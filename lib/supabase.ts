import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a dummy client if env vars are missing (for development)
// This prevents build-time errors
let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Using dummy client.');
  // Create a dummy client that won't work but won't crash
  supabase = createClient('https://dummy.supabase.co', 'dummy-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
} else {
  // Create Supabase client with proper session persistence
  // Supabase uses a storage key format: `sb-${projectRef}-auth-token`
  // But we can also use a custom key
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use localStorage for session persistence
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Supabase will use its default key format, but we can check for it
      // The actual key format is: sb-{projectRef}-auth-token
      // We'll let Supabase use its default key
      // PKCE is enabled by default in Supabase
      // Cookies are used automatically for code_verifier storage
      // Session will be stored in localStorage and persist across page reloads
    },
  });
  
  // Note: Session initialization is handled in client components, not here
  // This prevents SSR issues and build errors
}

export { supabase };

