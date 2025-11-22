/**
 * @file Visualizations page for the application.
 * This page displays various charts and graphs to visualize the user's carbon footprint data.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { 
  CategorySummary, 
  EmissionSummary, 
  EconomicImpact, 
  TimeSummary 
} from '@/types';

import styles from '@/app/dashboard/dashboard.module.css'; // Reusing dashboard styles
import CategoryChart from '@/components/CategoryChart';
import TopEmittersChart from '@/components/TopEmittersChart';
import EmissionsTrendChart from '@/components/EmissionsTrendChart'; // Import the new chart

type TimeView = 'monthly' | 'weekly' | 'daily';

/**
 * Visualizations page component.
 * @returns {JSX.Element} The visualizations page component.
 */
export default function VisualizationsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // State for chart data
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [physicalSummary, setPhysicalSummary] = useState<EmissionSummary[]>([]);
  const [economicSummary, setEconomicSummary] = useState<EconomicImpact[]>([]);
  
  // State for time-series charts
  const [monthlyData, setMonthlyData] = useState<TimeSummary[]>([]);
  const [weeklyData, setWeeklyData] = useState<TimeSummary[]>([]);
  const [dailyData, setDailyData] = useState<TimeSummary[]>([]);
  const [timeView, setTimeView] = useState<TimeView>('monthly'); // Default view


  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    fetchChartData(currentUser._id);
  }, [router]);

  /**
   * Fetches all chart data from the API.
   * @param {string} userId - The ID of the user.
   */
  const fetchChartData = async (userId: string) => {
    try {
      setLoading(true);
      // Fetch all data needed for all charts
      const [
        categoryData,
        physicalData,
        economicData,
        monthly,
        weekly,
        daily
      ] = await Promise.all([
        api.getCategorySummary(userId),
        api.getPhysicalSummary(userId),
        api.getEconomicSummary(userId),
        api.getMonthlySummary(userId),
        api.getWeeklySummary(userId),
        api.getDailySummary(userId)
      ]);
      
      setCategorySummary(categoryData);
      setPhysicalSummary(physicalData);
      setEconomicSummary(economicData);
      setMonthlyData(monthly);
      setWeeklyData(weekly);
      setDailyData(daily);

    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Returns the correct data for the time-series chart based on the selected view.
   * @returns {TimeSummary[]} The data for the chart.
   */
  const getChartData = () => {
    switch (timeView) {
      case 'daily': return dailyData;
      case 'weekly': return weeklyData;
      case 'monthly':
      default: return monthlyData;
    }
  };

  if (loading) {
    return <div className={styles.dashboardLoading}>Loading visualizations...</div>;
  }
  if (!user) {
    return null;
  }

  return (
    <div className={styles.dashboardContainer}>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Visualizations
      </h1>

      <div className={styles.dashboardGrid}>

        {/* --- Emissions by Category Donut Chart --- */}
        <section className={styles.dashboardCard}>
          <h2>Emissions by Category</h2>
          {categorySummary && categorySummary.length > 0 ? (
            <CategoryChart data={categorySummary} />
          ) : (
            <p className={styles.emptyState}>No activities logged yet.</p>
          )}
        </section>

        {/* --- Top 5 Emitters Bar Chart --- */}
        <section className={styles.dashboardCard}>
          <h2>Top 5 Emitters</h2>
          {(physicalSummary && physicalSummary.length > 0) || (economicSummary && economicSummary.length > 0) ? (
            <TopEmittersChart 
              physicalData={physicalSummary} 
              economicData={economicSummary} 
            />
          ) : (
            <p className={styles.emptyState}>No activities logged yet.</p>
          )}
        </section>

        {/* --- NEW Emissions Over Time Chart --- */}
        <section className={`${styles.dashboardCard} ${styles.fullWidthCard}`}>
          <h2>Emissions Over Time</h2>
          
          {/* Toggle Buttons */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setTimeView('monthly')}
              className={timeView === 'monthly' ? styles.activeButton : styles.toggleButton}
            >
              Monthly
            </button>
            <button 
              onClick={() => setTimeView('weekly')}
              className={timeView === 'weekly' ? styles.activeButton : styles.toggleButton}
            >
              Weekly
            </button>
            <button 
              onClick={() => setTimeView('daily')}
              className={timeView === 'daily' ? styles.activeButton : styles.toggleButton}
            >
              Daily
            </button>
          </div>

          <EmissionsTrendChart data={getChartData()} />
        </section>
      </div>
    </div>
  );
}