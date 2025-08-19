module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/backend'],
    testMatch: [
        '<rootDir>/backend/tests/**/*.test.ts',
        '<rootDir>/backend/**/__tests__/**/*.ts'
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        '<rootDir>/backend/domain/**/*.ts',
        '<rootDir>/backend/infra/**/*.ts',
        '<rootDir>/backend/middleware/**/*.ts',
        '<rootDir>/backend/server.ts',
        '!<rootDir>/backend/**/*.d.ts',
        '!<rootDir>/backend/node_modules/**',
        '!<rootDir>/backend/dist/**',
        '!<rootDir>/backend/tests/**',
    ],
    coverageDirectory: '<rootDir>/backend/coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.ts'],

    testTimeout: 10000,
}
