import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter
} from 'recharts';

type ScenarioKey = 'budget' | 'directive' | 'roadmap' | 'histogram' | 'marketshare' | 'risk' | 'satisfaction' | 'utilization' | 'funnel' | 'financial';

interface Props {
  initialScenario?: ScenarioKey;
  compact?: boolean;
}

const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c', '#0891b2', '#be123c', '#4338f5', '#059669'];

const InteractiveChartScenarios: React.FC<Props> = ({ initialScenario = 'budget', compact = false }) => {
  const [scenario, setScenario] = useState<ScenarioKey>(initialScenario);

  const budgetData = [
    { category: 'Marketing', budgeted: 15000, actual: 12500, variance: -2500 },
    { category: 'Operations', budgeted: 25000, actual: 27800, variance: 2800 },
    { category: 'R&D', budgeted: 20000, actual: 18900, variance: -1100 },
    { category: 'HR', budgeted: 12000, actual: 11200, variance: -800 },
    { category: 'IT', budgeted: 18000, actual: 19500, variance: 1500 },
    { category: 'Sales', budgeted: 22000, actual: 24300, variance: 2300 }
  ];
  const directiveData = [
    { milestone: 'Q1 Setup', planned: 100, completed: 85, critical: true },
    { milestone: 'Q2 Launch', planned: 75, completed: 92, critical: false },
    { milestone: 'Q3 Scale', planned: 60, completed: 45, critical: true },
    { milestone: 'Q4 Optimize', planned: 40, completed: 20, critical: false },
    { milestone: 'Next Phase', planned: 25, completed: 5, critical: true }
  ];
  const roadmapData = [
    { phase: 'Discovery', duration: 8, effort: 120, team: 'Research' },
    { phase: 'Design', duration: 12, effort: 200, team: 'UX' },
    { phase: 'Development', duration: 20, effort: 400, team: 'Engineering' },
    { phase: 'Testing', duration: 6, effort: 80, team: 'QA' },
    { phase: 'Deployment', duration: 4, effort: 60, team: 'DevOps' },
    { phase: 'Launch', duration: 2, effort: 40, team: 'Marketing' }
  ];
  const histogramData = [
    { range: '0-10', frequency: 5, percentage: 8.3 },
    { range: '11-20', frequency: 12, percentage: 20.0 },
    { range: '21-30', frequency: 18, percentage: 30.0 },
    { range: '31-40', frequency: 15, percentage: 25.0 },
    { range: '41-50', frequency: 8, percentage: 13.3 },
    { range: '51-60', frequency: 2, percentage: 3.3 }
  ];
  const marketShareData = [
    { company: 'Leader', share: 35, value: 3500, color: colors[0] },
    { company: 'Challenger', share: 25, value: 2500, color: colors[1] },
    { company: 'Follower', share: 20, value: 2000, color: colors[2] },
    { company: 'Niche Player', share: 12, value: 1200, color: colors[3] },
    { company: 'Others', share: 8, value: 800, color: colors[4] }
  ];
  const riskData = [
    { risk: 'Market Volatility', probability: 70, impact: 80, severity: 'High' },
    { risk: 'Tech Disruption', probability: 50, impact: 90, severity: 'Medium' },
    { risk: 'Regulatory Change', probability: 30, impact: 60, severity: 'Low' },
    { risk: 'Talent Shortage', probability: 85, impact: 70, severity: 'High' },
    { risk: 'Supply Chain', probability: 45, impact: 75, severity: 'Medium' },
    { risk: 'Cyber Security', probability: 25, impact: 95, severity: 'Critical' }
  ];
  const satisfactionData = [
    { month: 'Jan', nps: 45, csat: 78, retention: 92 },
    { month: 'Feb', nps: 48, csat: 82, retention: 94 },
    { month: 'Mar', nps: 52, csat: 85, retention: 91 },
    { month: 'Apr', nps: 47, csat: 80, retention: 93 },
    { month: 'May', nps: 55, csat: 88, retention: 95 },
    { month: 'Jun', nps: 58, csat: 90, retention: 96 }
  ];
  const utilizationData = [
    { resource: 'Developers', capacity: 100, utilized: 85, available: 15 },
    { resource: 'Designers', capacity: 100, utilized: 92, available: 8 },
    { resource: 'Analysts', capacity: 100, utilized: 76, available: 24 },
    { resource: 'Managers', capacity: 100, utilized: 88, available: 12 },
    { resource: 'QA Engineers', capacity: 100, utilized: 82, available: 18 }
  ];
  const funnelData = [
    { stage: 'Leads', count: 10000, conversion: 100 },
    { stage: 'Qualified', count: 3000, conversion: 30 },
    { stage: 'Proposal', count: 1200, conversion: 12 },
    { stage: 'Negotiation', count: 600, conversion: 6 },
    { stage: 'Closed Won', count: 240, conversion: 2.4 }
  ];
  const financialData = [
    { quarter: 'Q1 2023', revenue: 125000, profit: 18000, margin: 14.4 },
    { quarter: 'Q2 2023', revenue: 142000, profit: 24000, margin: 16.9 },
    { quarter: 'Q3 2023', revenue: 138000, profit: 21000, margin: 15.2 },
    { quarter: 'Q4 2023', revenue: 165000, profit: 32000, margin: 19.4 },
    { quarter: 'Q1 2024', revenue: 158000, profit: 28000, margin: 17.7 },
    { quarter: 'Q2 2024', revenue: 172000, profit: 35000, margin: 20.3 }
  ];

  const scenarios: Record<ScenarioKey, { title: string; description: string; data: any[]; chart: 'composed' | 'bar' | 'area' | 'pie' | 'scatter' | 'line' }> = {
    budget: { title: 'Budget vs Actual Analysis', description: 'Compare budgeted amounts with actual spending across departments', data: budgetData, chart: 'composed' },
    directive: { title: 'Strategic Directive Progress', description: 'Track completion of strategic initiatives and milestones', data: directiveData, chart: 'bar' },
    roadmap: { title: 'Product Roadmap Timeline', description: 'Visualize project phases, duration, and resource allocation', data: roadmapData, chart: 'area' },
    histogram: { title: 'Performance Distribution Histogram', description: 'Frequency distribution of performance scores', data: histogramData, chart: 'bar' },
    marketshare: { title: 'Market Share Distribution', description: 'Current market position and competitive landscape', data: marketShareData, chart: 'pie' },
    risk: { title: 'Risk Assessment Matrix', description: 'Risk probability vs impact analysis', data: riskData, chart: 'scatter' },
    satisfaction: { title: 'Customer Satisfaction Trends', description: 'NPS, CSAT, and retention metrics over time', data: satisfactionData, chart: 'line' },
    utilization: { title: 'Resource Utilization Dashboard', description: 'Team capacity and availability analysis', data: utilizationData, chart: 'composed' },
    funnel: { title: 'Sales Funnel Analysis', description: 'Lead conversion through sales stages', data: funnelData, chart: 'bar' },
    financial: { title: 'Financial Performance Dashboard', description: 'Revenue, profit, and margin trends', data: financialData, chart: 'composed' }
  };

  const current = scenarios[scenario];

  const renderChart = () => {
    const data = current.data;
    switch (current.chart) {
      case 'composed':
        if (scenario === 'budget') {
          return (
            <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budgeted" fill={colors[0]} name="Budgeted" />
              <Bar dataKey="actual" fill={colors[1]} name="Actual" />
              <Line type="monotone" dataKey="variance" stroke={colors[2]} strokeWidth={3} name="Variance" />
            </ComposedChart>
          );
        }
        if (scenario === 'utilization') {
          return (
            <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="resource" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilized" stackId="a" fill={colors[0]} name="Utilized" />
              <Bar dataKey="available" stackId="a" fill={colors[1]} name="Available" />
              <Line type="monotone" dataKey="capacity" stroke={colors[2]} strokeWidth={2} name="Capacity" />
            </ComposedChart>
          );
        }
        if (scenario === 'financial') {
          return (
            <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill={colors[0]} name="Revenue" />
              <Bar yAxisId="left" dataKey="profit" fill={colors[1]} name="Profit" />
              <Line yAxisId="right" type="monotone" dataKey="margin" stroke={colors[2]} strokeWidth={3} name="Margin %" />
            </ComposedChart>
          );
        }
        return null;
      case 'bar':
        if (scenario === 'directive') {
          return (
            <BarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="milestone" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned" fill={colors[0]} name="Planned" />
              <Bar dataKey="completed" fill={colors[1]} name="Completed" />
            </BarChart>
          );
        }
        if (scenario === 'histogram') {
          return (
            <BarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="frequency" fill={colors[0]} name="Frequency" />
            </BarChart>
          );
        }
        if (scenario === 'funnel') {
          return (
            <BarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill={colors[0]} name="Count" />
            </BarChart>
          );
        }
        return null;
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="phase" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="effort" stackId="1" stroke={colors[0]} fill={colors[0]} name="Effort (hours)" />
            <Area type="monotone" dataKey="duration" stackId="2" stroke={colors[1]} fill={colors[1]} name="Duration (weeks)" />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ company, share }) => `${company}: ${share}%`} outerRadius={120} dataKey="share">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
      case 'scatter':
        return (
          <ScatterChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="probability" name="Probability" unit="%" />
            <YAxis dataKey="impact" name="Impact" unit="%" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Risk Factors" data={data} fill={colors[0]} />
          </ScatterChart>
        );
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="nps" stroke={colors[0]} strokeWidth={3} name="NPS Score" />
            <Line type="monotone" dataKey="csat" stroke={colors[1]} strokeWidth={3} name="CSAT %" />
            <Line type="monotone" dataKey="retention" stroke={colors[2]} strokeWidth={3} name="Retention %" />
          </LineChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full">
      {!compact && (
        <div className="mb-3">
          <h2 className="text-xl font-semibold">{current.title}</h2>
          <p className="text-sm text-gray-600">{current.description}</p>
        </div>
      )}
      <div className="w-full h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      <div className="mt-2">
        <select className="px-2 py-1 border rounded text-sm" value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioKey)}>
          {Object.keys(scenarios).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default InteractiveChartScenarios;


