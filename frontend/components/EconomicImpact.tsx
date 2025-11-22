/**
 * @file Component for displaying economic impact data.
 */

'use client';

import type { EconomicImpact } from '@/types';

interface EconomicImpactProps {
  data: EconomicImpact[];
}

/**
 * Component for displaying economic impact data.
 * @param {EconomicImpactProps} props - The props for the component.
 * @returns {JSX.Element} The economic impact component.
 */
export default function EconomicImpact({ data }: EconomicImpactProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No economic activities yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.slice(0, 5).map((item, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-800">{(item as any).sector ?? 'Unknown sector'}</h3>
            <span className="text-sm font-medium text-red-600">
              {(item as any).total_co2e_kg?.toFixed(1) ?? 'N/A'} kg CO₂e
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Spending:</span>
            <span>{(item as any).total_spending_usd != null ? `$${(item as any).total_spending_usd.toFixed(2)}` : 'N/A'}</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full"
              style={{
                width: `${Math.min(((item as any).total_co2e_kg / Math.max(...data.map(d => (d as any).total_co2e_kg))) * 100, 100)}%`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}