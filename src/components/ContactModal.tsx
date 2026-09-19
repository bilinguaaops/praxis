import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Copy,
  Check,
  Headphones,
  ExternalLink,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!isOpen) return null;

  const phoneNumber = '+225 0103890314';
  const rawPhone = '+2250103890314';
  const emailAddress = 'agoussoukevin@gmail.com';
  const whatsappUrl = `https://wa.me/2250103890314?text=${encodeURIComponent(
    'Bonjour, je vous contacte au sujet de Praxis IA (logiciel de correction assistée).'
  )}`;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div
      id="contact-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="contact-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 sm:p-7 relative">
          <button
            type="button"
            onClick={onClose}
            id="btn-close-contact-modal"
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Headphones className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-100 border border-blue-400/30">
                Support & Contact Direct
              </span>
              <h3 className="text-xl font-extrabold tracking-tight">Contactez-nous</h3>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-md">
            Une question sur Praxis IA, besoin d'une démonstration pour votre établissement ou d'une assistance technique ? Nous sommes à votre disposition.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Card 1: Téléphone & WhatsApp */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Phone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Téléphone & WhatsApp
                  </span>
                  <span className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                    {phoneNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyPhone}
                id="btn-copy-phone"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                title="Copier le numéro"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-link-whatsapp"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message WhatsApp</span>
              </a>
              <a
                href={`tel:${rawPhone}`}
                id="btn-link-call"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Appeler direct</span>
              </a>
            </div>
          </div>

          {/* Card 2: E-mail */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Adresse e-mail officielle
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight break-all">
                    {emailAddress}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                id="btn-copy-email"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                title="Copier l'e-mail"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-1">
              <a
                href={`mailto:${emailAddress}?subject=Contact%20Praxis%20IA`}
                id="btn-link-email"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Envoyer un e-mail maintenant</span>
              </a>
            </div>
          </div>

          {/* Quick info badges */}
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Réponse rapide sous 24h</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Support direct enseignant</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
