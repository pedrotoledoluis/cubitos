# Synthesizes one WAV per job using Windows SAPI (System.Speech).
# Input: a UTF-8 JSON file with [{ "text": "...", "out": "C:\\path\\file.wav", "rate": 0 }]
param([Parameter(Mandatory = $true)][string]$JobsFile, [string]$Voice = "Microsoft Sabina Desktop")
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$jobs = Get-Content -Raw -Encoding UTF8 $JobsFile | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice($Voice)
foreach ($job in $jobs) {
  $synth.Rate = [int]$job.rate
  $synth.SetOutputToWaveFile($job.out)
  $synth.Speak([string]$job.text)
  $synth.SetOutputToNull()
  Write-Output "ok $($job.out)"
}
$synth.Dispose()
