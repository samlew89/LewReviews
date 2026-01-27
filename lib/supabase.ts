/**
 * Supabase Client Configuration for React Native
 *
 * This module initializes the Supabase client with AsyncStorage
 * for session persistence in React Native environments.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Environment variables - these should be set in your .env file
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase credentials not found. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
  );
}

/**
 * Custom storage adapter for Supabase auth using AsyncStorage
 * This enables session persistence across app restarts
 */
const AsyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  },
};

/**
 * Supabase client instance configured for React Native
 *
 * Features:
 * - AsyncStorage for session persistence
 * - Auto refresh token enabled
 * - Persistent sessions enabled
 * - URL detection disabled (not available in React Native)
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not available in React Native
    },
  }
);

/**
 * Storage bucket helpers
 */
export const storage = {
  videos: supabase.storage.from('videos'),
  thumbnails: supabase.storage.from('thumbnails'),
  avatars: supabase.storage.from('avatars'),
};

/**
 * Helper to get public URL for a storage object
 */
export function getPublicUrl(bucket: 'videos' | 'thumbnails' | 'avatars', path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Helper to upload a file to storage
 */
export async function uploadFile(
  bucket: 'videos' | 'thumbnails' | 'avatars',
  path: string,
  file: Blob | ArrayBuffer,
  contentType?: string
) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return {
    path: data.path,
    publicUrl: getPublicUrl(bucket, data.path),
  };
}

/**
 * Helper to delete a file from storage
 */
export async function deleteFile(bucket: 'videos' | 'thumbnails' | 'avatars', path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw error;
  }
}

export default supabase;
