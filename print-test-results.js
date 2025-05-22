// Script to print test results summary
import { spawn } from 'child_process';

// Run the anchor test command and capture output
const cmd = spawn('bash', ['-c', 'RUSTUP_TOOLCHAIN=nightly-2025-04-16 anchor test']);

// Collect all output
let output = '';
let errorOutput = '';

cmd.stdout.on('data', (data) => {
  const chunk = data.toString();
  output += chunk;
  process.stdout.write(chunk);
});

cmd.stderr.on('data', (data) => {
  const chunk = data.toString();
  errorOutput += chunk;
  process.stderr.write(chunk);
});

cmd.on('close', (code) => {
  console.log(`\n\n=========== TEST RESULTS SUMMARY ===========`);
  
  // Check for specific test patterns
  const testResults = [];

  // Check for Ticketfair bidding tests
  if (output.includes('places a bid at the current price')) {
    const placeBidTestResult = output.includes('places a bid at the current price (') ? 'PASSED' : 'FAILED';
    testResults.push(`'places a bid at the current price': ${placeBidTestResult}`);
  }

  if (output.includes('TESTING INCORRECT BID REJECTION')) {
    const incorrectBidTestResult = output.includes('INCORRECT BID TEST PASSED') ? 'PASSED' : 'FAILED';
    testResults.push(`'rejects bids not at the current auction price': ${incorrectBidTestResult}`);
  }

  // Print the results
  if (testResults.length > 0) {
    console.log('Ticketfair Bidding Tests:');
    testResults.forEach(result => console.log(`- ${result}`));
  } else {
    console.log('Could not find specific test results in the output.');
  }

  // Check if the entire test suite passed
  if (output.includes('✔ Ticket Bidding & Awarding') || output.includes('Ticket Bidding & Awarding (')) {
    console.log('\nOverall test suite appears to have PASSED!');
  } else {
    console.log('\nOverall test suite might have FAILED or test output was incomplete.');
  }

  console.log(`\nExit code: ${code}`);
});