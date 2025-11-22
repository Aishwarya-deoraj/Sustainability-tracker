/**
 * @file Dashboard page for the application.
 * This page displays the user's carbon footprint data.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { 
  Activity, 
  EmissionSummary, 
  EconomicImpact,
  CategorySummary,
  BiggestImpactors,
} from '@/types';
import styles from './dashboard.module.css';

import EditActivityModal from '@/components/EditActivityModal/EditActivityModal';

/**
 * Dashboard page component.
 * @returns {JSX.Element} The dashboard page component.
 */
export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // State for all our data
  const [totalEmissions, setTotalEmissions] = useState<number>(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [physicalSummary, setPhysicalSummary] = useState<EmissionSummary[]>([]);
  const [economicSummary, setEconomicSummary] = useState<EconomicImpact[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [impactors, setImpactors] = useState<BiggestImpactors | null>(null);
  
  // --- NEW STATE for Edit Modal ---
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    fetchUserData(currentUser._id);
  }, [router]);

  /**
   * Fetches all user data from the API.
   * @param {string} userId - The ID of the user.
   */
  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true);
      const [
        activitiesData, 
        physicalData, 
        economicData,
        categoryData,
        impactorsData,
      ] = await Promise.all([
        api.getUserActivities(userId),
        api.getPhysicalSummary(userId),
        api.getEconomicSummary(userId),
        api.getCategorySummary(userId),
        api.getBiggestImpactors(userId),
      ]);
      
      setActivities(activitiesData);
      setPhysicalSummary(physicalData);
      setEconomicSummary(economicData);
      setCategorySummary(categoryData);
      setImpactors(impactorsData);
      
      const physicalTotal = physicalData.reduce((sum, item) => sum + item.total_co2e_kg, 0);
      const economicTotal = economicData.reduce((sum, item) => sum + (item as any).total_co2e_kg, 0);
      setTotalEmissions(physicalTotal + economicTotal);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // --- NEW HANDLERS FOR EDITING ---
  
  /**
   * Opens the edit modal for an activity.
   * @param {Activity} activity - The activity to edit.
   */
  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
  };

  /**
   * Closes the edit modal and refreshes the data after a successful save.
   */
  const handleSave = () => {
    setEditingActivity(null); // Close the modal
    if (user) {
      fetchUserData(user._id); // Refresh the dashboard data
    }
  };

  /**
   * Closes the edit modal without saving.
   */
  const handleClose = () => {
    setEditingActivity(null);
  };
  
  /**
   * Deletes an activity.
   * @param {string} activityId - The ID of the activity to delete.
   */
  const handleDelete = async (activityId: string) => {
    if (
      !user ||
      !window.confirm('Are you sure you want to delete this activity?')
    ) {
      return;
    }

    try {
      await api.deleteActivity(user._id, activityId); // <-- USES NEW API FUNCTION
      await fetchUserData(user._id); // Refresh all data
    } catch (error) {
      console.error('Failed to delete activity:', error);
      alert('Failed to delete activity. Please try again.');
    }
  };


  if (loading) {
    return <div className={styles.dashboardLoading}>Loading your carbon footprint...</div>;
  }
  if (!user) {
    return null;
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardGrid}>
        
        {/* --- 1. Total Emissions Card (Full width) --- */}
        <section className={styles.totalEmissionsCard}>
          <h2>Your Total Footprint</h2>
          <div>
            <span className={styles.totalNumber}>
              {totalEmissions.toFixed(2)}
            </span>
            <span className={styles.totalUnit}>kg CO₂e</span>
          </div>
        </section>

        {/* --- 3. Emissions by Category --- */}
        <section className={styles.dashboardCard}>
          <h2>Emissions by Category</h2>
          <div className={styles.summaryList}>
            {categorySummary && categorySummary.length > 0 ? categorySummary.map((item, i) => (
              <div key={i} className={styles.summaryItem}>
                <span className={styles.name}>{item.category}</span>
                <span className={`${styles.amount} ${styles.amountRed}`}>{item.total_co2e_kg.toFixed(2)} kg CO₂e</span>
              </div>
            )) : <p className={styles.emptyState}>No activities logged yet.</p>}
          </div>
        </section>

        {/* --- 4. Biggest Impactors --- */}
        <section className={styles.dashboardCard}>
          <h2>Your Biggest Impactors</h2>
          <div className={styles.summaryList}>
            {impactors?.biggest_physical ? (
              <div className={styles.summaryItem}>
                <span className={styles.name}>Physical: {impactors.biggest_physical.item_name}</span>
                <span className={`${styles.amount} ${styles.amountRed}`}>{impactors.biggest_physical.total_co2e_kg.toFixed(2)} kg CO₂e</span>
              </div>
            ) : <p className={styles.emptyState}>No physical activities logged.</p>}

            {impactors?.biggest_economic ? (
              <div className={styles.summaryItem}>
                <span className={styles.name}>Economic: {impactors.biggest_economic.sector}</span>
                <span className={`${styles.amount} ${styles.amountRed}`}>{impactors.biggest_economic.total_co2e_kg.toFixed(2)} kg CO₂e</span>
              </div>
            ) : <p className={styles.emptyState}>No economic activities logged.</p>}
          </div>
        </section>

        {/* --- 5. Physical Emissions by Item --- */}
        <section className={styles.dashboardCard}>
          <h2>Physical Emissions by Item</h2>
          {physicalSummary && physicalSummary.length > 0 ? (
            <div className={styles.emissionsGrid}>
              {physicalSummary.map((item, index) => (
                <div key={index} className={styles.emissionItem}>
                  <span className={styles.category}>{item.item_name}</span> 
                  <span className={styles.amount}>{item.total_co2e_kg.toFixed(2)} kg CO₂e</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No physical activities yet</p>
            </div>
          )}
        </section>

        {/* --- 6. Economic Impact Analysis --- */}
        <section className={styles.dashboardCard}>
          <h2>Economic Impact Analysis</h2>
          {economicSummary && economicSummary.length > 0 ? (
            <div className={styles.economicGrid}>
              {economicSummary.map((item, index) => (
                <div key={index} className={styles.economicItem}>
                  <span className={styles.sector}>{(item as any).sector ?? 'N/A'}</span>
                  <span className={styles.spending}>{(item as any).total_spending_usd ? `$${(item as any).total_spending_usd.toFixed(2)}` : 'N/A'}</span>
                  <span className={styles.emissions}>{(item as any).total_co2e_kg?.toFixed(1) ?? 'N/A'} kg CO₂e</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No economic activities yet</p>
            </div>
          )}
        </section>

        {/* --- 8. Recent Activities (Full width) --- */}
        <section className={`${styles.dashboardCard} ${styles.fullWidthCard}`}>
          <h2>Recent Activities</h2>
          {activities && activities.length > 0 ? (
            <div className={styles.activitiesList}>
              {activities.map((activity) => (
                <div key={activity._id} className={styles.activityItem}>
                  <div className={styles.activityHeader}>
                    <span className={styles.activityName}>{activity.name}</span>
                    <span className={styles.activityEmissions}>{activity.emissions.toFixed(2)} kg CO₂e</span>
                  </div>
                  <div className={styles.activityDetails}>
                    <span className={styles.activityCategory}>{activity.category}</span>
                    <span>{activity.quantity} {activity.unit}</span>
                    <span>
                      {new Date(activity.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* --- ADD Edit/Delete Buttons --- */}
                  <div className={styles.activityActions}>
                    <button
                      onClick={() => handleEdit(activity)}
                      className={styles.buttonIcon}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(activity._id)} 
                      className={`${styles.buttonIcon} ${styles.buttonDelete}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No activities logged yet. Log your first activity!</p>
            </div>
          )}
        </section>

      </div>

      {/* --- RENDER THE EDIT MODAL --- */}
      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          onClose={handleClose}
          onSave={handleSave} // Calls handleSave on success (to close and refresh)
        />
      )}
    </div>
  );
}