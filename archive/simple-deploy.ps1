# Simple Deployment Script - Deploys without removing node_modules

Write-Host "🚀 Simple deployment starting..." -ForegroundColor Green

# Clean build artifacts only
Write-Host "🗑️ Cleaning build artifacts..." -ForegroundColor Yellow
if (Test-Path "dist") { 
    try { Remove-Item -Recurse -Force "dist" -ErrorAction Stop; Write-Host "   Removed dist" } 
    catch { Write-Host "   dist already clean" }
}

# Install/update dependencies (will update existing ones)
Write-Host "📦 Installing/updating dependencies..." -ForegroundColor Yellow
npm install

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build

# Check if build was successful
if (Test-Path "dist") {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    
    # Deploy to Netlify
    Write-Host "🚀 Deploying to Netlify..." -ForegroundColor Yellow
    netlify deploy --prod
    
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed - dist folder not created" -ForegroundColor Red
    Write-Host "Check the build output above for errors" -ForegroundColor Yellow
}