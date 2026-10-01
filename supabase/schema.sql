-- ============================================================================
-- SAAS PRAXIS - SCHEMA COMPLET SUPABASE (PostgreSQL + Auth + Storage + RLS)
-- ============================================================================
-- Ce script est 100% autonome et prêt à être collé dans l'éditeur SQL de Supabase.
-- Il configure :
-- 1. Les extensions PostgreSQL requises
-- 2. Les tables métier, relations et contraintes d'intégrité
-- 3. Le système de crédits avec ledger immuable et cache de balance
-- 4. Les protections strictes contre le double débit et le double remboursement (Idempotence)
-- 5. La gestion fine des crédits (free, subscription, purchased, frozen)
-- 6. Les abonnements (free, monthly, 3_months, 9_months) sans paiement externe
-- 7. Les classes, élèves, devoirs (assignments), corrigés et copies multi-pages (1 copie = 1 crédit)
-- 8. Les pré-corrections IA et validations officielles de l'enseignant
-- 9. Les documents juridiques et l'enregistrement horodaté des consentements
-- 10. Les fonctions SECURITY DEFINER avec contrôle de propriété (auth.uid())
-- 11. Les politiques de sécurité RLS (Row Level Security) sur toutes les tables
-- 12. Les buckets Supabase Storage et leurs politiques de sécurité
-- 13. Les données initiales (seeds des plans, packs et documents légaux)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABLE PROFILES (Liée à auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin', 'partner')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_whatsapp TEXT,
    school_name TEXT,
    city TEXT,
    country TEXT DEFAULT 'SN',
    avatar_url TEXT,
    referral_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- ----------------------------------------------------------------------------
-- 3. PLANS D'ABONNEMENT ET PACKS DE CRÉDITS
-- ----------------------------------------------------------------------------
-- Plans : free (30 crédits offerts), monthly (500), 3_months (1500), 9_months (4500)
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY, -- 'free', 'monthly', '3_months', '9_months'
    name TEXT NOT NULL,
    duration_days INT NOT NULL,
    price_fcfa INT NOT NULL,
    included_credits INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Packs supplémentaires : +100 (1 000 FCFA), +500 (5 000 FCFA), +1000 (10 000 FCFA)
CREATE TABLE IF NOT EXISTS public.credit_packs (
    id TEXT PRIMARY KEY, -- 'pack_100', 'pack_500', 'pack_1000'
    name TEXT NOT NULL,
    credits_count INT NOT NULL,
    price_fcfa INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 4. ABONNEMENTS DES ENSEIGNANTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled', 'past_due')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ, -- NULL pour le plan 'free'
    auto_renew BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_teacher ON public.subscriptions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ----------------------------------------------------------------------------
-- 5. SOLDES DE CRÉDITS & GRAND LIVRE D'AUDIT (LEDGER)
-- ----------------------------------------------------------------------------
-- Cache performant des 4 compartiments de crédits
CREATE TABLE IF NOT EXISTS public.credit_balances (
    teacher_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    free_credits INT NOT NULL DEFAULT 0 CHECK (free_credits >= 0),
    subscription_credits INT NOT NULL DEFAULT 0 CHECK (subscription_credits >= 0),
    purchased_credits INT NOT NULL DEFAULT 0 CHECK (purchased_credits >= 0),
    frozen_subscription_credits INT NOT NULL DEFAULT 0 CHECK (frozen_subscription_credits >= 0),
    total_copies_corrected INT NOT NULL DEFAULT 0 CHECK (total_copies_corrected >= 0),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Colonne virtuelle / calculée pour le total disponible immédiatement
ALTER TABLE public.credit_balances 
    DROP COLUMN IF EXISTS total_available_credits;
ALTER TABLE public.credit_balances 
    ADD COLUMN total_available_credits INT GENERATED ALWAYS AS (free_credits + subscription_credits + purchased_credits) STORED;

-- Grand livre immuable : chaque mouvement de crédit est consigné ici
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    delta INT NOT NULL, -- -1 pour débit, +N pour crédit
    credit_type TEXT NOT NULL CHECK (credit_type IN ('free', 'subscription', 'purchased', 'frozen_subscription')),
    action_type TEXT NOT NULL CHECK (action_type IN (
        'initial_grant',
        'subscription_grant',
        'pack_purchase',
        'correction_consume',
        'correction_refund',
        'subscription_expire_freeze',
        'subscription_renew_unfreeze',
        'admin_adjustment',
        'referral_reward'
    )),
    submission_id UUID, -- Référence directe à la copie corrigée
    reference_id TEXT,  -- ID externe (ex: transaction_id, promo_code, referral_id)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_teacher ON public.credit_ledger(teacher_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_submission ON public.credit_ledger(submission_id);

-- CONTRAINTE CRITIQUE D'IDEMPOTENCE 1 : PROTECTION DOUBLE DÉBIT
-- Une même copie (submission_id) ne peut consommer qu'UN SEUL crédit au maximum.
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_ledger_consume_per_submission 
    ON public.credit_ledger(submission_id) 
    WHERE action_type = 'correction_consume';

-- CONTRAINTE CRITIQUE D'IDEMPOTENCE 2 : PROTECTION DOUBLE REMBOURSEMENT
-- Une même copie (submission_id) ne peut être remboursée qu'UNE SEULE fois au maximum.
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_ledger_refund_per_submission 
    ON public.credit_ledger(submission_id) 
    WHERE action_type = 'correction_refund';

-- CONTRAINTE CRITIQUE D'IDEMPOTENCE 3 : PROTECTION DOUBLE RÉCOMPENSE PARRAINAGE
-- Un même parrainage (referral_id) ne peut donner lieu qu'à une seule attribution par enseignant
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_ledger_referral_reward 
    ON public.credit_ledger(reference_id, teacher_id) 
    WHERE action_type = 'referral_reward';

-- ----------------------------------------------------------------------------
-- 6. GESTION DES CLASSES ET DES ÉLÈVES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT,
    discipline TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes(teacher_id);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher ON public.students(teacher_id);

-- ----------------------------------------------------------------------------
-- 7. SÉRIES DE CORRECTION (ASSIGNMENTS) ET FICHIERS CORRIGÉS/BARÈMES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    discipline TEXT NOT NULL,
    level TEXT NOT NULL,
    max_grade NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    correction_mode TEXT NOT NULL DEFAULT 'with_rubric' CHECK (correction_mode IN ('with_rubric', 'autonomous')),
    assessment_type TEXT NOT NULL DEFAULT 'standard',
    rubric_content TEXT NOT NULL DEFAULT '',
    pedagogical_guidelines JSONB NOT NULL DEFAULT '{"spellingTolerance": false, "rewardEffortAndMethod": true, "rigorousJustification": true, "encourageClarity": true, "customInstructions": ""}'::jsonb,
    analysis_speed TEXT NOT NULL DEFAULT 'turbo' CHECK (analysis_speed IN ('turbo', 'deep')),
    ai_engine TEXT NOT NULL DEFAULT 'auto' CHECK (ai_engine IN ('auto', 'haiku', 'gemini')),
    pages_per_copy INT NOT NULL DEFAULT 1 CHECK (pages_per_copy >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments(class_id);

-- Fichiers du barème / corrigé officiel
CREATE TABLE IF NOT EXISTS public.rubric_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    page_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rubric_files_assignment ON public.rubric_files(assignment_id);

-- ----------------------------------------------------------------------------
-- 8. COPIES D'ÉLÈVES (SUBMISSIONS) ET PAGES MULTIPLES
-- ----------------------------------------------------------------------------
-- Une copie (Submission) représente 1 élève = 1 correction = 1 seul crédit
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL DEFAULT 'Élève Anonyme',
    page_count INT NOT NULL DEFAULT 1 CHECK (page_count >= 1),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_teacher ON public.submissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

-- Pages de la copie (1 copie peut avoir 1, 2, 3, 4 pages ou plus)
CREATE TABLE IF NOT EXISTS public.submission_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    page_index INT NOT NULL DEFAULT 1 CHECK (page_index >= 1),
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    rotation INT NOT NULL DEFAULT 0 CHECK (rotation IN (0, 90, 180, 270)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_submission_page_index UNIQUE (submission_id, page_index)
);

CREATE INDEX IF NOT EXISTS idx_submission_pages_submission ON public.submission_pages(submission_id);

-- ----------------------------------------------------------------------------
-- 9. PRÉ-CORRECTION IA (AI_CORRECTIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    note_ia NUMERIC(5,2) NOT NULL,
    note_sur NUMERIC(5,2) NOT NULL,
    confiance_globale TEXT NOT NULL DEFAULT 'elevee' CHECK (confiance_globale IN ('elevee', 'moyenne', 'faible')),
    verification_humaine_recommandee BOOLEAN NOT NULL DEFAULT false,
    motif_verification TEXT,
    lisibilite TEXT NOT NULL DEFAULT 'bonne' CHECK (lisibilite IN ('excellente', 'bonne', 'moyenne', 'faible', 'illisible')),
    appreciation TEXT NOT NULL,
    points_forts JSONB NOT NULL DEFAULT '[]'::jsonb,
    points_ameliorer JSONB NOT NULL DEFAULT '[]'::jsonb,
    competences JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    texte_transcrit_resume TEXT,
    nom_manuscrit_detecte TEXT,
    raw_ai_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_corrections_submission ON public.ai_corrections(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_corrections_teacher ON public.ai_corrections(teacher_id);

-- ----------------------------------------------------------------------------
-- 10. CORRECTION FINALE OFFICIELLE DE L'ENSEIGNANT (FINAL_EVALUATIONS)
-- ----------------------------------------------------------------------------
-- L'enseignant reste le seul décideur légal et pédagogique final
CREATE TABLE IF NOT EXISTS public.final_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    note_finale NUMERIC(5,2) NOT NULL,
    note_sur NUMERIC(5,2) NOT NULL,
    appreciation TEXT NOT NULL,
    competences JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    statut_validation TEXT NOT NULL DEFAULT 'propose_ia' CHECK (statut_validation IN ('propose_ia', 'en_cours_examen', 'valide_professeur')),
    valide_par_nom TEXT,
    valide_le TIMESTAMPTZ,
    manually_adjusted BOOLEAN NOT NULL DEFAULT false,
    teacher_notes TEXT,
    validated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_final_evaluations_submission ON public.final_evaluations(submission_id);
CREATE INDEX IF NOT EXISTS idx_final_evaluations_teacher ON public.final_evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_final_evaluations_statut ON public.final_evaluations(statut_validation);

-- ----------------------------------------------------------------------------
-- 11. PARTENAIRES, CODES PROMO ET PARRAINAGE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    partner_name TEXT NOT NULL,
    promo_code TEXT NOT NULL UNIQUE,
    commission_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
    total_earned_fcfa INT NOT NULL DEFAULT 0 CHECK (total_earned_fcfa >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
    code TEXT PRIMARY KEY,
    discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    max_uses INT,
    current_uses INT NOT NULL DEFAULT 0,
    valid_until TIMESTAMPTZ,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 11.B PROGRAMME DE PARRAINAGE PROFESSEUR → PROFESSEUR
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'canceled')),
    reward_granted BOOLEAN NOT NULL DEFAULT false,
    reward_amount INT NOT NULL DEFAULT 50 CHECK (reward_amount = 50),
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT chk_no_self_referral CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- ----------------------------------------------------------------------------
-- 12. TRANSACTIONS (PRÉPARATION DE L'ARCHITECTURE SANS PAIEMENT ACTIF)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_fcfa INT NOT NULL CHECK (amount_fcfa >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    plan_id TEXT REFERENCES public.plans(id),
    pack_id TEXT REFERENCES public.credit_packs(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    payment_provider TEXT DEFAULT 'manual_or_pending',
    provider_transaction_id TEXT,
    promo_code TEXT REFERENCES public.promo_codes(code),
    discount_amount_fcfa INT NOT NULL DEFAULT 0,
    partner_commission_fcfa INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_teacher ON public.transactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- ----------------------------------------------------------------------------
-- 13. DOCUMENTS JURIDIQUES ET ACCEPTATIONS (CGU, MENTIONS, RGPD/DPA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_documents (
    slug TEXT NOT NULL, -- 'cgu', 'mentions_legales', 'politique_confidentialite', 'dpa_rgpd'
    version TEXT NOT NULL, -- ex: '1.0.0'
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (slug, version)
);

CREATE TABLE IF NOT EXISTS public.legal_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_slug TEXT NOT NULL,
    version TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    FOREIGN KEY (document_slug, version) REFERENCES public.legal_documents(slug, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_consents_teacher ON public.legal_consents(teacher_id);

-- ----------------------------------------------------------------------------
-- 14. LOGS D'AUDIT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    ip_address TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_teacher ON public.audit_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ----------------------------------------------------------------------------
-- 15. FONCTIONS MÉTIER ATOMIQUES ET SÉCURISÉES (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- A. DÉBIT ATOMIQUE D'UN CRÉDIT AVEC IDEMPOTENCE ABSOLUE
CREATE OR REPLACE FUNCTION public.consume_correction_credit(
    p_teacher_id UUID,
    p_submission_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_existing_ledger RECORD;
    v_balance RECORD;
    v_chosen_credit_type TEXT;
    v_has_active_sub BOOLEAN;
BEGIN
    -- 1. Contrôle de sécurité strict : l'appelant doit être le propriétaire ou le service_role
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL AND v_caller_uid <> p_teacher_id THEN
        RAISE EXCEPTION 'Accès refusé : vous ne pouvez pas débiter les crédits d''un autre enseignant.';
    END IF;

    -- 2. Vérification idempotence : la copie a-t-elle DÉJÀ consommé un crédit ?
    SELECT id, credit_type, created_at INTO v_existing_ledger
    FROM public.credit_ledger
    WHERE submission_id = p_submission_id 
      AND action_type = 'correction_consume';

    IF FOUND THEN
        -- Déjà consommé : retourne un statut de succès sans débit supplémentaire
        RETURN jsonb_build_object(
            'success', true,
            'already_consumed', true,
            'credit_type_used', v_existing_ledger.credit_type,
            'consumed_at', v_existing_ledger.created_at,
            'message', 'Cette copie a déjà consommé son crédit d''analyse.'
        );
    END IF;

    -- 3. Verrouillage atomique de la ligne balance (FOR UPDATE)
    SELECT * INTO v_balance
    FROM public.credit_balances
    WHERE teacher_id = p_teacher_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'balance_not_found',
            'message', 'Compte enseignant introuvable.'
        );
    END IF;

    -- 4. Vérification si un abonnement payant actif existe
    SELECT EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE teacher_id = p_teacher_id
          AND status = 'active'
          AND plan_id IN ('monthly', '3_months', '9_months')
          AND (expires_at IS NULL OR expires_at > now())
    ) INTO v_has_active_sub;

    -- 5. Sélection du compartiment prioritaire selon la règle :
    -- 1er : subscription_credits (si abonnement actif et > 0)
    -- 2e  : free_credits (si > 0)
    -- 3e  : purchased_credits (si > 0)
    IF v_has_active_sub AND v_balance.subscription_credits > 0 THEN
        v_chosen_credit_type := 'subscription';
    ELSIF v_balance.free_credits > 0 THEN
        v_chosen_credit_type := 'free';
    ELSIF v_balance.purchased_credits > 0 THEN
        v_chosen_credit_type := 'purchased';
    ELSIF v_balance.subscription_credits > 0 THEN
        -- Cas où l'abonnement n'a pas encore été marqué expiré formellement
        v_chosen_credit_type := 'subscription';
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_credits',
            'message', 'Solde de crédits insuffisant pour analyser cette copie.'
        );
    END IF;

    -- 6. Débit dans le grand livre (insère avec submission_id, protégé par l'index unique)
    INSERT INTO public.credit_ledger (
        teacher_id,
        delta,
        credit_type,
        action_type,
        submission_id,
        metadata
    ) VALUES (
        p_teacher_id,
        -1,
        v_chosen_credit_type,
        'correction_consume',
        p_submission_id,
        jsonb_build_object('timestamp', now())
    );

    -- 7. Décrémentation du solde dans le cache
    IF v_chosen_credit_type = 'subscription' THEN
        UPDATE public.credit_balances
        SET subscription_credits = subscription_credits - 1,
            total_copies_corrected = total_copies_corrected + 1,
            last_updated_at = now()
        WHERE teacher_id = p_teacher_id;
    ELSIF v_chosen_credit_type = 'free' THEN
        UPDATE public.credit_balances
        SET free_credits = free_credits - 1,
            total_copies_corrected = total_copies_corrected + 1,
            last_updated_at = now()
        WHERE teacher_id = p_teacher_id;
    ELSIF v_chosen_credit_type = 'purchased' THEN
        UPDATE public.credit_balances
        SET purchased_credits = purchased_credits - 1,
            total_copies_corrected = total_copies_corrected + 1,
            last_updated_at = now()
        WHERE teacher_id = p_teacher_id;
    END IF;

    -- 8. Mise à jour du statut de la copie en cours d'analyse
    UPDATE public.submissions
    SET status = 'analyzing',
        updated_at = now()
    WHERE id = p_submission_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_consumed', false,
        'credit_type_used', v_chosen_credit_type,
        'submission_id', p_submission_id
    );
END;
$$;

-- B. REMBOURSEMENT ATOMIQUE D'UN CRÉDIT AVEC IDEMPOTENCE ABSOLUE
CREATE OR REPLACE FUNCTION public.refund_correction_credit(
    p_teacher_id UUID,
    p_submission_id UUID,
    p_reason TEXT DEFAULT 'correction_failed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_consume_record RECORD;
    v_refund_record RECORD;
    v_credit_type_to_refund TEXT;
    v_has_active_sub BOOLEAN;
BEGIN
    -- 1. Contrôle de sécurité strict
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL AND v_caller_uid <> p_teacher_id THEN
        RAISE EXCEPTION 'Accès refusé : vous ne pouvez pas rembourser les crédits d''un autre enseignant.';
    END IF;

    -- 2. Vérification idempotence : la copie a-t-elle DÉJÀ été remboursée ?
    SELECT id, created_at INTO v_refund_record
    FROM public.credit_ledger
    WHERE submission_id = p_submission_id
      AND action_type = 'correction_refund';

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_refunded', true,
            'refunded_at', v_refund_record.created_at,
            'message', 'Cette copie a déjà été remboursée.'
        );
    END IF;

    -- 3. Vérification de la consommation initiale
    SELECT id, credit_type INTO v_consume_record
    FROM public.credit_ledger
    WHERE submission_id = p_submission_id
      AND action_type = 'correction_consume';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'no_prior_consumption',
            'message', 'Aucune consommation préalable trouvée pour cette copie.'
        );
    END IF;

    -- 4. Déterminer quel compartiment recréditer
    v_credit_type_to_refund := v_consume_record.credit_type;

    -- Si c'était un crédit d'abonnement mais que l'abonnement a expiré entre-temps,
    -- le crédit est remboursé dans purchased_credits pour ne jamais léser le professeur !
    IF v_credit_type_to_refund = 'subscription' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.subscriptions
            WHERE teacher_id = p_teacher_id
              AND status = 'active'
              AND (expires_at IS NULL OR expires_at > now())
        ) INTO v_has_active_sub;

        IF NOT v_has_active_sub THEN
            v_credit_type_to_refund := 'purchased';
        END IF;
    END IF;

    -- 5. Verrouillage atomique de la balance
    PERFORM 1 FROM public.credit_balances WHERE teacher_id = p_teacher_id FOR UPDATE;

    -- 6. Enregistrement dans le grand livre
    INSERT INTO public.credit_ledger (
        teacher_id,
        delta,
        credit_type,
        action_type,
        submission_id,
        metadata
    ) VALUES (
        p_teacher_id,
        1,
        v_credit_type_to_refund,
        'correction_refund',
        p_submission_id,
        jsonb_build_object('reason', p_reason, 'timestamp', now())
    );

    -- 7. Ré-incrémentation du solde
    IF v_credit_type_to_refund = 'subscription' THEN
        UPDATE public.credit_balances
        SET subscription_credits = subscription_credits + 1,
            total_copies_corrected = GREATEST(0, total_copies_corrected - 1),
            last_updated_at = now()
        WHERE teacher_id = p_teacher_id;
    ELSIF v_credit_type_to_refund = 'free' THEN
        UPDATE public.credit_balances
        SET free_credits = free_credits + 1,
            total_copies_corrected = GREATEST(0, total_copies_corrected - 1),
            last_updated_at = now()
        WHERE teacher_id = p_teacher_id;
    ELSIF v_credit_type_to_refund = 'purchased' THEN
        UPDATE public.credit_balances
        SET purchased_credits = purchased_credits + 1,
            total_copies_corrected = GREATEST(0, total_copies_corrected - 1),
            last_updated_at = now()
        WHERE teacher_id = p_teacher_id;
    END IF;

    -- 8. Mise à jour du statut de la copie en erreur
    UPDATE public.submissions
    SET status = 'error',
        error_message = p_reason,
        updated_at = now()
    WHERE id = p_submission_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_refunded', false,
        'refunded_credit_type', v_credit_type_to_refund,
        'submission_id', p_submission_id
    );
END;
$$;

-- C. RÉABONNEMENT ET DÉGEL DES CRÉDITS D'ABONNEMENT
CREATE OR REPLACE FUNCTION public.grant_subscription_plan(
    p_teacher_id UUID,
    p_plan_id TEXT,
    p_auto_renew BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_plan RECORD;
    v_balance RECORD;
    v_frozen_to_unfreeze INT;
    v_new_credits INT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_plan FROM public.plans WHERE id = p_plan_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'plan_not_found');
    END IF;

    -- Calcul de la date d'expiration
    IF v_plan.duration_days > 0 THEN
        v_expires_at := now() + (v_plan.duration_days || ' days')::interval;
    ELSE
        v_expires_at := NULL;
    END IF;

    -- Verrouiller la balance
    SELECT * INTO v_balance FROM public.credit_balances WHERE teacher_id = p_teacher_id FOR UPDATE;

    v_frozen_to_unfreeze := COALESCE(v_balance.frozen_subscription_credits, 0);
    v_new_credits := v_plan.included_credits;

    -- 1. Marquer les anciens abonnements comme terminés
    UPDATE public.subscriptions
    SET status = 'canceled', updated_at = now()
    WHERE teacher_id = p_teacher_id AND status = 'active';

    -- 2. Créer le nouvel abonnement
    INSERT INTO public.subscriptions (
        teacher_id,
        plan_id,
        status,
        started_at,
        expires_at,
        auto_renew
    ) VALUES (
        p_teacher_id,
        p_plan_id,
        'active',
        now(),
        v_expires_at,
        p_auto_renew
    );

    -- 3. Dégel des crédits gelés si présent
    IF v_frozen_to_unfreeze > 0 THEN
        INSERT INTO public.credit_ledger (
            teacher_id, delta, credit_type, action_type, metadata
        ) VALUES (
            p_teacher_id, v_frozen_to_unfreeze, 'subscription', 'subscription_renew_unfreeze',
            jsonb_build_object('unfrozen_credits', v_frozen_to_unfreeze, 'plan_id', p_plan_id)
        );
    END IF;

    -- 4. Attribution des nouveaux crédits inclus
    IF v_new_credits > 0 THEN
        INSERT INTO public.credit_ledger (
            teacher_id, delta, credit_type, action_type, metadata
        ) VALUES (
            p_teacher_id, v_new_credits, 'subscription', 'subscription_grant',
            jsonb_build_object('granted_credits', v_new_credits, 'plan_id', p_plan_id)
        );
    END IF;

    -- 5. Mise à jour de la balance
    UPDATE public.credit_balances
    SET subscription_credits = subscription_credits + v_frozen_to_unfreeze + v_new_credits,
        frozen_subscription_credits = 0,
        last_updated_at = now()
    WHERE teacher_id = p_teacher_id;

    RETURN jsonb_build_object(
        'success', true,
        'plan_id', p_plan_id,
        'new_credits', v_new_credits,
        'unfrozen_credits', v_frozen_to_unfreeze,
        'expires_at', v_expires_at
    );
END;
$$;

-- D. EXPIRATION D'ABONNEMENT ET GEL AUTOMATIQUE DES CRÉDITS RESTANTS
CREATE OR REPLACE FUNCTION public.freeze_expired_subscription_credits(
    p_teacher_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_balance RECORD;
    v_to_freeze INT;
BEGIN
    SELECT * INTO v_balance FROM public.credit_balances WHERE teacher_id = p_teacher_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'balance_not_found');
    END IF;

    v_to_freeze := COALESCE(v_balance.subscription_credits, 0);

    IF v_to_freeze > 0 THEN
        -- Inscription au grand livre
        INSERT INTO public.credit_ledger (
            teacher_id, delta, credit_type, action_type, metadata
        ) VALUES (
            p_teacher_id, -v_to_freeze, 'subscription', 'subscription_expire_freeze',
            jsonb_build_object('frozen_amount', v_to_freeze, 'timestamp', now())
        );

        INSERT INTO public.credit_ledger (
            teacher_id, delta, credit_type, action_type, metadata
        ) VALUES (
            p_teacher_id, v_to_freeze, 'frozen_subscription', 'subscription_expire_freeze',
            jsonb_build_object('frozen_amount', v_to_freeze, 'timestamp', now())
        );

        -- Mise à jour du cache de solde
        UPDATE public.credit_balances
        SET subscription_credits = 0,
            frozen_subscription_credits = frozen_subscription_credits + v_to_freeze,
            last_updated_at = now()
        WHERE teacher_id = p_teacher_id;
    END IF;

    -- Mettre à jour le statut de l'abonnement
    UPDATE public.subscriptions
    SET status = 'expired', updated_at = now()
    WHERE teacher_id = p_teacher_id AND status = 'active' AND expires_at < now();

    RETURN jsonb_build_object('success', true, 'frozen_credits', v_to_freeze);
END;
$$;

-- E. INITIALISATION D'UN NOUVEL ENSEIGNANT (TRIGGER AUTH.USERS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_full_name TEXT;
    v_school TEXT;
    v_phone TEXT;
    v_generated_code TEXT;
    v_clean_name TEXT;
    v_raw_ref_code TEXT;
    v_referrer RECORD;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_school := COALESCE(NEW.raw_user_meta_data->>'school_name', NEW.raw_user_meta_data->>'school', 'Établissement non précisé');
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_whatsapp', NEW.raw_user_meta_data->>'whatsapp', '');

    -- Génération d'un code de parrainage unique, court et non ambigu (ex: PRAXIS-MARI4F8B)
    v_clean_name := upper(regexp_replace(v_full_name, '[^A-Za-z0-9]', '', 'g'));
    IF length(v_clean_name) < 3 THEN
        v_clean_name := 'PROF';
    END IF;
    v_generated_code := 'PRAXIS-' || substring(v_clean_name from 1 for 4) || upper(substring(replace(NEW.id::text, '-', '') from 1 for 4));

    -- 1. Créer le profil avec son code de parrainage personnel
    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        email,
        phone_whatsapp,
        school_name,
        referral_code
    ) VALUES (
        NEW.id,
        'teacher',
        v_full_name,
        NEW.email,
        v_phone,
        v_school,
        v_generated_code
    ) ON CONFLICT (id) DO UPDATE SET
        referral_code = COALESCE(public.profiles.referral_code, EXCLUDED.referral_code);

    -- 2. Créer le compte de solde avec les 50 corrections gratuites offertes
    INSERT INTO public.credit_balances (
        teacher_id,
        free_credits,
        subscription_credits,
        purchased_credits,
        frozen_subscription_credits
    ) VALUES (
        NEW.id,
        50,
        0,
        0,
        0
    ) ON CONFLICT (teacher_id) DO NOTHING;

    -- 3. Inscription de bienvenue dans le grand livre (50 crédits gratuits)
    INSERT INTO public.credit_ledger (
        teacher_id,
        delta,
        credit_type,
        action_type,
        metadata
    ) VALUES (
        NEW.id,
        50,
        'free',
        'initial_grant',
        jsonb_build_object('description', '50 corrections gratuites offertes à l''inscription')
    );

    -- 4. Abonnement gratuit initial
    INSERT INTO public.subscriptions (
        teacher_id,
        plan_id,
        status,
        started_at,
        expires_at
    ) VALUES (
        NEW.id,
        'free',
        'active',
        now(),
        NULL
    );

    -- 5. Si un code de parrainage valide a été utilisé lors de l'inscription (?ref=PRAXIS-XXXXXX)
    v_raw_ref_code := upper(trim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
    IF v_raw_ref_code <> '' THEN
        -- Rechercher le professeur parrain
        SELECT id, referral_code INTO v_referrer
        FROM public.profiles
        WHERE upper(trim(referral_code)) = v_raw_ref_code
        LIMIT 1;

        -- Règle anti-fraude : un utilisateur ne peut pas s'auto-parrainer
        IF FOUND AND v_referrer.id <> NEW.id THEN
            -- Inscription en statut 'pending' : 0 crédit distribué à ce stade (A = 0, B = 0)
            -- La récompense sera débloquée UNIQUEMENT lors du 1er paiement d'abonnement confirmé
            INSERT INTO public.referrals (
                referrer_user_id,
                referred_user_id,
                referral_code,
                status,
                reward_granted,
                metadata
            ) VALUES (
                v_referrer.id,
                NEW.id,
                v_referrer.referral_code,
                'pending',
                false,
                jsonb_build_object('registered_at', now(), 'invited_with_code', v_raw_ref_code)
            ) ON CONFLICT (referred_user_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- F. VALIDATION ET ATTRIBUTION DE LA RÉCOMPENSE DE PARRAINAGE (+50 A / +50 B LORS DU 1ER ABONNEMENT PAYÉ)
-- SÉCURITÉ CRITIQUE : Cette fonction ne peut être exécutée que par le backend / webhook de paiement (service_role).
-- Elle vérifie l'existence réelle d'une transaction d'abonnement confirmée ('succeeded') et que c'est le 1er abonnement.
DROP FUNCTION IF EXISTS public.claim_referral_reward_for_first_payment(UUID, TEXT);
DROP FUNCTION IF EXISTS public.claim_referral_reward_for_first_payment(UUID);
DROP FUNCTION IF EXISTS public.claim_referral_reward_for_first_payment(UUID, UUID);

CREATE OR REPLACE FUNCTION public.claim_referral_reward_for_first_payment(
    p_transaction_id UUID,
    p_referred_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx RECORD;
    v_ref RECORD;
    v_referred_name TEXT;
    v_referrer_name TEXT;
    v_prior_subs_count INT;
BEGIN
    -- 1. SÉCURITÉ CRITIQUE : Vérification que la transaction de paiement existe réellement
    IF p_transaction_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'missing_transaction_id',
            'message', 'L''identifiant de transaction est obligatoire pour valider la récompense.'
        );
    END IF;

    SELECT * INTO v_tx
    FROM public.transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'transaction_not_found',
            'message', 'Aucune transaction trouvée correspondant à cet identifiant.'
        );
    END IF;

    -- Vérification de cohérence avec l'utilisateur spécifié si fourni
    IF p_referred_user_id IS NOT NULL AND v_tx.teacher_id <> p_referred_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'teacher_mismatch',
            'message', 'L''utilisateur de la transaction ne correspond pas à l''utilisateur spécifié.'
        );
    END IF;

    -- 2. SÉCURITÉ CRITIQUE : Le paiement doit être confirmé et réussi (succeeded)
    IF v_tx.status <> 'succeeded' THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'transaction_not_succeeded',
            'status', v_tx.status,
            'message', 'La transaction n''est pas confirmée comme réussie (statut actuel : ' || v_tx.status || ').'
        );
    END IF;

    -- 3. SÉCURITÉ CRITIQUE : Paiement réel (> 0 FCFA)
    IF v_tx.amount_fcfa <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'zero_amount',
            'message', 'La transaction ne correspond pas à un paiement payant.'
        );
    END IF;

    -- 4. RÈGLE MÉTIER STRICTE : Les packs de crédits (+100, +500) NE DÉCLENCHENT PAS de parrainage
    IF v_tx.pack_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'pack_purchase_excluded',
            'message', 'Les achats de packs de crédits sont exclus du programme de parrainage. Seul un abonnement qualifie.'
        );
    END IF;

    -- 5. RÈGLE MÉTIER STRICTE : La transaction doit concerner un abonnement payant Praxis valide
    IF v_tx.plan_id IS NULL OR v_tx.plan_id = 'free' OR v_tx.plan_id NOT IN ('monthly', 'quarterly', 'school_year') THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'invalid_subscription_plan',
            'message', 'La transaction ne concerne pas une formule d''abonnement payante valide.'
        );
    END IF;

    -- 6. RÈGLE MÉTIER STRICTE : Il doit s'agir du TOUT PREMIER abonnement payé par cet enseignant (pas de renouvellement)
    SELECT count(*) INTO v_prior_subs_count
    FROM public.transactions
    WHERE teacher_id = v_tx.teacher_id
      AND status = 'succeeded'
      AND plan_id IS NOT NULL
      AND plan_id IN ('monthly', 'quarterly', 'school_year')
      AND pack_id IS NULL
      AND (created_at < v_tx.created_at OR (created_at = v_tx.created_at AND id <> v_tx.id));

    IF v_prior_subs_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'not_first_subscription',
            'message', 'Ce n''est pas le premier abonnement payé par cet enseignant. Les renouvellements ne déclenchent aucun parrainage.'
        );
    END IF;

    -- 7. VÉRIFICATION DU REFERRAL : Recherche et verrouillage de la ligne de parrainage
    SELECT * INTO v_ref
    FROM public.referrals
    WHERE referred_user_id = v_tx.teacher_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'no_referral_found',
            'message', 'Aucun parrainage enregistré pour cet enseignant.'
        );
    END IF;

    -- 8. IDÉMPOTENCE STRICTE : Vérification que le parrainage n'a pas déjà été récompensé
    IF v_ref.reward_granted = true OR v_ref.status = 'rewarded' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_rewarded', true,
            'rewarded_at', v_ref.rewarded_at,
            'message', 'La récompense de parrainage (+50 crédits chacun) a déjà été attribuée.'
        );
    END IF;

    IF v_ref.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'referral_not_pending',
            'status', v_ref.status,
            'message', 'Le parrainage n''est pas en attente (statut : ' || v_ref.status || ').'
        );
    END IF;

    -- 9. IDÉMPOTENCE SUR LA TRANSACTION : Vérifier que cette transaction n'a pas déjà été traitée dans le ledger
    PERFORM 1 FROM public.credit_ledger
    WHERE action_type = 'referral_reward'
      AND metadata->>'transaction_id' = v_tx.id::text;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_rewarded', true,
            'message', 'Cette transaction a déjà été traitée pour le parrainage.'
        );
    END IF;

    -- 10. Récupérer les identités pour le journal d'audit comptable
    SELECT full_name INTO v_referred_name FROM public.profiles WHERE id = v_ref.referred_user_id;
    SELECT full_name INTO v_referrer_name FROM public.profiles WHERE id = v_ref.referrer_user_id;

    -- 11. Marquer le parrainage comme récompensé (irréversible et atomique)
    UPDATE public.referrals
    SET status = 'rewarded',
        reward_granted = true,
        reward_amount = 50,
        rewarded_at = now(),
        metadata = jsonb_build_object(
            'transaction_id', v_tx.id,
            'referrer_reward', 50,
            'referred_reward', 50,
            'plan_id', v_tx.plan_id,
            'processed_at', now()
        )
    WHERE id = v_ref.id;

    -- 12. Attribution de +50 crédits permanents au Filleul (B)
    PERFORM 1 FROM public.credit_balances WHERE teacher_id = v_ref.referred_user_id FOR UPDATE;

    INSERT INTO public.credit_ledger (
        teacher_id,
        delta,
        credit_type,
        action_type,
        reference_id,
        metadata
    ) VALUES (
        v_ref.referred_user_id,
        50,
        'purchased',
        'referral_reward',
        v_ref.id::text,
        jsonb_build_object(
            'role', 'referred',
            'description', 'Bonus de bienvenue parrainage (+50 crédits) - 1er abonnement payé (invité par ' || COALESCE(v_referrer_name, 'un collègue') || ')',
            'referral_id', v_ref.id,
            'transaction_id', v_tx.id
        )
    );

    UPDATE public.credit_balances
    SET purchased_credits = purchased_credits + 50,
        last_updated_at = now()
    WHERE teacher_id = v_ref.referred_user_id;

    -- 13. Attribution de +50 crédits permanents au Parrain (A)
    PERFORM 1 FROM public.credit_balances WHERE teacher_id = v_ref.referrer_user_id FOR UPDATE;

    INSERT INTO public.credit_ledger (
        teacher_id,
        delta,
        credit_type,
        action_type,
        reference_id,
        metadata
    ) VALUES (
        v_ref.referrer_user_id,
        50,
        'purchased',
        'referral_reward',
        v_ref.id::text,
        jsonb_build_object(
            'role', 'referrer',
            'description', 'Récompense parrainage (+50 crédits) - 1er abonnement de votre filleul (' || COALESCE(v_referred_name, 'collègue') || ')',
            'referral_id', v_ref.id,
            'transaction_id', v_tx.id
        )
    );

    UPDATE public.credit_balances
    SET purchased_credits = purchased_credits + 50,
        last_updated_at = now()
    WHERE teacher_id = v_ref.referrer_user_id;

    -- 14. Mettre à jour les métadonnées de la transaction
    UPDATE public.transactions
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'referral_reward_processed', true,
        'referral_id', v_ref.id
    )
    WHERE id = v_tx.id;

    RETURN jsonb_build_object(
        'success', true,
        'rewarded', true,
        'referrer_user_id', v_ref.referrer_user_id,
        'referred_user_id', v_ref.referred_user_id,
        'referrer_credits', 50,
        'referred_credits', 50,
        'referral_id', v_ref.id,
        'transaction_id', v_tx.id
    );
END;
$$;

-- RÈGLE DE SÉCURITÉ : Interdire l'exécution directe depuis le frontend (rôles anon et authenticated)
REVOKE EXECUTE ON FUNCTION public.claim_referral_reward_for_first_payment(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_reward_for_first_payment(UUID, UUID) TO service_role;

-- Trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 16. ROW LEVEL SECURITY (RLS) - SÉCURISATION INTÉGRALE
-- ----------------------------------------------------------------------------

-- Activation de RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- POLICIES PROFILES
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- POLICIES PLANS & CREDIT_PACKS (Lecture publique / authentifiée, écriture admin uniquement)
CREATE POLICY "plans_read_all" ON public.plans
    FOR SELECT USING (true);

CREATE POLICY "credit_packs_read_all" ON public.credit_packs
    FOR SELECT USING (true);

-- POLICIES SUBSCRIPTIONS
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
    FOR SELECT USING (auth.uid() = teacher_id OR public.is_admin());

-- POLICIES CREDIT_BALANCES & CREDIT_LEDGER :
-- CRITIQUE : Lecture seule pour l'enseignant. AUCUNE MODIFICATION DIRECTE (Insert/Update/Delete) depuis le client !
-- Tout débit ou crédit passe obligatoirement par les fonctions SECURITY DEFINER (consume_correction_credit, etc.)
CREATE POLICY "credit_balances_select_own" ON public.credit_balances
    FOR SELECT USING (auth.uid() = teacher_id OR public.is_admin());

CREATE POLICY "credit_ledger_select_own" ON public.credit_ledger
    FOR SELECT USING (auth.uid() = teacher_id OR public.is_admin());

-- POLICIES CLASSES & STUDENTS
CREATE POLICY "classes_all_own" ON public.classes
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

CREATE POLICY "students_all_own" ON public.students
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

-- POLICIES ASSIGNMENTS & RUBRICS
CREATE POLICY "assignments_all_own" ON public.assignments
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

CREATE POLICY "rubric_files_all_own" ON public.rubric_files
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

-- POLICIES SUBMISSIONS & SUBMISSION_PAGES
CREATE POLICY "submissions_all_own" ON public.submissions
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

CREATE POLICY "submission_pages_all_own" ON public.submission_pages
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

-- POLICIES AI_CORRECTIONS & FINAL_EVALUATIONS
CREATE POLICY "ai_corrections_all_own" ON public.ai_corrections
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

CREATE POLICY "final_evaluations_all_own" ON public.final_evaluations
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

-- POLICIES PARTNERS & PROMO CODES
CREATE POLICY "partners_select_own" ON public.partners
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "promo_codes_read_active" ON public.promo_codes
    FOR SELECT USING (is_active = true OR public.is_admin());

-- POLICIES REFERRALS (Parrainage Professeur → Professeur)
-- Un professeur peut lire uniquement les parrainages où il est parrain ou filleul.
-- Aucune écriture directe par le client (création via trigger et récompense via fonction SECURITY DEFINER)
CREATE POLICY "referrals_select_own" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id OR public.is_admin());

-- POLICIES TRANSACTIONS
CREATE POLICY "transactions_select_own" ON public.transactions
    FOR SELECT USING (auth.uid() = teacher_id OR public.is_admin());

-- POLICIES LEGAL DOCUMENTS (Lecture publique des documents légaux en vigueur)
CREATE POLICY "legal_documents_read_all" ON public.legal_documents
    FOR SELECT USING (true);

CREATE POLICY "legal_consents_all_own" ON public.legal_consents
    FOR ALL USING (auth.uid() = teacher_id OR public.is_admin());

-- POLICIES AUDIT LOGS
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
    FOR SELECT USING (auth.uid() = teacher_id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 17. SUPABASE STORAGE : BUCKETS ET POLITIQUES D'ACCÈS
-- ----------------------------------------------------------------------------
-- Création des 3 buckets privés dédiés :
-- 1. student-copies : photos et scans des devoirs d'élèves
-- 2. rubrics : barèmes et sujets importés par l'enseignant
-- 3. correction-exports : fiches de correction PDF et exports de notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('student-copies', 'student-copies', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('rubrics', 'rubrics', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('correction-exports', 'correction-exports', false, 20971520, ARRAY['application/pdf', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS sur storage.objects (Chaque enseignant accède uniquement à ses sous-dossiers : /<teacher_id>/*)
CREATE POLICY "storage_student_copies_owner" ON storage.objects
    FOR ALL USING (
        bucket_id = 'student-copies' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
    );

CREATE POLICY "storage_rubrics_owner" ON storage.objects
    FOR ALL USING (
        bucket_id = 'rubrics' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
    );

CREATE POLICY "storage_exports_owner" ON storage.objects
    FOR ALL USING (
        bucket_id = 'correction-exports' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
    );

-- ----------------------------------------------------------------------------
-- 18. DONNÉES INITIALES (SEEDS OFFICIELS DU SAAS PRAXIS)
-- ----------------------------------------------------------------------------

-- A. Grille tarifaire officielle des forfaits
INSERT INTO public.plans (id, name, duration_days, price_fcfa, included_credits, is_active)
VALUES
    ('free', 'Compte Découverte', 0, 0, 50, true),
    ('monthly', 'Abonnement Mensuel (1 mois)', 30, 5000, 500, true),
    ('3_months', 'Trimestriel (3 mois)', 90, 12000, 1500, true),
    ('9_months', 'Année Scolaire (9 mois)', 270, 30000, 4500, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    duration_days = EXCLUDED.duration_days,
    price_fcfa = EXCLUDED.price_fcfa,
    included_credits = EXCLUDED.included_credits,
    is_active = EXCLUDED.is_active;

-- B. Packs de copies supplémentaires (sans expiration)
INSERT INTO public.credit_packs (id, name, credits_count, price_fcfa, is_active)
VALUES
    ('pack_100', 'Pack 100 corrections', 100, 1000, true),
    ('pack_500', 'Pack 500 corrections', 500, 5000, true),
    ('pack_1000', 'Pack 1000 corrections', 1000, 10000, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    credits_count = EXCLUDED.credits_count,
    price_fcfa = EXCLUDED.price_fcfa,
    is_active = EXCLUDED.is_active;

-- C. Textes légaux initiaux (CGU, Mentions, Confidentialité, DPA)
INSERT INTO public.legal_documents (slug, version, title, content_markdown, is_current)
VALUES
    ('cgu', '1.0.0', 'Conditions Générales d''Utilisation de Praxis', 
     '# Conditions Générales d''Utilisation\n\nPraxis est une solution d''aide à la pré-correction pédagogique...', true),
    ('mentions_legales', '1.0.0', 'Mentions Légales', 
     '# Mentions Légales\n\nÉditeur : SaaS Praxis...', true),
    ('politique_confidentialite', '1.0.0', 'Politique de Confidentialité et Protection des Données', 
     '# Politique de Confidentialité\n\nPraxis protège scrupuleusement les données des élèves et des enseignants...', true),
    ('dpa_rgpd', '1.0.0', 'Accord de Traitement des Données Scolaires (DPA)', 
     '# Accord de Traitement des Données Scolaires\n\nEn conformité avec les réglementations de protection des données...', true)
ON CONFLICT (slug, version) DO UPDATE SET
    title = EXCLUDED.title,
    content_markdown = EXCLUDED.content_markdown,
    is_current = EXCLUDED.is_current;

-- Fin du script SQL
