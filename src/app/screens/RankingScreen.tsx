import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function RankingScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ranking</Text>
            <Text style={styles.subtitle}>Leaderboard coming soon!</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
})
