/**
 * @file Login page for the application.
 * This page allows users to sign in or sign up.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import '../styles/login.css';

/**
 * Login page component.
 * @returns {JSX.Element} The login page component.
 */
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  /**
   * Handles the form submission for both sign in and sign up.
   * @param {React.FormEvent} e - The form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (isSignUp) {
      if (!email.trim()) {
        setError('Email is required for sign up');
        return;
      }
      if (!password) {
        setError('Password is required for sign up');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      let userData;

      if (isSignUp) {
        // Sign up with email and password
        userData = await api.signUpWithEmail({
          username: username.trim(),
          email: email.trim(),
          password: password
        });
      } else {
        // Sign in with username or email
        if (email.trim()) {
          // Sign in with email and password
          userData = await api.signInWithEmail({
            email: email.trim(),
            password: password
          });
        } else {
          // Original username-only login
          userData = await api.loginOrCreateUser({
            username: username.trim(),
            email: undefined
          });
        }
      }

      // Store user in local storage
      auth.setCurrentUser(userData);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || `${isSignUp ? 'Sign up' : 'Login'} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggles between sign in and sign up modes.
   */
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="loginContainer">
      <div className="container">
        {/* Hero Card */}
        <div className="heroCard">
          <div className="appLogo">
            <span className="appLogoIcon">🌱</span>
            <h1 className="appLogoText">Sustainability Tracker</h1>
          </div>
          <div className="heroContent">
            <h2 className="heroTitle">Track Your Impact, Protect Our Planet</h2>
            <p className="heroDescription">
              Monitor your carbon footprint, set sustainability goals, and make eco-friendly 
              choices with our intuitive tracking platform.
            </p>
            
            <ul className="featuresList">
              <li className="featureItem">
                <span className="featureIcon">✓</span>
                Calculate your carbon footprint
              </li>
              <li className="featureItem">
                <span className="featureIcon">✓</span>
                Track progress with visual charts
              </li>
              <li className="featureItem">
                <span className="featureIcon">✓</span>
                Get personalized eco-tips
              </li>
              <li className="featureItem">
                <span className="featureIcon">✓</span>
                Join a community of eco-warriors
              </li>
            </ul>
            
            <a href="#" className="ctaButton">
              Learn more about sustainability
            </a>
          </div>
        </div>
        
        {/* Login Card */}
        <div className="loginCard">
          <div className="loginHeader">
            <h2 className="loginTitle">
              {isSignUp ? 'Create your account' : 'Log in to your account'}
            </h2>
            <p className="loginSubtitle">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button 
                type="button" 
                className="signUpLink" 
                onClick={toggleMode}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="formGroup">
              <label htmlFor="username" className="formLabel">
                Username *
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="formInput"
                placeholder="Enter your username"
              />
            </div>

            <div className="formGroup">
              <label htmlFor="email" className="formLabel">
                Email {isSignUp ? '*' : '(optional)'}
              </label>
              <input
                id="email"
                type="email"
                required={isSignUp}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="formInput"
                placeholder="Enter your email"
              />
            </div>

            {isSignUp && (
              <>
                <div className="formGroup">
                  <label htmlFor="password" className="formLabel">
                    Password *
                  </label>
                  <input
                    id="password"
                    type="password"
                    required={isSignUp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="formInput"
                    placeholder="Create a password"
                  />
                </div>

                <div className="formGroup">
                  <label htmlFor="confirmPassword" className="formLabel">
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required={isSignUp}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="formInput"
                    placeholder="Confirm your password"
                  />
                </div>
              </>
            )}

            {!isSignUp && email && (
              <div className="formGroup">
                <label htmlFor="password" className="formLabel">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="formInput"
                  placeholder="Enter your password"
                />
              </div>
            )}

            {error && (
              <div className="errorMessage">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="loginButton"
            >
              {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
          </form>
          
          <p className="footerText">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}