#!/bin/bash

# Shell script to run TicketFair tests with proper setup and configuration
# This addresses PDA collision issues and ensures clean test execution

set -e

echo "=== TicketFair Test Runner ==="
echo "Timestamp: $(date)"

# Color output for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if local validator is running
check_validator() {
    print_status $BLUE "Checking if Solana test validator is running..."
    if pgrep -f "solana-test-validator" > /dev/null; then
        print_status $GREEN "✓ Solana test validator is running"
        return 0
    else
        print_status $YELLOW "⚠ Solana test validator is not running"
        return 1
    fi
}

# Start validator if not running
start_validator() {
    print_status $BLUE "Starting Solana test validator..."
    
    # Kill any existing validator processes
    pkill -f "solana-test-validator" 2>/dev/null || true
    sleep 2
    
    # Start validator with reset flag to ensure clean state
    print_status $BLUE "Launching test validator with --reset flag..."
    solana-test-validator --quiet --reset &
    
    # Wait for validator to start
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if pgrep -f "solana-test-validator" > /dev/null; then
            print_status $GREEN "✓ Test validator started successfully"
            # Give it extra time to fully initialize
            sleep 5
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    print_status $RED "✗ Failed to start test validator after ${max_attempts} seconds"
    return 1
}

# Generate TypeScript client
generate_client() {
    print_status $BLUE "Generating TypeScript client..."
    if npx tsx create-codama-client.ts; then
        print_status $GREEN "✓ TypeScript client generated successfully"
    else
        print_status $RED "✗ Failed to generate TypeScript client"
        return 1
    fi
}

# Run specific test with timeout and enhanced error handling
run_test() {
    local test_file=$1
    local timeout_seconds=${2:-120}  # Default 2 minutes
    local log_file="test-logs/$(basename "$test_file" .ts)-$(date +%Y%m%d-%H%M%S).log"
    
    # Create log directory if it doesn't exist
    mkdir -p test-logs
    
    print_status $BLUE "Running test: $test_file (timeout: ${timeout_seconds}s)"
    print_status $BLUE "Logs will be saved to: $log_file"
    
    # Capture both stdout and stderr
    local test_output
    local exit_code
    
    # Use timeout command if available, otherwise run without timeout
    if command -v timeout > /dev/null; then
        test_output=$(timeout ${timeout_seconds}s npx tsx --test "$test_file" 2>&1)
        exit_code=$?
    else
        # No timeout available, run without it
        test_output=$(npx tsx --test "$test_file" 2>&1)
        exit_code=$?
    fi
    
    # Save output to log file
    echo "=== Test Run: $(date) ===" > "$log_file"
    echo "Test file: $test_file" >> "$log_file"
    echo "Timeout: ${timeout_seconds}s" >> "$log_file"
    echo "Exit code: $exit_code" >> "$log_file"
    echo "" >> "$log_file"
    echo "$test_output" >> "$log_file"
    
    # Analyze output for common error patterns
    analyze_test_output "$test_output" "$test_file" "$exit_code"
    
    if [ $exit_code -eq 0 ]; then
        print_status $GREEN "✓ Test passed: $test_file"
        # Show summary of passed tests
        local passed_count=$(echo "$test_output" | grep -c "✓" || echo "0")
        print_status $GREEN "  → $passed_count test(s) passed"
        return 0
    else
        if [ $exit_code -eq 124 ]; then
            print_status $RED "✗ Test timed out after ${timeout_seconds}s: $test_file"
        else
            print_status $RED "✗ Test failed: $test_file (exit code: $exit_code)"
        fi
        
        # Show error summary
        print_status $YELLOW "Error summary saved to: $log_file"
        return $exit_code
    fi
}

# Analyze test output for common error patterns and provide helpful suggestions
analyze_test_output() {
    local output="$1"
    local test_file="$2"
    local exit_code="$3"
    
    if [ $exit_code -eq 0 ]; then
        return 0
    fi
    
    print_status $YELLOW "=== Error Analysis ==="
    
    # Check for common error patterns
    if echo "$output" | grep -q -i "account not owned by system program"; then
        print_status $RED "❌ PDA Collision Error Detected"
        echo "  Suggestion: Run './run-tests.sh --validator' to reset the validator"
        echo "  This error occurs when accounts from previous test runs conflict"
    fi
    
    if echo "$output" | grep -q -i "insufficient funds"; then
        print_status $RED "❌ Insufficient Funds Error"
        echo "  Suggestion: Ensure local validator has adequate funds"
        echo "  Try restarting validator: 'solana-test-validator --reset'"
    fi
    
    if echo "$output" | grep -q -i "connection.*refused\|timeout"; then
        print_status $RED "❌ Network Connection Error"
        echo "  Suggestion: Check if solana-test-validator is running"
        echo "  Run: 'pgrep -f solana-test-validator'"
    fi
    
    if echo "$output" | grep -q -i "anchor"; then
        print_status $RED "❌ Anchor/Program Error"
        echo "  Suggestion: Ensure program is built and deployed"
        echo "  Try: 'anchor build && anchor deploy'"
    fi
    
    if echo "$output" | grep -q -i "fetch.*failed\|rpc.*error"; then
        print_status $RED "❌ RPC/Fetch Error"
        echo "  Suggestion: Verify RPC endpoint and network connectivity"
        echo "  Current config: $(solana config get | grep 'RPC URL')"
    fi
    
    if echo "$output" | grep -q -i "typescript\|syntax"; then
        print_status $RED "❌ TypeScript/Syntax Error"
        echo "  Suggestion: Check for TypeScript compilation errors"
        echo "  Try regenerating client: 'npx tsx create-codama-client.ts'"
    fi
    
    # Count different types of test results
    local failed_count=$(echo "$output" | grep -c "not ok\|✗" || echo "0")
    local passed_count=$(echo "$output" | grep -c "ok\|✓" || echo "0")
    
    if [ "$failed_count" -gt 0 ]; then
        print_status $RED "  → $failed_count test(s) failed, $passed_count test(s) passed"
    fi
    
    # Show first few error lines for quick diagnosis
    print_status $YELLOW "=== First Error Details ==="
    echo "$output" | grep -A 3 -B 1 -i "error\|fail\|not ok" | head -10
    
    print_status $YELLOW "=== Full logs available in test-logs/ directory ==="
}

# Main execution
main() {
    print_status $BLUE "Starting TicketFair test execution..."
    
    # Check if we're in the right directory
    if [ ! -f "Anchor.toml" ]; then
        print_status $RED "✗ Error: Anchor.toml not found. Please run from project root."
        exit 1
    fi
    
    # Ensure we're using localnet
    if ! grep -q 'cluster = "localnet"' Anchor.toml; then
        print_status $YELLOW "⚠ Updating Anchor.toml to use localnet..."
        sed -i.bak 's/cluster = "devnet"/cluster = "localnet"/' Anchor.toml
    fi
    
    # Check and start validator
    if ! check_validator; then
        if ! start_validator; then
            print_status $RED "✗ Failed to start validator. Exiting."
            exit 1
        fi
    fi
    
    # Generate client
    if ! generate_client; then
        print_status $RED "✗ Failed to generate client. Exiting."
        exit 1
    fi
    
    # Run tests
    print_status $BLUE "Running tests..."
    
    local test_files=(
        "tests/ticketfair.test.ts"
        "tests/escrow.test.ts"
    )
    
    local passed=0
    local failed=0
    
    for test_file in "${test_files[@]}"; do
        if [ -f "$test_file" ]; then
            if run_test "$test_file" 180; then  # 3 minute timeout
                passed=$((passed + 1))
            else
                failed=$((failed + 1))
            fi
        else
            print_status $YELLOW "⚠ Test file not found: $test_file"
        fi
    done
    
    # Summary
    print_status $BLUE "=== Test Summary ==="
    print_status $GREEN "Passed: $passed"
    print_status $RED "Failed: $failed"
    
    if [ $failed -eq 0 ]; then
        print_status $GREEN "🎉 All tests passed!"
        exit 0
    else
        print_status $RED "❌ Some tests failed"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --validator   Only start/check validator"
        echo "  --client      Only generate client"
        echo "  --test <file> Run specific test file"
        exit 0
        ;;
    --validator)
        if ! check_validator; then
            start_validator
        fi
        exit 0
        ;;
    --client)
        generate_client
        exit 0
        ;;
    --test)
        if [ -z "$2" ]; then
            print_status $RED "✗ Error: Test file not specified"
            exit 1
        fi
        if ! check_validator; then
            start_validator
        fi
        generate_client
        run_test "$2"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_status $RED "✗ Unknown option: $1"
        exit 1
        ;;
esac