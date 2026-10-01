-- ============================================================================
-- MIGRATION PRAXIS : SÉCURISATION DU PARRAINAGE PROFESSEUR → PROFESSEUR
-- ============================================================================
-- RÈGLES MÉTIER :
-- 1. Parrain (A) : +50 crédits permanents
-- 2. Filleul (B) : +50 crédits permanents (bonus de bienvenue)
-- 3. Déclenché UNIQUEMENT lors du TOUT PREMIER abonnement payé (status = 'succeeded')
-- 4. Les achats de packs (+100, +500) sont STRICTEMENT EXCLUS
-- 5. Les renouvellements d'abonnements sont STRICTEMENT EXCLUS
-- 6. Le frontend NE PEUT PAS déclencher la récompense : exécution restreinte à service_role
-- 7. Idempotence absolue (FOR UPDATE, vérification statut, index unique ledger)
-- ============================================================================

-- Suppression des anciennes signatures pour éviter tout conflit
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

-- RÈGLE DE SÉCURITÉ CRITIQUE :
-- Révocation de l'accès pour les utilisateurs anonymes et authentifiés du frontend
-- Seul le rôle backend 'service_role' (ou administrateur base) peut appeler cette fonction
REVOKE EXECUTE ON FUNCTION public.claim_referral_reward_for_first_payment(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_reward_for_first_payment(UUID, UUID) TO service_role;
