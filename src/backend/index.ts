import { createLocalBackend } from './local';
import { createSupabaseBackend } from './supabase';
import type { Backend } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Uses Supabase when configured, otherwise a self-contained demo mode. */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : createLocalBackend();

export type { Backend, Session } from './types';
