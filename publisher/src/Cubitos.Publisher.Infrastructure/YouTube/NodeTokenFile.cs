using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Cubitos.Publisher.Core.Ports;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Util.Store;

namespace Cubitos.Publisher.Infrastructure.YouTube;

/// <summary>
/// Converts the Node googleapis <c>token.json</c> (<c>access_token</c>, <c>refresh_token</c>, <c>scope</c>,
/// <c>token_type</c>, <c>expiry_date</c> in epoch ms) to and from <see cref="TokenResponse"/>.
/// Error messages never include token values.
/// </summary>
public static class NodeTokenFile
{
    private static readonly JsonSerializerOptions WriteOptions = new() { WriteIndented = true, IndentSize = 2 };

    public static TokenResponse Parse(string json, DateTimeOffset now)
    {
        JsonObject root;
        try
        {
            root = JsonNode.Parse(json) as JsonObject ?? throw new InvalidOperationException("token.json must be a JSON object.");
        }
        catch (JsonException)
        {
            throw new InvalidOperationException("token.json is not valid JSON.");
        }

        var refresh = (string?)root["refresh_token"];
        if (string.IsNullOrEmpty(refresh))
            throw new InvalidOperationException("token.json has no refresh_token; re-authorize with `node uploader/upload.mjs --auth`.");

        long? expiryMs = root["expiry_date"] is JsonValue v && v.TryGetValue(out long ms) ? ms : null;
        var lifetime = expiryMs is { } e ? Math.Max(0, (e - now.ToUnixTimeMilliseconds()) / 1000) : 0;

        return new TokenResponse
        {
            AccessToken = (string?)root["access_token"],
            RefreshToken = refresh,
            Scope = (string?)root["scope"],
            TokenType = (string?)root["token_type"] ?? "Bearer",
            IssuedUtc = now.UtcDateTime,
            ExpiresInSeconds = lifetime,
        };
    }

    /// <summary>Writes the refreshed access token and expiry into the existing JSON, keeping every other field.</summary>
    public static string Merge(string existingJson, TokenResponse refreshed)
    {
        var root = JsonNode.Parse(existingJson) as JsonObject ?? [];
        if (refreshed.AccessToken is not null) root["access_token"] = refreshed.AccessToken;
        if (!string.IsNullOrEmpty(refreshed.RefreshToken)) root["refresh_token"] = refreshed.RefreshToken;
        if (refreshed.ExpiresInSeconds is { } seconds)
        {
            var issued = new DateTimeOffset(DateTime.SpecifyKind(refreshed.IssuedUtc, DateTimeKind.Utc));
            root["expiry_date"] = issued.AddSeconds(seconds).ToUnixTimeMilliseconds();
        }
        return root.ToJsonString(WriteOptions);
    }
}

/// <summary>
/// Google <see cref="IDataStore"/> backed by the Node <c>token.json</c>: refreshed tokens are merged back so the
/// Node uploader keeps working. Delete/clear are no-ops so a revoke never removes the user's token file.
/// </summary>
public sealed class NodeTokenDataStore(string tokenPath, IClock clock) : IDataStore
{
    private readonly SemaphoreSlim _lock = new(1, 1);

    public async Task<TokenResponse> LoadAsync(CancellationToken ct = default)
    {
        if (!File.Exists(tokenPath))
            throw new FileNotFoundException("token.json not found; authorize with `node uploader/upload.mjs --auth`.");
        return NodeTokenFile.Parse(await File.ReadAllTextAsync(tokenPath, ct), clock.UtcNow);
    }

    public async Task StoreAsync<T>(string key, T value)
    {
        if (value is not TokenResponse token) return;
        await _lock.WaitAsync();
        try
        {
            var existing = File.Exists(tokenPath) ? await File.ReadAllTextAsync(tokenPath) : "{}";
            var temp = tokenPath + ".tmp-" + Guid.NewGuid().ToString("N");
            try
            {
                await File.WriteAllTextAsync(temp, NodeTokenFile.Merge(existing, token), new UTF8Encoding(false));
                File.Move(temp, tokenPath, overwrite: true);
            }
            finally
            {
                if (File.Exists(temp)) File.Delete(temp);
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<T> GetAsync<T>(string key) =>
        typeof(T) == typeof(TokenResponse) && File.Exists(tokenPath) ? (T)(object)await LoadAsync() : default!;

    public Task DeleteAsync<T>(string key) => Task.CompletedTask;

    public Task ClearAsync() => Task.CompletedTask;
}
