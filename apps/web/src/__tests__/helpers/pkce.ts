/**
 * PKCE helper functions for testing
 */

import { createHash, randomBytes } from 'crypto';

export interface PKCEPair {
    verifier: string;
    challenge: string;
}

/**
 * Generate PKCE code verifier and challenge
 * RFC 7636 compliant
 */
export function generatePKCEPair(): PKCEPair {
    // Generate a random verifier (43-128 characters, base64url encoded)
    const verifier = randomBytes(32)
        .toString('base64url')
        .slice(0, 128);

    // Compute challenge using SHA256
    const challenge = createHash('sha256')
        .update(verifier)
        .digest('base64url');

    return { verifier, challenge };
}

/**
 * Generate an invalid verifier (contains invalid characters)
 */
export function generateInvalidVerifier(): string {
    return 'invalid-verifier-with-special-chars!@#$%';
}

/**
 * Generate a short verifier (less than 43 characters, invalid)
 */
export function generateShortVerifier(): string {
    return 'short';
}

/**
 * Generate an invalid challenge (contains invalid characters)
 */
export function generateInvalidChallenge(): string {
    return 'invalid-challenge-with-special-chars!@#$%';
}

