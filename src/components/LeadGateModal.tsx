import React from 'react';
import { AuthView } from './AuthView';
import { LeadData } from '../types';

interface LeadGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (lead: LeadData) => void;
}

export const LeadGateModal: React.FC<LeadGateModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <AuthView
      initialMode="register"
      isModal={true}
      onClose={onClose}
      onAuthSuccess={(user, profile) => {
        const lead: LeadData = {
          name: profile?.full_name || (user?.user_metadata?.full_name as string) || (user?.email?.split('@')[0] ?? 'Enseignant'),
          email: user?.email || '',
          whatsapp: profile?.phone_whatsapp || (user?.user_metadata?.phone_whatsapp as string) || '',
          school: profile?.school_name || (user?.user_metadata?.school_name as string) || 'Établissement non précisé',
          plan: 'free',
          status: 'active',
          quota: 30,
          subscriptionCredits: 30,
          extraCredits: 0,
          copiesCorrected: 0,
          userId: user?.id,
          role: profile?.role || 'teacher',
        };
        onSubmitSuccess(lead);
      }}
    />
  );
};
