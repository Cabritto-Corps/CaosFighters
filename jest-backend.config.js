module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/backend'],
    testMatch: ['<rootDir>/backend/**/__tests__/**/*.ts', '<rootDir>/backend/**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        '<rootDir>/backend/**/*.ts',
        '!<rootDir>/backend/**/*.d.ts',
        '!<rootDir>/backend/node_modules/**',
        '!<rootDir>/backend/dist/**',
    ],
    coverageDirectory: '<rootDir>/backend/coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.ts'],
}
