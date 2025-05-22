// Enhanced test helpers with retry mechanisms for handling sporadic failures
import { Connection } from "solana-kite";
import { type KeyPairSigner, type Address } from "@solana/kit";

// Retry configuration interface
interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retriableErrors?: string[];
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 10000,    // 10 seconds
  backoffMultiplier: 2,
  retriableErrors: [
    'account not owned by system program',
    'timeout',
    'network error',
    'insufficient funds',
    'blockhash not found',
    'transaction was not confirmed',
    'failed to send transaction'
  ]
};

// Exponential backoff delay calculation
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

// Check if an error is retriable
function isRetriableError(error: Error, retriableErrors: string[]): boolean {
  const errorMessage = error.message.toLowerCase();
  return retriableErrors.some(pattern => errorMessage.includes(pattern.toLowerCase()));
}

// Generic retry wrapper for async operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      console.log(`[Retry] ${context} - Attempt ${attempt}/${finalConfig.maxAttempts}`);
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`[Retry] ${context} - Succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.log(`[Retry] ${context} - Attempt ${attempt} failed:`, lastError.message);

      // If this is the last attempt, don't retry
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // Check if the error is retriable
      if (!isRetriableError(lastError, finalConfig.retriableErrors)) {
        console.log(`[Retry] ${context} - Error not retriable, stopping retries`);
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);
      console.log(`[Retry] ${context} - Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed
  console.error(`[Retry] ${context} - All attempts failed`);
  throw lastError;
}

// Retry wrapper for wallet creation
export async function createWalletWithRetry(
  connection: Connection,
  airdropAmount: bigint,
  context: string = "Create wallet"
): Promise<KeyPairSigner> {
  return withRetry(
    () => connection.createWallet({ airdropAmount }),
    context,
    {
      maxAttempts: 3,
      baseDelay: 2000,
      retriableErrors: ['insufficient funds', 'airdrop', 'timeout', 'network']
    }
  );
}

// Retry wrapper for multiple wallet creation
export async function createWalletsWithRetry(
  connection: Connection,
  count: number,
  airdropAmount: bigint,
  context: string = "Create wallets"
): Promise<KeyPairSigner[]> {
  return withRetry(
    () => connection.createWallets(count, { airdropAmount }),
    context,
    {
      maxAttempts: 3,
      baseDelay: 2000,
      retriableErrors: ['insufficient funds', 'airdrop', 'timeout', 'network']
    }
  );
}

// Retry wrapper for transaction sending
export async function sendTransactionWithRetry(
  connection: Connection,
  transaction: {
    feePayer: KeyPairSigner;
    instructions: any[];
  },
  context: string = "Send transaction"
): Promise<string> {
  return withRetry(
    () => connection.sendTransactionFromInstructions(transaction),
    context,
    {
      maxAttempts: 3,
      baseDelay: 1500,
      retriableErrors: [
        'blockhash not found',
        'transaction was not confirmed',
        'failed to send transaction',
        'timeout',
        'network error'
      ]
    }
  );
}

// Retry wrapper for account fetching
export async function fetchAccountWithRetry<T>(
  fetchFunction: () => Promise<T>,
  context: string = "Fetch account"
): Promise<T> {
  return withRetry(
    fetchFunction,
    context,
    {
      maxAttempts: 5,
      baseDelay: 500,
      retriableErrors: ['timeout', 'network error', 'not found', 'failed to fetch']
    }
  );
}

// Enhanced delay function with jitter to avoid thundering herd
export function delayWithJitter(baseMs: number, jitterPercent: number = 20): Promise<void> {
  const jitter = baseMs * (jitterPercent / 100) * (Math.random() - 0.5);
  const delay = Math.max(100, baseMs + jitter); // Minimum 100ms delay
  
  console.log(`[Delay] Waiting ${Math.round(delay)}ms (base: ${baseMs}ms, jitter: ${Math.round(jitter)}ms)`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Circuit breaker pattern for frequent failures
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>, context: string): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        console.log(`[CircuitBreaker] ${context} - State changed to half-open`);
      } else {
        throw new Error(`Circuit breaker is open for ${context}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(context);
      return result;
    } catch (error) {
      this.onFailure(context);
      throw error;
    }
  }

  private onSuccess(context: string) {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      console.log(`[CircuitBreaker] ${context} - State changed to closed`);
    }
  }

  private onFailure(context: string) {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      console.log(`[CircuitBreaker] ${context} - State changed to open (${this.failures} failures)`);
    }
  }
}

// Global circuit breaker instance
const globalCircuitBreaker = new CircuitBreaker();

// Circuit breaker wrapper
export async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  return globalCircuitBreaker.execute(operation, context);
}

// Combined retry + circuit breaker wrapper
export async function withRetryAndCircuitBreaker<T>(
  operation: () => Promise<T>,
  context: string,
  retryConfig: RetryConfig = {}
): Promise<T> {
  return withCircuitBreaker(
    () => withRetry(operation, context, retryConfig),
    context
  );
}

// Health check for test environment
export async function checkTestEnvironmentHealth(connection: Connection): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check connection
    const slot = await connection.rpc.getSlot();
    console.log(`[HealthCheck] Current slot: ${slot}`);
  } catch (error) {
    issues.push(`Connection issue: ${error.message}`);
  }

  try {
    // Check if we can create a test account
    const testWallet = await connection.createWallet({ airdropAmount: 100000000n }); // 0.1 SOL
    console.log(`[HealthCheck] Test wallet created: ${testWallet.address}`);
  } catch (error) {
    issues.push(`Wallet creation issue: ${error.message}`);
  }

  return {
    healthy: issues.length === 0,
    issues
  };
}

// Retry-enhanced test assertion
export async function assertWithRetry(
  assertion: () => Promise<boolean> | boolean,
  message: string,
  context: string = "Assertion",
  config: RetryConfig = {}
): Promise<void> {
  const result = await withRetry(
    async () => {
      const passed = await assertion();
      if (!passed) {
        throw new Error(`Assertion failed: ${message}`);
      }
      return true;
    },
    context,
    {
      maxAttempts: 3,
      baseDelay: 1000,
      ...config
    }
  );
}

export {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  calculateDelay,
  isRetriableError
};