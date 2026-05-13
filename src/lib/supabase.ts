import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

const webOrigin =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : process.env.EXPO_PUBLIC_WEB_URL;

export function getOAuthRedirectUrl(queryParams?: Record<string, string>): string {
  if (Platform.OS === 'web') {
    const url = new URL('/auth/callback', webOrigin ?? 'http://localhost');

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  }

  return Linking.createURL('/auth/callback', { queryParams });
}
