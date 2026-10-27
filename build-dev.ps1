param(
    [switch]$Run,
    [switch]$Clean,
    [string]$BuildType = "Release"
)

$ErrorActionPreference = "Stop"

# Auto-locate Qt 6 and build tools on Windows
$qtToolPaths = @(
    "C:\Qt\6.12.0\mingw_64\bin",
    "C:\Qt\Tools\mingw1310_64\bin",
    "C:\Qt\Tools\Ninja",
    "C:\Qt\Tools\CMake_64\bin"
)

foreach ($p in $qtToolPaths) {
    if ((Test-Path $p) -and ($env:PATH -notlike "*$p*")) {
        $env:PATH = "$p;$env:PATH"
    }
}

$buildDir = "native-qt/build"

if ($Clean -and (Test-Path $buildDir)) {
    Write-Host "Cleaning $buildDir..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $buildDir
}

Write-Host "Configuring MatterPackr Native Desktop ($BuildType)..." -ForegroundColor Cyan
cmake -S native-qt -B $buildDir -G "Ninja" `
    -DCMAKE_PREFIX_PATH="C:\Qt\6.12.0\mingw_64" `
    "-DCMAKE_BUILD_TYPE=$BuildType" `
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON

Write-Host "Building MatterPackr executable..." -ForegroundColor Cyan
cmake --build $buildDir

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild succeeded: $buildDir/MatterPackr.exe" -ForegroundColor Green

    # Ensure Qt plugins and runtime are deployed
    $windeploy = "C:\Qt\6.12.0\mingw_64\bin\windeployqt.exe"
    if (Test-Path $windeploy) {
        & $windeploy --svg --no-translations --compiler-runtime "$buildDir/MatterPackr.exe" | Out-Null
    }

    # Keep compilation database updated for VS Code / IDE
    if (Test-Path "$buildDir/compile_commands.json") {
        Copy-Item "$buildDir/compile_commands.json" -Destination "compile_commands.json" -Force
    }

    if ($Run) {
        Write-Host "Launching MatterPackr..." -ForegroundColor Cyan
        $absExe = (Resolve-Path "$buildDir/MatterPackr.exe").Path
        Start-Process -FilePath $absExe
    }
}
