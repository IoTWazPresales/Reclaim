# Reclaim device QA helper — screenshots + adb checks
# Usage: .\scripts\device-qa.ps1 -Branch feat/final-final-pass [-Launch]

param(
  [string]$Branch = (git rev-parse --abbrev-ref HEAD 2>$null),
  [switch]$Launch,
  [string]$Adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
)

$ErrorActionPreference = "Stop"
$date = Get-Date -Format "yyyy-MM-dd"
$runDir = Join-Path $PSScriptRoot "..\docs\audits\device-runs\${date}_${Branch}"
$manual = Join-Path $runDir "manual"
$play = Join-Path $runDir "play-store"

New-Item -ItemType Directory -Force -Path $manual, $play | Out-Null

function Invoke-Adb([string[]]$Args) {
  if (-not (Test-Path $Adb)) { throw "adb not found at $Adb" }
  & $Adb @Args
}

function Save-Screenshot([string]$Name) {
  $path = Join-Path $manual $Name
  cmd /c "`"$Adb`" exec-out screencap -p > `"$path`""
  if (-not (Test-Path $path)) { throw "Screenshot failed: $Name" }
  Write-Host "screenshot: $path ($((Get-Item $path).Length) bytes)"
}

Write-Host "=== Reclaim device QA ==="
Write-Host "Run dir: $runDir"
Invoke-Adb devices -l

$devices = (Invoke-Adb devices) | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }
if (-not $devices) {
  Write-Warning "No adb device. Connect phone (USB debugging) or start emulator."
  exit 2
}

if ($Launch) {
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = "10.0.2.2"
  Push-Location (Join-Path $PSScriptRoot "..\app")
  try {
    Invoke-Adb reverse tcp:8081 tcp:8081
    npx expo start --dev-client --android
  } finally {
    Pop-Location
  }
}

Save-Screenshot "00_smoke.png"
Write-Host "Done. Add manual navigations or extend with Maestro flows."
