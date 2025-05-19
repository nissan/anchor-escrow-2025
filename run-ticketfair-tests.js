// Script to run limited tests to avoid timeouts
import { fork } from 'child_process';
import path from 'path';

console.log('Running TicketFair limited test suite...');

// Use Anchor's npm script to run the tests
const child = fork(
  './node_modules/.bin/anchor', 
  ['test'], 
  {
    env: {
      ...process.env,
      RUSTUP_TOOLCHAIN: 'nightly-2025-04-16',
      TEST_TIMEOUT: '180000', // 3 minutes timeout
      DEBUG: 'anchor:*' // Enable anchor debug logs
    },
    stdio: 'inherit'
  }
);

child.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});