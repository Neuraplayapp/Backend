# NeuraPlay Frontend-Only Development
# This runs ONLY the frontend and proxies API calls to your live Render deployment
# 🔒 SECURE: No production API keys in local environment

Write-Host "🎯 Starting NeuraPlay Frontend with Render API Proxy..." -ForegroundColor Cyan
Write-Host "🔒 Security: All API calls proxied to https://neuraplay.onrender.com" -ForegroundColor Green
Write-Host "✅ No API keys needed locally - uses your production deployment" -ForegroundColor Green

Write-Host ""
Write-Host "🔧 Configuration:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   API Proxy: https://neuraplay.onrender.com" -ForegroundColor White
Write-Host "   Mode: Frontend development with production API" -ForegroundColor White
Write-Host ""

# Start frontend dev server (will proxy to Render)
Write-Host "Starting frontend with Render proxy..." -ForegroundColor Cyan
npm run dev

Write-Host ""
Write-Host "✅ Frontend development started!" -ForegroundColor Green
Write-Host "🌐 Open http://localhost:5173 in your browser" -ForegroundColor Cyan
Write-Host ""
Write-Host "ℹ️  How it works:" -ForegroundColor Blue
Write-Host "   • Frontend runs locally for fast development" -ForegroundColor Green
Write-Host "   • All /api/* calls are proxied to your Render deployment" -ForegroundColor Green
Write-Host "   • Your production API keys stay secure on Render" -ForegroundColor Green
Write-Host "   • You get real AI responses from production APIs" -ForegroundColor Green
Write-Host ""
Write-Host "🛡️  Security Benefits:" -ForegroundColor Magenta
Write-Host "   ✅ No API keys in local environment" -ForegroundColor Green
Write-Host "   ✅ No risk of committing secrets" -ForegroundColor Green
Write-Host "   ✅ Production-level API responses" -ForegroundColor Green
Write-Host "   ✅ Same behavior as production" -ForegroundColor Green
