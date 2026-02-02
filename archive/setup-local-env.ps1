# NeuraPlay Local Development Environment Setup
# Run this before starting your local server

Write-Host "🔧 Setting up NeuraPlay local environment..." -ForegroundColor Green

# Replace 'your_password' with your actual PostgreSQL password
$env:DATABASE_URL = "postgresql://postgres:1332@127.0.0.1:5432/neuraplay"

# Redis (using your cloud Redis)
$env:REDIS_URL = "redis://default:9sLmSd2xfwNQR4ahq73HIwQz8eAOUevo@redis-11699.c16.us-east-1-2.ec2.redns.redis-cloud.com:11699"

# Development settings
$env:NODE_ENV = "development"
$env:LEGACY_ROUTES = "true"
$env:PORT = "3000"

# Optional: Add PostgreSQL to PATH for this session
$env:PATH += ";C:\Program Files\PostgreSQL\17\bin"

Write-Host "✅ Environment configured for local development" -ForegroundColor Green
Write-Host "📊 Database: Local PostgreSQL (127.0.0.1:5432)" -ForegroundColor Cyan
Write-Host "🔥 Cache: Redis Cloud" -ForegroundColor Cyan
Write-Host "🚀 Ready to start server with: node server-new.cjs" -ForegroundColor Yellow

# Show current settings
Write-Host "`n📋 Current Environment:" -ForegroundColor Magenta
Write-Host "   DATABASE_URL: $($env:DATABASE_URL)" -ForegroundColor Gray
Write-Host "   NODE_ENV: $($env:NODE_ENV)" -ForegroundColor Gray
Write-Host "   REDIS_URL: redis://***:***@redis-11699.c16.us-east-1-2.ec2.redns.redis-cloud.com:11699" -ForegroundColor Gray

