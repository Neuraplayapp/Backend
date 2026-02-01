Write-Host "Starting NeuraPlay Development Environment..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Vite Dev Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Write-Host "Starting API Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node dev-server.js" -WindowStyle Normal

Write-Host ""
Write-Host "Development servers started!" -ForegroundColor Green
Write-Host "Vite Dev Server: http://localhost:5173 (or next available port)" -ForegroundColor Cyan
Write-Host "API Server: http://localhost:8888" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 