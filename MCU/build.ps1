Param(
    [string]$Preset = "host"
)

# Simple helper script to compile the shared MCU runtime/tests on the host machine.
# Usage:
#   pwsh ./MCU/build.ps1            # default preset (host)
#   pwsh ./MCU/build.ps1 -Preset arduino

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $root "build-$Preset"

if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

Push-Location $buildDir
try {
    if ($Preset -eq "host") {
        cmake -G "Ninja" -DUNS_MCU_BUILD_TESTS=ON ..\shared
        ninja
    }
    else {
        Write-Output "Preset '$Preset' is not implemented yet. Add platform presets as ports mature."
    }
}
finally {
    Pop-Location
}
