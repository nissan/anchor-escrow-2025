// Test runner for Event Management tests only
const { spawnSync } = require('child_process');
const { join } = require('path');
const { assert } = require('assert');

// Run the test suite
console.log('Running Event Management tests...');

// Execute the test
const result = spawnSync('node', [
  '--test',
  '--test-name-pattern=Event Management',
  join(__dirname, 'tests', 'ticketfair.test.js')
], {
  stdio: 'inherit',
  env: { ...process.env },
});

// Check result
if (result.status !== 0) {
  console.error('Tests failed with status:', result.status);
  process.exit(1);
}

console.log('Event Management tests completed successfully!');