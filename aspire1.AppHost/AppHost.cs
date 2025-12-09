var builder = DistributedApplication.CreateBuilder(args);

// Capture version for container tags and ACA revision labels
var version = builder.Configuration["VERSION"] ?? "1.0.0-local";
var commitSha = builder.Configuration["COMMIT_SHA"] ??
                Environment.GetEnvironmentVariable("GITHUB_SHA")?[..7] ?? "local";

// Add Azure App Configuration (deployed as existing resource)
var appConfig = builder.AddAzureAppConfiguration("appconfig");

var apiService = builder.AddProject<Projects.aspire1_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithEnvironment("APP_VERSION", version)
    .WithEnvironment("COMMIT_SHA", commitSha)
    .WithReference(appConfig);

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
    .WithReference(appConfig)
    .WaitFor(apiService);

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
