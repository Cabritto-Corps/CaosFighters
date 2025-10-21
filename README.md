# Battle App React Native with Expo

A proximity-based battle game built with React Native, Expo, and Supabase.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Expo CLI
- Android Studio / Xcode (for device testing)

### Environment Setup

Create a `.env` file in the root directory:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** The project uses the existing `app.json` configuration with environment variables support.

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Run on device
pnpm android  # Android
pnpm ios      # iOS
pnpm web      # Web
```

## 🏗️ Project Structure

```
src/
├── app/                    # Application layer
│   ├── screens/           # Screen components
│   ├── components/        # Reusable components
│   └── navigation/        # Navigation setup
├── expo-app/              # Existing Expo app structure
│   ├── (tabs)/            # Tab navigation
│   ├── _layout.tsx        # Root layout
│   └── +not-found.tsx     # 404 screen
├── domain/                # Domain layer
│   ├── entities/          # Business entities
│   ├── repositories/      # Data access interfaces
│   ├── services/          # Business logic
│   └── adapters/          # External service adapters
├── infra/                 # Infrastructure layer
│   ├── supabase/          # Supabase client
│   ├── gateways/          # External service gateways
│   └── mappers/           # Data transformation
├── state/                 # State management (Zustand)
├── styles/                # Theme and styling (includes Colors)
└── utils/                 # Utility functions (includes hooks)

**Note:** The project has been reorganized to avoid conflicts. All existing Expo files are now properly organized within `src/` following clean architecture principles.
```

## 🎯 Features (Planned)

- [ ] **Authentication** - Supabase auth integration
- [ ] **Proximity Matching** - Location-based battle matching
- [ ] **Turn-based Battles** - Pokémon-like battle system
- [ ] **Ranking System** - Leaderboards and statistics

## 🛠️ Development

### Available Scripts

- `pnpm start` - Start Expo development server
- `pnpm android` - Run on Android device/emulator
- `pnpm ios` - Run on iOS device/simulator
- `pnpm test` - Run Jest tests
- `pnpm lint` - Run ESLint

### Testing

```bash
pnpm test              # Run all tests
pnpm test --watch      # Run tests in watch mode
pnpm test --coverage   # Run tests with coverage
```

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Lightweight configuration
- **Prettier**: Code formatting (already configured)

## 🔧 Configuration

### TypeScript

- Strict mode enabled
- Path aliases configured (`@/*`)
- Expo base configuration

### Navigation

- React Navigation (Stack + Tabs)
- Login → Main app flow
- Tab-based navigation for main features

### State Management

- Zustand for global state
- Session and battle stores (placeholders)

## 📱 Permissions

The app will request these permissions:

- **Location**: For proximity-based matching
- **Notifications**: For battle invitations

## 🚧 Current Status

This is a **scaffolded project** with:

- ✅ Project structure and folders
- ✅ Basic navigation shell
- ✅ Supabase client setup
- ✅ Placeholder screens
- ✅ State store placeholders
- ✅ Testing configuration
- ✅ Environment configuration
- ✅ Metro configuration for path aliases
- ✅ ESLint configuration for new structure

**Next steps:**

1. Implement domain entities and business logic
2. Add Supabase authentication
3. Implement location services
4. Build battle system
5. Add ranking functionality

## 🤝 Contributing

1. Follow the established folder structure
2. Use TypeScript with strict mode
3. Keep components minimal and focused
4. Add tests for new functionality
5. Update documentation as needed

## 📄 License

Private project - All rights reserved
