/**
 * @file Page for logging new activities.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { EmissionFactor, Category } from '@/types';

// 1. Import the new CSS Module
import styles from './activities.module.css';

/**
 * Page component for logging new activities.
 * @returns {JSX.Element} The activities page component.
 */
export default function ActivitiesPage() {
  // --- All your state and logic remains exactly the same ---
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFactor, setSelectedFactor] = useState<EmissionFactor | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [monetaryAmount, setMonetaryAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    
    if (!currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      loadCategories();
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (selectedCategory) {
      loadEmissionFactors(selectedCategory);
    } else {
      setFactors([]);
      setSelectedFactor(null);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const categoriesData = await api.getCategories();
      setCategories(categoriesData);
      const categoriesWithData = await getCategoriesWithData(categoriesData);
      setAvailableCategories(categoriesWithData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const getCategoriesWithData = async (allCategories: Category[]): Promise<Category[]> => {
    const categoriesWithData: Category[] = [];
    for (const category of allCategories) {
      try {
        const factors = await api.getEmissionFactors(category.name);
        if (factors.length > 0) {
          categoriesWithData.push(category);
        }
      } catch (error) {
        console.error(`Error checking factors for ${category.name}:`, error);
      }
    }
    return categoriesWithData;
  };

  const loadEmissionFactors = async (category: string) => {
    try {
      const factorsData = await api.getEmissionFactors(category);
      setFactors(factorsData);
      setSelectedFactor(null);
      setQuantity('');
      setMonetaryAmount('');
    } catch (error) {
      console.error('Error loading factors:', error);
      setFactors([]);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    setSelectedCategory(category);
    setSelectedFactor(null);
    setQuantity('');
    setMonetaryAmount('');
  };

  const handleFactorSelect = (factorId: string) => {
    const factor = factors.find(f => f._id === factorId);
    setSelectedFactor(factor || null);
    setQuantity('');
    setMonetaryAmount('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactor || !user) return;
    setLoading(true);
    setMessage('');
    try {
      const activityData = {
        factor_id: selectedFactor._id,
        quantity: selectedFactor.unit.includes('USD') ? 1 : parseFloat(quantity),
        monetary_amount: selectedFactor.unit.includes('USD') ? parseFloat(monetaryAmount) : 0,
      };
      await api.createActivity(user._id, activityData);
      setMessage('Activity logged successfully!');
      setSelectedFactor(null);
      setQuantity('');
      setMonetaryAmount('');
      setSelectedCategory('');
      setFactors([]);
    } catch (error) {
      setMessage('Error logging activity. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEconomicActivity = selectedFactor?.unit.includes('USD');

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <div>Redirecting...</div>;
  }

  // --- 2. JSX is now using 'styles' from the CSS Module ---
  return (
    <div className={styles.container}>
      {/* Header is removed - sidebar handles user info */}
      <h1 className={styles.pageTitle}>Log New Activity</h1>

      <div className={styles.formContainer}>
        {message && (
          <div 
            className={`
              ${styles.message} 
              ${message.includes('Error') ? styles.messageError : styles.messageSuccess}
            `}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Category Selection */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className={styles.formSelect}
              required
            >
              <option value="">Select a category</option>
              {availableCategories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            {availableCategories.length === 0 && (
              <p className={styles.formHint}>
                Loading available categories...
              </p>
            )}
          </div>

          {/* Emission Factor Selection */}
          {selectedCategory && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Activity Type
              </label>
              {factors.length === 0 ? (
                <div className={styles.loadingBox}>
                  <p>Loading activities for {selectedCategory}...</p>
                </div>
              ) : (
                <select
                  value={selectedFactor?._id || ''}
                  onChange={(e) => handleFactorSelect(e.target.value)}
                  className={styles.formSelect}
                  required
                >
                  <option value="">Select an activity</option>
                  {factors.map((factor) => (
                    <option key={factor._id} value={factor._id}>
                        {(factor as any).item_name || (factor as any).name || factor._id} ({(factor as any).co2e_value || (factor as any).emission_value} {factor.unit})
                      </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Dynamic Input based on Activity Type */}
          {selectedFactor && (
            <div className={styles.formGroup}>
              {isEconomicActivity ? (
                <div>
                  <label className={styles.formLabel}>
                    Amount Spent (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monetaryAmount}
                    onChange={(e) => setMonetaryAmount(e.target.value)}
                    className={styles.formInput}
                    placeholder="Enter amount spent"
                    required
                    min="0.01"
                  />
                  <p className={styles.formHint}>
                    This will calculate emissions based on ${monetaryAmount || '0'} × {(selectedFactor as any).co2e_value || (selectedFactor as any).emission_value} {selectedFactor.unit}
                  </p>
                </div>
              ) : (
                <div>
                  <label className={styles.formLabel}>
                    Quantity ({selectedFactor.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={styles.formInput}
                    placeholder={`Enter quantity in ${selectedFactor.unit}`}
                    required
                    min="0.1"
                  />
                  <p className={styles.formHint}>
                    This will calculate emissions based on {quantity || '0'} {selectedFactor.unit} × {(selectedFactor as any).co2e_value || (selectedFactor as any).emission_value} kg CO₂e per {selectedFactor.unit}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedFactor}
            className={styles.submitButton}
          >
            {loading ? 'Logging Activity...' : 'Log Activity'}
          </button>
        </form>
      </div>
    </div>
  );
}