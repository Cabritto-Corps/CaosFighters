import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TODO: Add authentication, database queries, and realtime subscriptions later
// TODO: Implement proper error handling and retry logic
// TODO: Add type definitions for database schema
