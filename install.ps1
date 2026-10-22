# VDF installer — Windows PowerShell
# usage: .\install.ps1 [-Prefix <dir>]     (default: $HOME\.local)
param(
  [string]$Prefix = "$HOME\.local"
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$cpu = if ([Environment]::Is64BitOperatingSystem) {
  if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "aarch64" } else { "x86_64" }
} else { "x86_64" }

$src = Join-Path $here "binaries\windows\$cpu\vdf.exe"
if (-not (Test-Path $src)) {
  Write-Host "binary not found: $src"
  Get-ChildItem (Join-Path $here "binaries\windows") | ForEach-Object { Write-Host "  $($_.Name)" }
  exit 1
}

$bindir = Join-Path $Prefix "bin"
New-Item -ItemType Directory -Force -Path $bindir | Out-Null
Copy-Item $src (Join-Path $bindir "vdf.exe")

Write-Host "installed: $bindir\vdf.exe"

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$bindir*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$bindir", "User")
  Write-Host "added to your user PATH (open a NEW terminal to use 'vdf')"
} else {
  Write-Host "$bindir already on PATH"
}

& (Join-Path $bindir "vdf.exe") --version
Write-Host "try:  vdf doc"
