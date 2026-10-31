<#
.SYNOPSIS
  Copies the public channel stats JSON to the GitHub Pages repository and pushes it when it changed.
.DESCRIPTION
  Keeps a dedicated clone of the Pages repository at %LOCALAPPDATA%\Cubitos\pages-repo. Each run fetches and hard
  resets that clone to origin/<Branch>, copies the stats JSON to data/channel-stats.json and, only when the content
  changed, commits that single file ("chore: update channel stats") and pushes it. No other file is touched.

  The JSON is validated first: it must parse, must have schemaVersion, and must not contain ':\', 'secrets' or
  'token' (case-insensitive). Runs non-interactively (no credential prompts), writes one line per run to
  %LOCALAPPDATA%\Cubitos\pages-sync.log (last ~500 lines kept) and exits non-zero on failure, without retrying.
.PARAMETER DryRun
  Does everything except commit and push, reports whether it would push, and restores the clone.
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File publisher\scripts\sync-pages.ps1 -DryRun
#>
[CmdletBinding()]
param(
    # Default (resolved below): <repo>\site\data\channel-stats.json. $PSScriptRoot is empty in param defaults on PS 5.1.
    [string]$SourcePath,
    [string]$RepoUrl = 'https://github.com/pedrotoledoluis/pedrotoledoluis.github.io.git',
    [string]$Branch = 'master',
    [string]$ClonePath = (Join-Path $env:LOCALAPPDATA 'Cubitos\pages-repo'),
    [string]$LogPath = (Join-Path $env:LOCALAPPDATA 'Cubitos\pages-sync.log'),
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $SourcePath) {
    $SourcePath = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'site\data\channel-stats.json'
}
$TargetRelative = 'data/channel-stats.json'
$CommitMessage = 'chore: update channel stats'
$MaxLogLines = 500

# Never block on a credential or editor prompt; fail instead.
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
$env:GIT_ASKPASS = ''
$env:SSH_ASKPASS = ''

function Write-SyncLog([string]$Status, [string]$Message) {
    $line = '{0} [{1}]{2} {3}' -f (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz'), $Status, ($(if ($DryRun) { ' (dry-run)' } else { '' })), $Message
    Write-Host $line
    try {
        $dir = Split-Path -Parent $LogPath
        if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $lines = @()
        if (Test-Path -LiteralPath $LogPath) { $lines = @(Get-Content -LiteralPath $LogPath -Encoding UTF8) }
        $lines = @($lines + $line)
        if ($lines.Count -gt $MaxLogLines) { $lines = $lines[($lines.Count - $MaxLogLines)..($lines.Count - 1)] }
        Set-Content -LiteralPath $LogPath -Value $lines -Encoding UTF8
    } catch {
        Write-Warning "Could not write the log: $($_.Exception.Message)"
    }
}

# Runs git, returns its combined output as one string and throws on a non-zero exit code.
# Deliberately a simple function using $args, so git switches like -C or -m are not parsed as PowerShell parameters.
function Invoke-Git {
    $GitArgs = @($args)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'  # git writes progress to stderr; only the exit code decides.
    try {
        $output = & git @GitArgs 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
    # TrimEnd only: porcelain status lines start with a meaningful space.
    $text = ($output -join "`n").TrimEnd()
    if ($code -ne 0) {
        $first = ($text -split "`n" | Where-Object { $_ } | Select-Object -Last 1)
        throw "git $($GitArgs[0]) failed ($code): $first"
    }
    return $text
}

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git is not on PATH.' }

    # 1. Validate the source JSON before touching the clone.
    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) { throw "Source JSON not found: $SourcePath" }
    $raw = [System.IO.File]::ReadAllText($SourcePath)
    foreach ($forbidden in @(':\', 'secrets', 'token')) {
        if ($raw.IndexOf($forbidden, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            throw "Refusing to publish: the JSON contains the forbidden text '$forbidden'."
        }
    }
    try { $json = $raw | ConvertFrom-Json } catch { throw "Source JSON does not parse: $($_.Exception.Message)" }
    if (-not ($json.PSObject.Properties.Name -contains 'schemaVersion')) { throw 'Source JSON has no schemaVersion.' }

    # 2. Clone if missing, otherwise check it is the expected repository.
    if (-not (Test-Path -LiteralPath (Join-Path $ClonePath '.git'))) {
        if ((Test-Path -LiteralPath $ClonePath) -and @(Get-ChildItem -LiteralPath $ClonePath -Force).Count -gt 0) {
            throw "Clone path exists, is not empty and is not a git repository: $ClonePath"
        }
        New-Item -ItemType Directory -Path (Split-Path -Parent $ClonePath) -Force | Out-Null
        Invoke-Git clone --quiet --branch $Branch --single-branch $RepoUrl $ClonePath | Out-Null
    } else {
        $origin = Invoke-Git -C $ClonePath remote get-url origin
        if ($origin -ne $RepoUrl) { throw "Clone origin is '$origin', expected '$RepoUrl'. Delete $ClonePath to re-clone." }
    }

    # 3. Match origin exactly; this clone is owned by this script, so local changes are discarded.
    Invoke-Git -C $ClonePath fetch --quiet origin $Branch | Out-Null
    Invoke-Git -C $ClonePath checkout --quiet -B $Branch "origin/$Branch" | Out-Null
    Invoke-Git -C $ClonePath reset --quiet --hard "origin/$Branch" | Out-Null
    Invoke-Git -C $ClonePath clean --quiet -fd | Out-Null

    # 4. Copy the JSON byte for byte and let git decide whether anything changed.
    $target = Join-Path $ClonePath ($TargetRelative -replace '/', '\')
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $SourcePath -Destination $target -Force

    $changes = Invoke-Git -C $ClonePath status --porcelain --untracked-files=all
    $changedPaths = @($changes -split "`n" | Where-Object { $_ } | ForEach-Object { $_.Substring(3).Trim('"') })
    $unexpected = @($changedPaths | Where-Object { $_ -ne $TargetRelative })
    if ($unexpected.Count -gt 0) { throw "Unexpected changes in the clone: $($unexpected -join ', ')" }

    if ($changedPaths.Count -eq 0) {
        Write-SyncLog 'OK' 'No change; nothing to push.'
        exit 0
    }

    if ($DryRun) {
        Invoke-Git -C $ClonePath reset --quiet --hard "origin/$Branch" | Out-Null
        Invoke-Git -C $ClonePath clean --quiet -fd | Out-Null
        Write-SyncLog 'OK' "Content changed; WOULD commit and push $TargetRelative to origin/$Branch."
        exit 0
    }

    # 5. Commit only the stats file and push.
    Invoke-Git -C $ClonePath add -- $TargetRelative | Out-Null
    Invoke-Git -C $ClonePath commit --quiet -m $CommitMessage -- $TargetRelative | Out-Null
    $sha = Invoke-Git -C $ClonePath rev-parse --short HEAD
    Invoke-Git -C $ClonePath push --quiet origin "HEAD:$Branch" | Out-Null
    Write-SyncLog 'OK' "Pushed $sha to origin/$Branch."
    exit 0
} catch {
    Write-SyncLog 'FAIL' $_.Exception.Message
    exit 1
}
