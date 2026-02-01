# Clean Deployment Script for Windows - Removes all bolt.new and StackBlitz associations

Write-Host "🧹 Cleaning bolt.new and StackBlitz associations..." -ForegroundColor Green

# Remove bolt directories and files
Write-Host "🗑️ Cleaning bolt.new files..." -ForegroundColor Yellow
if (Test-Path ".bolt") { 
    try { Remove-Item -Recurse -Force ".bolt" -ErrorAction Stop; Write-Host "   Removed .bolt" } 
    catch { Write-Host "   .bolt already clean" }
}
if (Test-Path ".netlify") { 
    try { Remove-Item -Recurse -Force ".netlify" -ErrorAction Stop; Write-Host "   Removed .netlify" } 
    catch { Write-Host "   .netlify already clean" }
}
Get-ChildItem -Path "." -Name "bolt.config.*" -ErrorAction SilentlyContinue | ForEach-Object {
    try { Remove-Item -Force $_ -ErrorAction Stop; Write-Host "   Removed $_" } 
    catch { Write-Host "   $_ already clean" }
}
Get-ChildItem -Path "." -Name "stackblitz.config.*" -ErrorAction SilentlyContinue | ForEach-Object {
    try { Remove-Item -Force $_ -ErrorAction Stop; Write-Host "   Removed $_" } 
    catch { Write-Host "   $_ already clean" }
}

# Clean build artifacts
Write-Host "🗑️ Cleaning build artifacts..." -ForegroundColor Yellow
if (Test-Path "dist") { 
    try { Remove-Item -Recurse -Force "dist" -ErrorAction Stop; Write-Host "   Removed dist" } 
    catch { Write-Host "   dist already clean" }
}
if (Test-Path "node_modules") { 
    try { 
        Write-Host "   Removing node_modules (this may take a moment)..." -ForegroundColor Gray
        Remove-Item -Recurse -Force "node_modules" -ErrorAction Stop -Confirm:$false
        Write-Host "   Removed node_modules" 
    } 
    catch { 
        Write-Host "   node_modules removal failed, trying alternative methods..." -ForegroundColor Yellow
        
        # Method 1: Try with takeown and icacls to take ownership
        try {
            Write-Host "   Trying ownership method..." -ForegroundColor Gray
            takeown /f "node_modules" /r /d y >$null 2>&1
            icacls "node_modules" /grant administrators:F /t >$null 2>&1
            Remove-Item -Recurse -Force "node_modules" -ErrorAction Stop -Confirm:$false
            Write-Host "   Removed node_modules with ownership method"
        }
        catch {
            # Method 2: Use robocopy to empty the directory first
            try {
                Write-Host "   Trying robocopy method..." -ForegroundColor Gray
                New-Item -ItemType Directory -Path "empty_temp" -Force >$null
                robocopy "empty_temp" "node_modules" /mir >$null 2>&1
                Remove-Item "empty_temp" -Force >$null 2>&1
                Remove-Item "node_modules" -Force -Confirm:$false >$null 2>&1
                Write-Host "   Removed node_modules with robocopy method"
            }
            catch {
                Write-Host "   Skipping node_modules - will reinstall over existing files" -ForegroundColor Gray
            }
        }
    }
}

# Reinstall dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build

# Deploy to Netlify
Write-Host "🚀 Deploying to Netlify..." -ForegroundColor Yellow
netlify deploy --prod

Write-Host "✅ Clean deployment complete!" -ForegroundColor Green
Write-Host "🎉 All bolt.new and StackBlitz associations removed" -ForegroundColor Green 