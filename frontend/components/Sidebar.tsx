/**
 * @file Sidebar component for the application.
 * This component provides navigation and user information.
 */

'use client'; 

// Import your new CSS Module file
import styles from '@/app/styles/Sidebar.module.css';

// All the client-side imports
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { LayoutDashboard, ListPlus, LogOut, CircleUser, PieChart } from 'lucide-react';

/**
 * Sidebar component.
 * @returns {JSX.Element | null} The sidebar component.
 */
export default function Sidebar() {
  // All the logic and state is now safely in this file
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    auth.clearCurrentUser();
    setUser(null);
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;
  
  // Logic to decide if we show the sidebar
  if (isLoading || pathname === '/login' || !user) {
    return null; // Don't render anything if loading, on login, or no user
  }

  // --- This is the Sidebar JSX ---
  return (
    <aside className={styles.sidebar}>
      
      <div className={styles.navArea}>
        {/* Logo */}
        <div className={styles.logo}>
            <span>🌱</span>
            <span>Sustainability Tracker</span>
        </div>

        {/* Nav Links */}
        <nav className={styles.navLinks}>
          <Link
            href="/dashboard"
            className={`
              ${styles.navLink} 
              ${isActive('/dashboard') ? styles.navLinkActive : ''}
            `}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/visualizations"
            className={`
              ${styles.navLink} 
              ${isActive('/visualizations') ? styles.navLinkActive : ''}
            `}
          >
            <PieChart size={20} />
            <span>Visualizations</span>
          </Link>

          
          <Link
            href="/activities"
            className={`
              ${styles.navLink} 
              ${isActive('/activities') ? styles.navLinkActive : ''}
            `}
          >
            <ListPlus size={20} />
            <span>Log Activity</span>
          </Link>
        </nav>
      </div>



      {/* User Info (Pinned to bottom) */}
      <div className={styles.userArea}>
        <div className={styles.userInfo}>
          <CircleUser size={36} />
          <div className={styles.userInfoDetails}>
            <div className={styles.userInfoWelcome}>Welcome back,</div>
            <span>{user.username}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className={styles.logoutButton}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}