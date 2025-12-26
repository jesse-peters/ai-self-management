/**
 * Test for init interview functionality
 */

import { describe, it, expect } from 'vitest';
import {
  getInterviewQuestions,
  processInterviewResponses,
  generateConventionsMarkdown,
  generateReconProfile,
  type ProjectConventions,
} from '../interview';

describe('Interview Service', () => {
  describe('getInterviewQuestions', () => {
    it('should return interview questions', () => {
      const questions = getInterviewQuestions();
      expect(questions).toHaveLength(10);
      expect(questions[0].id).toBe('stack');
      expect(questions[0].type).toBe('select');
    });
  });

  describe('processInterviewResponses', () => {
    it('should process interview responses into conventions', () => {
      const responses = {
        stack: 'Next.js',
        testCommand: 'npm test',
        devCommand: 'npm run dev',
        environments: 'dev,staging,prod',
        reconMode: 'automated',
        uploadMode: 'manual',
      };

      const conventions = processInterviewResponses(responses);

      expect(conventions.stack).toBe('Next.js');
      expect(conventions.testCommand).toBe('npm test');
      expect(conventions.devCommand).toBe('npm run dev');
      expect(conventions.environments).toEqual(['dev', 'staging', 'prod']);
      expect(conventions.reconMode).toBe('automated');
      expect(conventions.uploadMode).toBe('manual');
    });

    it('should handle comma-separated environments', () => {
      const responses = {
        stack: 'Django',
        testCommand: 'pytest',
        devCommand: 'python manage.py runserver',
        environments: 'development, staging, production',
        reconMode: 'manual',
        uploadMode: 'auto',
      };

      const conventions = processInterviewResponses(responses);
      expect(conventions.environments).toEqual(['development', 'staging', 'production']);
    });

    it('should provide defaults for missing values', () => {
      const conventions = processInterviewResponses({});
      expect(conventions.stack).toBe('Other');
      expect(conventions.testCommand).toBe('npm test');
      expect(conventions.environments).toContain('dev');
    });
  });

  describe('generateConventionsMarkdown', () => {
    it('should generate markdown conventions document', () => {
      const conventions: ProjectConventions = {
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
        interviewedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const markdown = generateConventionsMarkdown(conventions);

      expect(markdown).toContain('# Project Conventions');
      expect(markdown).toContain('Next.js');
      expect(markdown).toContain('npm test');
      expect(markdown).toContain('npm run dev');
      expect(markdown).toContain('npm run lint');
      expect(markdown).toContain('tsc --noEmit');
      expect(markdown).toContain('npm run build');
      expect(markdown).toContain('dev\n- staging\n- prod');
    });
  });

  describe('generateReconProfile', () => {
    it('should generate recon profile from conventions', () => {
      const conventions: ProjectConventions = {
        stack: 'Next.js',
        stackDescription: 'TypeScript React framework',
        testCommand: 'npm test',
        devCommand: 'npm run dev',
        dockerEnabled: false,
        environments: ['dev', 'staging', 'prod'],
        reconMode: 'automated',
        uploadMode: 'manual',
        interviewedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const profile = generateReconProfile(conventions);

      expect(profile.commands).toBeDefined();
      expect(profile.filePatterns).toBeDefined();
      expect(profile.forbiddenPatterns).toBeDefined();

      // Check for specific commands based on stack
      const commandNames = profile.commands.map(c => c.name);
      expect(commandNames).toContain('directory_tree');
      expect(commandNames).toContain('npm_dependencies');
    });

    it('should include Python commands for Django stack', () => {
      const conventions: ProjectConventions = {
        stack: 'Django',
        stackDescription: 'Python web framework',
        testCommand: 'pytest',
        devCommand: 'python manage.py runserver',
        dockerEnabled: false,
        environments: ['dev', 'prod'],
        reconMode: 'automated',
        uploadMode: 'manual',
        interviewedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const profile = generateReconProfile(conventions);
      const commandNames = profile.commands.map(c => c.name);

      expect(commandNames).toContain('python_dependencies');
    });

    it('should include Rust commands for Rust stack', () => {
      const conventions: ProjectConventions = {
        stack: 'Rust/Axum',
        stackDescription: 'Rust async framework',
        testCommand: 'cargo test',
        devCommand: 'cargo run',
        dockerEnabled: false,
        environments: ['dev', 'prod'],
        reconMode: 'automated',
        uploadMode: 'manual',
        interviewedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const profile = generateReconProfile(conventions);
      const commandNames = profile.commands.map(c => c.name);

      expect(commandNames).toContain('rust_dependencies');
    });
  });
});

