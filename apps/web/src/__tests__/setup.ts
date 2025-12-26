/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 */

import { vi } from 'vitest';

// Mock Next.js headers
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    })),
    headers: vi.fn(() => new Headers()),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret';

