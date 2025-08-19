# Backend Tests

Comprehensive test suite for the Battle Arena backend system.

## Test Structure

```
backend/tests/
├── entities/          # Domain entity tests
│   ├── User.test.ts
│   ├── Character.test.ts
│   ├── Battle.test.ts
│   ├── Attack.test.ts
│   └── Location.test.ts
├── services/          # Business logic service tests
│   ├── AuthService.test.ts
│   ├── CharacterService.test.ts
│   ├── BattleService.test.ts
│   ├── LocationService.test.ts
│   ├── RankingService.test.ts
│   └── MatchmakingService.test.ts
├── gateways/          # Infrastructure gateway tests
│   └── InMemoryLocationGateway.test.ts
├── mappers/           # Data mapper tests
│   ├── UserMapper.test.ts
│   ├── CharacterMapper.test.ts
│   └── BattleMapper.test.ts
├── integration/       # API integration tests
│   └── api.test.ts
└── setup.ts          # Test configuration and mocks
```

## Running Tests

### All Tests

```bash
pnpm run backend:test
```

### Specific Test Suites

```bash
# Entity tests only
npx jest backend/tests/entities

# Service tests only
npx jest backend/tests/services

# Integration tests only
npx jest backend/tests/integration

# Specific test file
npx jest backend/tests/entities/User.test.ts
```

### Test Coverage

```bash
npx jest --coverage --config jest-backend.config.js
```

## Test Categories

### 🧱 **Entity Tests**

- **User Entity**: Creation, validation, business logic, JSON serialization
- **Character Entity**: Stats management, tier upgrades, damage/healing, power calculation
- **Battle Entity**: Turn management, attack mechanics, battle flow, state transitions
- **Attack Entity**: Random generation, damage calculation, attack types, critical hits
- **Location Entity**: GPS validation, distance calculation, safe spot detection

### ⚙️ **Service Tests**

- **AuthService**: User registration, authentication, validation, error handling
- **CharacterService**: CRUD operations, stat updates, tier progression, search
- **BattleService**: Battle creation, turn management, random attacks, real-time integration
- **LocationService**: GPS tracking, proximity detection, safe spot management
- **RankingService**: Point calculation, leaderboards, ranking updates, seasonal rewards
- **MatchmakingService**: Invitation system, proximity matching, auto-matchmaking

### 🔌 **Infrastructure Tests**

- **Gateways**: Data persistence, repository implementations, error handling
- **Mappers**: Domain ↔ Database conversions, data transformation, type safety

### 🌐 **Integration Tests**

- **API Endpoints**: Request/response handling, authentication, error responses
- **Real-time Features**: Supabase integration, event broadcasting
- **End-to-End Flows**: Complete battle scenarios, matchmaking workflows

## Mock Strategy

### External Dependencies

- **Supabase Client**: Fully mocked for isolated testing
- **Real-time Channels**: Mocked subscription and broadcast methods
- **Crypto.randomUUID**: Deterministic UUIDs for consistent testing
- **Date/Time**: Controlled timestamps for time-sensitive features

### Repository Mocking

All repository interfaces are mocked using Jest to isolate service logic testing.

### Test Data

Realistic test data that matches your game's domain:

- Character stats in 0-100 range
- Battle scenarios with actual HP values
- GPS coordinates for real locations
- Attack types matching your game mechanics

## Test Quality Standards

### Coverage Goals

- **Entities**: 100% line coverage (critical business logic)
- **Services**: 95%+ line coverage (core application logic)
- **Gateways**: 90%+ line coverage (infrastructure reliability)
- **Integration**: Key user flows and error scenarios

### Test Types

- **Unit Tests**: Fast, isolated, no external dependencies
- **Integration Tests**: API contracts, authentication flows
- **Business Logic Tests**: Domain rules, game mechanics validation
- **Error Scenario Tests**: Edge cases, validation failures, network errors

## Key Testing Features

### 🎮 **Game Mechanics Testing**

- Random attack generation with statistical validation
- Battle flow scenarios (start, attack, end)
- Proximity-based matchmaking logic
- Point calculation algorithms

### 🏆 **Ranking System Testing**

- Point award calculations
- Upset victory bonuses
- Speed battle bonuses
- Leaderboard updates

### 📍 **Location System Testing**

- GPS coordinate validation
- Haversine distance calculations
- Safe spot detection
- Proximity queries

### ⚡ **Real-time Testing**

- Subscription management
- Event broadcasting
- Channel cleanup

## Running Specific Test Scenarios

```bash
# Test proximity detection
npx jest -t "proximity"

# Test battle mechanics
npx jest -t "battle"

# Test attack system
npx jest -t "attack"

# Test ranking calculations
npx jest -t "ranking"
```

## Development Workflow

1. **Write Tests First**: TDD approach for new features
2. **Run Tests Frequently**: Use `--watch` mode during development
3. **Check Coverage**: Ensure new code is tested
4. **Integration Testing**: Test API contracts after service changes
5. **Mock External Services**: Keep tests fast and reliable

The test suite ensures your proximity-based battle system works correctly and remains robust as you add new features! 🎯
