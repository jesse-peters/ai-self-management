/**
 * Tests for dangerous command detection and recon services
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeCommand,
  isSafeCommand,
  redactSecrets,
  getAllDangerousPatterns,
  SAFE_COMMAND_CATEGORIES,
  type CommandAnalysis,
} from '../dangerousCommands';
import {
  validateReconProfile,
  generateReconProfileYAML,
  type ReconProfile,
} from '../recon';

describe('Dangerous Commands Service', () => {
  describe('analyzeCommand', () => {
    it('should detect recursive delete commands', () => {
      const analysis = analyzeCommand('rm -rf /important');
      expect(analysis.isDangerous).toBe(true);
      expect(analysis.severity).toBe('critical');
      expect(analysis.matchedPatterns.some(p => p.name === 'recursive_delete')).toBe(true);
    });

    it('should detect terraform apply commands', () => {
      const analysis = analyzeCommand('terraform apply -auto-approve');
      expect(analysis.isDangerous).toBe(true);
      expect(analysis.severity).toBe('critical');
    });

    it('should detect kubernetes delete commands', () => {
      const analysis = analyzeCommand('kubectl delete pod my-pod');
      expect(analysis.isDangerous).toBe(true);
      expect(analysis.severity).toBe('critical');
    });

    it('should detect database drop commands', () => {
      const analysis = analyzeCommand('DROP DATABASE production;');
      expect(analysis.isDangerous).toBe(true);
      expect(analysis.severity).toBe('critical');
    });

    it('should detect database truncate commands', () => {
      const analysis = analyzeCommand('TRUNCATE TABLE users;');
      expect(analysis.isDangerous).toBe(true);
      expect(analysis.severity).toBe('critical');
    });

    it('should detect dangerous chmod commands', () => {
      const analysis = analyzeCommand('chmod 777 /etc/passwd');
      expect(analysis.isDangerous).toBe(true);
      expect(analysis.severity).toBe('high');
    });

    it('should detect git force push commands', () => {
      const analysis = analyzeCommand('git push -f origin main');
      expect(analysis.isDangerous).toBe(true);
      expect(analysis.severity).toBe('high');
    });

    it('should detect credential exports', () => {
      const analysis = analyzeCommand('export DB_PASSWORD=secret123');
      expect(analysis.isDangerous).toBe(true);
      // Could be detected as critical if secret leak pattern matches
      expect(['high', 'critical']).toContain(analysis.severity);
    });

    it('should allow safe commands', () => {
      const analysis = analyzeCommand('npm test');
      expect(analysis.isDangerous).toBe(false);
    });

    it('should allow safe git commands', () => {
      const analysis = analyzeCommand('git log --oneline');
      expect(analysis.isDangerous).toBe(false);
    });

    it('should allow safe file operations', () => {
      const analysis = analyzeCommand('ls -la src/');
      expect(analysis.isDangerous).toBe(false);
    });

    it('should allow safe ls commands', () => {
      const analysis = analyzeCommand('ls -la');
      expect(analysis.isDangerous).toBe(false);
    });

    it('should allow find commands', () => {
      const analysis = analyzeCommand('find . -name "*.ts" -type f');
      expect(analysis.isDangerous).toBe(false);
    });

    it('should allow grep commands', () => {
      const analysis = analyzeCommand('grep -r "pattern" src/');
      expect(analysis.isDangerous).toBe(false);
    });

    it('should provide recommendations', () => {
      const analysis = analyzeCommand('rm -rf /');
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0]).toContain('⚠️');
    });
  });

  describe('isSafeCommand', () => {
    it('should return true for safe commands', () => {
      expect(isSafeCommand('npm test')).toBe(true);
      expect(isSafeCommand('git status')).toBe(true);
      expect(isSafeCommand('find . -name "*.js"')).toBe(true);
    });

    it('should return false for dangerous commands', () => {
      expect(isSafeCommand('rm -rf /')).toBe(false);
      expect(isSafeCommand('terraform apply')).toBe(false);
      expect(isSafeCommand('DROP DATABASE prod')).toBe(false);
    });
  });

  describe('redactSecrets', () => {
    it('should redact Stripe keys', () => {
      const output = 'API key: sk_live_abc123def456';
      const redacted = redactSecrets(output);
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('sk_live_abc123def456');
    });

    it('should redact GitHub tokens', () => {
      const output = 'Token: ghp_abc123def456ghi789';
      const redacted = redactSecrets(output);
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('ghp_abc123def456ghi789');
    });

    it('should redact passwords', () => {
      const output = 'password=secretpassword123';
      const redacted = redactSecrets(output);
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('secretpassword123');
    });

    it('should redact bearer tokens', () => {
      const output = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const redacted = redactSecrets(output);
      expect(redacted).toContain('[REDACTED]');
    });

    it('should preserve safe output', () => {
      const output = 'Build successful! All tests passed.';
      const redacted = redactSecrets(output);
      expect(redacted).toBe(output);
    });
  });

  describe('getAllDangerousPatterns', () => {
    it('should return array of dangerous patterns', () => {
      const patterns = getAllDangerousPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should include pattern details', () => {
      const patterns = getAllDangerousPatterns();
      const pattern = patterns[0];
      expect(pattern.name).toBeDefined();
      expect(pattern.pattern).toBeDefined();
      expect(pattern.severity).toBeDefined();
      expect(pattern.description).toBeDefined();
      expect(pattern.examples).toBeDefined();
    });

    it('should have critical and high severity patterns', () => {
      const patterns = getAllDangerousPatterns();
      const severities = patterns.map(p => p.severity);
      expect(severities).toContain('critical');
      expect(severities).toContain('high');
    });
  });

  describe('SAFE_COMMAND_CATEGORIES', () => {
    it('should have safe command categories defined', () => {
      expect(SAFE_COMMAND_CATEGORIES.file_inspection).toBeDefined();
      expect(SAFE_COMMAND_CATEGORIES.dependency_inspection).toBeDefined();
      expect(SAFE_COMMAND_CATEGORIES.build_verification).toBeDefined();
      expect(SAFE_COMMAND_CATEGORIES.code_quality).toBeDefined();
      expect(SAFE_COMMAND_CATEGORIES.git_inspection).toBeDefined();
    });

    it('should have examples for each category', () => {
      for (const [key, value] of Object.entries(SAFE_COMMAND_CATEGORIES)) {
        expect(value.description).toBeDefined();
        expect(value.examples).toBeDefined();
        expect(Array.isArray(value.examples)).toBe(true);
        expect(value.examples.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('Recon Service', () => {
  describe('validateReconProfile', () => {
    let validProfile: ReconProfile;

    beforeEach(() => {
      validProfile = {
        version: '1.0.0',
        commands: [
          {
            name: 'test',
            command: 'npm test',
            timeout: 60,
            category: 'tests',
          },
        ],
        filePatterns: [
          {
            name: 'source',
            pattern: '*.ts',
            maxDepth: 5,
            category: 'code',
          },
        ],
        forbiddenPatterns: ['node_modules', '.git'],
      };
    });

    it('should validate a correct profile', () => {
      const result = validateReconProfile(validProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing version', () => {
      delete (validProfile as any).version;
      const result = validateReconProfile(validProfile);
      expect(result.errors).toContain('Missing version field');
    });

    it('should detect invalid commands array', () => {
      (validProfile as any).commands = 'not an array';
      const result = validateReconProfile(validProfile);
      expect(result.errors.some(e => e.includes('Commands must be an array'))).toBe(true);
    });

    it('should detect empty commands', () => {
      validProfile.commands = [];
      const result = validateReconProfile(validProfile);
      expect(result.warnings.some(w => w.includes('No commands configured'))).toBe(true);
    });

    it('should detect missing command name', () => {
      validProfile.commands = [
        {
          name: '',
          command: 'npm test',
          timeout: 60,
          category: 'tests',
        },
      ];
      const result = validateReconProfile(validProfile);
      expect(result.errors.some(e => e.includes('missing name'))).toBe(true);
    });

    it('should detect missing command command field', () => {
      validProfile.commands = [
        {
          name: 'test',
          command: '',
          timeout: 60,
          category: 'tests',
        },
      ];
      const result = validateReconProfile(validProfile);
      expect(result.errors.some(e => e.includes('missing command'))).toBe(true);
    });

    it('should detect invalid timeout', () => {
      validProfile.commands = [
        {
          name: 'test',
          command: 'npm test',
          timeout: -1,
          category: 'tests',
        },
      ];
      const result = validateReconProfile(validProfile);
      expect(result.errors.some(e => e.includes('invalid timeout'))).toBe(true);
    });

    it('should detect missing category warning', () => {
      validProfile.commands = [
        {
          name: 'test',
          command: 'npm test',
          timeout: 60,
          category: '',
        },
      ];
      const result = validateReconProfile(validProfile);
      expect(result.warnings.some(w => w.includes('missing category'))).toBe(true);
    });

    it('should detect invalid file patterns array', () => {
      (validProfile as any).filePatterns = 'not an array';
      const result = validateReconProfile(validProfile);
      expect(result.errors.some(e => e.includes('File patterns must be an array'))).toBe(true);
    });

    it('should detect invalid maxDepth in file pattern', () => {
      validProfile.filePatterns = [
        {
          name: 'source',
          pattern: '*.ts',
          maxDepth: 0,
          category: 'code',
        },
      ];
      const result = validateReconProfile(validProfile);
      expect(result.errors.some(e => e.includes('invalid maxDepth'))).toBe(true);
    });
  });

  describe('generateReconProfileYAML', () => {
    let profile: ReconProfile;

    beforeEach(() => {
      profile = {
        version: '1.0.0',
        commands: [
          {
            name: 'test',
            command: 'npm test',
            timeout: 60,
            category: 'tests',
          },
        ],
        filePatterns: [
          {
            name: 'source',
            pattern: '*.ts',
            maxDepth: 5,
            category: 'code',
          },
        ],
        forbiddenPatterns: ['node_modules', '.git'],
      };
    });

    it('should generate YAML format', () => {
      const yaml = generateReconProfileYAML(profile);
      expect(yaml).toContain('version: 1.0.0');
      expect(yaml).toContain('forbiddenPatterns:');
      expect(yaml).toContain('commands:');
      expect(yaml).toContain('filePatterns:');
    });

    it('should include all commands', () => {
      const yaml = generateReconProfileYAML(profile);
      expect(yaml).toContain('name: test');
      expect(yaml).toContain('command: "npm test"');
      expect(yaml).toContain('timeout: 60');
      expect(yaml).toContain('category: tests');
    });

    it('should include all file patterns', () => {
      const yaml = generateReconProfileYAML(profile);
      expect(yaml).toContain('name: source');
      expect(yaml).toContain('pattern: "*.ts"');
      expect(yaml).toContain('maxDepth: 5');
    });

    it('should include forbidden patterns', () => {
      const yaml = generateReconProfileYAML(profile);
      expect(yaml).toContain('- "node_modules"');
      expect(yaml).toContain('- ".git"');
    });
  });
});

