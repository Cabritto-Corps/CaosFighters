import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: "Caos Fighters",
    slug: "caos-fighters",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/LogoCaosFighters.png",
    scheme: "poo",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
        supportsTablet: true,
        infoPlist: {
            NSLocationWhenInUseUsageDescription: "Este app precisa da sua localização para encontrar jogadores próximos e enviar notificações de batalha.",
            NSLocationAlwaysAndWhenInUseUsageDescription: "Este app precisa da sua localização para encontrar jogadores próximos e enviar notificações de batalha."
        }
    },
    android: {
        adaptiveIcon: {
            foregroundImage: "./assets/images/LogoCaosFighters.png",
            backgroundColor: "#ffffff"
        },
        edgeToEdgeEnabled: true,
        package: "com.anonymous.poo",
        permissions: [
            "ACCESS_FINE_LOCATION",
            "ACCESS_COARSE_LOCATION",
            "RECEIVE_BOOT_COMPLETED"
        ]
    },
    web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png"
    },
    plugins: [
        "expo-router",
        [
            "expo-splash-screen",
            {
                "image": "./assets/images/LogoCaosFighters.png",
                "imageWidth": 200,
                "resizeMode": "contain",
                "backgroundColor": "#ffffff"
            }
        ],
        [
            "expo-notifications",
            {
                "icon": "./assets/images/LogoCaosFighters.png",
                "color": "#FFD700",
                "sounds": []
            }
        ],
        [
            "expo-location",
            {
                "locationAlwaysAndWhenInUsePermission": "Este app precisa da sua localização para encontrar jogadores próximos e enviar notificações de batalha."
            }
        ],
        [
            "expo-font",
            {
                "fonts": ["node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"]
            }
        ]
    ],
    experiments: {
        typedRoutes: true
    },
    extra: {
        apiUrl: process.env.EXPO_PUBLIC_API_URL,
        reverbAppKey: process.env.EXPO_PUBLIC_REVERB_APP_KEY,
        reverbHost: process.env.EXPO_PUBLIC_REVERB_HOST,
        reverbPort: process.env.EXPO_PUBLIC_REVERB_PORT,
        reverbScheme: process.env.EXPO_PUBLIC_REVERB_SCHEME,
        router: {},
        eas: {
            projectId: "cbac2687-3963-46be-a056-e51daa716f74"
        }
    }
});
