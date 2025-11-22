/**
 * @file Modal component for editing an activity.
 */

'use client';

import { useState, useEffect }from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { EmissionFactor, Activity } from '@/types';

// Import the form styles from your activities page
import formStyles from '../../app/activities/activities.module.css';
// Import the new modal-specific styles
import modalStyles from './EditActivityModal.module.css';

interface EditActivityModalProps {
  activity: Activity;
  onClose: () => void;
  onSave: () => void; // To tell the dashboard to refresh
}

/**
 * Modal component for editing an activity.
 * @param {EditActivityModalProps} props - The props for the component.
 * @returns {JSX.Element} The modal component.
 */
export default function EditActivityModal({
  activity,
  onClose,
  onSave,
}: EditActivityModalProps) {
  // --- This logic is copied from your activities page ---
  const [user, setUser] = useState<any>(null);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    activity.category
  );
  const [selectedFactor, setSelectedFactor] =
    useState<EmissionFactor | null>(null);
  const [quantity, setQuantity] = useState<string>(String(activity.quantity));
  const [monetaryAmount, setMonetaryAmount] = useState<string>(
    String(activity.monetary_amount)
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // --- Modal-specific logic ---
  // We need to load the factors for the pre-selected category
  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    setUser(currentUser);

    if (selectedCategory) {
      loadEmissionFactors(selectedCategory);
    }
  }, [selectedCategory]);


  useEffect(() => {
    if (factors.length > 0 && !selectedFactor) {
      const factorToSelect = factors.find(
        (f) => f._id === activity.emission_factor_id
      );
      if (factorToSelect) {
        setSelectedFactor(factorToSelect);
      }
    }
  }, [factors, activity, selectedFactor]);

  /**
   * Loads the emission factors for a given category.
   * @param {string} category - The category to load factors for.
   */
  const loadEmissionFactors = async (category: string) => {
    setLoading(true);
    try {
      const factorsData = await api.getEmissionFactors(category);
      setFactors(factorsData);
    } catch (error) {
      console.error('Error loading factors:', error);
      setFactors([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the selection of an emission factor.
   * @param {string} factorId - The ID of the selected factor.
   */
  const handleFactorSelect = (factorId: string) => {
    const factor = factors.find((f) => f._id === factorId);
    setSelectedFactor(factor || null);
  };

  /**
   * Handles the form submission for updating an activity.
   * @param {React.FormEvent} e - The form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactor || !user) return;
    setLoading(true);
    setMessage('');

    try {
      const updateData = {
        factor_id: selectedFactor._id,
        quantity: isEconomicActivity ? 1 : parseFloat(quantity),
        monetary_amount: isEconomicActivity
          ? parseFloat(monetaryAmount)
          : 0,
      };
      
      // Use the updateActivity API call
      await api.updateActivity(user._id, activity._id, updateData);
      
      setMessage('Activity updated successfully!');
      
      // Tell the dashboard to refresh and close
      setTimeout(() => {
        onSave(); // This will trigger the refresh and close
      }, 1000);

    } catch (error) {
      setMessage('Error updating activity. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEconomicActivity = selectedFactor?.unit.includes('USD');

  return (
    <div className={modalStyles.modalBackdrop} onClick={onClose}>
      <div
        className={modalStyles.modalContent}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className={modalStyles.modalHeader}>
          <h2>Edit Activity</h2>
          <button onClick={onClose} className={modalStyles.closeButton}>
            &times;
          </button>
        </div>

        <div className={modalStyles.modalBody}>
          {message && (
            <div
              className={`${formStyles.message} ${
                message.includes('Error')
                  ? formStyles.messageError
                  : formStyles.messageSuccess
              }`}
            >
              {message}
            </div>
          )}

          {/* --- This is the reusable form --- */}
          <form onSubmit={handleSubmit} className={formStyles.form}>
            {/* Category (disabled, as we don't want to change it) */}
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel}>Category</label>
              <input
                type="text"
                value={selectedCategory}
                className={formStyles.formInput}
                disabled
              />
            </div>

            {/* Emission Factor Selection */}
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel}>Activity Type</label>
              <select
                value={selectedFactor?._id || ''}
                onChange={(e) => handleFactorSelect(e.target.value)}
                className={formStyles.formSelect}
                required
              >
                <option value="">Select an activity</option>
                {factors.map((factor) => (
                  <option key={factor._id} value={factor._id}>
                    {(factor as any).item_name || (factor as any).name}{' '}
                    ({(factor as any).co2e_value} {factor.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Input based on Activity Type */}
            {selectedFactor && (
              <div className={formStyles.formGroup}>
                {isEconomicActivity ? (
                  <div>
                    <label className={formStyles.formLabel}>
                      Amount Spent (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={monetaryAmount}
                      onChange={(e) => setMonetaryAmount(e.target.value)}
                      className={formStyles.formInput}
                      required
                      min="0.01"
                    />
                  </div>
                ) : (
                  <div>
                    <label className={formStyles.formLabel}>
                      Quantity ({selectedFactor.unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={formStyles.formInput}
                      required
                      min="0.1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className={modalStyles.modalActions}>
              <button
                type="button"
                className={modalStyles.buttonSecondary}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedFactor}
                className={formStyles.submitButton} // Re-use the green button
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}