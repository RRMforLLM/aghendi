import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://jgyopnphlwkmqbkihqme.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpneW9wbnBobHdrbXFia2locW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NjU5ODIsImV4cCI6MjA2MDI0MTk4Mn0.KyOlX-8WU40F4B6nmNLhqgMS-9r39KbOFUQkwFywFfY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})