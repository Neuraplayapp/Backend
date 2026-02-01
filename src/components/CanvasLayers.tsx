import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, EyeOff, Lock, Unlock, MoreVertical, Plus, 
  ChevronDown, ChevronRight, Trash2, Copy, Edit3 
} from 'lucide-react';

interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  elements: string[]; // Element IDs in this layer
  type: 'design' | 'code' | 'data' | 'overlay';
}

interface CanvasLayersProps {
  isOpen: boolean;
  layers: CanvasLayer[];
  selectedLayer: string | null;
  onLayerSelect: (layerId: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerRename: (layerId: string, newName: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerCreate: (type: CanvasLayer['type']) => void;
  onLayerReorder: (draggedLayerId: string, targetLayerId: string, position: 'above' | 'below') => void;
}

const CanvasLayers: React.FC<CanvasLayersProps> = ({
  isOpen,
  layers,
  selectedLayer,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerOpacityChange,
  onLayerRename,
  onLayerDuplicate,
  onLayerDelete,
  onLayerCreate,
  onLayerReorder
}) => {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLayerExpand = (layerId: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  const handleStartEdit = (layer: CanvasLayer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleFinishEdit = () => {
    if (editingLayerId && editingName.trim()) {
      onLayerRename(editingLayerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setEditingLayerId(null);
      setEditingName('');
    }
  };

  const getLayerIcon = (type: CanvasLayer['type']) => {
    switch (type) {
      case 'design': return '🎨';
      case 'code': return '💻';
      case 'data': return '📊';
      case 'overlay': return '📋';
      default: return '📄';
    }
  };

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayer(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    if (draggedLayer && draggedLayer !== targetLayerId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const position = y < rect.height / 2 ? 'above' : 'below';
      onLayerReorder(draggedLayer, targetLayerId, position);
    }
    setDraggedLayer(null);
  };

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="absolute left-4 top-20 bottom-4 w-80 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden z-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold flex items-center space-x-2">
          <span>🗂️</span>
          <span>Layers</span>
        </h3>
        
        {/* Add Layer Button */}
        <div className="relative group">
          <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <Plus size={16} className="text-white" />
          </button>
          
          {/* Add Layer Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
            {[
              { type: 'design', label: 'Design Layer', icon: '🎨' },
              { type: 'code', label: 'Code Layer', icon: '💻' },
              { type: 'data', label: 'Data Layer', icon: '📊' },
              { type: 'overlay', label: 'Overlay Layer', icon: '📋' }
            ].map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => onLayerCreate(type as CanvasLayer['type'])}
                className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-300 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
              >
                <span>{icon}</span>
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <div className="text-4xl mb-2">🗂️</div>
            <div className="text-sm">No layers yet</div>
            <div className="text-xs mt-1 opacity-75">Click + to add your first layer</div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`group relative ${
                  draggedLayer === layer.id ? 'opacity-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, layer.id)}
              >
                {/* Layer Item */}
                <div
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selectedLayer === layer.id
                      ? 'bg-blue-600/30 border border-blue-500/50'
                      : 'hover:bg-gray-700/50'
                  }`}
                  onClick={() => onLayerSelect(layer.id)}
                >
                  {/* Expand/Collapse */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLayerExpand(layer.id);
                    }}
                    className="p-1 hover:bg-gray-600 rounded transition-colors"
                  >
                    {expandedLayers.has(layer.id) ? (
                      <ChevronDown size={12} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={12} className="text-gray-400" />
                    )}
                  </button>

                  {/* Layer Icon */}
                  <span className="text-sm">{getLayerIcon(layer.type)}</span>

                  {/* Layer Name */}
                  <div className="flex-1 min-w-0">
                    {editingLayerId === layer.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleFinishEdit}
                        onKeyDown={handleKeyPress}
                        className="w-full bg-gray-700 text-white text-sm px-2 py-1 rounded border-0 focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div className="text-gray-300 text-sm truncate">{layer.name}</div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-1">
                    {/* Visibility Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerToggleVisibility(layer.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                    >
                      {layer.visible ? (
                        <Eye size={14} className="text-gray-400" />
                      ) : (
                        <EyeOff size={14} className="text-gray-500" />
                      )}
                    </button>

                    {/* Lock Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerToggleLock(layer.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    >
                      {layer.locked ? (
                        <Lock size={14} className="text-gray-400" />
                      ) : (
                        <Unlock size={14} className="text-gray-400" />
                      )}
                    </button>

                    {/* More Options */}
                    <div className="relative group/menu">
                      <button className="p-1 hover:bg-gray-600 rounded transition-colors">
                        <MoreVertical size={14} className="text-gray-400" />
                      </button>
                      
                      {/* Context Menu */}
                      <div className="absolute top-full right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 group-hover/menu:opacity-100 transition-opacity z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(layer);
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 first:rounded-t-lg transition-colors"
                        >
                          <Edit3 size={12} />
                          <span className="text-xs">Rename</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerDuplicate(layer.id);
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          <Copy size={12} />
                          <span className="text-xs">Duplicate</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerDelete(layer.id);
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-400 hover:bg-gray-700 last:rounded-b-lg transition-colors"
                        >
                          <Trash2 size={12} />
                          <span className="text-xs">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Opacity Slider */}
                {expandedLayers.has(layer.id) && (
                  <div className="ml-8 mr-4 mt-2 mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-xs">Opacity:</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={layer.opacity}
                        onChange={(e) => onLayerOpacityChange(layer.id, parseInt(e.target.value))}
                        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none"
                      />
                      <span className="text-gray-400 text-xs w-8">{layer.opacity}%</span>
                    </div>
                  </div>
                )}

                {/* Elements in Layer */}
                {expandedLayers.has(layer.id) && layer.elements.length > 0 && (
                  <div className="ml-8 mr-4 mt-1 space-y-1">
                    {layer.elements.slice(0, 3).map((elementId) => (
                      <div
                        key={elementId}
                        className="flex items-center space-x-2 p-1 text-xs text-gray-400 hover:text-gray-300 cursor-pointer"
                      >
                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                        <span className="truncate">Element {elementId.slice(-8)}</span>
                      </div>
                    ))}
                    {layer.elements.length > 3 && (
                      <div className="text-xs text-gray-500 ml-4">
                        +{layer.elements.length - 3} more elements
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-gray-700 p-3">
        <div className="text-xs text-gray-400 space-y-1">
          <div>Total Layers: {layers.length}</div>
          <div>Visible: {layers.filter(l => l.visible).length}</div>
          <div>Elements: {layers.reduce((sum, l) => sum + l.elements.length, 0)}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default CanvasLayers;
