import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, UserProfile, UserCreditBalance, UserSubscription } from './supabase';
import { LeadData, SaaSPlan } from '../types';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<UserCreditBalance | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronise le profil et le solde de crédits depuis PostgreSQL
  const fetchUserData = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;

    try {
      // 1. Récupérer le profil dans public.profiles
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profData && !profError) {
        setProfile(profData as UserProfile);
      }

      // 2. Récupérer le solde dans public.credit_balances
      const { data: balData, error: balError } = await supabase
        .from('credit_balances')
        .select('*')
        .eq('teacher_id', userId)
        .maybeSingle();

      if (balData && !balError) {
        setBalance(balData as UserCreditBalance);
      }

      // 3. Récupérer l'abonnement actif dans public.subscriptions
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('teacher_id', userId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData && !subError) {
        setSubscription(subData as UserSubscription);
      }
    } catch (err) {
      console.warn('[Supabase Auth] Erreur lors de la récupération des données utilisateur:', err);
    }
  }, []);

  // Initialisation au montage du composant
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[Supabase Auth] Erreur getSession:', error.message);
        }

        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await fetchUserData(currentSession.user.id);
          }
        }
      } catch (err) {
        console.warn('[Supabase Auth] Exception init:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // Écouteur en temps réel sur les changements d'état d'authentification
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (newSession?.user) {
            await fetchUserData(newSession.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setBalance(null);
          setSubscription(null);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.unsubscribe();
    };
  }, [fetchUserData]);

  // Déconnexion officielle via Supabase
  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Erreur lors du signOut Supabase:', e);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setBalance(null);
    setSubscription(null);
  }, []);

  // Recharger manuellement les données (ex: après correction d'une copie)
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  }, [user?.id, fetchUserData]);

  // Mapper le profil et le solde vers le type LeadData utilisé par Praxis
  const currentLead: LeadData | null = user
    ? {
        name: profile?.full_name || (user.user_metadata?.full_name as string) || (user.email?.split('@')[0] ?? 'Enseignant'),
        email: user.email || '',
        whatsapp: profile?.phone_whatsapp || (user.user_metadata?.phone_whatsapp as string) || '',
        school: profile?.school_name || (user.user_metadata?.school_name as string) || 'Établissement non précisé',
        plan: (subscription?.plan_id as SaaSPlan) || 'free',
        status: (subscription?.status as any) || 'active',
        subscriptionCredits: (balance?.subscription_credits ?? 0) + (balance?.free_credits ?? 30),
        extraCredits: balance?.purchased_credits ?? 0,
        quota: balance?.total_available_credits ?? 30,
        copiesCorrected: balance?.total_copies_corrected ?? 0,
        userId: user.id,
        role: profile?.role || 'teacher',
        referralCode: profile?.referral_code || `PRAXIS-${(profile?.full_name || user.email?.split('@')[0] || 'PROF').replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase()}${user.id.replace(/-/g, '').substring(0, 4).toUpperCase()}`,
      }
    : null;

  return {
    user,
    session,
    profile,
    balance,
    subscription,
    currentLead,
    loading,
    signOut,
    refreshProfile,
  };
}
