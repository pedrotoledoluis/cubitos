using System.Net;
using System.Text.Json.Nodes;
using Cubitos.Publisher.Core.Ports;
using Cubitos.Publisher.Infrastructure.YouTube;
using Google;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Requests;

namespace Cubitos.Publisher.Infrastructure.Tests;

public sealed class YouTubeErrorsTests
{
    private static GoogleApiException ApiError(string? reason, string message) =>
        new("youtube", message)
        {
            HttpStatusCode = HttpStatusCode.Forbidden,
            Error = new RequestError
            {
                Code = 403,
                Message = message,
                Errors = reason is null ? [] : [new SingleError { Reason = reason, Message = message }],
            },
        };

    [Fact]
    public void Upload_limit_reason_maps_to_core_exception()
    {
        Assert.IsType<UploadLimitExceededException>(YouTubeErrors.Translate(ApiError("uploadLimitExceeded", "limit")));
    }

    [Fact]
    public void Upload_limit_message_without_reason_maps_to_core_exception()
    {
        var mapped = YouTubeErrors.Translate(ApiError(null, "The user has exceeded the number of videos they may upload."));
        Assert.IsType<UploadLimitExceededException>(mapped);
    }

    [Theory]
    [InlineData("quotaExceeded")]
    [InlineData("dailyLimitExceeded")]
    public void Quota_reasons_map_to_retryable_quota_exception(string reason)
    {
        Assert.IsType<PlatformQuotaExceededException>(YouTubeErrors.Translate(ApiError(reason, "quota")));
    }

    [Fact]
    public void Other_errors_pass_through_unchanged()
    {
        var original = ApiError("forbidden", "nope");
        Assert.Same(original, YouTubeErrors.Translate(original));
        var io = new IOException("disk");
        Assert.Same(io, YouTubeErrors.Translate(io));
    }
}

public sealed class YouTubeMappingTests
{
    [Fact]
    public void Status_with_publish_at_is_private_and_scheduled()
    {
        var status = YouTubeMapping.BuildStatus(new DateTimeOffset(2026, 10, 31, 12, 0, 0, TimeSpan.FromHours(-5)), madeForKids: false);

        Assert.Equal("private", status.PrivacyStatus);
        Assert.Equal("2026-10-31T17:00:00.000Z", status.PublishAtRaw);
        Assert.False(status.SelfDeclaredMadeForKids);
        Assert.False(status.ContainsSyntheticMedia);
    }

    [Fact]
    public void Status_without_publish_at_is_public()
    {
        var status = YouTubeMapping.BuildStatus(null, madeForKids: false);

        Assert.Equal("public", status.PrivacyStatus);
        Assert.Null(status.PublishAtRaw);
    }

    [Theory]
    [InlineData("public", VideoPrivacy.Public)]
    [InlineData("unlisted", VideoPrivacy.Unlisted)]
    [InlineData("private", VideoPrivacy.Private)]
    [InlineData(null, VideoPrivacy.Private)]
    public void Privacy_strings_map_to_core_enum(string? raw, VideoPrivacy expected)
    {
        Assert.Equal(expected, YouTubeMapping.ParsePrivacy(raw));
    }

    [Fact]
    public void Batches_ids_in_groups_of_fifty()
    {
        var ids = Enumerable.Range(0, 120).Select(i => $"v{i}").ToList();
        Assert.Equal([50, 50, 20], YouTubeMapping.Batches(ids).Select(b => b.Count));
    }
}

public sealed class NodeTokenFileTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Parses_node_token_json_into_token_response()
    {
        var expiry = Now.AddMinutes(30).ToUnixTimeMilliseconds();
        var json = "{ \"access_token\": \"fake-a\", \"refresh_token\": \"fake-r\", \"scope\": \"s1 s2\", " +
                   "\"token_type\": \"Bearer\", \"expiry_date\": " + expiry + " }";

        var token = NodeTokenFile.Parse(json, Now);

        Assert.Equal("fake-a", token.AccessToken);
        Assert.Equal("fake-r", token.RefreshToken);
        Assert.Equal("s1 s2", token.Scope);
        Assert.Equal("Bearer", token.TokenType);
        Assert.Equal(Now.UtcDateTime, token.IssuedUtc);
        Assert.Equal(1800, token.ExpiresInSeconds);
    }

    [Fact]
    public void Expired_token_parses_with_zero_lifetime()
    {
        var json = "{ \"access_token\": \"fake-a\", \"refresh_token\": \"fake-r\", \"expiry_date\": " +
                   Now.AddHours(-1).ToUnixTimeMilliseconds() + " }";
        Assert.Equal(0, NodeTokenFile.Parse(json, Now).ExpiresInSeconds);
    }

    [Fact]
    public void Missing_refresh_token_throws_without_echoing_content()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => NodeTokenFile.Parse("{ \"access_token\": \"fake-secret\" }", Now));
        Assert.DoesNotContain("fake-secret", ex.Message);
    }

    [Fact]
    public void Merge_updates_access_and_expiry_and_preserves_other_fields()
    {
        var json = """{ "access_token": "old-a", "refresh_token": "keep-r", "scope": "s", "token_type": "Bearer", "expiry_date": 1, "id_token": "x" }""";
        var refreshed = new TokenResponse { AccessToken = "new-a", ExpiresInSeconds = 3599, IssuedUtc = Now.UtcDateTime };

        var merged = JsonNode.Parse(NodeTokenFile.Merge(json, refreshed))!;

        Assert.Equal("new-a", (string?)merged["access_token"]);
        Assert.Equal(Now.AddSeconds(3599).ToUnixTimeMilliseconds(), (long?)merged["expiry_date"]);
        Assert.Equal("keep-r", (string?)merged["refresh_token"]);
        Assert.Equal("x", (string?)merged["id_token"]);
        Assert.Equal("s", (string?)merged["scope"]);
    }

    [Fact]
    public void Merge_replaces_refresh_token_only_when_a_new_one_is_issued()
    {
        var json = """{ "access_token": "old-a", "refresh_token": "old-r", "expiry_date": 1 }""";
        var refreshed = new TokenResponse { AccessToken = "new-a", RefreshToken = "new-r", ExpiresInSeconds = 60, IssuedUtc = Now.UtcDateTime };

        var merged = JsonNode.Parse(NodeTokenFile.Merge(json, refreshed))!;

        Assert.Equal("new-r", (string?)merged["refresh_token"]);
    }
}
