using System.Reflection;
using Azure.Identity;
using Microsoft.Extensions.Configuration.AzureAppConfiguration;
using Microsoft.FeatureManagement;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add Azure App Configuration with feature flags
var appConfigEndpoint = builder.Configuration["AppConfig:Endpoint"];
if (!string.IsNullOrEmpty(appConfigEndpoint))
{
    try
    {
        builder.Configuration.AddAzureAppConfiguration(options =>
        {
            options.Connect(new Uri(appConfigEndpoint), new DefaultAzureCredential())
                   .UseFeatureFlags(featureFlagOptions =>
                   {
                       featureFlagOptions.SetRefreshInterval(TimeSpan.FromSeconds(30));
                       // Use sentinel key for cache refresh
                       featureFlagOptions.Select("*", builder.Environment.EnvironmentName);
                   });
        });
    }
    catch (Exception ex)
    {
        // Log warning but continue - fall back to local appsettings.json
        Console.WriteLine($"Warning: Could not connect to Azure App Configuration: {ex.Message}");
        Console.WriteLine("Falling back to local feature flag configuration.");
    }
}

// Add feature management
builder.Services.AddFeatureManagement();

// Add services to the container.
builder.Services.AddProblemDetails();

// Capture version info at startup
var version = builder.Configuration["APP_VERSION"] ??
              Assembly.GetExecutingAssembly()
                      .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
                      ?.InformationalVersion ?? "unknown";
var commitSha = builder.Configuration["COMMIT_SHA"] ??
                Environment.GetEnvironmentVariable("GITHUB_SHA")?[..7] ?? "local";

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

// Enable Azure App Configuration middleware for dynamic refresh
if (!string.IsNullOrEmpty(builder.Configuration["AppConfig:Endpoint"]))
{
    app.UseAzureAppConfiguration();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

string[] summaries = ["Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"];

app.MapGet("/", () => "API service is running. Navigate to /weatherforecast to see sample data.");

app.MapGet("/weatherforecast", async (IFeatureManager featureManager) =>
{
    // Check if feature is enabled
    if (!await featureManager.IsEnabledAsync("WeatherForecast"))
    {
        return Results.Json(
            new { error = "Weather forecast feature is currently disabled" },
            statusCode: 503
        );
    }

    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return Results.Ok(forecast);
})
.WithName("GetWeatherForecast");

// Version endpoint for deployment tracking
app.MapGet("/version", () => new
{
    version,
    commitSha,
    service = "apiservice",
    environment = app.Environment.EnvironmentName,
    timestamp = DateTime.UtcNow
})
.WithName("GetVersion");

// Enhanced health with version for OpenTelemetry correlation
app.MapGet("/health/detailed", async (IFeatureManager featureManager) =>
{
    var showDetailed = await featureManager.IsEnabledAsync("DetailedHealth");

    if (showDetailed)
    {
        return Results.Ok(new
        {
            status = "healthy",
            version,
            commitSha,
            service = "apiservice",
            timestamp = DateTime.UtcNow,
            uptime = Environment.TickCount64 / 1000.0,
            features = new
            {
                detailedHealth = true,
                weatherForecast = await featureManager.IsEnabledAsync("WeatherForecast")
            }
        });
    }

    return Results.Ok(new { status = "healthy" });
})
.WithName("GetDetailedHealth");
app.MapDefaultEndpoints();

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
