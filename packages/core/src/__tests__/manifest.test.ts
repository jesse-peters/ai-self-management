/**
 * Tests for manifest service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    discoverManifestDir,
    readProjectManifest,
    readLocalManifest,
    readManifests,
    writeProjectManifest,
    writeLocalManifest,
    initializeManifests,
    getProjectIdFromManifest,
    getUserIdFromManifest,
    validateManifests,
    updateProjectManifest,
    updateLocalManifestSyncTime,
} from '../services/manifest';

describe('Manifest Service', () => {
    let tempDir: string;

    beforeEach(() => {
        // Create a temporary directory for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
    });

    afterEach(() => {
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('discoverManifestDir', () => {
        it('should find .pm directory in current directory', () => {
            const pmDir = path.join(tempDir, '.pm');
            fs.mkdirSync(pmDir);

            const result = discoverManifestDir(tempDir);
            expect(result).toBe(pmDir);
        });

        it('should find .pm directory in parent directory', () => {
            const pmDir = path.join(tempDir, '.pm');
            const subDir = path.join(tempDir, 'sub', 'dir');
            fs.mkdirSync(pmDir);
            fs.mkdirSync(subDir, { recursive: true });

            const result = discoverManifestDir(subDir);
            expect(result).toBe(pmDir);
        });

        it('should return null if no .pm directory found', () => {
            const result = discoverManifestDir(tempDir);
            expect(result).toBeNull();
        });
    });

    describe('writeProjectManifest', () => {
        it('should create .pm directory and write project manifest', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';

            const manifestPath = writeProjectManifest(tempDir, projectId, projectName);

            expect(fs.existsSync(manifestPath)).toBe(true);
            const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            expect(content.projectId).toBe(projectId);
            expect(content.projectName).toBe(projectName);
            expect(content.version).toBe('1.0.0');
            expect(content.repoRoot).toBe(tempDir);
        });
    });

    describe('writeLocalManifest', () => {
        it('should create .pm directory and write local manifest', () => {
            const userId = 'test-user-id';

            const manifestPath = writeLocalManifest(tempDir, userId);

            expect(fs.existsSync(manifestPath)).toBe(true);
            const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            expect(content.userId).toBe(userId);
            expect(content.version).toBe('1.0.0');
        });

        it('should include user preferences if provided', () => {
            const userId = 'test-user-id';
            const preferences = { autoSync: false, defaultBranch: 'main' };

            const manifestPath = writeLocalManifest(tempDir, userId, preferences);

            const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            expect(content.userPreferences).toEqual(preferences);
        });
    });

    describe('readProjectManifest', () => {
        it('should read existing project manifest', () => {
            const pmDir = path.join(tempDir, '.pm');
            const projectId = 'test-project-id';
            const projectName = 'Test Project';

            writeProjectManifest(tempDir, projectId, projectName);

            const manifest = readProjectManifest(pmDir);
            expect(manifest).not.toBeNull();
            expect(manifest?.projectId).toBe(projectId);
            expect(manifest?.projectName).toBe(projectName);
        });

        it('should return null if manifest does not exist', () => {
            const pmDir = path.join(tempDir, '.pm');
            fs.mkdirSync(pmDir);

            const manifest = readProjectManifest(pmDir);
            expect(manifest).toBeNull();
        });

        it('should throw error for invalid manifest', () => {
            const pmDir = path.join(tempDir, '.pm');
            fs.mkdirSync(pmDir);
            fs.writeFileSync(path.join(pmDir, 'project.json'), 'invalid json');

            expect(() => readProjectManifest(pmDir)).toThrow();
        });
    });

    describe('readLocalManifest', () => {
        it('should read existing local manifest', () => {
            const pmDir = path.join(tempDir, '.pm');
            const userId = 'test-user-id';

            writeLocalManifest(tempDir, userId);

            const manifest = readLocalManifest(pmDir);
            expect(manifest).not.toBeNull();
            expect(manifest?.userId).toBe(userId);
        });

        it('should return null if manifest does not exist', () => {
            const pmDir = path.join(tempDir, '.pm');
            fs.mkdirSync(pmDir);

            const manifest = readLocalManifest(pmDir);
            expect(manifest).toBeNull();
        });
    });

    describe('readManifests', () => {
        it('should read both manifests', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';
            const userId = 'test-user-id';

            writeProjectManifest(tempDir, projectId, projectName);
            writeLocalManifest(tempDir, userId);

            const manifests = readManifests(tempDir);
            expect(manifests).not.toBeNull();
            expect(manifests?.project.projectId).toBe(projectId);
            expect(manifests?.local?.userId).toBe(userId);
        });

        it('should work with only project manifest', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';

            writeProjectManifest(tempDir, projectId, projectName);

            const manifests = readManifests(tempDir);
            expect(manifests).not.toBeNull();
            expect(manifests?.project.projectId).toBe(projectId);
            expect(manifests?.local).toBeUndefined();
        });

        it('should return null if no project manifest exists', () => {
            const manifests = readManifests(tempDir);
            expect(manifests).toBeNull();
        });
    });

    describe('initializeManifests', () => {
        it('should create both manifests and .gitignore', () => {
            const project = { id: 'test-project-id', name: 'Test Project' };
            const userId = 'test-user-id';

            const result = initializeManifests(tempDir, project, userId);

            expect(fs.existsSync(result.projectManifest)).toBe(true);
            expect(fs.existsSync(result.localManifest)).toBe(true);
            expect(fs.existsSync(path.join(result.pmDir, '.gitignore'))).toBe(true);

            // Verify .gitignore content
            const gitignoreContent = fs.readFileSync(path.join(result.pmDir, '.gitignore'), 'utf-8');
            expect(gitignoreContent).toContain('local.json');
        });
    });

    describe('getProjectIdFromManifest', () => {
        it('should return project ID from manifest', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';

            writeProjectManifest(tempDir, projectId, projectName);

            const result = getProjectIdFromManifest(tempDir);
            expect(result).toBe(projectId);
        });

        it('should return null if no manifest exists', () => {
            const result = getProjectIdFromManifest(tempDir);
            expect(result).toBeNull();
        });
    });

    describe('getUserIdFromManifest', () => {
        it('should return user ID from local manifest', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';
            const userId = 'test-user-id';

            writeProjectManifest(tempDir, projectId, projectName);
            writeLocalManifest(tempDir, userId);

            const result = getUserIdFromManifest(tempDir);
            expect(result).toBe(userId);
        });

        it('should return null if no local manifest exists', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';

            writeProjectManifest(tempDir, projectId, projectName);

            const result = getUserIdFromManifest(tempDir);
            expect(result).toBeNull();
        });
    });

    describe('validateManifests', () => {
        it('should validate correct manifests', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';
            const userId = 'test-user-id';

            writeProjectManifest(tempDir, projectId, projectName);
            writeLocalManifest(tempDir, userId);

            const result = validateManifests(tempDir);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return errors if no .pm directory', () => {
            const result = validateManifests(tempDir);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('No .pm directory found. Run pm.init to initialize.');
        });

        it('should return warnings if local manifest missing', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';

            writeProjectManifest(tempDir, projectId, projectName);

            const result = validateManifests(tempDir);
            expect(result.valid).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('updateProjectManifest', () => {
        it('should update project manifest fields', () => {
            const projectId = 'test-project-id';
            const projectName = 'Test Project';
            const pmDir = path.join(tempDir, '.pm');

            writeProjectManifest(tempDir, projectId, projectName);

            updateProjectManifest(pmDir, { projectName: 'Updated Project' });

            const manifest = readProjectManifest(pmDir);
            expect(manifest?.projectName).toBe('Updated Project');
            expect(manifest?.projectId).toBe(projectId); // Unchanged
        });
    });

    describe('updateLocalManifestSyncTime', () => {
        it('should update sync time', () => {
            const userId = 'test-user-id';
            const pmDir = path.join(tempDir, '.pm');

            writeLocalManifest(tempDir, userId);

            const before = readLocalManifest(pmDir);
            const beforeTime = before?.lastSyncAt;

            // Wait a bit to ensure time difference
            setTimeout(() => {
                updateLocalManifestSyncTime(pmDir);

                const after = readLocalManifest(pmDir);
                const afterTime = after?.lastSyncAt;

                expect(afterTime).not.toBe(beforeTime);
                expect(new Date(afterTime!).getTime()).toBeGreaterThan(new Date(beforeTime!).getTime());
            }, 10);
        });
    });
});


