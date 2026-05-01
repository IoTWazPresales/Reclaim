Param()

$ErrorActionPreference = "Stop"

Write-Host "== Health Connect Diagnose =="

$repoRoot = Split-Path -Parent $PSScriptRoot
$appRoot = Join-Path $repoRoot "app"

if (!(Test-Path $appRoot)) {
  Write-Host "ERROR: Expected app directory at: $appRoot"
  exit 1
}

function Get-PackageJsonVersion([string]$filePath, [string]$packageName) {
  if (!(Test-Path $filePath)) { return $null }
  $json = Get-Content -Raw -Path $filePath | ConvertFrom-Json
  if ($json.dependencies -and $json.dependencies.$packageName) { return $json.dependencies.$packageName }
  if ($json.devDependencies -and $json.devDependencies.$packageName) { return $json.devDependencies.$packageName }
  return $null
}

$rootPkgJson = Join-Path $appRoot "package.json"
$nodePkgJson = Join-Path $appRoot "node_modules/react-native-health-connect/package.json"

$declared = Get-PackageJsonVersion $rootPkgJson "react-native-health-connect"
$installed = $null
if (Test-Path $nodePkgJson) {
  $installed = (Get-Content -Raw -Path $nodePkgJson | ConvertFrom-Json).version
}

Write-Host ""
Write-Host "1) Versions"
Write-Host ("- Declared (app/package.json): " + ($declared ?? "<missing>"))
Write-Host ("- Installed (node_modules):     " + ($installed ?? "<missing>"))

$kotlinFile = Join-Path $appRoot "node_modules/react-native-health-connect/android/src/main/java/dev/matinzd/healthconnect/permissions/HealthConnectPermissionDelegate.kt"
Write-Host ""
Write-Host "2) Android 14+ contract patch check"
if (!(Test-Path $kotlinFile)) {
  Write-Host ("- Kotlin file not found: " + $kotlinFile)
} else {
  $src = Get-Content -Raw -Path $kotlinFile
  $hasBranch = ($src -match "SDK_INT\s*>=\s*34") -and ($src -match "createRequestPermissionResultContract\(\)") -and ($src -match "createRequestPermissionResultContract\(providerPackageName\)")
  Write-Host ("- Kotlin file: " + $kotlinFile)
  Write-Host ("- Has SDK>=34 no-arg branch + else(providerPackageName): " + ($hasBranch ? "YES" : "NO"))
}

Write-Host ""
Write-Host "3) Search android/ manifests for ACTION_SHOW_PERMISSIONS_RATIONALE"
$androidRoot = Join-Path $appRoot "android"
if (!(Test-Path $androidRoot)) {
  Write-Host ("- android/ not found (run: npx expo prebuild --clean)")
} else {
  $manifests = Get-ChildItem -Path $androidRoot -Recurse -Filter "AndroidManifest.xml" -File
  foreach ($m in $manifests) {
    $matches = Select-String -Path $m.FullName -SimpleMatch -Pattern "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE"
    if (!$matches) { continue }

    foreach ($hit in $matches) {
      $lines = Get-Content -Path $m.FullName
      $idx = $hit.LineNumber - 1

      # Best-effort: walk backwards to nearest <activity ... android:name="...">
      $activityName = "<unknown>"
      for ($i = $idx; $i -ge 0; $i--) {
        if ($lines[$i] -match "<activity\b" -and $lines[$i] -match "android:name\\s*=\\s*\"([^\"]+)\"") {
          $activityName = $Matches[1]
          break
        }
      }

      Write-Host ("- File: " + $m.FullName)
      Write-Host ("  Activity: " + $activityName)
      Write-Host ("  Line " + $hit.LineNumber + ": " + $hit.Line.Trim())
    }
  }
}

Write-Host ""
Write-Host "4) Suggested logcat repro"
Write-Host "adb logcat -c"
Write-Host "(user action) tap Integrations -> Health Connect -> Connect once"
Write-Host 'adb logcat -d -v time | Select-String -SimpleMatch -Pattern "E/PermissionsActivity","App should support rationale intent, finishing!","REQUEST_HEALTH_PERMISSIONS","HEALTH_CONNECT_NO_DIALOG_OR_UNAVAILABLE"'


