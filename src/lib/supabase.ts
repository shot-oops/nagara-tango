import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function resolveConfig(): { url: string; anonKey: string } | null {
  const extra =
    Constants?.expoConfig?.extra && typeof Constants.expoConfig.extra === 'object'
      ? Constants.expoConfig.extra
      : {};
  const rawUrl =
    typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : '';
  const anonKey =
    typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey : '';
  if (!rawUrl || !anonKey) return null;
  // createClient expects the project base URL (https://xxx.supabase.co), not
  // the REST endpoint — strip a trailing /rest/v1 or /rest/v1/ if present.
  const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  return { url, anonKey };
}

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const cfg = resolveConfig();
  if (!cfg) {
    console.info(
      '[supabase] no URL/anon key configured — running in offline mode'
    );
    return null;
  }
  try {
    client = createClient(cfg.url, cfg.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    return client;
  } catch (e) {
    console.error('[supabase] createClient failed', e);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return resolveConfig() !== null;
}
