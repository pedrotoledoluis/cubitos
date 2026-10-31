<#
.SYNOPSIS
  Registers (or updates) the per-user Scheduled Task CubitosPagesSync that runs sync-pages.ps1 every hour.
.DESCRIPTION
  No admin rights needed. The task runs as the current user only while that user is logged on (no stored
  password), hidden, starting at the next full hour and repeating hourly. A missed run starts when available and
  overlapping runs are skipped. Running this script again updates the task in place; -Uninstall removes it.
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File publisher\scripts\install-pages-sync.ps1
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File publisher\scripts\install-pages-sync.ps1 -Uninstall
#>
[CmdletBinding()]
param(
    [string]$TaskName = 'CubitosPagesSync',
    [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'

if ($Uninstall) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed scheduled task $TaskName."
    } else {
        Write-Host "Scheduled task $TaskName is not registered; nothing to remove."
    }
    exit 0
}

$script = Join-Path $PSScriptRoot 'sync-pages.ps1'
if (-not (Test-Path -LiteralPath $script)) { throw "sync-pages.ps1 not found next to this script: $script" }

$user = "$env:USERDOMAIN\$env:USERNAME"
$now = Get-Date
$start = $now.Date.AddHours($now.Hour + 1)  # next full hour

$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$arguments = "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Once -At $start -RepetitionInterval (New-TimeSpan -Hours 1)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -Hidden -StartWhenAvailable -MultipleInstances IgnoreNew `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
    -Description 'Pushes site/data/channel-stats.json to the GitHub Pages repository when it changed (Cubitos).' `
    -Force | Out-Null

Write-Host "Registered $TaskName for $user, hourly from $($start.ToString('yyyy-MM-dd HH:mm'))."
Get-ScheduledTask -TaskName $TaskName | Format-Table -AutoSize TaskName, State
