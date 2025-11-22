/**
 * @file Root layout for the application.
 * @see https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates
 */

import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

// Import the Sidebar component
import Sidebar from '../components/Sidebar';

// Set up the fonts
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

// We can now add metadata back!
export const metadata: Metadata = {
  title: 'Sustainability Tracker',
  description: 'Track your carbon footprint',
};

/**
 * Root layout component for the application.
 * @param {object} props - The props for the component.
 * @param {React.ReactNode} props.children - The children to render.
 * @returns {JSX.Element} The root layout component.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Apply fonts to the html tag
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <head />
      <body className={`font-sans flex h-screen overflow-hidden bg-gray-100`}>
        
        {/* Render the Sidebar component */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 font-sans">
          {children}
        </main>
      </body>
    </html>
  );
}