/**
 * 🎯 NeuraPlay Chart Canvas
 * 
 * Interactive chart canvas with ECharts integration.
 * 
 * Features:
 * - Multiple chart types (bar, line, pie, scatter, etc.)
 * - Data editing interface
 * - Export as image/data
 * - Uses existing ChartRenderer
 * - Version history for data changes
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, Maximize2, Minimize2, Download, BarChart3, Edit3, Save, Plus, Trash2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { type CanvasElement } from '../stores/canvasStore';
import { chartDataService, type ChartType, type ChartDataPoint } from '../services/ChartDataService';
import { getUniversalCanvasService } from '../services/UniversalCanvasService';
import { canvasAccessTracker } from '../services/CanvasAccessTracker';
// Use full echarts import to include all required components (core-only requires manual renderer registration)
import * as echarts from 'echarts';

interface NeuraPlayChartCanvasProps {
  element: CanvasElement;
  conversationId: string;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const NeuraPlayChartCanvas: React.FC<NeuraPlayChartCanvasProps> = ({
  element,
  conversationId,
  onClose,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const { isDarkMode } = useTheme();
  const canvasService = useMemo(() => getUniversalCanvasService(conversationId), [conversationId]);
  const chartRef = useRef<HTMLDivElement>(null);
  const echartsInstance = useRef<echarts.EChartsType | null>(null);

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartTitle, setChartTitle] = useState('Chart');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // DEFENSIVE GUARD: Check if element/content is valid (after all hooks)
  const isValidElement = element && element.content !== undefined && element.content !== null;

  // 🎯 TRACK CANVAS ACCESS: Record when this chart is viewed
  useEffect(() => {
    if (element && conversationId) {
      canvasAccessTracker.trackAccess(element, conversationId);
      console.log('👁️ Chart canvas viewed:', element.content?.title || 'Chart');
    }
  }, [element?.id, conversationId]);

  // Initialize chart data
  useEffect(() => {
    // Guard against undefined content
    if (!isValidElement) {
      console.warn('[ChartCanvas] Skipping initialization - element/content invalid');
      return;
    }
    
    try {
      const content = typeof element.content === 'string'
        ? JSON.parse(element.content)
        : element.content;

      if (content) {
        setChartType(content.chartType || 'bar');
        setChartTitle(content.title || 'Chart');
        
        if (content.series && Array.isArray(content.series)) {
          setChartData(content.series);
        } else {
          // Generate sample data
          setChartData(chartDataService.generateSampleData(content.chartType || 'bar'));
        }
      }
    } catch (error) {
      console.error('Failed to parse chart data:', error);
      setChartData(chartDataService.generateSampleData('bar'));
    }
  }, [element?.content, isValidElement]);

  // Initialize ECharts
  useEffect(() => {
    if (!chartRef.current) return;

    if (!echartsInstance.current) {
      echartsInstance.current = echarts.init(chartRef.current, isDarkMode ? 'dark' : undefined);
    }

    return () => {
      echartsInstance.current?.dispose();
      echartsInstance.current = null;
    };
  }, []);

  // Update chart when data changes
  useEffect(() => {
    if (!echartsInstance.current || chartData.length === 0) return;

    const option = chartDataService.transformForECharts(chartData, chartType);
    option.title = { text: chartTitle, left: 'center', textStyle: { color: isDarkMode ? '#ffffff' : '#000000' } };

    echartsInstance.current.setOption(option, true);
  }, [chartData, chartType, chartTitle, isDarkMode]);

  // Resize chart on window resize
  useEffect(() => {
    const handleResize = () => {
      echartsInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const chartContent = JSON.stringify({
        type: 'chart',
        chartType,
        title: chartTitle,
        series: chartData
      });

      await canvasService.addVersion(element.id, chartContent, 'Chart data update');
      setEditMode(false);
      console.log('✅ Chart saved');
    } catch (error) {
      console.error('Failed to save chart:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportImage = () => {
    if (!echartsInstance.current) return;

    const url = echartsInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
    });

    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartTitle.replace(/\s+/g, '_')}_${Date.now()}.png`;
    a.click();
  };

  const handleExportData = () => {
    const csv = chartDataService.exportAsCSV(chartData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartTitle.replace(/\s+/g, '_')}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddDataPoint = () => {
    setChartData(prev => [
      ...prev,
      { label: `Item ${prev.length + 1}`, value: Math.floor(Math.random() * 100) }
    ]);
  };

  const handleRemoveDataPoint = (index: number) => {
    setChartData(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDataPoint = (index: number, field: keyof ChartDataPoint, value: any) => {
    setChartData(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'bar', label: 'Bar' },
    { value: 'line', label: 'Line' },
    { value: 'pie', label: 'Pie' },
    { value: 'scatter', label: 'Scatter' },
    { value: 'histogram', label: 'Histogram' }
  ];

  // DEFENSIVE GUARD: Show loading state if element is not ready
  if (!isValidElement) {
    return (
      <div className={`flex items-center justify-center h-64 rounded-lg ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm opacity-70">Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}
        ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
        rounded-lg shadow-2xl overflow-hidden
        flex flex-col
      `}
      style={{
        maxHeight: isFullscreen ? '100vh' : '80vh'
      }}
    >
      {/* Header */}
      <div className={`
        flex items-center justify-between px-6 py-4 border-b
        ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
      `}>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <div>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              className={`text-lg font-semibold bg-transparent border-none focus:outline-none ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
              placeholder="Chart Title"
            />
            <p className="text-sm opacity-70">
              {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart • {chartData.length} data points
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 focus:border-blue-500'
                : 'bg-white border-gray-300 focus:border-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          >
            {chartTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Edit Button */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`
              p-2 rounded-lg transition-colors
              ${editMode ? 'bg-blue-500 text-white' : 'hover:bg-blue-500/10'}
            `}
            title="Edit data"
          >
            <Edit3 className="w-5 h-5" />
          </button>

          {/* Save Button */}
          {editMode && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
              title="Save"
            >
              <Save className={`w-5 h-5 ${saving ? 'animate-pulse' : ''}`} />
            </button>
          )}
          
          {/* Export */}
          <div className="relative group">
            <button
              className="p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
              title="Export"
            >
              <Download className="w-5 h-5" />
            </button>
            <div className={`
              absolute right-0 top-full mt-2 w-40 rounded-lg shadow-lg overflow-hidden
              opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all
              ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
            `}>
              <button
                onClick={handleExportImage}
                className={`
                  w-full px-4 py-2 text-left text-sm hover:bg-blue-500/10 transition-colors
                `}
              >
                Export as PNG
              </button>
              <button
                onClick={handleExportData}
                className={`
                  w-full px-4 py-2 text-left text-sm hover:bg-blue-500/10 transition-colors
                `}
              >
                Export as CSV
              </button>
            </div>
          </div>
          
          {/* Fullscreen toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          )}
          
          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart */}
        <div className="flex-1 p-4">
          <div
            ref={chartRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Data Editor */}
        {editMode && (
          <div className={`
            w-80 border-l overflow-y-auto
            ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
          `}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Data Points</h3>
                <button
                  onClick={handleAddDataPoint}
                  className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  title="Add data point"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {chartData.map((point, index) => (
                  <div
                    key={index}
                    className={`
                      p-3 rounded-lg border
                      ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Point {index + 1}</span>
                      <button
                        onClick={() => handleRemoveDataPoint(index)}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={point.label || ''}
                        onChange={(e) => handleUpdateDataPoint(index, 'label', e.target.value)}
                        placeholder="Label"
                        className={`
                          w-full px-2 py-1 text-sm rounded border
                          ${isDarkMode
                            ? 'bg-gray-800 border-gray-700 focus:border-blue-500'
                            : 'bg-white border-gray-300 focus:border-blue-500'
                          }
                          focus:outline-none focus:ring-2 focus:ring-blue-500/20
                        `}
                      />
                      <input
                        type="number"
                        value={point.value || 0}
                        onChange={(e) => handleUpdateDataPoint(index, 'value', parseFloat(e.target.value))}
                        placeholder="Value"
                        className={`
                          w-full px-2 py-1 text-sm rounded border
                          ${isDarkMode
                            ? 'bg-gray-800 border-gray-700 focus:border-blue-500'
                            : 'bg-white border-gray-300 focus:border-blue-500'
                          }
                          focus:outline-none focus:ring-2 focus:ring-blue-500/20
                        `}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={`
        flex items-center justify-between px-6 py-3 border-t
        ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
      `}>
        <div className="text-sm opacity-70">
          📊 ECharts • Interactive Visualization
        </div>
        
        {editMode && (
          <div className="text-sm opacity-50">
            Click Save to apply changes
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NeuraPlayChartCanvas;

