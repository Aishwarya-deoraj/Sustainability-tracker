/**
 * @file Chart component for displaying emissions trend over time.
 */

'use client';

import { TimeSummary } from '@/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface ChartProps {
  data: TimeSummary[];
}

/**
 * Chart component for displaying emissions trend over time.
 * @param {ChartProps} props - The props for the component.
 * @returns {JSX.Element} The chart component.
 */
export default function EmissionsTrendChart({ data }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
        Log more activities to see your trend over time.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data}
        margin={{
          top: 5, right: 30, left: 20, bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`} />
        <Legend />
        <Bar dataKey="emissions" fill="#2e7d32" name="Total Emissions (kg CO₂e)" />
      </BarChart>
    </ResponsiveContainer>
  );
}