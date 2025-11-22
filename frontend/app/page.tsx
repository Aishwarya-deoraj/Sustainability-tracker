/**
 * @file Home page for the application.
 * This page redirects the user to the dashboard if they are logged in, otherwise to the login page.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

/**
 * Home page component.
 * @returns {JSX.Element} The home page component.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}