# Export Full Workspace to GitHub - Neuraplay v5
Write-Host "Starting Neuraplay v5 workspace export to GitHub..." -ForegroundColor Green

# Set Git path
$gitPath = "C:\Program Files\Git\bin\git.exe"

# Check if Git is available
if (-not (Test-Path $gitPath)) {
    Write-Host "Git not found at $gitPath" -ForegroundColor Red
    exit 1
}

Write-Host "Git found at: $gitPath" -ForegroundColor Green

# Initialize Git repository if not already done
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    & $gitPath init
} else {
    Write-Host "Git repository already initialized" -ForegroundColor Green
}

# Create .gitignore
Write-Host "Creating .gitignore..." -ForegroundColor Yellow
$gitignoreContent = @"
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Netlify
.netlify/

# Exclude export files
*-export-*.zip
*-complete.zip
*-project-export.zip

# Exclude installer files
*.exe
*.msi

# Exclude temporary directories
Workingversion of the project/
Neuraplayv4-clone/
"@
$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8

Write-Host ".gitignore created" -ForegroundColor Green

# Add all files to Git
Write-Host "Adding all files to Git..." -ForegroundColor Yellow
& $gitPath add .

# Create initial commit
Write-Host "Creating initial commit..." -ForegroundColor Yellow
$commitMessage = "Initial commit: Neuraplay v5 - Full workspace export - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
& $gitPath commit -m $commitMessage

# Create simple README
Write-Host "Creating README for v5..." -ForegroundColor Yellow
$readmeContent = @"
# Neuraplay v5 - Interactive Learning Platform

Neuraplay v5 is a comprehensive interactive learning platform featuring AI-powered educational games, cognitive training modules, and personalized learning experiences.

## Features
- AI-Powered Games
- Cognitive Training
- Interactive Learning
- Responsive Design
- Netlify Integration
- Enhanced AI Agent

## Technology Stack
- React 18 + TypeScript
- Tailwind CSS
- Vite
- Netlify
- OpenAI APIs
- ElevenLabs

## Quick Start
1. npm install
2. npm run dev
3. npm run build
4. npm run deploy

## Games
- Fuzzling
- Counting Adventure
- Memory Sequence
- The Cube
- Crossroad Fun
- Starbloom Adventure
- Mountain Climber

Last Updated: $(Get-Date -Format 'yyyy-MM-dd')
Version: 5.0
"@
$readmeContent | Out-File -FilePath "README.md" -Encoding UTF8

Write-Host "README created for v5" -ForegroundColor Green

# Create setup instructions
Write-Host "Creating GitHub setup instructions..." -ForegroundColor Yellow
$setupContent = @"
# GitHub Repository Setup Instructions - Neuraplay v5

To push this project to GitHub as neuraplayv5:

1. Create a new repository on GitHub
   - Go to https://github.com/new
   - Repository name: neuraplayv5
   - Make it public or private as preferred
   - Don't initialize with README

2. Add the remote origin
   git remote add origin https://github.com/YOUR_USERNAME/neuraplayv5.git

3. Push to GitHub
   git branch -M main
   git push -u origin main

4. Verify the upload
   - Check your GitHub repository
   - All files should be visible

What's included in this v5 export:
- Complete source code (src/ directory)
- All assets (public/assets/)
- Configuration files
- Documentation
- Netlify functions
- Licensing information
- Build scripts
- Third-party games
- Enhanced AI components

Post-upload setup:
1. Install dependencies: npm install
2. Set up environment variables
3. Configure Netlify
4. Test the application: npm run dev

Repository Statistics:
- Total files: $(Get-ChildItem -Recurse -File | Measure-Object | Select-Object -ExpandProperty Count)
- Total size: $([math]::Round((Get-ChildItem -Recurse -File | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum) / 1MB, 2)) MB

Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@
$setupContent | Out-File -FilePath "GITHUB_SETUP_V5.md" -Encoding UTF8

Write-Host "GitHub setup instructions created" -ForegroundColor Green

# Show repository status
Write-Host "Repository Status:" -ForegroundColor Cyan
& $gitPath log --oneline -1
& $gitPath status

Write-Host ""
Write-Host "Neuraplay v5 workspace export completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create a new repository on GitHub named 'neuraplayv5'" -ForegroundColor White
Write-Host "2. Add remote: git remote add origin https://github.com/YOUR_USERNAME/neuraplayv5.git" -ForegroundColor White
Write-Host "3. Push: git push -u origin main" -ForegroundColor White
Write-Host "4. Check GITHUB_SETUP_V5.md for detailed instructions" -ForegroundColor White
Write-Host ""
Write-Host "Files ready for GitHub neuraplayv5:" -ForegroundColor Cyan
Write-Host "- Complete source code" -ForegroundColor White
Write-Host "- All assets and media" -ForegroundColor White
Write-Host "- Configuration files" -ForegroundColor White
Write-Host "- Documentation" -ForegroundColor White
Write-Host "- Netlify functions" -ForegroundColor White
Write-Host "- Third-party integrations" -ForegroundColor White 