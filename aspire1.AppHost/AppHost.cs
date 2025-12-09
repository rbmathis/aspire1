var builder = DistributedApplication.CreateBuilder(args);

// Capture version for container tags and ACA revision labels
var version = builder.Configuration["VERSION"] ?? "1.0.0-local";
var commitSha = builder.Configuration["COMMIT_SHA"] ??
                Environment.GetEnvironmentVariable("GITHUB_SHA")?[..7] ?? "local";

// Detect if we're running locally without Docker (offline-first development)
var isLocalDev = builder.Environment.EnvironmentName == "Development" &&
                 string.IsNullOrEmpty(builder.Configuration["CONTAINER_REGISTRY"]);

// Add Azure App Configuration (only when deploying)
var appConfig = !isLocalDev ? builder.AddAzureAppConfiguration("appconfig") : null;
if (appConfig != null)
{
    Console.WriteLine("✅ Azure App Configuration enabled");
}
else
{
    Console.WriteLine("⚠️  Azure App Configuration disabled for local development");
}

// Add Redis for distributed caching and session state (only when Docker is available)
IResourceBuilder<IResourceWithConnectionString>? redis = null;
if (!isLocalDev)
{
    redis = builder.AddRedis("cache");
    Console.WriteLine("✅ Redis container enabled (Docker available)");
}
else
{
    Console.WriteLine("⚠️  Redis disabled for local development (Docker not required)");
    Console.WriteLine("   Services will use in-memory fallbacks");
}

var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithEnvironment("APP_VERSION", version)
    .WithEnvironment("COMMIT_SHA", commitSha);

// Only reference Azure resources if they were added
if (appConfig != null)
{
    apiService.WithReference(appConfig);
}
if (redis != null)
{
    apiService.WithReference(redis);
}

// Only add container annotations when deploying (CONTAINER_REGISTRY is set by azd)
if (!string.IsNullOrEmpty(builder.Configuration["CONTAINER_REGISTRY"]))
{
    apiService.WithAnnotation(new ContainerImageAnnotation
    {
        Registry = builder.Configuration["CONTAINER_REGISTRY"],
        Image = "aspire1-apiservice",
        Tag = version
    });
}

var webFrontend = builder.AddProject<Projects.aspire1_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithEnvironment("APP_VERSION", version)
    .WithEnvironment("COMMIT_SHA", commitSha)
    .WithReference(apiService)
    .WaitFor(apiService);

// Only reference Azure resources if they were added
if (appConfig != null)
{
    webFrontend.WithReference(appConfig);
}
if (redis != null)
{
    webFrontend.WithReference(redis);
}

// Only add container annotations when deploying
if (!string.IsNullOrEmpty(builder.Configuration["CONTAINER_REGISTRY"]))
{
    webFrontend.WithAnnotation(new ContainerImageAnnotation
    {
        Registry = builder.Configuration["CONTAINER_REGISTRY"],
        Image = "aspire1-web",
        Tag = version
    });
}

builder.Build().Run();
