import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Environment configuration with proper typing
const env = {
    SUPABASE_URL: process.env['SUPABASE_URL'],
    SUPABASE_ANON_KEY: process.env['SUPABASE_ANON_KEY']
}

const supabaseUrl = env.SUPABASE_URL
const supabaseAnonKey = env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TODO: Add authentication, database queries, and realtime subscriptions later
// TODO: Implement proper error handling and retry logic
// TODO: Add type definitions for database schema
