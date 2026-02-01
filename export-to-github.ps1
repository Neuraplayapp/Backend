# Export Full Workspace to GitHub Script
# This script exports the complete project workspace to GitHub

Write-Host "🚀 Starting full workspace export to GitHub..." -ForegroundColor Green

# Set Git path
$gitPath = "C:\Program Files\Git\bin\git.exe"

# Check if Git is available
if (-not (Test-Path $gitPath)) {
    Write-Host "❌ Git not found at $gitPath" -ForegroundColor Red
    Write-Host "Please install Git or update the path in this script" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Git found at: $gitPath" -ForegroundColor Green

# Initialize Git repository if not already done
if (-not (Test-Path ".git")) {
    Write-Host "📁 Initializing Git repository..." -ForegroundColor Yellow
    & $gitPath init
} else {
    Write-Host "✅ Git repository already initialized" -ForegroundColor Green
}

# Create comprehensive .gitignore
Write-Host "📝 Creating comprehensive .gitignore..." -ForegroundColor Yellow
@"
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs
dist/
build/
.next/
out/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Netlify
.netlify/

# Vercel
.vercel

# TypeScript
*.tsbuildinfo

# Optional: Exclude large media files if needed
# public/assets/Videos/
# public/assets/music/

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
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8

Write-Host "✅ .gitignore created" -ForegroundColor Green

# Add all files to Git
Write-Host "📦 Adding all files to Git..." -ForegroundColor Yellow
& $gitPath add .

# Check what files are staged
Write-Host "📋 Staged files:" -ForegroundColor Cyan
& $gitPath status --porcelain

# Create initial commit
Write-Host "💾 Creating initial commit..." -ForegroundColor Yellow
$commitMessage = "Initial commit: Full Neuraplay workspace export - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
& $gitPath commit -m $commitMessage

# Create README for GitHub
Write-Host "📖 Creating comprehensive README..." -ForegroundColor Yellow
@"
# Neuraplay - Interactive Learning Platform

## 🚀 Project Overview

Neuraplay is a comprehensive interactive learning platform featuring AI-powered educational games, cognitive training modules, and personalized learning experiences.

## 📁 Project Structure

\`\`\`
project/
├── src/                    # Main source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static assets
│   ├── assets/            # Images, videos, music
│   └── imports/           # Third-party game imports
├── netlify/               # Netlify functions
├── licensing/             # License information
└── docs/                  # Documentation files
\`\`\`

## 🎮 Features

- **AI-Powered Games**: Multiple educational games with AI assistance
- **Cognitive Training**: Memory, pattern matching, and inhibition games
- **Interactive Learning**: Dynamic content with real-time feedback
- **Responsive Design**: Works on desktop and mobile devices
- **Netlify Integration**: Serverless functions for AI features

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Deployment**: Netlify
- **AI Integration**: OpenAI-compatible APIs
- **Audio**: ElevenLabs integration

## 🚀 Quick Start

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Build for Production**
   \`\`\`bash
   npm run build
   \`\`\`

4. **Deploy to Netlify**
   \`\`\`bash
   npm run deploy
   \`\`\`

## 📚 Documentation

- [Technical Guide](TECHNICAL_GUIDE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Universal AI Agent](UNIVERSAL_AI_AGENT.md)
- [Game Integration Guides](docs/)

## 🎯 Key Components

### AI Games
- **Fuzzling**: Advanced pattern recognition
- **Counting Adventure**: Mathematical learning
- **Memory Sequence**: Cognitive training
- **The Cube**: 3D spatial reasoning
- **Crossroad Fun**: Decision making

### AI Features
- **Universal AI Agent**: Multi-purpose AI assistant
- **ElevenLabs Integration**: Text-to-speech capabilities
- **Dynamic Island**: iOS-style AI interface
- **Teaching Assistant**: Educational AI support

## 🔧 Configuration

### Environment Variables
Create a \`.env\` file with:
\`\`\`
VITE_OPENAI_API_KEY=your_openai_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
\`\`\`

### Netlify Functions
Serverless functions are located in \`netlify/functions/\`:
- \`api.cjs\`: Main API endpoint
- \`elevenlabs-websocket.cjs\`: Real-time audio
- \`openai-compatible.cjs\`: AI integration

## 📦 Build Scripts

- \`npm run dev\`: Start development server
- \`npm run build\`: Build for production
- \`npm run preview\`: Preview production build
- \`npm run deploy\`: Deploy to Netlify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](licensing/neuraplay.txt) file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- ElevenLabs for text-to-speech
- Netlify for hosting and serverless functions
- React and TypeScript communities

---

**Last Updated**: $(Get-Date -Format 'yyyy-MM-dd')
**Version**: 4.0
**Status**: Active Development
"@ | Out-File -FilePath "README.md" -Encoding UTF8

Write-Host "✅ README created" -ForegroundColor Green

# Create GitHub repository setup instructions
Write-Host "📋 Creating GitHub setup instructions..." -ForegroundColor Yellow
$setupContent = @"
# GitHub Repository Setup Instructions

## 🚀 To push this project to GitHub:

1. Create a new repository on GitHub
   - Go to https://github.com/new
   - Choose a repository name (e.g., 'neuraplay-workspace')
   - Make it public or private as preferred
   - Don't initialize with README (we already have one)

2. Add the remote origin
   \`\`\`bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   \`\`\`

3. Push to GitHub
   \`\`\`bash
   git branch -M main
   git push -u origin main
   \`\`\`

4. Verify the upload
   - Check your GitHub repository
   - All files should be visible
   - The README should display properly

## 📁 What's included in this export:

✅ Complete source code (src/ directory)
✅ All assets (public/assets/)
✅ Configuration files (package.json, vite.config.ts, etc.)
✅ Documentation (all .md files)
✅ Netlify functions (netlify/ directory)
✅ Licensing information (licensing/ directory)
✅ Build scripts (deployment scripts)
✅ Third-party games (public/imports/)

## 🔧 Post-upload setup:

1. Install dependencies: \`npm install\`
2. Set up environment variables in your deployment platform
3. Configure Netlify for serverless functions
4. Test the application: \`npm run dev\`

## 📊 Repository Statistics:
- Total files: $(Get-ChildItem -Recurse -File | Measure-Object | Select-Object -ExpandProperty Count)
- Total size: $([math]::Round((Get-ChildItem -Recurse -File | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum) / 1MB, 2)) MB
- Main directories: $(Get-ChildItem -Directory | Select-Object -ExpandProperty Name -Join ', ')

---
*Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')*
"@
$setupContent | Out-File -FilePath "GITHUB_SETUP.md" -Encoding UTF8

Write-Host "✅ GitHub setup instructions created" -ForegroundColor Green

# Show repository status
Write-Host "📊 Repository Status:" -ForegroundColor Cyan
& $gitPath log --oneline -1
& $gitPath status

Write-Host ""
Write-Host "🎉 Full workspace export completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Create a new repository on GitHub" -ForegroundColor White
Write-Host "2. Add remote: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git" -ForegroundColor White
Write-Host "3. Push: git push -u origin main" -ForegroundColor White
Write-Host "4. Check GITHUB_SETUP.md for detailed instructions" -ForegroundColor White
Write-Host ""
Write-Host "📁 Files ready for GitHub:" -ForegroundColor Cyan
Write-Host "- Complete source code" -ForegroundColor White
Write-Host "- All assets and media" -ForegroundColor White
Write-Host "- Configuration files" -ForegroundColor White
Write-Host "- Documentation" -ForegroundColor White
Write-Host "- Netlify functions" -ForegroundColor White
Write-Host "- Third-party integrations" -ForegroundColor White 