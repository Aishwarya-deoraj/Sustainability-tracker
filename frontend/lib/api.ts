/**
 * @file API client for the application.
 * This file contains functions for making requests to the backend API.
 */

import { Category, EmissionFactor, Activity, EmissionSummary, EconomicImpact, User, LoginData, CategorySummary, BiggestImpactors, TimeSummary } from '@/types';

const API_BASE_URL = 'http://localhost:8000';

export const api = {
  /**
   * Logs in or creates a user with a username.
   * @param {LoginData} loginData - The login data.
   * @returns {Promise<User>} The user object.
   */
  loginOrCreateUser: async (loginData: LoginData): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }
    
    // The backend should return the full user object
    return {
      _id: result.user_id || result._id,
      username: result.username,
      email: result.email,
      created_at: result.created_at
    };
  },

  /**
   * Signs up a user with an email and password.
   * @param {object} data - The sign up data.
   * @param {string} data.username - The username.
   * @param {string} data.email - The email.
   * @param {string} data.password - The password.
   * @returns {Promise<User>} The user object.
   */
  signUpWithEmail: async (data: { username: string; email: string; password: string }): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Sign up failed');
    }
    
    return {
      _id: result.user_id || result._id,
      username: result.username,
      email: result.email,
      created_at: result.created_at
    };
  },

  /**
   * Signs in a user with an email and password.
   * @param {object} data - The sign in data.
   * @param {string} data.email - The email.
   * @param {string} data.password - The password.
   * @returns {Promise<User>} The user object.
   */
  signInWithEmail: async (data: { email: string; password: string }): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Invalid email or password');
    }
    
    return {
      _id: result.user_id || result._id,
      username: result.username,
      email: result.email,
      created_at: result.created_at
    };
  },

  /**
   * Gets a user by their ID.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<User>} The user object.
   */
  getUser: async (userId: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    
    return response.json();
  },

  /**
   * Gets all categories.
   * @returns {Promise<Category[]>} A list of categories.
   */
  getCategories: async (): Promise<Category[]> => {
    const response = await fetch(`${API_BASE_URL}/categories`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    return response.json();
  },

  /**
   * Gets emission factors.
   * @param {string} [category] - The category to filter by.
   * @param {string} [search] - The search term to filter by.
   * @returns {Promise<EmissionFactor[]>} A list of emission factors.
   */
  getEmissionFactors: async (category?: string, search?: string): Promise<EmissionFactor[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    
    const response = await fetch(`${API_BASE_URL}/emission-factors?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch emission factors');
    }
    
    return response.json();
  },

  /**
   * Creates an activity for a user.
   * @param {string} userId - The ID of the user.
   * @param {any} activityData - The activity data.
   * @returns {Promise<any>} The created activity.
   */
  createActivity: async (userId: string, activityData: any) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create activity');
    }
    
    return result;
  },

  /**
   * Gets all activities for a user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<Activity[]>} A list of activities.
   */
  getUserActivities: async (userId: string): Promise<Activity[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/activities`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch user activities');
    }
    
    return response.json();
  },


  /**
   * Gets the physical summary for a user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<EmissionSummary[]>} The physical summary.
   */
  getPhysicalSummary: async (userId: string): Promise<EmissionSummary[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/summary/physical`);
    if (!response.ok) throw new Error('Failed to fetch physical summary');
    return response.json();
  },

  /**
   * Gets the economic summary for a user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<EconomicImpact[]>} The economic summary.
   */
  getEconomicSummary: async (userId: string): Promise<EconomicImpact[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/summary/economic`);
    if (!response.ok) throw new Error('Failed to fetch economic summary');
    return response.json();
  },

  /**
   * Gets the category summary for a user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<CategorySummary[]>} The category summary.
   */
  getCategorySummary: async (userId: string): Promise<CategorySummary[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/summary/by-category`);
    if (!response.ok) throw new Error('Failed to fetch category summary');
    return response.json();
  },

  /**
   * Gets the biggest impactors for a user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<BiggestImpactors>} The biggest impactors.
   */
  getBiggestImpactors: async (userId: string): Promise<BiggestImpactors> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/summary/biggest-impactors`);
    if (!response.ok) throw new Error('Failed to fetch biggest impactors');
    return response.json();
  },

  /**
   * Gets the monthly summary for a user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<TimeSummary[]>} The monthly summary.
   */
  getMonthlySummary: async (userId: string): Promise<TimeSummary[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/summary/monthly`);
    if (!response.ok) throw new Error('Failed to fetch monthly summary');
    return response.json();
  },

  /**
   * Gets the weekly summary for a user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<TimeSummary[]>} The weekly summary.
   */
  getWeeklySummary: async (userId: string): Promise<TimeSummary[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/summary/weekly`);
    if (!response.ok) throw new Error('Failed to fetch weekly summary');
    return response.json();
  },

  /**
   * Gets the daily summary for a user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<TimeSummary[]>} The daily summary.
   */
  getDailySummary: async (userId: string): Promise<TimeSummary[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/summary/daily`);
    if (!response.ok) throw new Error('Failed to fetch daily summary');
    return response.json();
  },

  /**
   * Updates an activity for a user.
   * @param {string} userId - The ID of the user.
   * @param {string} activityId - The ID of the activity.
   * @param {any} updateData - The data to update.
   * @returns {Promise<any>} The updated activity.
   */
  updateActivity: async (userId: string, activityId: string, updateData: any) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/activities/${activityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update activity');
    }

    return result;
  },
  
  /**
   * Deletes an activity for a user.
   * @param {string} userId - The ID of the user.
   * @param {string} activityId - The ID of the activity.
   * @returns {Promise<{ message: string }>} A success message.
   */
  deleteActivity: async (userId: string, activityId: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/activities/${activityId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to delete activity');
    }

    // Success returns an empty 200/204, or the JSON message {"message": "..."}
    try {
        return await response.json();
    } catch {
        return { message: 'Activity deleted successfully' };
    }
  },
};