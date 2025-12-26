#!/usr/bin/env tsx
/**
 * Quick test for pm.interview_questions tool
 */

import { routeToolCall } from './apps/mcp-server/src/handlers';

// You'll need to set this to a valid OAuth token
const TEST_TOKEN = process.env.MCP_ACCESS_TOKEN || 'test-token';

async function testInterviewQuestions() {
  console.log('Testing pm.interview_questions tool...\n');
  
  try {
    const result = await routeToolCall('pm.interview_questions', {}, TEST_TOKEN);
    
    if (result.isError) {
      console.error('❌ Error:', result.content[0]?.text);
      process.exit(1);
    }

    const questions = JSON.parse(result.content[0]?.text || '{}');
    console.log('✅ Tool call successful!');
    console.log(`\nFound ${questions.questions?.length || 0} question(s):\n`);
    console.log(JSON.stringify(questions, null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testInterviewQuestions().catch(console.error);
