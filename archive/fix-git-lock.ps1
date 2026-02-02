#!/usr/bin/env pwsh
# Automatic Git Lock File Cleanup
# Run this whenever git complains about index.lock

$lockFile = "C:\Users\sammy\.git\index.lock"

if (Test-Path $lockFile) {
    Write-Host "Removing stale git lock file..." -ForegroundColor Yellow
    Remove-Item -Force $lockFile -ErrorAction SilentlyContinue
    Write-Host "Lock file removed." -ForegroundColor Green
} else {
    Write-Host "No lock file found." -ForegroundColor Green
}

# Also check for other common lock files in the project
$projectLocks = @(
    ".git/index.lock",
    ".git/refs/heads/*.lock",
    ".git/HEAD.lock"
)

foreach ($pattern in $projectLocks) {
    Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Removing: $($_.FullName)" -ForegroundColor Yellow
        Remove-Item -Force $_.FullName
    }
}

Write-Host "Git is ready." -ForegroundColor Green

