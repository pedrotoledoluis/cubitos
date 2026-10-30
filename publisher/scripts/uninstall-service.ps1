<#
.SYNOPSIS
  Stops and removes the CubitosPublisher Windows Service. Keeps publisher/dist and publisher/data (DB, logs).
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

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "$ServiceName is not installed."
    exit 0
}
if ($service.Status -ne 'Stopped') {
    Write-Host "Stopping $ServiceName..."
    Stop-Service -Name $ServiceName
    $service.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(60))
}
sc.exe delete $ServiceName | Out-Host
if ($LASTEXITCODE -ne 0) { throw "sc.exe delete failed ($LASTEXITCODE)." }
Write-Host "$ServiceName removed. publisher/data (DB, logs) was kept."
