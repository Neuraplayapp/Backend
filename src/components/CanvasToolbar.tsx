import React from 'react';
import { 
  Play, Pause, Save, Download, Code, Zap, MessageSquare, 
  Settings, Layers, Grid, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut 
} from 'lucide-react';

interface CanvasToolbarProps {
  canvasMode: 'design' | 'code' | 'data' | 'collab';
  isExecuting: boolean;
  showGrid: boolean;
  showLayers: boolean;
  zoomLevel: number;
  onModeChange: (mode: 'design' | 'code' | 'data' | 'collab') => void;
  onExecute: () => void;
  onStop: () => void;
  onSave: () => void;
  onExport: () => void;
  onGridToggle: () => void;
  onLayersToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onAddChart: () => void;
  onAddDocument: () => void;
  onAddCode: () => void;
  onSettings: () => void;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  canvasMode,
  isExecuting,
  showGrid,
  showLayers,
  zoomLevel,
  onModeChange,
  onExecute,
  onStop,
  onSave,
  onExport,
  onGridToggle,
  onLayersToggle,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onAddChart,
  onAddDocument,
  onAddCode,
  onSettings
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
      {/* Left Section - Mode Controls */}
      <div className="flex items-center space-x-2">
        {/* Canvas Mode Selector */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          {['design', 'code', 'data', 'collab'].map((mode) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode as any)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                canvasMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Execution Controls */}
        <div className="flex items-center space-x-1 border-l border-gray-600 pl-3">
          <button
            onClick={isExecuting ? onStop : onExecute}
            className={`p-2 rounded transition-colors ${
              isExecuting
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            title={isExecuting ? 'Stop Execution' : 'Execute Canvas'}
          >
            {isExecuting ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <button
            onClick={onSave}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded text-white transition-colors"
            title="Save Canvas"
          >
            <Save size={16} />
          </button>
          
          <button
            onClick={onExport}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded text-white transition-colors"
            title="Export Canvas"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Center Section - Quick Add Tools */}
      <div className="flex items-center space-x-2">
        <span className="text-gray-400 text-sm font-medium">Quick Add:</span>
        
        <button
          onClick={onAddChart}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
          title="Add Chart"
        >
          📊
        </button>
        
        <button
          onClick={onAddDocument}
          className="p-2 bg-purple-600 hover:bg-purple-700 rounded text-white transition-colors"
          title="Add Document"
        >
          📄
        </button>
        
        <button
          onClick={onAddCode}
          className="p-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
          title="Add Code Block"
        >
          <Code size={16} />
        </button>
        
        <button
          className="p-2 bg-orange-600 hover:bg-orange-700 rounded text-white transition-colors"
          title="AI Generate"
        >
          <Zap size={16} />
        </button>
        
        <button
          className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white transition-colors"
          title="Assistant Chat"
        >
          <MessageSquare size={16} />
        </button>
      </div>

      {/* Right Section - View Controls */}
      <div className="flex items-center space-x-2">
        {/* View Controls */}
        <div className="flex items-center space-x-1 border-r border-gray-600 pr-3">
          <button
            onClick={onGridToggle}
            className={`p-2 rounded transition-colors ${
              showGrid 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Toggle Grid"
          >
            <Grid size={16} />
          </button>
          
          <button
            onClick={onLayersToggle}
            className={`p-2 rounded transition-colors ${
              showLayers 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Toggle Layers Panel"
          >
            <Layers size={16} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onZoomOut}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          
          <button
            onClick={onZoomReset}
            className="px-3 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Reset Zoom"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          
          <button
            onClick={onZoomIn}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Settings */}
        <button
          onClick={onSettings}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Canvas Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};

export default CanvasToolbar;
