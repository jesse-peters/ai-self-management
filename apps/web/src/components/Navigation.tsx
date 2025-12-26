'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

export function Navigation() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <nav className="bg-white dark:bg-gray-900 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">ProjectFlow</div>
          </div>
        </div>
      </nav>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-lg font-semibold text-gray-900 dark:text-white">
              ProjectFlow
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {user ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}



