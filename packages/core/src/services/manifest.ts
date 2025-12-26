/**
 * Manifest service - handles .pm/project.json and .pm/local.json files
 * 
 * The manifest files link local repositories to SaaS projects:
 * - .pm/project.json: Checked into git, contains project ID and basic config
 * - .pm/local.json: Gitignored, contains user-specific settings and auth
 * - .pm/recon.yml: Gitignored, contains recon profile for safe command execution
 * - .pm/primer.md: Gitignored, auto-generated project primer
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Project } from '@projectflow/db';
import type { ReconProfile } from './recon';
import { generateReconProfileYAML, saveReconProfile as saveReconProfileJSON } from './recon';

/**
 * Project manifest file (.pm/project.json)
 * This file is checked into version control
 */
export interface ProjectManifest {
    version: string;
    projectId: string;
    projectName: string;
    repoRoot: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Local user-specific settings (.pm/local.json)
 * This file is gitignored and contains user-specific data
 */
export interface LocalManifest {
    version: string;
    userId: string;
    lastSyncAt?: string;
    userPreferences?: {
        autoSync?: boolean;
        defaultBranch?: string;
    };
}

/**
 * Combined manifest data (both project and local)
 */
export interface ManifestData {
    project: ProjectManifest;
    local?: LocalManifest;
}

const MANIFEST_VERSION = '1.0.0';
const PM_DIR = '.pm';
const PROJECT_MANIFEST_FILE = 'project.json';
const LOCAL_MANIFEST_FILE = 'local.json';
const RECON_PROFILE_FILE = 'recon.yml';
const RECON_PROFILE_JSON_FILE = 'recon.json';

/**
 * Discovers the .pm directory by walking up from current directory
 * 
 * @param startDir Starting directory (defaults to process.cwd())
 * @returns Path to .pm directory or null if not found
 */
export function discoverManifestDir(startDir: string = process.cwd()): string | null {
    let currentDir = path.resolve(startDir);
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
        const pmDir = path.join(currentDir, PM_DIR);
        if (fs.existsSync(pmDir) && fs.statSync(pmDir).isDirectory()) {
            return pmDir;
        }
        currentDir = path.dirname(currentDir);
    }

    return null;
}

/**
 * Reads the project manifest from .pm/project.json
 * 
 * @param pmDir Path to .pm directory
 * @returns Project manifest or null if not found
 */
export function readProjectManifest(pmDir: string): ProjectManifest | null {
    const manifestPath = path.join(pmDir, PROJECT_MANIFEST_FILE);

    if (!fs.existsSync(manifestPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(content) as ProjectManifest;

        // Validate required fields
        if (!manifest.version || !manifest.projectId || !manifest.projectName) {
            throw new Error('Invalid project manifest: missing required fields');
        }

        return manifest;
    } catch (error) {
        throw new Error(`Failed to read project manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Reads the local manifest from .pm/local.json
 * 
 * @param pmDir Path to .pm directory
 * @returns Local manifest or null if not found
 */
export function readLocalManifest(pmDir: string): LocalManifest | null {
    const manifestPath = path.join(pmDir, LOCAL_MANIFEST_FILE);

    if (!fs.existsSync(manifestPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(content) as LocalManifest;

        // Validate required fields
        if (!manifest.version || !manifest.userId) {
            throw new Error('Invalid local manifest: missing required fields');
        }

        return manifest;
    } catch (error) {
        throw new Error(`Failed to read local manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Reads both project and local manifests
 * 
 * @param startDir Starting directory (defaults to process.cwd())
 * @returns Manifest data or null if no project manifest found
 */
export function readManifests(startDir: string = process.cwd()): ManifestData | null {
    const pmDir = discoverManifestDir(startDir);

    if (!pmDir) {
        return null;
    }

    const project = readProjectManifest(pmDir);

    if (!project) {
        return null;
    }

    const local = readLocalManifest(pmDir);

    return {
        project,
        local: local || undefined,
    };
}

/**
 * Writes the project manifest to .pm/project.json
 * 
 * @param repoRoot Repository root directory
 * @param projectId Project ID from SaaS
 * @param projectName Project name
 * @returns Path to created manifest file
 */
export function writeProjectManifest(
    repoRoot: string,
    projectId: string,
    projectName: string
): string {
    const pmDir = path.join(repoRoot, PM_DIR);

    // Create .pm directory if it doesn't exist
    if (!fs.existsSync(pmDir)) {
        fs.mkdirSync(pmDir, { recursive: true });
    }

    const manifest: ProjectManifest = {
        version: MANIFEST_VERSION,
        projectId,
        projectName,
        repoRoot,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const manifestPath = path.join(pmDir, PROJECT_MANIFEST_FILE);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    return manifestPath;
}

/**
 * Writes the local manifest to .pm/local.json
 * 
 * @param repoRoot Repository root directory
 * @param userId User ID from SaaS
 * @param preferences Optional user preferences
 * @returns Path to created manifest file
 */
export function writeLocalManifest(
    repoRoot: string,
    userId: string,
    preferences?: LocalManifest['userPreferences']
): string {
    const pmDir = path.join(repoRoot, PM_DIR);

    // Create .pm directory if it doesn't exist
    if (!fs.existsSync(pmDir)) {
        fs.mkdirSync(pmDir, { recursive: true });
    }

    const manifest: LocalManifest = {
        version: MANIFEST_VERSION,
        userId,
        lastSyncAt: new Date().toISOString(),
        userPreferences: preferences,
    };

    const manifestPath = path.join(pmDir, LOCAL_MANIFEST_FILE);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    return manifestPath;
}

/**
 * Updates the local manifest with new sync time
 * 
 * @param pmDir Path to .pm directory
 */
export function updateLocalManifestSyncTime(pmDir: string): void {
    const local = readLocalManifest(pmDir);

    if (!local) {
        throw new Error('Local manifest not found');
    }

    const manifestPath = path.join(pmDir, LOCAL_MANIFEST_FILE);
    local.lastSyncAt = new Date().toISOString();

    fs.writeFileSync(manifestPath, JSON.stringify(local, null, 2) + '\n', 'utf-8');
}

/**
 * Updates the project manifest
 * 
 * @param pmDir Path to .pm directory
 * @param updates Partial updates to apply
 */
export function updateProjectManifest(
    pmDir: string,
    updates: Partial<Omit<ProjectManifest, 'version' | 'createdAt'>>
): void {
    const project = readProjectManifest(pmDir);

    if (!project) {
        throw new Error('Project manifest not found');
    }

    const manifestPath = path.join(pmDir, PROJECT_MANIFEST_FILE);
    const updatedManifest: ProjectManifest = {
        ...project,
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2) + '\n', 'utf-8');
}

/**
 * Creates a .gitignore file in .pm directory if it doesn't exist
 * Ensures local.json is ignored
 * 
 * @param pmDir Path to .pm directory
 */
export function ensureGitignore(pmDir: string): void {
    const gitignorePath = path.join(pmDir, '.gitignore');
    const content = `# Local user-specific settings (do not commit)
local.json

# Recon output (can be large and regenerated)
recon.yml
*.recon.log

# Primer (regenerated from SaaS)
primer.md
`;

    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, content, 'utf-8');
    }
}

/**
 * Initializes .pm directory with manifests
 * 
 * @param repoRoot Repository root directory
 * @param project Project data from SaaS
 * @param userId User ID
 * @returns Paths to created manifest files
 */
export function initializeManifests(
    repoRoot: string,
    project: Pick<Project, 'id' | 'name'>,
    userId: string
): { projectManifest: string; localManifest: string; pmDir: string } {
    const pmDir = path.join(repoRoot, PM_DIR);

    // Create .pm directory
    if (!fs.existsSync(pmDir)) {
        fs.mkdirSync(pmDir, { recursive: true });
    }

    // Create .gitignore
    ensureGitignore(pmDir);

    // Write manifests
    const projectManifest = writeProjectManifest(repoRoot, project.id, project.name);
    const localManifest = writeLocalManifest(repoRoot, userId, {
        autoSync: true,
    });

    return {
        projectManifest,
        localManifest,
        pmDir,
    };
}

/**
 * Gets the project ID from the current directory's manifest
 * 
 * @param startDir Starting directory (defaults to process.cwd())
 * @returns Project ID or null if not found
 */
export function getProjectIdFromManifest(startDir: string = process.cwd()): string | null {
    const manifests = readManifests(startDir);
    return manifests?.project.projectId || null;
}

/**
 * Gets the user ID from the current directory's local manifest
 * 
 * @param startDir Starting directory (defaults to process.cwd())
 * @returns User ID or null if not found
 */
export function getUserIdFromManifest(startDir: string = process.cwd()): string | null {
    const manifests = readManifests(startDir);
    return manifests?.local?.userId || null;
}

/**
 * Validates that manifests exist and are valid
 * 
 * @param startDir Starting directory (defaults to process.cwd())
 * @returns Validation result
 */
export function validateManifests(startDir: string = process.cwd()): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    const pmDir = discoverManifestDir(startDir);

    if (!pmDir) {
        errors.push('No .pm directory found. Run pm.init to initialize.');
        return { valid: false, errors, warnings };
    }

    const project = readProjectManifest(pmDir);

    if (!project) {
        errors.push('No project.json found in .pm directory.');
    } else {
        // Validate project manifest fields
        if (!project.projectId) {
            errors.push('project.json missing projectId');
        }
        if (!project.projectName) {
            errors.push('project.json missing projectName');
        }
        if (!project.repoRoot) {
            warnings.push('project.json missing repoRoot');
        }
    }

    const local = readLocalManifest(pmDir);

    if (!local) {
        warnings.push('No local.json found. Run pm.init to create user-specific settings.');
    } else {
        // Validate local manifest fields
        if (!local.userId) {
            errors.push('local.json missing userId');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Reads the recon profile from .pm/recon.yml or .pm/recon.json
 * 
 * @param pmDir Path to .pm directory
 * @returns Recon profile or null if not found
 */
export function readReconProfile(pmDir: string): ReconProfile | null {
    // Try JSON first (for internal use)
    const jsonPath = path.join(pmDir, RECON_PROFILE_JSON_FILE);
    if (fs.existsSync(jsonPath)) {
        try {
            const content = fs.readFileSync(jsonPath, 'utf-8');
            return JSON.parse(content) as ReconProfile;
        } catch (error) {
            throw new Error(`Failed to read recon profile: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    // Try YAML (user-editable version)
    const ymlPath = path.join(pmDir, RECON_PROFILE_FILE);
    if (fs.existsSync(ymlPath)) {
        try {
            const content = fs.readFileSync(ymlPath, 'utf-8');
            // Parse YAML - for now, convert to JSON format
            // Full YAML parsing would require additional dependencies
            console.warn('YAML parsing not yet implemented, returning null');
            return null;
        } catch (error) {
            throw new Error(`Failed to read recon profile: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    return null;
}

/**
 * Writes the recon profile to both JSON and YAML formats
 * 
 * @param pmDir Path to .pm directory
 * @param profile Recon profile to write
 */
export function writeReconProfile(pmDir: string, profile: ReconProfile): {
    jsonPath: string;
    ymlPath: string;
} {
    // Ensure .pm directory exists
    if (!fs.existsSync(pmDir)) {
        fs.mkdirSync(pmDir, { recursive: true });
    }
    
    // Write JSON format (for internal use and programmatic access)
    const jsonPath = path.join(pmDir, RECON_PROFILE_JSON_FILE);
    fs.writeFileSync(jsonPath, JSON.stringify(profile, null, 2) + '\n', 'utf-8');
    
    // Write YAML format (user-friendly)
    const ymlPath = path.join(pmDir, RECON_PROFILE_FILE);
    const yaml = generateReconProfileYAML(profile);
    fs.writeFileSync(ymlPath, yaml, 'utf-8');
    
    return { jsonPath, ymlPath };
}

/**
 * Updates the recon profile
 * 
 * @param pmDir Path to .pm directory
 * @param profile New recon profile
 */
export function updateReconProfile(pmDir: string, profile: ReconProfile): void {
    writeReconProfile(pmDir, profile);
}

/**
 * Checks if recon profile exists in the .pm directory
 * 
 * @param pmDir Path to .pm directory
 * @returns true if recon profile exists
 */
export function hasReconProfile(pmDir: string): boolean {
    const jsonPath = path.join(pmDir, RECON_PROFILE_JSON_FILE);
    const ymlPath = path.join(pmDir, RECON_PROFILE_FILE);
    return fs.existsSync(jsonPath) || fs.existsSync(ymlPath);
}

