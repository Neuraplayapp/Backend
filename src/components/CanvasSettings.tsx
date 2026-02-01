import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, Grid, Eye, Code, Download, Layers, Zap } from 'lucide-react';

interface CanvasSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  canvasMode: 'design' | 'code' | 'data' | 'collab';
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  backgroundColor: string;
  autoSave: boolean;
  executionMode: 'sandboxed' | 'isolated' | 'live';
  collaborationEnabled: boolean;
  onSettingChange: (setting: string, value: any) => void;
}

const CanvasSettings: React.FC<CanvasSettingsProps> = ({
  isOpen,
  onClose,
  canvasMode,
  showGrid,
  gridSize,
  snapToGrid,
  backgroundColor,
  autoSave,
  executionMode,
  collaborationEnabled,
  onSettingChange
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'behavior' | 'execution' | 'collaboration'>('appearance');

  if (!isOpen) return null;

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      {/* Background Color */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-3">Background Color</label>
        <div className="grid grid-cols-4 gap-3">
          {['#1a1a1a', '#2d3748', '#1a202c', '#2a4365'].map((color) => (
            <button
              key={color}
              onClick={() => onSettingChange('backgroundColor', color)}
              style={{ backgroundColor: color }}
              className={`w-12 h-12 rounded-lg border-2 transition-all ${
                backgroundColor === color ? 'border-blue-500 scale-110' : 'border-gray-600 hover:border-gray-500'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Grid Settings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-gray-300 text-sm font-medium">Show Grid</label>
          <button
            onClick={() => onSettingChange('showGrid', !showGrid)}
            className={`w-12 h-6 rounded-full transition-colors ${
              showGrid ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              showGrid ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        {showGrid && (
          <div className="space-y-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Grid Size: {gridSize}px</label>
              <input
                type="range"
                min="10"
                max="50"
                value={gridSize}
                onChange={(e) => onSettingChange('gridSize', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none slider"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-gray-400 text-xs">Snap to Grid</label>
              <button
                onClick={() => onSettingChange('snapToGrid', !snapToGrid)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  snapToGrid ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  snapToGrid ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderBehaviorSettings = () => (
    <div className="space-y-6">
      {/* Auto Save */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-gray-300 text-sm font-medium">Auto Save</label>
          <p className="text-gray-400 text-xs mt-1">Automatically save canvas changes</p>
        </div>
        <button
          onClick={() => onSettingChange('autoSave', !autoSave)}
          className={`w-12 h-6 rounded-full transition-colors ${
            autoSave ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            autoSave ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Canvas Mode */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-3">Default Canvas Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { mode: 'design', label: 'Design', icon: <Palette size={14} /> },
            { mode: 'code', label: 'Code', icon: <Code size={14} /> },
            { mode: 'data', label: 'Data', icon: <Grid size={14} /> },
            { mode: 'collab', label: 'Collaboration', icon: <Layers size={14} /> }
          ].map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => onSettingChange('canvasMode', mode)}
              className={`p-3 rounded-lg border transition-all ${
                canvasMode === mode
                  ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderExecutionSettings = () => (
    <div className="space-y-6">
      {/* Execution Mode */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-3">Code Execution Mode</label>
        <div className="space-y-2">
          {[
            { mode: 'sandboxed', label: 'Sandboxed', desc: 'Safe, isolated execution' },
            { mode: 'isolated', label: 'Isolated', desc: 'Medium security, more features' },
            { mode: 'live', label: 'Live', desc: 'Full access, high risk' }
          ].map(({ mode, label, desc }) => (
            <label key={mode} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer">
              <input
                type="radio"
                name="executionMode"
                value={mode}
                checked={executionMode === mode}
                onChange={() => onSettingChange('executionMode', mode)}
                className="mt-1"
              />
              <div>
                <div className="text-gray-300 text-sm font-medium">{label}</div>
                <div className="text-gray-400 text-xs">{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Performance Settings */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-3">Performance</label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Enable Hardware Acceleration</span>
            <button className="w-10 h-5 bg-blue-600 rounded-full">
              <div className="w-4 h-4 bg-white rounded-full translate-x-5 transition-transform" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Optimize for Mobile</span>
            <button className="w-10 h-5 bg-gray-600 rounded-full">
              <div className="w-4 h-4 bg-white rounded-full translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCollaborationSettings = () => (
    <div className="space-y-6">
      {/* Collaboration Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-gray-300 text-sm font-medium">Enable Collaboration</label>
          <p className="text-gray-400 text-xs mt-1">Allow real-time collaboration with other users</p>
        </div>
        <button
          onClick={() => onSettingChange('collaborationEnabled', !collaborationEnabled)}
          className={`w-12 h-6 rounded-full transition-colors ${
            collaborationEnabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            collaborationEnabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {collaborationEnabled && (
        <div className="space-y-4">
          {/* Share Settings */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Share Link</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value="https://neura.play/canvas/abc123"
                readOnly
                className="flex-1 bg-gray-700 text-gray-300 border border-gray-600 rounded px-3 py-2 text-sm"
              />
              <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                Copy
              </button>
            </div>
          </div>

          {/* Permission Settings */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Default Permissions</label>
            <select className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded px-3 py-2 text-sm">
              <option>View Only</option>
              <option>Can Edit</option>
              <option>Can Manage</option>
            </select>
          </div>

          {/* Active Collaborators */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Active Collaborators</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-2 bg-gray-700/50 rounded">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  AI
                </div>
                <div>
                  <div className="text-gray-300 text-sm">AI Assistant</div>
                  <div className="text-gray-400 text-xs">Active now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="absolute right-0 top-0 bottom-0 w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Canvas Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {[
              { id: 'appearance', label: 'Style', icon: <Palette size={16} /> },
              { id: 'behavior', label: 'Behavior', icon: <Eye size={16} /> },
              { id: 'execution', label: 'Code', icon: <Zap size={16} /> },
              { id: 'collaboration', label: 'Collab', icon: <Layers size={16} /> }
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'appearance' && renderAppearanceSettings()}
            {activeTab === 'behavior' && renderBehaviorSettings()}
            {activeTab === 'execution' && renderExecutionSettings()}
            {activeTab === 'collaboration' && renderCollaborationSettings()}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-6">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CanvasSettings;
