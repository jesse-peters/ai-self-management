/**
 * Test script to verify database connection and basic operations.
 * Run with: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy npx tsx src/test.ts
 */

import { createServerClient } from './client';
import type { ProjectInsert } from './types';

async function testDatabaseConnection() {
  console.log('Testing database connection...\n');

  try {
    // Create server client
    console.log('1. Creating server client...');
    const supabase = createServerClient();
    console.log('✓ Server client created successfully\n');

    // Test connection by querying projects table
    console.log('2. Testing connection by querying projects table...');
    const { data: existingProjects, error: selectError } = await supabase
      .from('projects')
      .select('count');

    if (selectError) {
      console.error('✗ Error querying projects:', selectError.message);
      return;
    }
    console.log('✓ Successfully connected to projects table\n');

    // Insert a test project
    console.log('3. Inserting a test project...');
    const testProject: ProjectInsert = {
      name: 'Test Project',
      description: 'This is a test project to verify database connection',
    };

    const { data: insertedProject, error: insertError } = await supabase
      .from('projects')
      .insert([testProject])
      .select()
      .single();

    if (insertError) {
      console.error('✗ Error inserting project:', insertError.message);
      return;
    }

    if (!insertedProject) {
      console.error('✗ No project data returned after insert');
      return;
    }

    console.log('✓ Test project inserted successfully');
    console.log(`  Project ID: ${insertedProject.id}`);
    console.log(`  Project Name: ${insertedProject.name}\n`);

    // Query the inserted project
    console.log('4. Querying the inserted project...');
    const { data: queriedProject, error: queryError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', insertedProject.id)
      .single();

    if (queryError) {
      console.error('✗ Error querying project:', queryError.message);
      return;
    }

    console.log('✓ Test project queried successfully');
    console.log(`  Retrieved: ${JSON.stringify(queriedProject, null, 2)}\n`);

    // Clean up: delete the test project
    console.log('5. Cleaning up (deleting test project)...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', insertedProject.id);

    if (deleteError) {
      console.error('✗ Error deleting project:', deleteError.message);
      return;
    }

    console.log('✓ Test project deleted successfully\n');

    console.log('===========================================');
    console.log('All tests passed! Database is working correctly.');
    console.log('===========================================');
  } catch (error) {
    console.error('✗ Unexpected error during testing:', error);
  }
}

// Run the test
testDatabaseConnection();

