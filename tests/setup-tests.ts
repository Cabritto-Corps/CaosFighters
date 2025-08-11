// TODO: Add proper React Native Testing Library setup
// TODO: Configure mocks for native modules
// TODO: Add custom matchers and utilities
// TODO: Set up test environment properly

// TODO: Add proper React Native Testing Library setup

// Mock expo-constants
jest.mock('expo-constants', () => ({
    expoConfig: {
        extra: {
            SUPABASE_URL: 'https://test.supabase.co',
            SUPABASE_ANON_KEY: 'test-key',
        },
    },
}))

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

// Mock expo-location
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
}))

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
    requestPermissionsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
}))
