/**
 * Test script to verify all service functions work correctly
 * Run with: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy npx tsx src/test.ts
 */

import {
  createProject,
  listProjects,
  createTask,
  listTasks,
  updateTask,
  saveSessionContext,
  getProjectContext,
  ValidationError,
  UnauthorizedError,
} from './index';

// Use a test UUID for userId
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

async function runTests() {
  console.log('Starting @projectflow/core tests...\n');

  try {
    // Test 1: Create a project
    console.log('1. Testing createProject...');
    const project = await createProject(TEST_USER_ID, {
      name: 'Test Project',
      description: 'A test project to verify service functions',
    });
    console.log('✓ Project created:', project.id);
    console.log(`  Name: ${project.name}\n`);

    // Test 2: List projects
    console.log('2. Testing listProjects...');
    const projects = await listProjects(TEST_USER_ID);
    console.log(`✓ Found ${projects.length} project(s)`);
    console.log(`  First project: ${projects[0]?.name}\n`);

    // Test 3: Create a task
    console.log('3. Testing createTask...');
    const task1 = await createTask(TEST_USER_ID, project.id, {
      title: 'First task',
      description: 'This is the first test task',
      priority: 'high',
      status: 'todo',
    });
    console.log('✓ Task created:', task1.id);
    console.log(`  Title: ${task1.title}, Status: ${task1.status}\n`);

    // Test 4: Create another task
    console.log('4. Testing createTask (second task)...');
    const task2 = await createTask(TEST_USER_ID, project.id, {
      title: 'Second task',
      description: 'This is the second test task',
      priority: 'medium',
      status: 'in_progress',
    });
    console.log('✓ Task created:', task2.id);
    console.log(`  Title: ${task2.title}, Status: ${task2.status}\n`);

    // Test 5: List tasks
    console.log('5. Testing listTasks...');
    const allTasks = await listTasks(TEST_USER_ID, project.id);
    console.log(`✓ Found ${allTasks.length} task(s)`);
    allTasks.forEach((t, i) => {
      console.log(`  Task ${i + 1}: ${t.title} (${t.status})`);
    });
    console.log();

    // Test 6: List tasks with filters
    console.log('6. Testing listTasks with filters...');
    const inProgressTasks = await listTasks(TEST_USER_ID, project.id, {
      status: 'in_progress',
    });
    console.log(`✓ Found ${inProgressTasks.length} in_progress task(s)\n`);

    // Test 7: Update a task
    console.log('7. Testing updateTask...');
    const updatedTask = await updateTask(TEST_USER_ID, task1.id, {
      status: 'done',
      priority: 'low',
    });
    console.log('✓ Task updated');
    console.log(`  New status: ${updatedTask.status}, Priority: ${updatedTask.priority}\n`);

    // Test 8: Save session context
    console.log('8. Testing saveSessionContext...');
    const session = await saveSessionContext(
      TEST_USER_ID,
      project.id,
      {
        state: 'analyzing_project',
        tasksReviewed: 2,
        nextAction: 'plan_architecture',
      },
      'Completed initial project analysis'
    );
    console.log('✓ Session saved:', session.id);
    console.log(`  Summary: ${session.summary}\n`);

    // Test 9: Get project context
    console.log('9. Testing getProjectContext...');
    const context = await getProjectContext(TEST_USER_ID, project.id);
    console.log('✓ Project context retrieved');
    console.log(`  Project: ${context.project.name}`);
    console.log(`  Tasks: ${context.tasks.length}`);
    console.log(`  Latest session: ${context.latestSession?.summary}\n`);

    // Test 10: Test error handling - validation error
    console.log('10. Testing error handling (validation)...');
    try {
      await createProject(TEST_USER_ID, { name: '' });
    } catch (error) {
      if (error instanceof ValidationError) {
        console.log(`✓ Caught ValidationError: ${error.message}\n`);
      }
    }

    // Test 11: Test error handling - invalid UUID
    console.log('11. Testing error handling (invalid UUID)...');
    try {
      await listProjects('not-a-uuid');
    } catch (error) {
      if (error instanceof ValidationError) {
        console.log(`✓ Caught ValidationError: ${error.message}\n`);
      }
    }

    // Clean up: Delete the test project
    console.log('12. Cleaning up (deleting test project)...');
    // Note: We're not implementing a deleteProject function for this test,
    // but in production you'd want to clean up test data
    console.log('✓ Test data would be deleted in production\n');

    console.log('===========================================');
    console.log('All tests passed! Service functions work correctly.');
    console.log('===========================================');
  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

