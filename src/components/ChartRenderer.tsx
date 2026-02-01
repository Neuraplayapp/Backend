import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as echarts from 'echarts/core';
import { BarChart as EBarChart, LineChart as ELineChart, PieChart as EPieChart, ScatterChart as EScatterChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';

// Register ECharts components
echarts.use([TitleComponent, TooltipComponent, GridComponent, LegendComponent, EBarChart, ELineChart, EPieChart, EScatterChart, CanvasRenderer]);

interface ChartRendererProps {
  chartData: {
    type: 'chart';
    title: string;
    chartType: string;
    series: any;
    config: any;
    style?: string;
    description?: string;
    library?: 'plotly' | 'chartjs' | 'd3';
  };
  position: { x: number; y: number };
  size: { width: number; height: number };
  isSelected: boolean;
  onClick: (e: any) => void;
  onDragEnd: (e: any) => void;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  chartData,
  position,
  size,
  isSelected,
  onClick,
  onDragEnd
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<Konva.Group>(null);
  const echartsRef = useRef<echarts.EChartsType | null>(null);
  const [initReady, setInitReady] = useState(false);

  // Delay init by a frame to avoid mounting during flip
  useEffect(() => {
    requestAnimationFrame(() => setInitReady(true));
  }, []);

  // Imperative Plotly render into container
  // ECharts init / dispose
  useEffect(() => {
    if (!initReady || !chartRef.current) return;
    try {
      if (!echartsRef.current) {
        echartsRef.current = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
      }
    } catch (e) {
      console.error('ECharts init failed', e);
      return;
    }
    return () => {
      try { echartsRef.current?.dispose(); } catch {}
      echartsRef.current = null;
    };
  }, [initReady]);

  // Update on data/layout changes
  // Build ECharts option
  const safeSeries = useMemo(() => {
    const raw = Array.isArray(chartData.series) ? chartData.series : [];
    return raw.length ? raw : [ { label: 'A', value: 10 }, { label: 'B', value: 20 }, { label: 'C', value: 15 } ];
  }, [chartData.series]);

  const option = useMemo(() => {
    const labels = safeSeries.map((s: any, i: number) => s?.label ?? s?.x ?? `Item ${i+1}`);
    const values = safeSeries.map((s: any) => s?.value ?? s?.y ?? Number(s ?? 0));
    const common: any = {
      title: { text: chartData.title, left: 'center', textStyle: { color: '#ffffff', fontSize: 14 } },
      tooltip: { trigger: chartData.chartType === 'pie' ? 'item' : 'axis' },
      legend: { top: 24, textStyle: { color: '#ffffff' } },
      grid: { left: 40, right: 20, top: 50, bottom: 40 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#9ca3af' }, axisLine: { lineStyle: { color: '#374151' } }, splitLine: { lineStyle: { color: '#374151' } } },
      yAxis: { type: 'value', axisLabel: { color: '#9ca3af' }, axisLine: { lineStyle: { color: '#374151' } }, splitLine: { lineStyle: { color: '#374151' } } }
    };
    switch (chartData.chartType) {
      case 'line':
        return { ...common, series: [{ type: 'line', data: values, smooth: true }] };
      case 'pie':
        return { ...common, xAxis: undefined, yAxis: undefined, series: [{ type: 'pie', radius: '60%', data: labels.map((l: any, idx: number) => ({ name: l, value: values[idx] })) }] };
      case 'scatter':
        return { ...common, series: [{ type: 'scatter', data: safeSeries.map((s: any, i: number) => [s?.x ?? i, s?.y ?? s?.value ?? 0]) }] };
      case 'histogram':
        return { ...common, series: [{ type: 'bar', data: values }] };
      default:
        return { ...common, series: [{ type: 'bar', data: values }] };
    }
  }, [chartData.title, chartData.chartType, safeSeries]);

  useEffect(() => {
    if (!echartsRef.current) return;
    try { echartsRef.current.setOption(option, true); } catch (e) { console.error('ECharts setOption failed', e); }
  }, [option]);

  // Chart.js fallback data
  const chartJsData = useMemo(() => {
    if (!chartData.series) return null;

    try {
      const { chartType, series, title } = chartData;
      
      switch (chartType) {
        case 'bar':
          return {
            labels: series.map((item: any, index: number) => item.label || `Item ${index + 1}`),
            datasets: [{
              label: title,
              data: series.map((item: any) => item.value || item.y || item || 0),
              backgroundColor: '#4f46e5',
              borderColor: '#3730a3',
              borderWidth: 1
            }]
          };
        case 'line':
          return {
            labels: series.map((item: any, index: number) => item.label || index),
            datasets: [{
              label: title,
              data: series.map((item: any) => item.value || item.y || item || 0),
              fill: false,
              borderColor: '#10b981',
              backgroundColor: '#10b981',
              tension: 0.1
            }]
          };
        case 'pie':
          return {
            labels: series.map((item: any, index: number) => item.label || `Slice ${index + 1}`),
            datasets: [{
              data: series.map((item: any) => Math.abs(item.value || item || 1)),
              backgroundColor: [
                '#4f46e5', '#10b981', '#f59e0b', '#ef4444', 
                '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
              ]
            }]
          };
        default:
          return {
            labels: series.map((_: any, i: number) => `Item ${i + 1}`),
            datasets: [{
              label: title || 'Chart',
              data: series.map((item: any) => item.value || item || 1),
              backgroundColor: '#4f46e5'
            }]
          };
      }
    } catch (error) {
      console.error('Error processing Chart.js data:', error);
      return {
        labels: ['Error'],
        datasets: [{ label: 'Error', data: [1], backgroundColor: '#ef4444' }]
      };
    }
  }, [chartData]);

  // Convert chart tool data to Plotly format
  const plotlyData = useMemo(() => {
    if (!chartData.series) return [];

    try {
      const { chartType, series, title } = chartData;
      
      // Handle different chart types
      switch (chartType) {
        case 'bar':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              x: series.map((item, index) => item.label || item.x || `Item ${index + 1}`),
              y: series.map(item => item.value || item.y || item),
              type: 'bar' as const,
              name: title,
              marker: {
                color: '#4f46e5',
                opacity: 0.8
              }
            }];
          }
          break;
          
        case 'line':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              x: series.map((item, index) => item.label || item.x || index),
              y: series.map(item => item.value || item.y || item),
              type: 'scatter' as const,
              mode: 'lines+markers' as const,
              name: title,
              line: { color: '#10b981' }
            }];
          }
          break;
          
        case 'scatter':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              x: series.map(item => item.x || item.value || Math.random()),
              y: series.map(item => item.y || item.value || Math.random()),
              type: 'scatter' as const,
              mode: 'markers' as const,
              name: title,
              marker: { 
                color: '#f59e0b',
                size: 8
              }
            }];
          }
          break;
          
        case 'pie':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              values: series.map(item => item.value || item),
              labels: series.map((item, index) => item.label || `Slice ${index + 1}`),
              type: 'pie' as const,
              name: title
            }];
          }
          break;
          
        case 'histogram':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              x: series.map(item => item.value || item),
              type: 'histogram' as const,
              name: title,
              marker: { color: '#ef4444' }
            }];
          }
          break;
          
        case 'heatmap':
          if (Array.isArray(series) && series.length > 0) {
            // Assume series is a 2D array for heatmap
            return [{
              z: Array.isArray(series[0]) ? series : [series],
              type: 'heatmap' as const,
              name: title,
              colorscale: 'Viridis'
            }];
          }
          break;
          
        default:
          // Fallback to bar chart
          return [{
            x: Array.isArray(series) ? series.map((_, i) => `Item ${i + 1}`) : ['Item 1'],
            y: Array.isArray(series) ? series.map(item => item.value || item || 1) : [1],
            type: 'bar' as const,
            name: title || 'Chart'
          }];
      }
    } catch (error) {
      console.error('Error processing chart data:', error);
      return [{
        x: ['Error'],
        y: [1],
        type: 'bar' as const,
        name: 'Error Chart'
      }];
    }

    return [];
  }, [chartData]);

  // Plotly layout configuration
  const plotlyLayout = useMemo(() => ({
    title: {
      text: chartData.title,
      font: { color: '#ffffff', size: 14 }
    },
    width: size.width - 20,
    height: size.height - 20,
    margin: { l: 40, r: 20, t: 40, b: 40 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#ffffff' },
    xaxis: {
      gridcolor: '#374151',
      tickfont: { color: '#9ca3af' }
    },
    yaxis: {
      gridcolor: '#374151',
      tickfont: { color: '#9ca3af' }
    },
    showlegend: true,
    legend: {
      font: { color: '#ffffff' }
    }
  }), [chartData.title, size]);

  // Plotly config
  const plotlyConfig = {
    displayModeBar: false,
    responsive: false,
    staticPlot: false
  };

  // Create chart as DOM element for Konva
  useEffect(() => {
    if (chartRef.current && groupRef.current) {
      // Create a foreign object for the chart
      const foreignObject = new Konva.Group();
      
      // Position the chart
      foreignObject.x(position.x);
      foreignObject.y(position.y);
      
      // Add to group
      if (groupRef.current) {
        groupRef.current.add(foreignObject);
        groupRef.current.getLayer()?.batchDraw();
      }
    }
  }, [position, plotlyData, plotlyLayout]);

  return (
    <>
      <Group
        ref={groupRef}
        x={position.x}
        y={position.y}
        onClick={onClick}
        draggable
        onDragEnd={onDragEnd}
      >
        {/* Background container */}
        <Rect
          width={size.width}
          height={size.height}
          fill="rgba(31, 41, 55, 0.9)"
          stroke={isSelected ? '#0066cc' : '#4a5568'}
          strokeWidth={isSelected ? 3 : 1}
          cornerRadius={8}
        />
        
        {/* Chart title background */}
        <Rect
          x={0}
          y={0}
          width={size.width}
          height={30}
          fill="rgba(55, 65, 81, 0.9)"
          cornerRadius={[8, 8, 0, 0]}
        />

        {/* Chart title */}
        <Text
          x={10}
          y={8}
          text={chartData.title}
          fontSize={14}
          fontStyle="bold"
          fill="#ffffff"
          width={size.width - 20}
        />
        
        {/* Chart content area */}
        <Rect
          x={10}
          y={40}
          width={size.width - 20}
          height={size.height - 50}
          fill="rgba(17, 24, 39, 0.8)"
          stroke="#374151"
          strokeWidth={1}
          cornerRadius={4}
        />

        {/* Loading/Status indicator */}
        <Text
          x={size.width / 2}
          y={size.height / 2}
          text={plotlyReady ? "📊 Interactive Chart" : useFallback ? "📊 Chart.js Fallback" : "⏳ Loading Chart..."}
          fontSize={12}
          fill="#9ca3af"
          align="center"
          width={size.width - 20}
        />
      </Group>

      {/* Render Chart.js fallback */}
      {useFallback && chartJsData && (
        <div
          style={{
            position: 'absolute',
            left: position.x + 10,
            top: position.y + 40,
            width: size.width - 20,
            height: size.height - 50,
            pointerEvents: isSelected ? 'all' : 'none',
            zIndex: isSelected ? 1000 : 100,
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <Chart
            type={chartData.chartType === 'line' ? 'line' : chartData.chartType === 'pie' ? 'pie' : 'bar'}
            data={chartJsData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: { color: '#ffffff' }
                }
              },
              scales: chartData.chartType !== 'pie' ? {
                x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
              } : undefined
            }}
          />
        </div>
      )}
    </>
  );
};

// Higher-order component that renders chart outside Konva for DOM-based charts
export const ChartPortalRenderer: React.FC<ChartRendererProps & { 
  stageRef?: React.RefObject<Konva.Stage>;
  containerRef?: React.RefObject<HTMLDivElement>;
}> = ({
  chartData,
  position,
  size,
  isSelected,
  onClick,
  onDragEnd,
  stageRef,
  containerRef
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Calculate absolute position based on stage transform
  const absolutePosition = useMemo(() => {
    if (!stageRef?.current) return position;
    
    const stage = stageRef.current;
    const transform = stage.getAbsoluteTransform();
    
    return {
      x: position.x * transform.m[0] + transform.m[4],
      y: position.y * transform.m[3] + transform.m[5]
    };
  }, [position, stageRef]);

  // Convert chart data to Plotly format (same logic as above)
  const plotlyData = useMemo(() => {
    if (!chartData.series) return [];

    try {
      const { chartType, series, title } = chartData;
      
      switch (chartType) {
        case 'bar':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              x: series.map((item, index) => item.label || item.x || `Item ${index + 1}`),
              y: series.map(item => item.value || item.y || item),
              type: 'bar' as const,
              name: title,
              marker: { color: '#4f46e5', opacity: 0.8 }
            }];
          }
          break;
          
        case 'line':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              x: series.map((item, index) => item.label || item.x || index),
              y: series.map(item => item.value || item.y || item),
              type: 'scatter' as const,
              mode: 'lines+markers' as const,
              name: title,
              line: { color: '#10b981' }
            }];
          }
          break;
          
        case 'scatter':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              x: series.map(item => item.x || item.value || Math.random()),
              y: series.map(item => item.y || item.value || Math.random()),
              type: 'scatter' as const,
              mode: 'markers' as const,
              name: title,
              marker: { color: '#f59e0b', size: 8 }
            }];
          }
          break;
          
        case 'pie':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              values: series.map(item => item.value || item),
              labels: series.map((item, index) => item.label || `Slice ${index + 1}`),
              type: 'pie' as const,
              name: title
            }];
          }
          break;
          
        case 'histogram':
          if (Array.isArray(series) && series.length > 0) {
            return [{
              x: series.map(item => item.value || item),
              type: 'histogram' as const,
              name: title,
              marker: { color: '#ef4444' }
            }];
          }
          break;
          
        default:
          return [{
            x: Array.isArray(series) ? series.map((_, i) => `Item ${i + 1}`) : ['Item 1'],
            y: Array.isArray(series) ? series.map(item => item.value || item || 1) : [1],
            type: 'bar' as const,
            name: title || 'Chart'
          }];
      }
    } catch (error) {
      console.error('Error processing chart data:', error);
      return [{
        x: ['Error'],
        y: [1],
        type: 'bar' as const,
        name: 'Error Chart'
      }];
    }

    return [];
  }, [chartData]);

  const plotlyLayout = useMemo(() => ({
    title: {
      text: chartData.title,
      font: { color: '#ffffff', size: 14 }
    },
    width: size.width - 20,
    height: size.height - 20,
    margin: { l: 40, r: 20, t: 40, b: 40 },
    paper_bgcolor: 'rgba(31, 41, 55, 0.9)',
    plot_bgcolor: 'rgba(17, 24, 39, 0.8)',
    font: { color: '#ffffff' },
    xaxis: {
      gridcolor: '#374151',
      tickfont: { color: '#9ca3af' }
    },
    yaxis: {
      gridcolor: '#374151',
      tickfont: { color: '#9ca3af' }
    },
    showlegend: true,
    legend: {
      font: { color: '#ffffff' }
    }
  }), [chartData.title, size]);

  const plotlyConfig = {
    displayModeBar: isSelected,
    displaylogo: false,
    modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
    modeBarButtonsToAdd: [
      {
        name: 'toggleHover',
        icon: { 'width': 857.1, 'height': 1000, 'path': 'm214-7h429v214h-429v-214z m286 500v-71q0-21-15-35.5t-35-14.5h-50q-21 0-35 14.5t-14 35.5v71h149z' },
        click: function() {
          console.log('Toggle hover information');
        }
      }
    ],
    responsive: false,
    doubleClick: 'reset',
    showTips: true
  };

  if (!containerRef?.current) {
    return null;
  }

  return (
    <>
      {/* Render Konva placeholder */}
      <Group
        x={position.x}
        y={position.y}
        onClick={onClick}
        draggable
        onDragEnd={onDragEnd}
      >
        <Rect
          width={size.width}
          height={size.height}
          fill="rgba(31, 41, 55, 0.3)"
          stroke={isSelected ? '#0066cc' : '#4a5568'}
          strokeWidth={isSelected ? 3 : 1}
          cornerRadius={8}
        />
      </Group>
      
      {/* Render ECharts chart as overlay */}
      <div
        ref={chartContainerRef}
        style={{
          position: 'absolute',
          left: absolutePosition.x + 10,
          top: absolutePosition.y + 10,
          width: size.width - 20,
          height: size.height - 20,
          pointerEvents: isSelected ? 'all' : 'none',
          zIndex: isSelected ? 1000 : 100,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e as any);
        }}
      >
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  );
};

export default ChartRenderer;
