import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, ScatterChart, Scatter
} from 'recharts';

interface InteractiveGraphProps {
  initialChartType?: 'line' | 'bar' | 'area' | 'scatter';
  initialDataset?: 'sales' | 'performance' | 'growth' | 'scatter';
}

const InteractiveGraph: React.FC<InteractiveGraphProps> = ({ initialChartType = 'line', initialDataset = 'sales' }) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'scatter'>(initialChartType);
  const [dataset, setDataset] = useState<'sales' | 'performance' | 'growth' | 'scatter'>(initialDataset);

  const datasets = {
    sales: [
      { name: 'Jan', value: 4000, secondary: 2400 },
      { name: 'Feb', value: 3000, secondary: 1398 },
      { name: 'Mar', value: 2000, secondary: 9800 },
      { name: 'Apr', value: 2780, secondary: 3908 },
      { name: 'May', value: 1890, secondary: 4800 },
      { name: 'Jun', value: 2390, secondary: 3800 },
      { name: 'Jul', value: 3490, secondary: 4300 },
    ],
    performance: [
      { name: 'Q1', value: 85, secondary: 78 },
      { name: 'Q2', value: 92, secondary: 85 },
      { name: 'Q3', value: 78, secondary: 90 },
      { name: 'Q4', value: 96, secondary: 88 },
    ],
    growth: [
      { name: '2020', value: 100, secondary: 120 },
      { name: '2021', value: 120, secondary: 140 },
      { name: '2022', value: 180, secondary: 200 },
      { name: '2023', value: 250, secondary: 280 },
      { name: '2024', value: 320, secondary: 350 },
    ],
    scatter: [
      { x: 100, y: 200, z: 200 },
      { x: 120, y: 100, z: 260 },
      { x: 170, y: 300, z: 400 },
      { x: 140, y: 250, z: 280 },
      { x: 150, y: 400, z: 500 },
      { x: 110, y: 280, z: 200 },
    ]
  } as const;

  const dataLabels = {
    sales: { primary: 'Revenue', secondary: 'Profit', title: 'Monthly Sales Data' },
    performance: { primary: 'Team A', secondary: 'Team B', title: 'Quarterly Performance' },
    growth: { primary: 'Company A', secondary: 'Company B', title: 'Annual Growth Comparison' },
    scatter: { primary: 'Performance', secondary: 'Efficiency', title: 'Performance vs Efficiency' }
  } as const;

  const currentData: any[] = (datasets as any)[dataset];
  const currentLabels = (dataLabels as any)[dataset];

  const renderChart = () => {
    const commonProps: any = {
      data: currentData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#2563eb" 
              strokeWidth={3}
              name={currentLabels.primary}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
            />
            {dataset !== 'scatter' && (
              <Line 
                type="monotone" 
                dataKey="secondary" 
                stroke="#dc2626" 
                strokeWidth={3}
                name={currentLabels.secondary}
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 6 }}
              />
            )}
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#2563eb" name={currentLabels.primary} />
            {dataset !== 'scatter' && (
              <Bar dataKey="secondary" fill="#dc2626" name={currentLabels.secondary} />
            )}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="value" 
              stackId="1" 
              stroke="#2563eb" 
              fill="#2563eb" 
              fillOpacity={0.6}
              name={currentLabels.primary}
            />
            {dataset !== 'scatter' && (
              <Area 
                type="monotone" 
                dataKey="secondary" 
                stackId="1" 
                stroke="#dc2626" 
                fill="#dc2626" 
                fillOpacity={0.6}
                name={currentLabels.secondary}
              />
            )}
          </AreaChart>
        );
      case 'scatter':
        return (
          <ScatterChart {...commonProps} data={(datasets as any).scatter}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" />
            <YAxis dataKey="y" type="number" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Data Points" data={(datasets as any).scatter} fill="#2563eb" />
          </ScatterChart>
        );
      default:
        return null;
    }
  };

  const title = currentLabels.title;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600">Interactive data visualization with multiple chart types and datasets</p>
      </div>
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">Chart Type:</label>
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
            <option value="scatter">Scatter Plot</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">Dataset:</label>
          <select 
            value={dataset} 
            onChange={(e) => setDataset(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={chartType === 'scatter'}
          >
            <option value="sales">Sales Data</option>
            <option value="performance">Performance Metrics</option>
            <option value="growth">Growth Comparison</option>
            {chartType === 'scatter' && <option value="scatter">Scatter Data</option>}
          </select>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <ResponsiveContainer width="100%" height={400}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Data Points</h3>
          <p className="text-2xl font-bold text-blue-600">{currentData.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Max Value</h3>
          <p className="text-2xl font-bold text-green-600">
            {chartType === 'scatter' 
              ? Math.max(...currentData.map((d: any) => d.y))
              : Math.max(...currentData.map((d: any) => d.value))}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800">Chart Type</h3>
          <p className="text-2xl font-bold text-purple-600 capitalize">{chartType}</p>
        </div>
      </div>
    </div>
  );
};

export default InteractiveGraph;


