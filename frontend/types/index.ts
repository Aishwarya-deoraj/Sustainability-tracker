/**
 * @file Type definitions for the application.
 */

/**
 * Represents the data required for a user to log in.
 */
export interface LoginData {
  username: string;
  email?: string;
}

/**
 * Represents the data required for a user to sign up.
 */
export interface SignUpData {
  username: string;
  email: string;
  password: string;
}

/**
 * Represents the data required for a user to sign in.
 */
export interface SignInData {
  email: string;
  password: string;
}

/**
 * Represents a user.
 */
export interface User {
  _id: string;
  username: string;
  email?: string;
  created_at: string;
}

/**
 * Represents a category of emission factors.
 */
export interface Category {
  _id: string;
  name: string;
  description?: string;
}

/**
 * Represents an emission factor.
 */
export interface EmissionFactor {
  _id: string;
  name: string;
  category: string;
  unit: string;
  emission_factor: number;
  source?: string;
}

/**
 * Represents an activity logged by a user.
 */
export interface Activity {
  _id: string;
  user_id: string;
  name: string;
  category: string;
  emission_factor_id: string;
  quantity: number;
  monetary_amount: number;
  unit: string;
  date: string;
  emissions: number;
}

/**
 * Represents a summary of emissions for an item.
 */
export interface EmissionSummary {
  item_name: string; // Changed from 'category'
  total_co2e_kg: number;
}

/**
 * Represents a summary of emissions for a category.
 */
export interface CategorySummary {
  category: string;
  total_co2e_kg: number;
}

/**
 * Represents an impactor.
 */
export interface Impactor {
  item_name?: string;
  sector?: string;
  total_co2e_kg: number;
}

/**
 * Represents the biggest impactors.
 */
export interface BiggestImpactors {
  biggest_physical: Impactor | null;
  biggest_economic: Impactor | null;
}

/**
 * Represents the economic impact of emissions.
 */
export interface EconomicImpact {
  category: string;
  economic_cost: number;
  percentage: number;
}

/**
 * Represents a summary of emissions over time.
 */
export interface TimeSummary {
  label: string;
  emissions: number;
}