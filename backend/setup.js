// Global test setup and configuration

jest.setTimeout(10000);

// Global test environment setup
beforeAll(() => {
  // Suppress console.log during tests (optional)
  // Set test environment variables
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Clean up after all tests
  jest.restoreAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Custom Jest matchers (optional)
expect.extend({
  toBeValidItem(received) {
    const pass = 
      typeof received === 'object' &&
      received !== null &&
      typeof received.id === 'number' &&
      typeof received.name === 'string' &&
      received.name.length > 0;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid item`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid item (must have id as number and name as non-empty string)`,
        pass: false,
      };
    }
  },
});