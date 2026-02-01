/**
 * 🎯 Chart Data Service
 * 
 * Handle chart data transformations and validation.
 * 
 * Features:
 * - Parse different data formats (JSON, CSV, arrays)
 * - Transform for ECharts/Chart.js
 * - Export as CSV/JSON
 * - Data validation
 */

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'heatmap';

export interface ChartData {
  type: ChartType;
  title: string;
  series: any[];
  config?: any;
  description?: string;
}

export interface ChartDataPoint {
  label?: string;
  value?: number;
  x?: number;
  y?: number;
  [key: string]: any;
}

export class ChartDataService {
  
  /**
   * Parse data from various formats
   */
  parseData(input: string | any[], format: 'json' | 'csv' | 'array' = 'json'): ChartDataPoint[] {
    switch (format) {
      case 'json':
        return this.parseJSON(input as string);
      case 'csv':
        return this.parseCSV(input as string);
      case 'array':
        return this.parseArray(input as any[]);
      default:
        return [];
    }
  }

  /**
   * Parse JSON data
   */
  private parseJSON(input: string): ChartDataPoint[] {
    try {
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => {
          if (typeof item === 'object') {
            return item as ChartDataPoint;
          } else {
            return { label: `Item ${index + 1}`, value: Number(item) || 0 };
          }
        });
      }
      
      return [];
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return [];
    }
  }

  /**
   * Parse CSV data
   */
  private parseCSV(input: string): ChartDataPoint[] {
    const lines = input.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data: ChartDataPoint[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const point: ChartDataPoint = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        // Try to parse as number
        const numValue = parseFloat(value);
        point[header] = isNaN(numValue) ? value : numValue;
      });
      
      data.push(point);
    }
    
    return data;
  }

  /**
   * Parse array data
   */
  private parseArray(input: any[]): ChartDataPoint[] {
    return input.map((item, index) => {
      if (typeof item === 'object') {
        return item as ChartDataPoint;
      } else {
        return { label: `Item ${index + 1}`, value: Number(item) || 0 };
      }
    });
  }

  /**
   * Transform data for ECharts
   */
  transformForECharts(data: ChartDataPoint[], chartType: ChartType): any {
    const labels = data.map((item, index) => item.label || item.x || `Item ${index + 1}`);
    const values = data.map(item => item.value || item.y || 0);
    
    const baseConfig: any = {
      tooltip: { trigger: chartType === 'pie' ? 'item' : 'axis' },
      legend: { top: 24, textStyle: { color: '#ffffff' } },
      grid: { left: 40, right: 20, top: 50, bottom: 40 },
      xAxis: { 
        type: 'category', 
        data: labels, 
        axisLabel: { color: '#9ca3af' }, 
        axisLine: { lineStyle: { color: '#374151' } }, 
        splitLine: { lineStyle: { color: '#374151' } } 
      },
      yAxis: { 
        type: 'value', 
        axisLabel: { color: '#9ca3af' }, 
        axisLine: { lineStyle: { color: '#374151' } }, 
        splitLine: { lineStyle: { color: '#374151' } } 
      }
    };
    
    switch (chartType) {
      case 'line':
        return {
          ...baseConfig,
          series: [{ type: 'line', data: values, smooth: true }]
        };
        
      case 'pie':
        return {
          ...baseConfig,
          xAxis: undefined,
          yAxis: undefined,
          series: [{
            type: 'pie',
            radius: '60%',
            data: labels.map((label, idx) => ({
              name: label,
              value: values[idx]
            }))
          }]
        };
        
      case 'scatter':
        return {
          ...baseConfig,
          series: [{
            type: 'scatter',
            data: data.map((item, i) => [item.x ?? i, item.y ?? item.value ?? 0])
          }]
        };
        
      case 'histogram':
      case 'bar':
        return {
          ...baseConfig,
          series: [{ type: 'bar', data: values }]
        };
        
      case 'heatmap':
        return {
          ...baseConfig,
          visualMap: {
            min: Math.min(...values),
            max: Math.max(...values),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 10
          },
          series: [{
            type: 'heatmap',
            data: data.map((item, i) => [item.x ?? 0, item.y ?? 0, item.value ?? 0])
          }]
        };
        
      default:
        return { ...baseConfig, series: [{ type: 'bar', data: values }] };
    }
  }

  /**
   * Transform data for Chart.js
   */
  transformForChartJS(data: ChartDataPoint[], chartType: ChartType, title: string): any {
    const labels = data.map((item, index) => item.label || `Item ${index + 1}`);
    const values = data.map(item => item.value || item.y || 0);
    
    switch (chartType) {
      case 'bar':
        return {
          labels,
          datasets: [{
            label: title,
            data: values,
            backgroundColor: '#4f46e5',
            borderColor: '#3730a3',
            borderWidth: 1
          }]
        };
        
      case 'line':
        return {
          labels,
          datasets: [{
            label: title,
            data: values,
            fill: false,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            tension: 0.1
          }]
        };
        
      case 'pie':
        return {
          labels,
          datasets: [{
            data: values.map(v => Math.abs(v)),
            backgroundColor: [
              '#4f46e5', '#10b981', '#f59e0b', '#ef4444',
              '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
            ]
          }]
        };
        
      default:
        return {
          labels,
          datasets: [{
            label: title,
            data: values,
            backgroundColor: '#4f46e5'
          }]
        };
    }
  }

  /**
   * Export as CSV
   */
  exportAsCSV(data: ChartDataPoint[]): string {
    if (data.length === 0) return '';
    
    // Get all unique keys
    const keys = Array.from(
      new Set(data.flatMap(item => Object.keys(item)))
    );
    
    // Create header row
    const header = keys.join(',');
    
    // Create data rows
    const rows = data.map(item =>
      keys.map(key => {
        const value = item[key];
        // Escape values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );
    
    return [header, ...rows].join('\n');
  }

  /**
   * Export as JSON
   */
  exportAsJSON(data: ChartDataPoint[], pretty: boolean = true): string {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * Validate chart data
   */
  validate(data: ChartDataPoint[], chartType: ChartType): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data || data.length === 0) {
      errors.push('No data provided');
      return { valid: false, errors };
    }
    
    switch (chartType) {
      case 'bar':
      case 'line':
      case 'histogram':
        // Check for value field
        if (!data.every(item => typeof item.value === 'number' || typeof item.y === 'number')) {
          errors.push('All data points must have a numeric value');
        }
        break;
        
      case 'pie':
        // Check for positive values
        if (!data.every(item => (item.value || item.y || 0) >= 0)) {
          errors.push('Pie chart values must be non-negative');
        }
        break;
        
      case 'scatter':
        // Check for x and y coordinates
        if (!data.every(item => typeof item.x === 'number' && typeof item.y === 'number')) {
          errors.push('Scatter plot requires x and y coordinates');
        }
        break;
        
      case 'heatmap':
        // Check for x, y, and value
        if (!data.every(item => 
          typeof item.x === 'number' && 
          typeof item.y === 'number' && 
          typeof item.value === 'number'
        )) {
          errors.push('Heatmap requires x, y, and value for each point');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate sample data for chart type
   */
  generateSampleData(chartType: ChartType, count: number = 5): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    
    switch (chartType) {
      case 'bar':
      case 'line':
      case 'histogram':
        for (let i = 0; i < count; i++) {
          data.push({
            label: `Item ${i + 1}`,
            value: Math.floor(Math.random() * 100) + 1
          });
        }
        break;
        
      case 'pie':
        const labels = ['A', 'B', 'C', 'D', 'E'];
        for (let i = 0; i < Math.min(count, labels.length); i++) {
          data.push({
            label: labels[i],
            value: Math.floor(Math.random() * 100) + 10
          });
        }
        break;
        
      case 'scatter':
        for (let i = 0; i < count; i++) {
          data.push({
            x: Math.random() * 100,
            y: Math.random() * 100,
            label: `Point ${i + 1}`
          });
        }
        break;
        
      case 'heatmap':
        for (let i = 0; i < count; i++) {
          for (let j = 0; j < count; j++) {
            data.push({
              x: i,
              y: j,
              value: Math.floor(Math.random() * 100)
            });
          }
        }
        break;
    }
    
    return data;
  }

  /**
   * Aggregate data (sum, average, count, etc.)
   */
  aggregate(data: ChartDataPoint[], operation: 'sum' | 'average' | 'min' | 'max' | 'count'): number {
    if (data.length === 0) return 0;
    
    const values = data.map(item => item.value || item.y || 0);
    
    switch (operation) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'average':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }
}

// Singleton instance
export const chartDataService = new ChartDataService();

