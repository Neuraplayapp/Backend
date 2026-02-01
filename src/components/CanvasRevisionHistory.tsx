/**
 * 🎯 Canvas Revision History
 * 
 * Timeline visualization of canvas element versions.
 * 
 * Features:
 * - Timeline view with version markers
 * - Expandable version cards
 * - Click to preview/restore
 * - Visual diff indicators
 * - Search through versions
 * - Export history
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RotateCcw, Download, Search, ChevronDown, ChevronUp, Check, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getUniversalCanvasService } from '../services/UniversalCanvasService';

interface CanvasRevisionHistoryProps {
  elementId: string;
  sessionId?: string;
  onRestore?: (versionId: string) => void;
}

const CanvasRevisionHistory: React.FC<CanvasRevisionHistoryProps> = ({
  elementId,
  sessionId,
  onRestore
}) => {
  const { isDarkMode } = useTheme();
  const canvasService = useMemo(() => getUniversalCanvasService(sessionId), [sessionId]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  
  // Get versions from service
  const versions = useMemo(() => {
    return canvasService.getVersions(elementId);
  }, [canvasService, elementId]);

  // Filter versions by search
  const filteredVersions = useMemo(() => {
    if (!searchQuery) return versions;
    
    return versions.filter(v =>
      v.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.request?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [versions, searchQuery]);

  const toggleVersion = (versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
  };

  const handleRestore = async (versionId: string) => {
    try {
      await canvasService.rollbackToVersion(elementId, versionId);
      if (onRestore) {
        onRestore(versionId);
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  const exportHistory = () => {
    const historyData = {
      elementId,
      versions: filteredVersions,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(historyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-history-${elementId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'frozen':
        return 'bg-blue-500';
      case 'displayed':
        return 'bg-green-500';
      case 'typing':
        return 'bg-yellow-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div
      className={`h-full flex flex-col ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Version History</h3>
          </div>
          <button
            onClick={exportHistory}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Export history"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search versions..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${
              isDarkMode
                ? 'bg-gray-900 border-gray-700 focus:border-purple-500'
                : 'bg-white border-gray-300 focus:border-purple-500'
            } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredVersions.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No versions match your search' : 'No version history yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredVersions.map((version, index) => {
                const isExpanded = expandedVersions.has(version.id);
                const isLatest = index === filteredVersions.length - 1;

                return (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative pl-6 ${index < filteredVersions.length - 1 ? 'pb-4' : ''}`}
                  >
                    {/* Timeline Line */}
                    {index < filteredVersions.length - 1 && (
                      <div
                        className={`absolute left-2 top-8 bottom-0 w-0.5 ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        }`}
                      />
                    )}

                    {/* Timeline Dot */}
                    <div
                      className={`absolute left-0 top-4 w-4 h-4 rounded-full border-2 ${
                        isLatest
                          ? 'bg-purple-500 border-purple-500'
                          : isDarkMode
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    />

                    {/* Version Card */}
                    <div
                      className={`rounded-lg border transition-all ${
                        isLatest
                          ? isDarkMode
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-purple-300 bg-purple-50'
                          : isDarkMode
                          ? 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {/* Card Header */}
                      <div
                        className="p-3 cursor-pointer"
                        onClick={() => toggleVersion(version.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold">
                                Version {version.version}
                              </span>
                              {isLatest && (
                                <span className="px-2 py-0.5 text-xs bg-purple-500 text-white rounded">
                                  Current
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 text-xs rounded ${getStateBadgeColor(version.state)}`}>
                                {version.state}
                              </span>
                            </div>
                            {version.request && (
                              <p
                                className={`text-xs truncate ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}
                              >
                                {version.request}
                              </p>
                            )}
                            <div
                              className={`flex items-center gap-1 mt-1 text-xs ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-500'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(version.timestamp)}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 flex-shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`border-t overflow-hidden ${
                              isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}
                          >
                            <div className="p-3">
                              {/* Content Preview */}
                              <pre
                                className={`text-xs whitespace-pre-wrap font-mono p-2 rounded max-h-40 overflow-y-auto ${
                                  isDarkMode ? 'bg-gray-900' : 'bg-white'
                                }`}
                              >
                                {version.content.length > 500
                                  ? version.content.substring(0, 500) + '...'
                                  : version.content}
                              </pre>

                              {/* Actions */}
                              {!isLatest && (
                                <div className="flex items-center gap-2 mt-3">
                                  <button
                                    onClick={() => handleRestore(version.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Restore
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasRevisionHistory;
