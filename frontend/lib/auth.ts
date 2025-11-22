/**
 * @file Authentication service for the application.
 * This file contains functions for managing user authentication state.
 */

const USER_STORAGE_KEY = 'sustainability_user';

export interface StoredUser {
  _id: string;
  username: string;
  email?: string;
  created_at: string;
}

export const auth = {
  /**
   * Gets the current user from local storage.
   * @returns {StoredUser | null} The current user, or null if not logged in.
   */
  getCurrentUser: (): StoredUser | null => {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(USER_STORAGE_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Stores the current user in local storage.
   * @param {StoredUser} user - The user to store.
   */
  setCurrentUser: (user: StoredUser): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  /**
   * Clears the current user from local storage.
   */
  clearCurrentUser: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  /**
   * Checks if a user is logged in.
   * @returns {boolean} True if a user is logged in, false otherwise.
   */
  isLoggedIn: (): boolean => {
    return auth.getCurrentUser() !== null;
  }
};