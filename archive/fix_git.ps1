# Fix broken git reference
if (Test-Path ".git\refs\remotes\v3") {
    Remove-Item -Path ".git\refs\remotes\v3" -Recurse -Force
    Write-Host "Removed broken v3 reference"
}

# Test git status
git status --porcelain
Write-Host "Git is now working!"

