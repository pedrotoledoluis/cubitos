<#
.SYNOPSIS
  Publishes the Cubitos publisher worker and installs (or updates) it as the CubitosPublisher Windows Service.
.NOTES
  Run from an elevated PowerShell. The service runs as LocalSystem and needs read/write access to the repo:
  uploader/uploaded.json, secrets/token.json (refreshed tokens are written back) and publisher/data.
#>
[CmdletBinding()]
param(
    [string]$ServiceName = 'CubitosPublisher'
)
$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not (New-Object Security.Principal.WindowsPrincipal $identity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'This script must run elevated: open PowerShell with "Run as administrator" and run it again.' -ForegroundColor Red
    exit 1
}

$publisherDir = Split-Path -Parent $PSScriptRoot
$project = Join-Path $publisherDir 'src\Cubitos.Publisher.Worker\Cubitos.Publisher.Worker.csproj'
$dist = Join-Path $publisherDir 'dist\worker'
$exe = Join-Path $dist 'Cubitos.Publisher.Worker.exe'
if ($exe -match '\s') { throw "The install path must not contain spaces: $exe" }

# Stop a running instance first so its binaries can be overwritten.
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing -and $existing.Status -ne 'Stopped') {
    Write-Host "Stopping $ServiceName..."
    Stop-Service -Name $ServiceName
    $existing.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(60))
}

Write-Host "Publishing to $dist..."
dotnet publish $project -c Release -r win-x64 --self-contained -o $dist
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed ($LASTEXITCODE)." }

if ($existing) {
    sc.exe config $ServiceName binPath= $exe start= delayed-auto | Out-Host
} else {
    sc.exe create $ServiceName binPath= $exe start= delayed-auto DisplayName= 'Cubitos Publisher' | Out-Host
}
if ($LASTEXITCODE -ne 0) { throw "sc.exe create/config failed ($LASTEXITCODE)." }

sc.exe description $ServiceName 'Publishes queued Historia en Cubitos episodes to YouTube and records view statistics.' | Out-Host
# Restart after 1 min, 1 min, then 5 min; reset the failure count after a day. Also restart on non-crash failures.
sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/300000 | Out-Host
sc.exe failureflag $ServiceName 1 | Out-Host

if (-not [System.Diagnostics.EventLog]::SourceExists($ServiceName)) {
    [System.Diagnostics.EventLog]::CreateEventSource($ServiceName, 'Application')
}

Write-Host "Starting $ServiceName..."
Start-Service -Name $ServiceName
Get-Service -Name $ServiceName | Format-Table -AutoSize Name, Status, StartType
