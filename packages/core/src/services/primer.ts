/**
 * Primer generation service
 * 
 * Creates and manages `.pm/primer.md` files that serve as comprehensive project context documents.
 * The primer has two distinct sections:
 * - Machine-owned: Auto-generated from project conventions
 * - User-owned: Manual documentation space
 * 
 * The service preserves user edits when refreshing conventions.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ProjectConventions } from './interview';

/**
 * Result of primer generation
 */
export interface PrimerGenerationResult {
    path: string;           // Full path to primer.md
    created: boolean;       // True if file was newly created
    updated: boolean;       // True if existing file was updated
    content: string;        // Full generated content
}

/**
 * Parsed primer content with separated sections
 */
export interface PrimerContent {
    machineSection: string;  // Machine-generated content
    userSection: string;     // User-editable content
}

/**
 * Primer status check result
 */
export interface PrimerStatusResult {
    exists: boolean;        // True if primer.md exists
    current: boolean;       // True if conventions appear to be current
    lastUpdated?: string;   // Last modification timestamp
}

/**
 * Delimiters for machine-owned section
 */
const MACHINE_BEGIN = '<!-- BEGIN_MACHINE_GENERATED -->';
const MACHINE_END = '<!-- END_MACHINE_GENERATED -->';

/**
 * Generates the machine-owned section from project conventions
 */
export function generateMachineSection(conventions: ProjectConventions): string {
    const environmentsList = conventions.environments
        .map(env => `- ${env}`)
        .join('\n');

    const commandsSection = `### Commands

#### Testing
\`\`\`bash
${conventions.testCommand}
\`\`\`

#### Development
\`\`\`bash
${conventions.devCommand}
\`\`\`
${conventions.lintCommand ? `
#### Linting
\`\`\`bash
${conventions.lintCommand}
\`\`\`
` : ''}${conventions.typeCheckCommand ? `
#### Type Checking
\`\`\`bash
${conventions.typeCheckCommand}
\`\`\`
` : ''}${conventions.buildCommand ? `
#### Build
\`\`\`bash
${conventions.buildCommand}
\`\`\`
` : ''}`;

    const content = `${MACHINE_BEGIN}
# Project Primer

## Project Conventions

### Stack
- **Framework/Language**: ${conventions.stack}
- **Description**: ${conventions.stackDescription}

${commandsSection}

### Environments
${environmentsList}

### Configuration
- **Docker Enabled**: ${conventions.dockerEnabled ? 'Yes' : 'No'}${conventions.dockerfile ? `\n- **Dockerfile**: \`${conventions.dockerfile}\`` : ''}
- **Recon Mode**: ${conventions.reconMode}
- **Upload Mode**: ${conventions.uploadMode}
- **Last Updated**: ${new Date().toISOString()}

${MACHINE_END}`;

    return content;
}

/**
 * Generates a template for the user-owned section
 */
export function generateUserSection(): string {
    return `## Project Overview

[Add your project overview here. This section is manually maintained.]

### Key Components

[Document major components and modules in your project]

### Important Notes

[Important information for developers working on this project]

### Common Tasks

[Common workflows and how to perform them]

### Architecture Decisions

[Document key technical decisions and their rationale]

### Getting Started

[Add any project-specific setup instructions]

### Common Issues & Workarounds

[Document known problems and solutions]`;
}

/**
 * Combines machine and user sections into complete primer content
 */
export function generatePrimerContent(machineSection: string, userSection: string): string {
    return `${machineSection}

${userSection}`;
}

/**
 * Reads and parses an existing primer file
 */
export function readPrimer(pmDir: string): PrimerContent | null {
    const primerPath = path.join(pmDir, 'primer.md');

    if (!fs.existsSync(primerPath)) {
        return null;
    }

    const content = fs.readFileSync(primerPath, 'utf-8');
    return parsePrimerContent(content);
}

/**
 * Parses primer markdown into machine and user sections
 */
export function parsePrimerContent(content: string): PrimerContent {
    const beginIndex = content.indexOf(MACHINE_BEGIN);
    const endIndex = content.indexOf(MACHINE_END);

    if (beginIndex === -1 || endIndex === -1) {
        // If delimiters not found, assume entire content is user section
        return {
            machineSection: '',
            userSection: content,
        };
    }

    const machineSection = content.substring(
        beginIndex,
        endIndex + MACHINE_END.length
    );

    const userSection = content
        .substring(endIndex + MACHINE_END.length)
        .trim();

    return {
        machineSection,
        userSection,
    };
}

/**
 * Generates or updates a primer file
 * 
 * If the file already exists, preserves user edits and regenerates machine section.
 * 
 * @param pmDir Path to .pm directory
 * @param conventions Project conventions
 * @returns Generation result with path and status
 */
export function generatePrimer(
    pmDir: string,
    conventions: ProjectConventions
): PrimerGenerationResult {
    // Ensure .pm directory exists
    if (!fs.existsSync(pmDir)) {
        fs.mkdirSync(pmDir, { recursive: true });
    }

    const primerPath = path.join(pmDir, 'primer.md');
    const created = !fs.existsSync(primerPath);

    // Read existing primer if it exists
    let userSection = generateUserSection();
    if (!created) {
        const existing = readPrimer(pmDir);
        if (existing && existing.userSection.trim()) {
            userSection = existing.userSection;
        }
    }

    // Generate machine section
    const machineSection = generateMachineSection(conventions);

    // Combine sections
    const content = generatePrimerContent(machineSection, userSection);

    // Write primer
    fs.writeFileSync(primerPath, content, 'utf-8');

    return {
        path: primerPath,
        created,
        updated: !created,
        content,
    };
}

/**
 * Refreshes the machine-owned section with new conventions
 * Preserves user edits and any existing user section.
 * 
 * @param pmDir Path to .pm directory
 * @param conventions Updated conventions
 * @returns Refresh result
 */
export function refreshPrimer(
    pmDir: string,
    conventions: ProjectConventions
): PrimerGenerationResult {
    const primerPath = path.join(pmDir, 'primer.md');

    // Read existing primer to preserve user edits
    let userSection = generateUserSection();

    if (fs.existsSync(primerPath)) {
        const existing = readPrimer(pmDir);
        if (existing && existing.userSection.trim()) {
            userSection = existing.userSection;
        }
    }

    // Generate new machine section
    const machineSection = generateMachineSection(conventions);

    // Combine sections
    const content = generatePrimerContent(machineSection, userSection);

    // Write updated primer
    fs.writeFileSync(primerPath, content, 'utf-8');

    return {
        path: primerPath,
        created: false,
        updated: true,
        content,
    };
}

/**
 * Extracts just the user-editable section of the primer
 */
export function getUserSection(pmDir: string): string | null {
    const primer = readPrimer(pmDir);
    return primer ? primer.userSection : null;
}

/**
 * Updates the user-editable section while preserving machine content
 * 
 * @throws Error if primer does not exist
 */
export function updateUserSection(pmDir: string, userContent: string): string {
    const primerPath = path.join(pmDir, 'primer.md');

    if (!fs.existsSync(primerPath)) {
        throw new Error(`Primer not found at ${primerPath}. Generate a primer first with generatePrimer().`);
    }

    // Read existing primer to get machine section
    const existing = readPrimer(pmDir);

    if (!existing) {
        throw new Error(`Failed to parse existing primer at ${primerPath}`);
    }

    const machineSection = existing.machineSection;

    // Combine sections
    const content = generatePrimerContent(machineSection, userContent);

    // Write updated primer
    fs.writeFileSync(primerPath, content, 'utf-8');

    return primerPath;
}

/**
 * Checks if a primer exists and whether it's current with conventions
 */
export function checkPrimerStatus(
    pmDir: string,
    conventions: ProjectConventions
): PrimerStatusResult {
    const primerPath = path.join(pmDir, 'primer.md');

    if (!fs.existsSync(primerPath)) {
        return {
            exists: false,
            current: false,
        };
    }

    try {
        const stats = fs.statSync(primerPath);
        const lastUpdated = stats.mtime.toISOString();

        // Read primer to check if it contains current conventions
        const primer = readPrimer(pmDir);

        if (!primer) {
            return {
                exists: true,
                current: false,
                lastUpdated,
            };
        }

        // Check if machine section contains current stack (simple heuristic)
        const containsStack = primer.machineSection.includes(conventions.stack);

        return {
            exists: true,
            current: containsStack,
            lastUpdated,
        };
    } catch (error) {
        return {
            exists: true,
            current: false,
            lastUpdated: new Date().toISOString(),
        };
    }
}

/**
 * Syncs conventions from SaaS to local primer file
 * 
 * This function:
 * 1. Reads the existing primer from disk
 * 2. Extracts and preserves the user-owned section
 * 3. Regenerates the machine section from conventions
 * 4. Writes back to disk
 * 
 * @param pmDir Path to .pm directory
 * @param conventions Project conventions from SaaS
 * @returns Updated primer path and status
 */
export function syncConventionsToPrimer(
    pmDir: string,
    conventions: ProjectConventions
): PrimerGenerationResult {
    // This is essentially the same as refreshPrimer
    // but with a clearer semantic purpose (syncing from SaaS)
    return refreshPrimer(pmDir, conventions);
}
