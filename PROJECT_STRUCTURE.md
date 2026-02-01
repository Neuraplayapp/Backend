# 📁 NeuraPlay Project Structure

## 🎯 **Core Application**
```
src/                    # Main application source code
├── ai/                 # AI services & handlers
│   ├── handlers/       # Chat, Tool, Socratic, Agent handlers
│   └── intent/         # Intent analysis & NPU
├── components/         # React components
├── services/           # Core services & utilities
├── stores/             # State management (Zustand)
└── styles/             # CSS & styling

server.cjs              # Backend server
package.json            # Dependencies
vite.config.ts          # Frontend build config
tailwind.config.js      # Styling config
```

## 📚 **Documentation**
```
docs/                   # All documentation
├── guides/             # User & development guides
├── setup/              # Installation & deployment docs
├── technical/          # Technical architecture docs
└── reference/          # API references & specs
```

## 🔧 **Scripts & Automation**
```
scripts/
├── deployment/         # Deploy scripts (export, render, etc.)
├── development/        # Dev environment scripts
└── maintenance/        # Cleanup, fix scripts
```

## 🗂️ **Working Files**
```
temp/
├── reference/          # Working reference files from d50370e
├── working/            # Current work-in-progress files
└── backups/            # Project backups & archives
```

## 🌐 **Build & Deploy**
```
dist/                   # Built frontend assets
public/                 # Static public assets
routes/                 # Backend route definitions
services/               # Backend services
```

## ⚙️ **Configuration**
```
development.env         # Local development environment
production.env          # Production environment template
netlify.toml           # Netlify deployment config
render.yaml            # Render deployment config
Dockerfile             # Container configuration
```

---

## 🔍 **Key Files for Canvas System**

### **Current Implementation:**
- `src/components/SpartanCanvasRenderer.tsx` - Main canvas renderer
- `src/services/CanvasStateAdapter.ts` - Canvas state management
- `src/services/CoreTools.ts` - Tool definitions & document creation
- `src/ai/intent/IntentAnalysisService.ts` - Canvas activation detection

### **Working Reference (d50370e):**
- `temp/reference/reference_working_spartancanvas.tsx`
- `temp/reference/reference_working_canvasstateadapter.ts`
- `temp/reference/reference_working_coretools.ts`
- `temp/reference/reference_working_intentanalysis.ts`

---

## 🚀 **Quick Start**
```bash
# Development
npm run dev

# Build for Render
npm run build:render

# Start server
node server.cjs
```

