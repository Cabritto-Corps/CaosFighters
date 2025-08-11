import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'

import BattleScreen from '../screens/BattleScreen'
import HomeScreen from '../screens/HomeScreen'
import LoginScreen from '../screens/LoginScreen'
import RankingScreen from '../screens/RankingScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#007AFF',
                tabBarInactiveTintColor: '#8E8E93',
            }}
        >
            <Tab.Screen 
                name="Home" 
                component={HomeScreen}
                options={{
                    title: 'Home',
                }}
            />
            <Tab.Screen 
                name="Battle" 
                component={BattleScreen}
                options={{
                    title: 'Battle',
                }}
            />
            <Tab.Screen 
                name="Ranking" 
                component={RankingScreen}
                options={{
                    title: 'Ranking',
                }}
            />
        </Tab.Navigator>
    )
}

export default function Navigation() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Main" component={TabNavigator} />
            </Stack.Navigator>
        </NavigationContainer>
    )
}
