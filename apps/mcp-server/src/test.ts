/**
 * Manual test script for MCP server tools
 * Run with: MCP_USER_ID=xxx npx tsx src/test.ts
 */

import { routeToolCall } from './handlers';
import { logger } from './logger';

const TEST_USER_ID = process.env.MCP_USER_ID || 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function runTests() {
  logger.info('Starting MCP Server tool tests...');
  logger.info(`Using userId: ${TEST_USER_ID}`);
  logger.info('');

  try {
    // Test 1: Create a project
    logger.info('1. Testing create_project...');
    const createProjectResult = await routeToolCall('create_project', {
      userId: TEST_USER_ID,
      name: 'Test MCP Project',
      description: 'Testing MCP server tools',
    });
    const projectContent = createProjectResult.content?.[0]?.text || '{}';
    const project = JSON.parse(projectContent);
    if (createProjectResult.isError) {
      logger.error('Failed to create project:', project);
      return;
    }
    logger.info('✓ Project created:', { id: project.id, name: project.name });
    logger.info('');

    // Test 2: List projects
    logger.info('2. Testing list_projects...');
    const listProjectsResult = await routeToolCall('list_projects', {
      userId: TEST_USER_ID,
    });
    const projectsContent = listProjectsResult.content?.[0]?.text || '[]';
    const projects = JSON.parse(projectsContent);
    logger.info(`✓ Found ${projects.length} project(s)`);
    logger.info('');

    // Test 3: Create a task
    logger.info('3. Testing create_task...');
    const createTaskResult = await routeToolCall('create_task', {
      userId: TEST_USER_ID,
      projectId: project.id,
      title: 'Test MCP Task',
      priority: 'high',
      status: 'in_progress',
    });
    const taskContent = createTaskResult.content?.[0]?.text || '{}';
    const task = JSON.parse(taskContent);
    if (createTaskResult.isError) {
      logger.error('Failed to create task:', task);
      return;
    }
    logger.info('✓ Task created:', { id: task.id, title: task.title });
    logger.info('');

    // Test 4: List tasks
    logger.info('4. Testing list_tasks...');
    const listTasksResult = await routeToolCall('list_tasks', {
      userId: TEST_USER_ID,
      projectId: project.id,
    });
    const tasksContent = listTasksResult.content?.[0]?.text || '[]';
    const tasks = JSON.parse(tasksContent);
    logger.info(`✓ Found ${tasks.length} task(s)`);
    logger.info('');

    // Test 5: Update a task
    logger.info('5. Testing update_task...');
    const updateTaskResult = await routeToolCall('update_task', {
      userId: TEST_USER_ID,
      taskId: task.id,
      status: 'done',
      priority: 'low',
    });
    const updatedTaskContent = updateTaskResult.content?.[0]?.text || '{}';
    const updatedTask = JSON.parse(updatedTaskContent);
    logger.info('✓ Task updated:', {
      status: updatedTask.status,
      priority: updatedTask.priority,
    });
    logger.info('');

    // Test 6: Save session context
    logger.info('6. Testing save_session_context...');
    const saveSessionResult = await routeToolCall('save_session_context', {
      userId: TEST_USER_ID,
      projectId: project.id,
      snapshot: {
        state: 'testing_mcp_server',
        toolsTested: 6,
        nextStep: 'test_project_context',
      },
      summary: 'Testing MCP server tools',
    });
    const sessionContent = saveSessionResult.content?.[0]?.text || '{}';
    const session = JSON.parse(sessionContent);
    logger.info('✓ Session saved:', { id: session.id, summary: session.summary });
    logger.info('');

    // Test 7: Get project context
    logger.info('7. Testing get_project_context...');
    const contextResult = await routeToolCall('get_project_context', {
      userId: TEST_USER_ID,
      projectId: project.id,
    });
    const contextContent = contextResult.content?.[0]?.text || '{}';
    const context = JSON.parse(contextContent);
    logger.info('✓ Project context retrieved:', {
      project: context.project?.name,
      tasksCount: context.tasks?.length,
      hasSession: context.latestSession !== null,
    });
    logger.info('');

    logger.info('===========================================');
    logger.info('All MCP server tests passed!');
    logger.info('===========================================');
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

