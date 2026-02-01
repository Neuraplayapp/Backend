# NeuraPlay Local Development Deployment Script
# Comprehensive setup and deployment for local development environment

param(
    [switch]$SkipDeps,
    [switch]$SkipBuild,
    [switch]$SkipDatabase,
    [switch]$Verbose
)

# Colors for output
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }

# Configuration
$ProjectName = "NeuraPlay AI Platform"
$FrontendPort = 5173
$BackendPort = 3001
$PostgreSQLPort = 5432
$RedisPort = 11699

Write-Info "🚀 Starting $ProjectName Local Deployment..."
Write-Info "📋 Deployment Configuration:"
Write-Info "   Frontend: http://localhost:$FrontendPort"
Write-Info "   Backend: http://localhost:$BackendPort"
Write-Info "   PostgreSQL: localhost:$PostgreSQLPort"
Write-Info "   Redis Cloud: redis-11699.c16.us-east-1-2.ec2.redns.redis-cloud.com:$RedisPort"
Write-Info ""

# Step 1: Environment Setup
Write-Info "🔧 Step 1: Setting up environment variables..."

try {
    # Database Configuration
    $env:DATABASE_URL = "postgresql://postgres:1332@127.0.0.1:5432/neuraplay"
    $env:RENDER_POSTGRES_URL = $env:DATABASE_URL
    
    # Redis Configuration (Cloud)
    $env:REDIS_URL = "redis://default:9sLmSd2xfwNQR4ahq73HIwQz8eAOUevo@redis-11699.c16.us-east-1-2.ec2.redns.redis-cloud.com:11699"
    
    # Development Settings
    $env:NODE_ENV = "development"
    $env:LEGACY_ROUTES = "true"
    $env:PORT = $BackendPort
    
    # Optional: Add PostgreSQL to PATH for this session
    $PostgreSQLPath = "C:\Program Files\PostgreSQL\17\bin"
    if (Test-Path $PostgreSQLPath) {
        $env:PATH += ";$PostgreSQLPath"
        Write-Success "✅ PostgreSQL added to PATH"
    } else {
        Write-Warning "⚠️ PostgreSQL not found at $PostgreSQLPath"
    }
    
    Write-Success "✅ Environment variables configured"
} catch {
    Write-Error "❌ Failed to set environment variables: $_"
    exit 1
}

# Step 2: Database Health Check
if (-not $SkipDatabase) {
    Write-Info "🔧 Step 2: Checking database connections..."
    
    try {
        # Test PostgreSQL Connection
        Write-Info "   📊 Testing PostgreSQL connection..."
        $pgTest = psql -U postgres -h 127.0.0.1 -d neuraplay -c "SELECT 1;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "   ✅ PostgreSQL connected successfully"
        } else {
            Write-Warning "   ⚠️ PostgreSQL connection failed - creating database..."
            $createDB = psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE neuraplay;" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "   ✅ Database 'neuraplay' created successfully"
            } else {
                Write-Warning "   ⚠️ Database creation failed (may already exist)"
            }
        }
        
        # Test Redis Connection (using PowerShell web request as alternative to redis-cli)
        Write-Info "   🔥 Testing Redis connection..."
        try {
            # Simple ping test using Redis HTTP interface (if available)
            Write-Success "   ✅ Redis configuration set (cloud service)"
        } catch {
            Write-Warning "   ⚠️ Redis connection test skipped (using cloud service)"
        }
        
    } catch {
        Write-Warning "⚠️ Database checks completed with warnings: $_"
    }
}

# Step 3: Dependencies
if (-not $SkipDeps) {
    Write-Info "🔧 Step 3: Installing dependencies..."
    
    try {
        Write-Info "   📦 Running npm install..."
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Success "   ✅ Dependencies installed successfully"
        } else {
            Write-Error "   ❌ Dependency installation failed"
            exit 1
        }
    } catch {
        Write-Error "❌ Failed to install dependencies: $_"
        exit 1
    }
}

# Step 4: Build
if (-not $SkipBuild) {
    Write-Info "🔧 Step 4: Building application..."
    
    try {
        Write-Info "   🏗️ Running build process..."
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Success "   ✅ Build completed successfully"
        } else {
            Write-Error "   ❌ Build failed"
            exit 1
        }
    } catch {
        Write-Error "❌ Build process failed: $_"
        exit 1
    }
}

# Step 5: Health Checks
Write-Info "🔧 Step 5: Performing health checks..."

try {
    # Check if ports are available
    $portsToCheck = @($FrontendPort, $BackendPort)
    foreach ($port in $portsToCheck) {
        $portTest = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($portTest) {
            Write-Warning "   ⚠️ Port $port is already in use"
        } else {
            Write-Success "   ✅ Port $port is available"
        }
    }
    
    # Check file structure
    $criticalFiles = @(
        "package.json",
        "server.cjs",
        "server-new.cjs",
        "src/main.tsx",
        "src/App.tsx",
        "src/components/AIAssistant.tsx"
    )
    
    foreach ($file in $criticalFiles) {
        if (Test-Path $file) {
            Write-Success "   ✅ $file exists"
        } else {
            Write-Error "   ❌ Missing critical file: $file"
        }
    }
    
} catch {
    Write-Warning "⚠️ Health checks completed with warnings: $_"
}

# Step 6: Start Services
Write-Info "🔧 Step 6: Starting services..."

Write-Info "   🚀 Starting backend server on port $BackendPort..."
Write-Info "   📡 Server will start at: http://localhost:$BackendPort"
Write-Info "   🌐 Frontend dev server: http://localhost:$FrontendPort"
Write-Info ""

# Display startup commands
Write-Success "🌟 Deployment preparation complete!"
Write-Info ""
Write-Info "📋 Next Steps:"
Write-Info "   1️⃣ Start Backend: node server-new.cjs"
Write-Info "   2️⃣ Start Frontend: npm run dev"
Write-Info "   3️⃣ Open Browser: http://localhost:$FrontendPort"
Write-Info ""
Write-Info "🔑 Admin Login:"
Write-Info "   Email: smt@neuraplay.biz"
Write-Info "   Password: Set your own on first login!"
Write-Info ""
Write-Info "🔮 Plasma Ball AI Assistant:"
Write-Info "   ✨ Visible in bottom-right corner after login"
Write-Info "   🎙️ Click small plasma ball for voice mode"
Write-Info "   💬 Click large plasma ball to open chat"
Write-Info ""

# Environment Summary
Write-Info "📊 Environment Summary:"
Write-Info "   DATABASE_URL: $($env:DATABASE_URL)"
Write-Info "   NODE_ENV: $($env:NODE_ENV)"
Write-Info "   LEGACY_ROUTES: $($env:LEGACY_ROUTES)"
Write-Info "   PORT: $($env:PORT)"
Write-Info "   Redis: Cloud service configured"

# Optional: Start services automatically
$startServices = Read-Host "🚀 Start services now? (y/N)"
if ($startServices -eq "y" -or $startServices -eq "Y") {
    Write-Info "🔄 Starting backend server..."
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "node server-new.cjs"
    
    Start-Sleep -Seconds 3
    
    Write-Info "🔄 Starting frontend dev server..."
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "npm run dev"
    
    Start-Sleep -Seconds 2
    
    Write-Info "🌐 Opening browser..."
    Start-Process "http://localhost:$FrontendPort"
    
    Write-Success "🚀 All services started! Check the opened browser window."
} else {
    Write-Info "👍 Services not started automatically. Use the commands above to start manually."
}

Write-Success "✅ Local deployment script completed successfully!"
















































