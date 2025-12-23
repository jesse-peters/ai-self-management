'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            ProjectFlow
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-4">
            AI-powered project management with MCP
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Manage your projects and tasks with AI assistance. Get started in seconds.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/auth/login"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Create Account
            </Link>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Projects</h3>
              <p className="text-gray-600">
                Organize your work into projects and track progress effortlessly.
              </p>
            </div>
            <div className="p-6">
              <div className="text-3xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Tasks</h3>
              <p className="text-gray-600">
                Create tasks, set priorities, and track their status in real-time.
              </p>
            </div>
            <div className="p-6">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Assistance</h3>
              <p className="text-gray-600">
                Use MCP tools to get AI-powered insights and assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
