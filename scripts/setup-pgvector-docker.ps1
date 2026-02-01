# 🐳 PostgreSQL + pgvector Docker Setup Script for NeuraPlay
# This script sets up a complete PostgreSQL database with pgvector extension

Write-Host "🚀 Setting up PostgreSQL with pgvector for NeuraPlay..." -ForegroundColor Green

# Check if Docker is available
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "💡 Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Stop and remove existing container if it exists
Write-Host "🧹 Cleaning up existing containers..." -ForegroundColor Yellow
docker stop neuraplay-postgres 2>$null
docker rm neuraplay-postgres 2>$null

# Create Docker network for NeuraPlay if it doesn't exist
docker network create neuraplay-network 2>$null

# Run PostgreSQL with pgvector
Write-Host "🐘 Starting PostgreSQL container with pgvector..." -ForegroundColor Cyan
docker run --name neuraplay-postgres `
  --network neuraplay-network `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=1332 `
  -e POSTGRES_DB=neuraplay `
  -p 5432:5432 `
  -d pgvector/pgvector:pg15

# Wait for PostgreSQL to start
Write-Host "⏳ Waiting for PostgreSQL to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test connection
Write-Host "🔍 Testing database connection..." -ForegroundColor Cyan
$maxAttempts = 10
$attempt = 1

do {
    try {
        docker exec neuraplay-postgres psql -U postgres -d neuraplay -c "SELECT version();" | Out-Null
        Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
        $connected = $true
        break
    } catch {
        Write-Host "⏳ Attempt $attempt/$maxAttempts - PostgreSQL not ready yet..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        $attempt++
    }
} while ($attempt -le $maxAttempts)

if (-not $connected) {
    Write-Host "❌ Failed to connect to PostgreSQL after $maxAttempts attempts" -ForegroundColor Red
    exit 1
}

# Install pgvector extension
Write-Host "🔍 Installing pgvector extension..." -ForegroundColor Cyan
try {
    docker exec neuraplay-postgres psql -U postgres -d neuraplay -c "CREATE EXTENSION IF NOT EXISTS vector;"
    Write-Host "✅ pgvector extension installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install pgvector extension" -ForegroundColor Red
    exit 1
}

# Test vector operations
Write-Host "🧪 Testing vector operations..." -ForegroundColor Cyan
try {
    docker exec neuraplay-postgres psql -U postgres -d neuraplay -c "
        CREATE TEMPORARY TABLE test_vectors (id int, embedding vector(3));
        INSERT INTO test_vectors VALUES (1, '[1,2,3]'), (2, '[4,5,6]');
        SELECT id, embedding, embedding <-> '[1,1,1]' as distance FROM test_vectors ORDER BY distance;
        DROP TABLE test_vectors;
    "
    Write-Host "✅ Vector operations working perfectly!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Vector test failed, but extension might still work" -ForegroundColor Yellow
}

# Update development.env
Write-Host "📝 Updating development.env..." -ForegroundColor Cyan
$envFile = "development.env"
if (Test-Path $envFile) {
    # Read current content
    $content = Get-Content $envFile -Raw
    
    # Update database URLs to point to Docker container
    $content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=postgresql://postgres:1332@127.0.0.1:5432/neuraplay"
    $content = $content -replace "VECTOR_DB_URL=.*", "VECTOR_DB_URL=postgresql://postgres:1332@127.0.0.1:5432/neuraplay"
    
    # Write back to file
    $content | Set-Content $envFile -NoNewline
    Write-Host "✅ development.env updated with Docker database URLs" -ForegroundColor Green
} else {
    Write-Host "⚠️ development.env not found, please update DATABASE_URL manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 PostgreSQL + pgvector setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Connection Details:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: 5432" -ForegroundColor White
Write-Host "   Database: neuraplay" -ForegroundColor White
Write-Host "   Username: postgres" -ForegroundColor White
Write-Host "   Password: 1332" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "   Start:  docker start neuraplay-postgres" -ForegroundColor White
Write-Host "   Stop:   docker stop neuraplay-postgres" -ForegroundColor White
Write-Host "   Logs:   docker logs neuraplay-postgres" -ForegroundColor White
Write-Host "   Shell:  docker exec -it neuraplay-postgres psql -U postgres -d neuraplay" -ForegroundColor White
Write-Host ""
Write-Host "✅ Ready to run: node server.cjs" -ForegroundColor Green
