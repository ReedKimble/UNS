# build.ps1
$ErrorActionPreference = "Stop"

# Collect files in deterministic order
$inputs = @()
$inputs += Get-ChildItem "src\*.md"    | Sort-Object Name | ForEach-Object FullName

# Ensure build folder exists
New-Item -ItemType Directory -Force -Path "build" | Out-Null

# Run pandoc with defaults config
pandoc @inputs --defaults pandoc.yaml
