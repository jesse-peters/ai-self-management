import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateMachineSection,
  generateUserSection,
  generatePrimerContent,
  generatePrimer,
  refreshPrimer,
  readPrimer,
  parsePrimerContent,
  getUserSection,
  updateUserSection,
  checkPrimerStatus,
} from '../primer';
import type { ProjectConventions } from '../interview';

describe('Primer Generation Service', () => {
  let tempDir: string;
  let pmDir: string;
  const mockConventions: ProjectConventions = {
    stack: 'Next.js',
    stackDescription: 'TypeScript React framework',
    testCommand: 'npm test',
    lintCommand: 'npm run lint',
    typeCheckCommand: 'tsc --noEmit',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    dockerEnabled: true,
    dockerfile: 'Dockerfile',
    environments: ['dev', 'staging', 'prod'],
    reconMode: 'automated',
    uploadMode: 'manual',
    interviewedAt: '2024-12-27T15:30:00.000Z',
    version: '1.0.0',
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'primer-test-'));
    pmDir = path.join(tempDir, '.pm');
    fs.mkdirSync(pmDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('generateMachineSection', () => {
    it('should generate machine section with all conventions', () => {
      const section = generateMachineSection(mockConventions);

      expect(section).toContain('<!-- BEGIN_MACHINE_GENERATED -->');
      expect(section).toContain('<!-- END_MACHINE_GENERATED -->');
      expect(section).toContain('Next.js');
      expect(section).toContain('npm test');
      expect(section).toContain('npm run dev');
      expect(section).toContain('npm run lint');
      expect(section).toContain('tsc --noEmit');
      expect(section).toContain('npm run build');
      expect(section).toContain('dev');
      expect(section).toContain('staging');
      expect(section).toContain('prod');
      expect(section).toContain('Docker Enabled');
      expect(section).toContain('Dockerfile');
    });

    it('should handle optional commands', () => {
      const minimalConventions: ProjectConventions = {
        stack: 'Django',
        stackDescription: 'Python web framework',
        testCommand: 'pytest',
        devCommand: 'python manage.py runserver',
        dockerEnabled: false,
        environments: ['dev'],
        reconMode: 'manual',
        uploadMode: 'auto',
        interviewedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const section = generateMachineSection(minimalConventions);

      expect(section).toContain('Django');
      expect(section).toContain('pytest');
      expect(section).not.toContain('Linting');
      expect(section).not.toContain('Type Checking');
      expect(section).not.toContain('Build');
    });
  });

  describe('generateUserSection', () => {
    it('should generate user section template', () => {
      const section = generateUserSection();

      expect(section).toContain('Project Overview');
      expect(section).toContain('Key Components');
      expect(section).toContain('Important Notes');
      expect(section).toContain('Common Tasks');
      expect(section).toContain('Architecture Decisions');
    });
  });

  describe('generatePrimerContent', () => {
    it('should combine machine and user sections', () => {
      const machine = 'MACHINE SECTION';
      const user = 'USER SECTION';

      const content = generatePrimerContent(machine, user);

      expect(content).toContain(machine);
      expect(content).toContain(user);
      expect(content.indexOf(machine) < content.indexOf(user)).toBe(true);
    });
  });

  describe('generatePrimer', () => {
    it('should create new primer file', () => {
      const result = generatePrimer(pmDir, mockConventions);

      expect(result.created).toBe(true);
      expect(result.updated).toBe(false);
      expect(fs.existsSync(result.path)).toBe(true);
      expect(result.path).toContain('primer.md');

      const content = fs.readFileSync(result.path, 'utf-8');
      expect(content).toContain('<!-- BEGIN_MACHINE_GENERATED -->');
      expect(content).toContain('Project Overview');
    });

    it('should update existing primer preserving user section', () => {
      // Create initial primer
      const result1 = generatePrimer(pmDir, mockConventions);
      expect(result1.created).toBe(true);

      // Add user content
      const primerPath = result1.path;
      const content1 = fs.readFileSync(primerPath, 'utf-8');
      const userContent = '## Project Overview\n\nThis is my custom content';
      const updated = content1.replace(
        'Project Overview\n\n[Add your project overview here',
        `Project Overview\n\n${userContent}`
      );
      fs.writeFileSync(primerPath, updated);

      // Update conventions
      const newConventions = { ...mockConventions, stack: 'Django' };

      // Regenerate primer
      const result2 = generatePrimer(pmDir, newConventions);

      expect(result2.created).toBe(false);
      expect(result2.updated).toBe(true);

      const content2 = fs.readFileSync(result2.path, 'utf-8');
      expect(content2).toContain('Django');
      // User content should be preserved
      expect(content2).toContain('This is my custom content');
    });
  });

  describe('parsePrimerContent', () => {
    it('should parse machine and user sections', () => {
      const content = `<!-- BEGIN_MACHINE_GENERATED -->
MACHINE CONTENT
<!-- END_MACHINE_GENERATED -->

USER CONTENT`;

      const parsed = parsePrimerContent(content);

      expect(parsed.machineSection).toContain('MACHINE CONTENT');
      expect(parsed.userSection).toContain('USER CONTENT');
    });

    it('should handle missing machine markers', () => {
      const content = 'Just user content without markers';

      const parsed = parsePrimerContent(content);

      expect(parsed.machineSection).toBe('');
      expect(parsed.userSection).toContain('Just user content');
    });
  });

  describe('readPrimer', () => {
    it('should read existing primer', () => {
      generatePrimer(pmDir, mockConventions);

      const primer = readPrimer(pmDir);

      expect(primer).not.toBeNull();
      expect(primer?.machineSection).toContain('Next.js');
      expect(primer?.userSection).toContain('Project Overview');
    });

    it('should return null for non-existent primer', () => {
      const primer = readPrimer(pmDir);

      expect(primer).toBeNull();
    });
  });

  describe('getUserSection', () => {
    it('should extract user section', () => {
      generatePrimer(pmDir, mockConventions);

      const userSection = getUserSection(pmDir);

      expect(userSection).not.toBeNull();
      expect(userSection).toContain('Project Overview');
      expect(userSection).not.toContain('BEGIN_MACHINE_GENERATED');
    });

    it('should return null if no primer exists', () => {
      const userSection = getUserSection(pmDir);

      expect(userSection).toBeNull();
    });
  });

  describe('updateUserSection', () => {
    it('should update user section while preserving machine section', () => {
      generatePrimer(pmDir, mockConventions);

      const newUserContent = '## My Custom Section\n\nCustom content here';
      updateUserSection(pmDir, newUserContent);

      const primer = readPrimer(pmDir);
      expect(primer?.userSection).toContain('My Custom Section');
      expect(primer?.userSection).toContain('Custom content here');
      expect(primer?.machineSection).toContain('Next.js');
    });

    it('should throw if primer does not exist', () => {
      expect(() => {
        updateUserSection(pmDir, 'content');
      }).toThrow();
    });
  });

  describe('checkPrimerStatus', () => {
    it('should report primer does not exist', () => {
      const status = checkPrimerStatus(pmDir, mockConventions);

      expect(status.exists).toBe(false);
      expect(status.current).toBe(false);
    });

    it('should report primer exists and is current', () => {
      generatePrimer(pmDir, mockConventions);

      const status = checkPrimerStatus(pmDir, mockConventions);

      expect(status.exists).toBe(true);
      expect(status.current).toBe(true);
      expect(status.lastUpdated).toBeDefined();
    });

    it('should report primer exists but is out of date', () => {
      generatePrimer(pmDir, mockConventions);

      const newConventions = { ...mockConventions, stack: 'Django' };
      const status = checkPrimerStatus(pmDir, newConventions);

      expect(status.exists).toBe(true);
      expect(status.current).toBe(false);
    });
  });

  describe('refreshPrimer', () => {
    it('should refresh primer with new conventions', () => {
      generatePrimer(pmDir, mockConventions);

      const newConventions: ProjectConventions = {
        ...mockConventions,
        stack: 'Django',
        stackDescription: 'Python web framework',
      };
      const result = refreshPrimer(pmDir, newConventions);

      expect(result.updated).toBe(true);

      const content = fs.readFileSync(result.path, 'utf-8');
      expect(content).toContain('Django');
      expect(content).toContain('Python web framework');
      expect(content).not.toContain('TypeScript React framework');
    });
  });
});

