# Export Project Script - Creates a clean export of the project

Write-Host "📦 Creating clean project export..." -ForegroundColor Green

# Create export directory
$exportDir = "neuraplay-export-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Name $exportDir | Out-Null

# Copy project files (excluding build artifacts)
Write-Host "📁 Copying project files..." -ForegroundColor Yellow

# Copy source files
Copy-Item -Path "src" -Destination "$exportDir/src" -Recurse -Force
Copy-Item -Path "netlify" -Destination "$exportDir/netlify" -Recurse -Force

# Copy configuration files
Copy-Item -Path "package.json" -Destination "$exportDir/"
Copy-Item -Path "package-lock.json" -Destination "$exportDir/"
Copy-Item -Path "vite.config.ts" -Destination "$exportDir/"
Copy-Item -Path "tsconfig.json" -Destination "$exportDir/"
Copy-Item -Path "tsconfig.app.json" -Destination "$exportDir/"
Copy-Item -Path "tsconfig.node.json" -Destination "$exportDir/"
Copy-Item -Path "tailwind.config.js" -Destination "$exportDir/"
Copy-Item -Path "postcss.config.js" -Destination "$exportDir/"
Copy-Item -Path "eslint.config.js" -Destination "$exportDir/"
Copy-Item -Path "index.html" -Destination "$exportDir/"
Copy-Item -Path "netlify.toml" -Destination "$exportDir/"

# Copy documentation
Copy-Item -Path "README.md" -Destination "$exportDir/"
Copy-Item -Path "DEPLOYMENT.md" -Destination "$exportDir/"
Copy-Item -Path "CLEANUP.md" -Destination "$exportDir/"

# Create .gitignore for the export
@"
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
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Netlify
.netlify/
"@ | Out-File -FilePath "$exportDir/.gitignore" -Encoding UTF8

# Create deployment scripts
Copy-Item -Path "clean-deploy.ps1" -Destination "$exportDir/" -ErrorAction SilentlyContinue
Copy-Item -Path "clean-deploy.sh" -Destination "$exportDir/" -ErrorAction SilentlyContinue

# Create ZIP archive
Write-Host "🗜️ Creating ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path $exportDir -DestinationPath "$exportDir.zip" -Force

# Clean up temporary directory
Remove-Item -Path $exportDir -Recurse -Force

Write-Host "✅ Project exported successfully!" -ForegroundColor Green
Write-Host "📁 Export file: $exportDir.zip" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 To use this export:" -ForegroundColor Yellow
Write-Host "1. Extract the ZIP file" -ForegroundColor White
Write-Host "2. Run 'npm install' to install dependencies" -ForegroundColor White
Write-Host "3. Run 'npm run dev' to start development server" -ForegroundColor White
Write-Host "4. Run 'npm run build' to build for production" -ForegroundColor White 