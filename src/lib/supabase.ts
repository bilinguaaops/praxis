/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabasePublishableKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabasePublishableKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[Praxis Auth] ⚠️ Variables VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY non définies ou incomplètes. ' +
    'Renseignez-les dans votre environnement ou fichier .env pour activer Supabase Auth.'
  );
}

// Client singleton Supabase officiel
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'praxis-supabase-auth-token',
    },
  }
);

export interface UserProfile {
  id: string;
  role: 'teacher' | 'admin' | 'partner';
  full_name: string;
  email: string;
  phone_whatsapp?: string;
  school_name?: string;
  city?: string;
  country?: string;
  avatar_url?: string;
  referral_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserCreditBalance {
  teacher_id: string;
  free_credits: number;
  subscription_credits: number;
  purchased_credits: number;
  frozen_subscription_credits: number;
  total_available_credits: number;
  total_copies_corrected: number;
  last_updated_at?: string;
}

export interface UserSubscription {
  id: string;
  teacher_id: string;
  plan_id: 'free' | 'monthly' | '3_months' | '9_months';
  status: 'active' | 'expired' | 'canceled' | 'past_due';
  started_at: string;
  expires_at?: string | null;
  auto_renew: boolean;
}
