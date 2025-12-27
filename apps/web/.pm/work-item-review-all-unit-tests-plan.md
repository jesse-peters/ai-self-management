# Review All Unit Tests

Comprehensive review of all unit tests across the codebase to ensure test coverage, quality, and maintainability. This includes reviewing test files in:

- apps/mcp-server/src/**tests**/
- apps/web/src/**tests**/
- packages/core/src/\*\*/**tests**/
- Any other test files in the project

Review should cover:

- Test coverage and gaps
- Test quality and best practices
- Test maintainability
- Missing test cases
- Flaky or unreliable tests
- Test organization and structure

## Tasks

### task-3447c754: Inventory All Test Files

Goal: Identify and catalog all test files across the codebase to understand the current test landscape
Type: research
Timebox: 15 minutes
Risk: low

Context:
We need to know what tests exist before we can review them. This task will create a comprehensive inventory of all test files.

### task-f1077207: Review MCP Server Tests

Goal: Review all unit tests in apps/mcp-server/src/**tests**/ for quality, coverage, and best practices
Type: verify
Timebox: 15 minutes
Risk: low

Context:
The MCP server is a critical component. Tests should cover handlers, tool implementations, and error handling.

### task-9b7be3e1: Review Web App Tests

Goal: Review all unit tests in apps/web/src/**tests**/ and app/api/\*\*/**tests**/ for quality and coverage
Type: verify
Timebox: 15 minutes
Risk: low

Context:
The web app includes API routes, components, and utilities that need thorough testing.

### task-cc0f6dfa: Review Core Package Tests

Goal: Review all unit tests in packages/core/src/\*\*/**tests**/ for quality, coverage, and maintainability
Type: verify
Timebox: 15 minutes
Risk: low

Context:
The core package contains business logic that should be well-tested. Tests should cover services, gates, events, and other core functionality.

### task-afb858c2: Analyze Test Coverage

Goal: Run test coverage tools and analyze coverage reports to identify gaps and areas needing more tests
Type: research
Timebox: 15 minutes
Risk: low

Context:
We need quantitative data on test coverage to complement the qualitative review.

### task-844f4fad: Identify Flaky or Unreliable Tests

Goal: Review test files for patterns that indicate flaky tests (timing issues, race conditions, improper mocking, etc.)
Type: verify
Timebox: 15 minutes
Risk: low

Context:
Flaky tests reduce confidence in the test suite and waste developer time.

### task-9a3a7ba1: Document Test Review Findings

Goal: Create a comprehensive report summarizing all findings from the test review, including coverage gaps, quality issues, and recommendations
Type: docs
Timebox: 15 minutes
Risk: low

Context:
This document will serve as a reference for improving the test suite going forward.

