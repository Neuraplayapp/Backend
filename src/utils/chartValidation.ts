export interface ChartData {
  type: 'chart';
  title: string;
  chartType: string;
  series: any;
  config: any;
  style?: string;
  description?: string;
  library?: 'plotly' | 'chartjs' | 'd3';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: ChartData;
}

export class ChartValidator {
  private static supportedChartTypes = [
    'bar', 'line', 'scatter', 'histogram', 'pie', 'heatmap', 
    '3d_scatter', '3d_surface', 'sankey', 'sunburst'
  ];

  private static supportedLibraries = ['echarts', 'chartjs', 'd3'];

  static validateChartData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['Chart data must be an object'],
        warnings: []
      };
    }

    // Required fields validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Chart title is required and must be a string');
    }

    if (!data.chartType || typeof data.chartType !== 'string') {
      errors.push('Chart type is required and must be a string');
    } else if (!this.supportedChartTypes.includes(data.chartType)) {
      warnings.push(`Chart type '${data.chartType}' is not officially supported. Falling back to 'bar' chart.`);
      data.chartType = 'bar';
    }

    // Series data validation
    if (!data.series) {
      warnings.push('No series data provided. Creating empty chart.');
      data.series = [];
    } else if (!Array.isArray(data.series)) {
      warnings.push('Series data should be an array. Converting to array.');
      data.series = [data.series];
    }

    // Validate series data structure
    if (Array.isArray(data.series) && data.series.length > 0) {
      const validationResult = this.validateSeriesData(data.series, data.chartType);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);
      if (validationResult.sanitizedSeries) {
        data.series = validationResult.sanitizedSeries;
      }
    }

    // Library validation
    if (data.library && !this.supportedLibraries.includes(data.library)) {
      warnings.push(`Library '${data.library}' is not supported. Using 'echarts' as default.`);
      data.library = 'echarts';
    } else if (!data.library) {
      data.library = 'echarts';
    }

    // Config validation
    if (data.config && typeof data.config !== 'object') {
      warnings.push('Chart config should be an object. Using default config.');
      data.config = {};
    }

    // Sanitize title and description
    if (data.title) {
      data.title = this.sanitizeString(data.title, 100);
    }

    if (data.description) {
      data.description = this.sanitizeString(data.description, 500);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: data
    };
  }

  private static validateSeriesData(series: any[], chartType: string): {
    errors: string[];
    warnings: string[];
    sanitizedSeries?: any[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedSeries: any[] = [];

    for (let i = 0; i < series.length; i++) {
      const item = series[i];
      
      switch (chartType) {
        case 'bar':
        case 'line':
          if (typeof item === 'number') {
            sanitizedSeries.push({ value: item, label: `Item ${i + 1}` });
          } else if (item && typeof item === 'object') {
            if (item.value === undefined && item.y === undefined) {
              warnings.push(`Series item ${i} missing value/y property. Using 0.`);
              sanitizedSeries.push({ ...item, value: 0 });
            } else {
              sanitizedSeries.push({
                value: item.value || item.y || 0,
                label: item.label || item.x || `Item ${i + 1}`
              });
            }
          } else {
            warnings.push(`Series item ${i} invalid format. Using default.`);
            sanitizedSeries.push({ value: 0, label: `Item ${i + 1}` });
          }
          break;

        case 'scatter':
          if (item && typeof item === 'object' && 
              (item.x !== undefined || item.y !== undefined)) {
            sanitizedSeries.push({
              x: typeof item.x === 'number' ? item.x : Math.random(),
              y: typeof item.y === 'number' ? item.y : Math.random(),
              label: item.label || `Point ${i + 1}`
            });
          } else {
            warnings.push(`Scatter plot item ${i} missing x/y coordinates. Using random values.`);
            sanitizedSeries.push({
              x: Math.random() * 10,
              y: Math.random() * 10,
              label: `Point ${i + 1}`
            });
          }
          break;

        case 'pie':
          if (typeof item === 'number') {
            sanitizedSeries.push({ value: Math.abs(item), label: `Slice ${i + 1}` });
          } else if (item && typeof item === 'object') {
            sanitizedSeries.push({
              value: Math.abs(item.value || item.y || 1),
              label: item.label || `Slice ${i + 1}`
            });
          } else {
            warnings.push(`Pie chart item ${i} invalid. Using default slice.`);
            sanitizedSeries.push({ value: 1, label: `Slice ${i + 1}` });
          }
          break;

        case 'histogram':
          if (typeof item === 'number') {
            sanitizedSeries.push(item);
          } else if (item && typeof item === 'object' && item.value !== undefined) {
            sanitizedSeries.push(item.value);
          } else {
            warnings.push(`Histogram item ${i} should be a number. Using 0.`);
            sanitizedSeries.push(0);
          }
          break;

        default:
          // Default handling for unknown chart types
          if (typeof item === 'number') {
            sanitizedSeries.push({ value: item, label: `Item ${i + 1}` });
          } else if (item && typeof item === 'object') {
            sanitizedSeries.push({
              value: item.value || item.y || 1,
              label: item.label || item.x || `Item ${i + 1}`
            });
          } else {
            sanitizedSeries.push({ value: 1, label: `Item ${i + 1}` });
          }
      }
    }

    return { errors, warnings, sanitizedSeries };
  }

  private static sanitizeString(str: string, maxLength: number): string {
    if (typeof str !== 'string') return '';
    
    // Remove potentially dangerous characters
    let sanitized = str.replace(/[<>\"'&]/g, '');
    
    // Trim to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength - 3) + '...';
    }
    
    return sanitized.trim();
  }

  static createErrorChart(errors: string[]): ChartData {
    return {
      type: 'chart',
      title: 'Chart Error',
      chartType: 'bar',
      series: [{ value: 1, label: 'Error' }],
      config: {},
      description: `Chart validation failed: ${errors.join(', ')}`,
      library: 'echarts'
    };
  }

  static createEmptyChart(title: string = 'Empty Chart'): ChartData {
    return {
      type: 'chart',
      title,
      chartType: 'bar',
      series: [
        { value: 1, label: 'Sample A' },
        { value: 2, label: 'Sample B' },
        { value: 1.5, label: 'Sample C' }
      ],
      config: {},
      description: 'No data provided. Showing sample chart.',
      library: 'echarts'
    };
  }
}

export default ChartValidator;
