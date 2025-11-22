/**
 * @file Chart component for displaying emissions by category.
 */

'use client';

import { CategorySummary } from '@/types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define some colors for the chart segments
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface CategoryChartProps {
  data: CategorySummary[];
}

/**
 * Chart component for displaying emissions by category.
 * @param {CategoryChartProps} props - The props for the component.
 * @returns {JSX.Element | null} The chart component.
 */
export default function CategoryChart({ data }: CategoryChartProps) {
  if (!data || data.length === 0) {
    return null; // Don't render anything if no data
  }

  // We need to rename 'category' to 'name' for the Pie chart
  const chartData = data.map(item => ({
    name: item.category,
    value: item.total_co2e_kg,
  }));

  return (
    // ResponsiveContainer makes the chart fit its parent div
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={(entry) => `${((entry.percent ?? 0) * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}