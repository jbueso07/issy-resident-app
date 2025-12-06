import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://fxawqxquinldcxkvwoet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4YXdxeHF1aW5sZGN4a3Z3b2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDAwNDYsImV4cCI6MjA3ODMxNjA0Nn0.Nu0AXZf9iy0kjPYi7V6acrhtiHuv30HkNGECb7AhgLk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
