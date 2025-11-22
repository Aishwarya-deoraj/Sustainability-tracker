/**
 * @file Chart component for displaying the top 5 emitters.
 */

'use client';

import { EmissionSummary, EconomicImpact } from '@/types';
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
  physicalData: EmissionSummary[];
  economicData: EconomicImpact[];
}

/**
 * Chart component for displaying the top 5 emitters.
 * @param {ChartProps} props - The props for the component.
 * @returns {JSX.Element | null} The chart component.
 */
export default function TopEmittersChart({ physicalData, economicData }: ChartProps) {
  
  // 1. Combine both physical and economic data into one list
  const combinedData = [
    ...physicalData.map(item => ({ 
      name: item.item_name, 
      emissions: item.total_co2e_kg 
    })),
    ...economicData.map(item => ({ 
      name: (item as any).sector, 
      emissions: (item as any).total_co2e_kg 
    }))
  ];

  // 2. Sort the list from highest to lowest and take the top 5
  const top5Data = combinedData
    .sort((a, b) => b.emissions - a.emissions)
    .slice(0, 5);

  if (!top5Data || top5Data.length === 0) {
    return null; // Don't render if no data
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={top5Data}
        layout="vertical" // This makes it a horizontal bar chart
        margin={{
          top: 5,
          right: 30,
          left: 50, // Add left margin for long labels
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={100} // Give space for the name
          tick={{ fontSize: 12 }} 
        />
        <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`} />
        <Legend />
        <Bar dataKey="emissions" fill="#d32f2f" name="kg CO₂e" />
      </BarChart>
    </ResponsiveContainer>
  );
}