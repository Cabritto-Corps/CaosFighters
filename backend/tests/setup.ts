// Jest setup file for backend tests
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

// Mock console methods for cleaner test output
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: jest.fn(() => 'test-uuid-123')
    }
})

// Setup test timeout
jest.setTimeout(10000)
