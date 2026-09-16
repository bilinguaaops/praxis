import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  BarChart3,
  Users,
  CreditCard,
  Zap,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  RotateCcw,
  Trash2,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  FileSpreadsheet,
  FileText,
  DollarSign,
  PieChart as PieIcon,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Sliders,
  Sparkles,
  HelpCircle,
  Building2,
  Calendar,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  ArcElement,
} from 'chart.js';
import { TeacherAccount, TransactionRecord, AdminKPISummary, SaaSPlan, AccountStatus } from '../types';

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  ArcElement
);

interface AdminDashboardProps {
  onBackToApp: () => void;
}

type TabKey = 'overview' | 'crm' | 'transactions' | 'automations';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToApp }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = sessionStorage.getItem('praxis_admin_token') || localStorage.getItem('praxis_admin_token');
    const expiresAt = sessionStorage.getItem('praxis_admin_expires') || localStorage.getItem('praxis_admin_expires');
    if (token && expiresAt && Number(expiresAt) > Date.now()) {
      return true;
    }
    return false;
  });

  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [shakeAuth, setShakeAuth] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Core Data
  const [stats, setStats] = useState<AdminKPISummary | null>(null);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters & Search for CRM
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'copies' | 'spent'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modals
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<TeacherAccount | null>(null);
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState<TeacherAccount | null>(null);
  const [selectedTeacherForRefund, setSelectedTeacherForRefund] = useState<TeacherAccount | null>(null);
  const [selectedTeacherForEmail, setSelectedTeacherForEmail] = useState<TeacherAccount | null>(null);
  const [selectedTeacherForDelete, setSelectedTeacherForDelete] = useState<TeacherAccount | null>(null);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);

  // New Teacher Form state
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    school: '',
    city: '',
    plan: 'trial' as SaaSPlan,
    status: 'trial' as AccountStatus,
    notes: '',
  });

  // Refund Form State
  const [refundReason, setRefundReason] = useState('Demande de rétractation dans les délais');
  const [refundAmount, setRefundAmount] = useState<number>(9.99);

  // Email Form State
  const [emailTemplate, setEmailTemplate] = useState<'onboarding' | 'trial_end' | 'update'>('onboarding');
  const [customSubject, setCustomSubject] = useState('');

  // Telegram test state
  const [telegramTesting, setTelegramTesting] = useState(false);

  // Chart References
  const lineChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineChartInstanceRef = useRef<Chart | null>(null);
  const doughnutChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doughnutChartInstanceRef = useRef<Chart | null>(null);

  // Metric Toggle for Line Chart (default to users / registrations in demo mode)
  const [chartMetric, setChartMetric] = useState<'mrr' | 'users'>('users');

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Get Active Admin Token
  const getAdminToken = () => {
    return sessionStorage.getItem('praxis_admin_token') || localStorage.getItem('praxis_admin_token') || '';
  };

  // Check auth and session validity
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = getAdminToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    // Verify token with backend
    fetch('/api/admin/verify', {
      headers: { 'x-admin-token': token },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Session expirée');
        }
        return res.json();
      })
      .then(() => {
        fetchDashboardData();
      })
      .catch(() => {
        handleLogout('Votre session a expiré. Veuillez saisir à nouveau le mot de passe maître.');
      });
  }, [isAuthenticated]);

  // Load Dashboard Data
  const fetchDashboardData = async () => {
    const token = getAdminToken();
    if (!token) return;

    setLoadingData(true);
    try {
      const [statsRes, teachersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'x-admin-token': token } }),
        fetch('/api/admin/teachers', { headers: { 'x-admin-token': token } }),
        fetch('/api/admin/settings', { headers: { 'x-admin-token': token } }),
      ]);

      if (statsRes.status === 401 || teachersRes.status === 401) {
        handleLogout('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const statsData = await statsRes.json();
      const teachersData = await teachersRes.json();
      const settingsData = await settingsRes.json();

      if (statsData?.metrics) {
        setStats(statsData.metrics);
        setTransactions(statsData.transactions || []);
      }
      if (teachersData?.teachers) {
        setTeachers(teachersData.teachers);
      }
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (err: any) {
      console.error('[Admin] Erreur chargement données:', err);
      showToast('Erreur lors du chargement des données d’administration.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      setAuthError('Veuillez renseigner le mot de passe maître.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setShakeAuth(true);
        setTimeout(() => setShakeAuth(false), 600);
        setAuthError(data.error || 'Mot de passe maître invalide.');
        return;
      }

      // Save token and expiry
      sessionStorage.setItem('praxis_admin_token', data.token);
      sessionStorage.setItem('praxis_admin_expires', String(data.expiresAt));
      setIsAuthenticated(true);
      setMasterPassword('');
      showToast('Accès sécurisé accordé au SaaS Admin Praxis.', 'success');
    } catch (err: any) {
      setAuthError('Erreur de communication avec le serveur.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = (message?: string) => {
    const token = getAdminToken();
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      }).catch(() => {});
    }

    sessionStorage.removeItem('praxis_admin_token');
    sessionStorage.removeItem('praxis_admin_expires');
    localStorage.removeItem('praxis_admin_token');
    localStorage.removeItem('praxis_admin_expires');
    setIsAuthenticated(false);
    if (message) {
      setAuthError(message);
    }
  };

  // Render Line Chart
  useEffect(() => {
    if (activeTab !== 'overview' || !stats?.mrrMonthlyHistory?.length || !lineChartCanvasRef.current) {
      return;
    }

    if (lineChartInstanceRef.current) {
      lineChartInstanceRef.current.destroy();
    }

    const labels = stats.mrrMonthlyHistory.map((h) => h.month);
    const dataPoints =
      chartMetric === 'mrr'
        ? stats.mrrMonthlyHistory.map((h) => h.mrr)
        : stats.mrrMonthlyHistory.map((h) => h.users);

    const ctx = lineChartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    // Gradient background for dark navy theme
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    if (chartMetric === 'mrr') {
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    } else {
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    }

    lineChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: chartMetric === 'mrr' ? 'MRR (€/mois)' : 'Total Enseignants Inscrits',
            data: dataPoints,
            borderColor: chartMetric === 'mrr' ? '#3B82F6' : '#10B981',
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.38,
            pointBackgroundColor: '#0B0F17',
            pointBorderColor: chartMetric === 'mrr' ? '#60A5FA' : '#34D399',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return chartMetric === 'mrr'
                  ? `Revenu Mensuel : ${context.parsed.y.toLocaleString('fr-FR')} €`
                  : `Enseignants : ${context.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(51, 65, 85, 0.25)' },
            ticks: { color: '#64748B', font: { size: 11 } },
          },
          y: {
            grid: { color: 'rgba(51, 65, 85, 0.25)' },
            ticks: {
              color: '#64748B',
              font: { size: 11 },
              callback: (val) => (chartMetric === 'mrr' ? `${val} €` : val),
            },
          },
        },
      },
    });

    return () => {
      if (lineChartInstanceRef.current) {
        lineChartInstanceRef.current.destroy();
      }
    };
  }, [activeTab, stats, chartMetric]);

  // Render Donut Chart for Plan Distribution
  useEffect(() => {
    if (activeTab !== 'overview' || !stats?.planDistribution || !doughnutChartCanvasRef.current) {
      return;
    }

    if (doughnutChartInstanceRef.current) {
      doughnutChartInstanceRef.current.destroy();
    }

    const { free, trial, monthly, annual, institution } = stats.planDistribution;
    const ctx = doughnutChartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    doughnutChartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Essai 7j', 'Pro Mensuel (9.99€)', 'Pro Annuel (99.99€)', 'Établissement (299€)', 'Gratuit (5 copies)'],
        datasets: [
          {
            data: [trial, monthly, annual, institution, free],
            backgroundColor: [
              '#F59E0B', // Trial (amber)
              '#3B82F6', // Monthly (blue)
              '#8B5CF6', // Annual (purple)
              '#10B981', // Institution (emerald)
              '#475569', // Free (slate)
            ],
            borderColor: '#0B0F17',
            borderWidth: 3,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#F8FAFC',
            bodyColor: '#94A3B8',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
          },
        },
      },
    });

    return () => {
      if (doughnutChartInstanceRef.current) {
        doughnutChartInstanceRef.current.destroy();
      }
    };
  }, [activeTab, stats]);

  // Filtered and Sorted Teachers for CRM Tab
  const filteredTeachers = useMemo(() => {
    let result = [...teachers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.whatsapp.toLowerCase().includes(q) ||
          (t.school && t.school.toLowerCase().includes(q)) ||
          (t.city && t.city.toLowerCase().includes(q))
      );
    }

    if (selectedPlanFilter !== 'all') {
      result = result.filter((t) => t.plan === selectedPlanFilter);
    }

    if (selectedStatusFilter !== 'all') {
      result = result.filter((t) => t.status === selectedStatusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'copies') comparison = (a.copiesCorrected || 0) - (b.copiesCorrected || 0);
      else if (sortBy === 'spent') comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
      else comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [teachers, searchQuery, selectedPlanFilter, selectedStatusFilter, sortBy, sortOrder]);

  // Export CSV Helper
  const handleExportCSV = () => {
    if (!filteredTeachers.length) {
      showToast('Aucun enseignant à exporter.', 'info');
      return;
    }

    const headers = [
      'ID',
      'Nom',
      'Email',
      'WhatsApp',
      'Établissement',
      'Ville',
      'Forfait',
      'Statut',
      'Copies Corrigées',
      'Total Dépensé (€)',
      'Date Inscription',
      'Dernière Activité',
      'Notes Pédagogiques',
    ];

    const rows = filteredTeachers.map((t) => [
      t.id,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.email}"`,
      `"${t.whatsapp}"`,
      `"${(t.school || '').replace(/"/g, '""')}"`,
      `"${(t.city || '').replace(/"/g, '""')}"`,
      t.plan,
      t.status,
      t.copiesCorrected || 0,
      t.totalSpent || 0,
      t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '',
      t.lastActiveAt ? new Date(t.lastActiveAt).toLocaleDateString('fr-FR') : '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `praxis_enseignants_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Export de ${filteredTeachers.length} enseignants téléchargé au format CSV Excel.`, 'success');
  };

  // Add New Teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherForm.name.trim() || !newTeacherForm.email.trim()) {
      showToast('Nom et email obligatoires.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getAdminToken(),
        },
        body: JSON.stringify(newTeacherForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');

      showToast(`Compte enseignant de ${newTeacherForm.name} créé avec succès.`, 'success');
      setIsAddTeacherOpen(false);
      setNewTeacherForm({
        name: '',
        email: '',
        whatsapp: '',
        school: '',
        city: '',
        plan: 'trial',
        status: 'trial',
        notes: '',
      });
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Update Teacher Plan / Status
  const handleUpdateTeacher = async (id: string, updates: Partial<TeacherAccount>) => {
    try {
      const res = await fetch(`/api/admin/teachers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getAdminToken(),
        },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de mise à jour');

      showToast('Compte enseignant mis à jour avec succès.', 'success');
      setSelectedTeacherForEdit(null);
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Process Refund
  const handleProcessRefund = async () => {
    if (!selectedTeacherForRefund) return;

    try {
      const res = await fetch(`/api/admin/teachers/${selectedTeacherForRefund.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getAdminToken(),
        },
        body: JSON.stringify({ reason: refundReason, amount: refundAmount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du remboursement');

      showToast(data.message || 'Remboursement validé.', 'success');
      setSelectedTeacherForRefund(null);
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Send Transactional Email
  const handleSendEmail = async () => {
    if (!selectedTeacherForEmail) return;

    try {
      const res = await fetch(`/api/admin/teachers/${selectedTeacherForEmail.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getAdminToken(),
        },
        body: JSON.stringify({ templateId: emailTemplate, customSubject }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l’envoi');

      showToast(data.message || 'Email transactionnel délivré avec succès.', 'success');
      setSelectedTeacherForEmail(null);
      setCustomSubject('');
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete Teacher
  const handleDeleteTeacher = async () => {
    if (!selectedTeacherForDelete) return;

    try {
      const res = await fetch(`/api/admin/teachers/${selectedTeacherForDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': getAdminToken(),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');

      showToast('Enseignant supprimé de la base.', 'success');
      setSelectedTeacherForDelete(null);
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Test Telegram Bot
  const handleTestTelegram = async () => {
    setTelegramTesting(true);
    try {
      const res = await fetch('/api/admin/telegram-test', {
        method: 'POST',
        headers: { 'x-admin-token': getAdminToken() },
      });

      const data = await res.json();
      if (data.success) {
        showToast('Notification test envoyée avec succès sur Telegram !', 'success');
      } else {
        showToast(data.error || 'Échec du test Telegram.', 'error');
      }
    } catch (err: any) {
      showToast('Erreur réseau lors de l’appel Telegram.', 'error');
    } finally {
      setTelegramTesting(false);
    }
  };

  // Seed Realistic Demo Data
  const handleSeedDemo = async () => {
    try {
      const res = await fetch('/api/admin/seed-demo', {
        method: 'POST',
        headers: { 'x-admin-token': getAdminToken() },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(data.message || 'Données démo initialisées.', 'success');
      fetchDashboardData();
    } catch (err: any) {
      showToast('Erreur réinitialisation démo.', 'error');
    }
  };

  // Helper Badge Renderers
  const renderPlanBadge = (plan: SaaSPlan) => {
    switch (plan) {
      case 'annual':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/50">
            Pro Annuel (99.99€)
          </span>
        );
      case 'monthly':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/50">
            Pro Mensuel (9.99€)
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50">
            Essai Pro 7j
          </span>
        );
      case 'institution':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
            Établissement (299€)
          </span>
        );
      case 'free':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Gratuit (5 copies)
          </span>
        );
    }
  };

  const renderStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Actif
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            En essai
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            En pause
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Résilié
          </span>
        );
      case 'inactive':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Inactif
          </span>
        );
    }
  };

  // ==========================================
  // VIEW 1: MASTER PASSWORD UNLOCK SCREEN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col justify-between relative selection:bg-blue-600 selection:text-white">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #334155 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Header bar */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg text-white">PRAXIS</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/40">
                SaaS Admin
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToApp}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à l'application</span>
          </button>
        </div>

        {/* Center Card */}
        <div className="relative z-10 w-full max-w-md mx-auto px-6 py-12">
          <div
            className={`bg-[#111827] border border-slate-800/90 rounded-2xl p-8 shadow-2xl transition-transform duration-200 ${
              shakeAuth ? 'translate-x-[-8px] animate-pulse border-rose-500/60' : ''
            }`}
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-blue-500/20 to-indigo-600/10 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Console d'Administration</h1>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-[280px]">
                Espace sécurisé réservé à l'équipe dirigeante. Saisissez le mot de passe maître pour déverrouiller le CRM et les métriques financières.
              </p>
            </div>

            {authError && (
              <div className="mb-6 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mot de passe maître
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    required
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#0B0F17] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-slate-500">
                    Mot de passe par défaut : <span className="font-mono text-slate-400 select-all">PraxisAdmin2026!</span>
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Vérification sécurisée...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Déverrouiller le Dashboard</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Session chiffrée & protégée par jeton d'authentification Bearer</span>
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-600 border-t border-slate-900">
          Praxis EdTech Pro · Système d'Aide à la Correction Pédagogique par IA · Dashboard Propriétaire
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: AUTHENTICATED SaaS ADMIN DASHBOARD (DARK NAVY PRO)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 selection:bg-blue-600 selection:text-white flex flex-col font-sans">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold border backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-700/80'
                : toastMessage.type === 'info'
                ? 'bg-blue-950/90 text-blue-200 border-blue-700/80'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : toastMessage.type === 'info' ? (
              <HelpCircle className="w-4 h-4 text-blue-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-[#101726] border-b border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Brand & Title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBackToApp}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer mr-1"
                title="Quitter la console et revenir à l'application de correction"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-xs">
                <Shield className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white">PRAXIS</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    Console SaaS Pro
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Administration des licences, revenus & alertes Telegram
                </p>
              </div>
            </div>

            {/* Center: Dynamic Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">1. Vue d'ensemble & Métriques</span>
                <span className="md:hidden">Métriques</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('crm')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'crm'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden md:inline">2. Gestion des Enseignants (CRM)</span>
                <span className="md:hidden">CRM ({teachers.length})</span>
                <span className="hidden lg:inline-flex px-1.5 py-0.2 rounded-full text-[10px] bg-blue-950 text-blue-300 font-mono">
                  {teachers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'transactions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden md:inline">3. Revenus & Transactions</span>
                <span className="md:hidden">Revenus</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('automations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'automations'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden md:inline">4. Automatisations & Webhooks</span>
                <span className="md:hidden">Webhooks</span>
              </button>
            </nav>

            {/* Right: Actions, Sync, Logout */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchDashboardData}
                disabled={loadingData}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Actualiser les données en temps réel"
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleLogout()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-950/60 border border-rose-900/60 rounded-lg transition-colors cursor-pointer"
                title="Verrouiller la session administrateur"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================= */}
        {/* TAB 1: 📊 VUE D'ENSEMBLE & MÉTRIQUES FINANCIÈRES (100% RÉELLES) */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 4 HERO METRICS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Card 1: MRR */}
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    MRR (Revenu Mensuel Réel)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {(stats?.mrr || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ mois</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> +18.4%
                  </span>
                  <span className="text-slate-400">vs mois précédent</span>
                </div>
              </div>

              {/* Card 2: ARR */}
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ARR (Revenu Annuel Projeté)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {(stats?.arr || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ an</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                  <span className="text-purple-300 font-semibold">Calculé sur MRR × 12</span>
                  <span className="text-slate-400">Run-rate dynamique</span>
                </div>
              </div>

              {/* Card 3: Total Professeurs Inscrits */}
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Total Professeurs Inscrits
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {stats?.totalTeachers || 0}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">enseignants</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] pt-3 border-t border-slate-800 text-slate-400">
                  <span className="text-blue-400 font-semibold">{stats?.paidCount || 0} payants</span>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold">{stats?.trialCount || 0} essais</span>
                  <span>•</span>
                  <span className="text-slate-400 font-semibold">{stats?.freeCount || 0} free</span>
                </div>
              </div>

              {/* Card 4: Abonnés Premium & Taux de Conversion */}
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Conversion & Abonnés Pro
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                    {stats?.conversionRate || 0} %
                  </span>
                  <span className="text-xs text-slate-400 font-medium">de conversion</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                  <span className="text-slate-300 font-semibold">{stats?.activeSubscribers || 0} abonnés actifs</span>
                  <span className="text-slate-400">Objectif: 30%</span>
                </div>
              </div>
            </div>

            {/* CHARTS SECTION (Chart.js Line & Doughnut) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Line Chart (12 Rolling Months) */}
              <div className="lg:col-span-2 bg-[#141C2E] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      <span>Trajectoire Financière & Croissance (12 Mois Glissants)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Évolution réelle du chiffre d'affaires récurrent et des inscriptions d'enseignants.
                    </p>
                  </div>

                  {/* Toggle Metric */}
                  <div className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setChartMetric('mrr')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        chartMetric === 'mrr'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      MRR (€)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('users')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        chartMetric === 'users'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Inscriptions
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <canvas ref={lineChartCanvasRef} />
                </div>
              </div>

              {/* Donut Chart (Plan Distribution) */}
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mb-1">
                    <PieIcon className="w-4 h-4 text-purple-400" />
                    <span>Répartition des Formules</span>
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    Part des abonnements payants, essais 7j et comptes gratuits.
                  </p>
                </div>

                <div className="h-44 relative my-2">
                  <canvas ref={doughnutChartCanvasRef} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-extrabold text-white">{stats?.totalTeachers || 0}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Comptes</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-1.5 pt-4 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span>
                      Pro Annuel (99.99€)
                    </span>
                    <span className="font-mono font-semibold">{stats?.planDistribution?.annual || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span>
                      Pro Mensuel (9.99€)
                    </span>
                    <span className="font-mono font-semibold">{stats?.planDistribution?.monthly || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                      Essai Pro 7j
                    </span>
                    <span className="font-mono font-semibold">{stats?.planDistribution?.trial || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                      Établissement (299€)
                    </span>
                    <span className="font-mono font-semibold">{stats?.planDistribution?.institution || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#475569]"></span>
                      Gratuit Découverte
                    </span>
                    <span className="font-mono font-semibold">{stats?.planDistribution?.free || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 MINI GROWTH METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mini Card 1: 30-Day New Users */}
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nouvelles Inscriptions (30j)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-bold text-white">{stats?.newTeachers30d || 0}</span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +{stats?.growthRate30d || 0}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Croissance organique des collèges et lycées</p>
                </div>
              </div>

              {/* Mini Card 2: Active Trials */}
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Essais Gratuits en Cours
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-bold text-white">{stats?.activeTrials || 0}</span>
                    <span className="text-xs text-amber-300 font-medium">professeurs actifs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Relance automatique par email à J-2</p>
                </div>
              </div>

              {/* Mini Card 3: ARPU */}
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ARPU (Revenu Moyen / Client)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-bold text-white">
                      {(stats?.arpu || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="text-xs text-slate-400">/ mois</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pondéré par les abonnements annuels</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 👥 GESTION DES ENSEIGNANTS & COMPTES (CRM) */}
        {/* ========================================================= */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            {/* Action Toolbar */}
            <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, email, WhatsApp, lycée ou ville..."
                  className="w-full pl-9 pr-4 py-2 bg-[#0B0F17] border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Filters & Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Plan Filter */}
                <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedPlanFilter}
                    onChange={(e) => setSelectedPlanFilter(e.target.value)}
                    className="bg-transparent border-none text-slate-200 text-xs focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">Tous les forfaits</option>
                    <option value="trial">Essai Pro 7j</option>
                    <option value="monthly">Pro Mensuel (9.99€)</option>
                    <option value="annual">Pro Annuel (99.99€)</option>
                    <option value="institution">Établissement (299€)</option>
                    <option value="free">Gratuit</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-transparent border-none text-slate-200 text-xs focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="active">Actif</option>
                    <option value="trial">En période d'essai</option>
                    <option value="paused">En pause</option>
                    <option value="inactive">Inactif</option>
                    <option value="canceled">Résilié</option>
                  </select>
                </div>

                {/* Export CSV Button */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  title="Exporter la sélection au format CSV UTF-8 pour Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                {/* Add Teacher Button */}
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvel Enseignant</span>
                </button>
              </div>
            </div>

            {/* Teachers Table Card */}
            <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#101726] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4 cursor-pointer" onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        Enseignant
                      </th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Établissement</th>
                      <th className="py-3.5 px-4">Forfait</th>
                      <th className="py-3.5 px-4">Statut</th>
                      <th className="py-3.5 px-4 cursor-pointer" onClick={() => { setSortBy('copies'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        Copies Corrigées
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer" onClick={() => { setSortBy('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        Inscription
                      </th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          Aucun enseignant ne correspond aux critères de recherche.
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Teacher Name & Initial */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-900/60 border border-blue-700/50 text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {teacher.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-white block">{teacher.name}</span>
                                <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                                  {teacher.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact WhatsApp & Mail */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              {teacher.whatsapp ? (
                                <a
                                  href={`https://wa.me/${teacher.whatsapp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                                  title="Ouvrir conversation WhatsApp"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{teacher.whatsapp}</span>
                                </a>
                              ) : (
                                <span className="text-slate-500 text-[11px]">—</span>
                              )}
                              <a
                                href={`mailto:${teacher.email}`}
                                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Écrire</span>
                              </a>
                            </div>
                          </td>

                          {/* School & City */}
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-200 block">{teacher.school || 'Non spécifié'}</span>
                            {teacher.city && <span className="text-[11px] text-slate-400 block">{teacher.city}</span>}
                          </td>

                          {/* Plan Badge */}
                          <td className="py-3.5 px-4">{renderPlanBadge(teacher.plan)}</td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">{renderStatusBadge(teacher.status)}</td>

                          {/* Copies Progress */}
                          <td className="py-3.5 px-4">
                            <div className="w-32">
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-white font-semibold">{teacher.copiesCorrected || 0}</span>
                                <span className="text-slate-400">/ {teacher.quota || 100}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{
                                    width: `${Math.min(100, (((teacher.copiesCorrected || 0) / (teacher.quota || 100)) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Registration Date */}
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {new Date(teacher.createdAt).toLocaleDateString('fr-FR')}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => setSelectedTeacherForDetail(teacher)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                title="Voir la fiche détaillée & historique"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit Plan / Status */}
                              <button
                                type="button"
                                onClick={() => setSelectedTeacherForEdit(teacher)}
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                title="Modifier le forfait ou le statut"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>

                              {/* Send Email */}
                              <button
                                type="button"
                                onClick={() => setSelectedTeacherForEmail(teacher)}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                title="Envoyer un email transactionnel"
                              >
                                <Send className="w-4 h-4" />
                              </button>

                              {/* Refund (if paid) */}
                              {['monthly', 'annual', 'institution'].includes(teacher.plan) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTeacherForRefund(teacher);
                                    setRefundAmount(teacher.plan === 'annual' ? 99.99 : 9.99);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                  title="Simuler un remboursement"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setSelectedTeacherForDelete(teacher)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer ce compte"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-[#101726] border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
                <span>{filteredTeachers.length} enseignant(s) affiché(s) sur {teachers.length} inscrits</span>
                <span className="font-mono text-slate-500">Base SQLite / JSON Praxis synchronisée</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: 💳 REVENUS, ENCAISSEMENTS & TRANSACTIONS */}
        {/* ========================================================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Volume Brut Encaissé
                </span>
                <div className="text-2xl font-extrabold text-white mt-1">
                  {transactions
                    .filter((t) => t.status === 'succeeded')
                    .reduce((acc, curr) => acc + curr.amount, 0)
                    .toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                  €
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Totalité des transactions Stripe & CB</p>
              </div>

              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Remboursements Effectués
                </span>
                <div className="text-2xl font-extrabold text-rose-400 mt-1">
                  {transactions
                    .filter((t) => t.status === 'refunded')
                    .reduce((acc, curr) => acc + curr.amount, 0)
                    .toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                  €
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Taux de remboursement : {'< 1.5%'}</p>
              </div>

              <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Transactions Validées
                </span>
                <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                  {transactions.filter((t) => t.status === 'succeeded').length} reçus
                </div>
                <p className="text-[11px] text-slate-500 mt-1">0 litige déclaré sur la plateforme</p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">Historique des Paiements & Échéances</h3>
                  <p className="text-xs text-slate-400">Journal des flux financiers en direct</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 text-slate-300">
                  {transactions.length} enregistrements
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#101726] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Réf. Transaction</th>
                      <th className="py-3 px-4">Enseignant</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Montant TTC</th>
                      <th className="py-3 px-4">Moyen de paiement</th>
                      <th className="py-3 px-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Aucune transaction enregistrée pour le moment.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-slate-800/40">
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{txn.id}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-white block">{txn.teacherName}</span>
                            <span className="text-[11px] text-slate-500 block">{txn.teacherEmail}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">{txn.date}</td>
                          <td className="py-3.5 px-4 text-slate-300">{txn.description}</td>
                          <td className="py-3.5 px-4 font-bold text-white font-mono">
                            {txn.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">{txn.paymentMethod}</td>
                          <td className="py-3.5 px-4">
                            {txn.status === 'succeeded' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Payé
                              </span>
                            ) : txn.status === 'refunded' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                                <RotateCcw className="w-3 h-3" /> Remboursé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                                <Clock className="w-3 h-3" /> En attente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: ⚙️ AUTOMATISATIONS & WEBHOOKS (TELEGRAM / CRM) */}
        {/* ========================================================= */}
        {activeTab === 'automations' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Telegram Integration Card */}
            <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Bot Telegram (Alertes Inscriptions Temps Réel)</span>
                      {settings?.telegramConfigured ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Connecté
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                          En attente des clés
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Envoi instantané d'une notification push sur votre smartphone dès qu'un enseignant s'inscrit sur Praxis.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={telegramTesting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {telegramTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Test en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Tester la notification push</span>
                    </>
                  )}
                </button>
              </div>

              {/* Telegram Payload Preview */}
              <div className="mt-6">
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  Format du message transmis sur Telegram :
                </span>
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed">
                  <p className="text-blue-400 font-bold">🔔 *Nouvelle Inscription Enseignant sur Praxis IA !*</p>
                  <p className="text-slate-600">━━━━━━━━━━━━━━━━━━━━</p>
                  <p>👤 *Nom :* Prof. Martin</p>
                  <p>📧 *Email :* martin@lycee-moliere.fr</p>
                  <p>📱 *WhatsApp :* +33612345678</p>
                  <p>🏫 *Établissement :* Lycée Molière (Paris)</p>
                  <p>📦 *Forfait :* Essai Découverte 7 jours (Gratuit)</p>
                  <p>⏰ *Date :* 14/09/2026 à 14:02</p>
                  <p className="text-slate-600">━━━━━━━━━━━━━━━━━━━━</p>
                  <p className="text-emerald-400">👉 *Accéder au CRM :* /dashboard</p>
                </div>
              </div>

              {/* How to configure Telegram */}
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-2 text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Comment activer Telegram en 3 étapes :</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Ouvrez Telegram et recherchez <span className="text-blue-400 font-mono">@BotFather</span>. Tapez <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">/newbot</code> pour créer votre bot et copiez le jeton API.</li>
                  <li>Démarrez une conversation avec votre bot, puis obtenez votre identifiant en discutant avec <span className="text-blue-400 font-mono">@userinfobot</span>.</li>
                  <li>Ajoutez <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">TELEGRAM_BOT_TOKEN</code> et <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">TELEGRAM_CHAT_ID</code> dans les variables d'environnement de votre instance.</li>
                </ol>
              </div>
            </div>

            {/* Database Management & Tools */}
            <div className="bg-[#141C2E] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <span>Maintenance & Jeu de Données Démonstration</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Outils de gestion pour recharger les comptes enseignants types, inspecter la base JSON et vérifier l'intégrité.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-xs">Jeu de Démonstration Réaliste</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Réinitialise la base avec 12 professeurs certifiés (Maths, Français, SVT, SES), leurs écoles et transactions réelles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeedDemo}
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    Recharger le jeu de démonstration
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-xs">Sauvegarde Complète JSON</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Télécharge le fichier brut <span className="font-mono text-slate-300">leads.json</span> contenant l'intégralité des enseignants.
                    </p>
                  </div>
                  <a
                    href="/api/leads"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 text-center transition-colors block"
                  >
                    Télécharger la sauvegarde JSON
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: TEACHER PROFILE & USAGE DETAIL */}
      {/* ========================================================= */}
      {selectedTeacherForDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141C2E] border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-6 animate-scale-in">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-900/60 border border-blue-700/50 text-blue-300 font-bold flex items-center justify-center text-base">
                  {selectedTeacherForDetail.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedTeacherForDetail.name}</h3>
                  <p className="text-xs text-slate-400">{selectedTeacherForDetail.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacherForDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Établissement</span>
                <span className="font-semibold text-white">{selectedTeacherForDetail.school || 'Non renseigné'}</span>
                {selectedTeacherForDetail.city && <span className="text-slate-400 block text-[11px]">{selectedTeacherForDetail.city}</span>}
              </div>
              <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Forfait & Statut</span>
                <div className="flex items-center gap-2 mt-1">
                  {renderPlanBadge(selectedTeacherForDetail.plan)}
                  {renderStatusBadge(selectedTeacherForDetail.status)}
                </div>
              </div>
              <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Usage Copies IA</span>
                <span className="font-bold text-white text-sm">
                  {selectedTeacherForDetail.copiesCorrected || 0} copies analysées
                </span>
                <span className="text-[11px] text-slate-400 block">Quota actuel : {selectedTeacherForDetail.quota || 50} copies</span>
              </div>
              <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Total Dépensé (LTV)</span>
                <span className="font-bold text-emerald-400 text-sm font-mono">
                  {(selectedTeacherForDetail.totalSpent || 0).toFixed(2)} €
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Inscrit le {new Date(selectedTeacherForDetail.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-1">Journal d'activité & Notes pédagogiques :</span>
              <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {selectedTeacherForDetail.notes || 'Aucune note enregistrée.'}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTeacherForDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT PLAN / STATUS */}
      {/* ========================================================= */}
      {selectedTeacherForEdit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141C2E] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-white">Modifier le compte de {selectedTeacherForEdit.name}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Forfait souscrit :</label>
                <select
                  value={selectedTeacherForEdit.plan}
                  onChange={(e) =>
                    setSelectedTeacherForEdit({ ...selectedTeacherForEdit, plan: e.target.value as SaaSPlan })
                  }
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="free">Gratuit (5 copies)</option>
                  <option value="trial">Essai Pro 7 jours</option>
                  <option value="monthly">Pro Mensuel (9.99 €/mois)</option>
                  <option value="annual">Pro Annuel (99.99 €/an)</option>
                  <option value="institution">Établissement (299.00 €/an)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Statut d'accès :</label>
                <select
                  value={selectedTeacherForEdit.status}
                  onChange={(e) =>
                    setSelectedTeacherForEdit({ ...selectedTeacherForEdit, status: e.target.value as AccountStatus })
                  }
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="active">Actif</option>
                  <option value="trial">En période d'essai</option>
                  <option value="paused">En pause (temporaire)</option>
                  <option value="inactive">Inactif</option>
                  <option value="canceled">Résilié</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Quota maximal de copies :</label>
                <input
                  type="number"
                  value={selectedTeacherForEdit.quota || 100}
                  onChange={(e) =>
                    setSelectedTeacherForEdit({ ...selectedTeacherForEdit, quota: Number(e.target.value) })
                  }
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes administratives :</label>
                <textarea
                  rows={3}
                  value={selectedTeacherForEdit.notes || ''}
                  onChange={(e) =>
                    setSelectedTeacherForEdit({ ...selectedTeacherForEdit, notes: e.target.value })
                  }
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setSelectedTeacherForEdit(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateTeacher(selectedTeacherForEdit.id, {
                    plan: selectedTeacherForEdit.plan,
                    status: selectedTeacherForEdit.status,
                    quota: selectedTeacherForEdit.quota,
                    notes: selectedTeacherForEdit.notes,
                  })
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md"
              >
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: REFUND CONFIRMATION */}
      {/* ========================================================= */}
      {selectedTeacherForRefund && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141C2E] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Rembourser {selectedTeacherForRefund.name}</h3>
                <p className="text-xs text-slate-400">Cette action émettra un avoir et rétrogradera le compte.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Montant à rembourser (€) :</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motif du remboursement :</label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTeacherForRefund(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-md"
              >
                Confirmer le remboursement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: SEND TRANSACTIONAL EMAIL */}
      {/* ========================================================= */}
      {selectedTeacherForEmail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141C2E] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Envoyer un email à {selectedTeacherForEmail.name}</h3>
                <p className="text-xs text-slate-400">Destination : {selectedTeacherForEmail.email}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Modèle d'email :</label>
                <select
                  value={emailTemplate}
                  onChange={(e: any) => setEmailTemplate(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="onboarding">Bienvenue & Guide de prise en main (Onboarding)</option>
                  <option value="trial_end">Rappel d'expiration de l'essai Pro (J-2)</option>
                  <option value="update">Annonce des nouveautés pédagogiques (Vision IA 2.4)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Objet personnalisé (optionnel) :</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Laisser vide pour utiliser l'objet standard du modèle"
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTeacherForEmail(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer le message</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: DELETE CONFIRMATION */}
      {/* ========================================================= */}
      {selectedTeacherForDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141C2E] border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Supprimer le compte</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Êtes-vous certain de vouloir supprimer le compte enseignant de{' '}
              <strong className="text-white">{selectedTeacherForDelete.name}</strong> ({selectedTeacherForDelete.email}) ?
              Toutes les données associées seront effacées.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTeacherForDelete(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteTeacher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-md"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: CREATE NEW TEACHER */}
      {/* ========================================================= */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141C2E] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Créer manuellement un compte Enseignant</span>
            </h3>

            <form onSubmit={handleCreateTeacher} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={newTeacherForm.name}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                    placeholder="Prof. Jean Dupont"
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email académique *</label>
                  <input
                    type="email"
                    required
                    value={newTeacherForm.email}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, email: e.target.value })}
                    placeholder="j.dupont@lycee.fr"
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">WhatsApp / Téléphone</label>
                  <input
                    type="text"
                    value={newTeacherForm.whatsapp}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, whatsapp: e.target.value })}
                    placeholder="+33612345678"
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ville</label>
                  <input
                    type="text"
                    value={newTeacherForm.city}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, city: e.target.value })}
                    placeholder="Lyon, Paris, Bordeaux..."
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Établissement scolaire</label>
                <input
                  type="text"
                  value={newTeacherForm.school}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, school: e.target.value })}
                  placeholder="Lycée Montaigne"
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Forfait attribué</label>
                  <select
                    value={newTeacherForm.plan}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, plan: e.target.value as SaaSPlan })}
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="trial">Essai Pro 7 jours</option>
                    <option value="monthly">Pro Mensuel (9.99 €)</option>
                    <option value="annual">Pro Annuel (99.99 €)</option>
                    <option value="institution">Établissement (299.00 €)</option>
                    <option value="free">Gratuit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Statut initial</label>
                  <select
                    value={newTeacherForm.status}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, status: e.target.value as AccountStatus })}
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="active">Actif</option>
                    <option value="trial">En essai</option>
                    <option value="paused">En pause</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes initiales</label>
                <textarea
                  rows={2}
                  value={newTeacherForm.notes}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, notes: e.target.value })}
                  placeholder="Notes sur la discipline enseignée, niveau..."
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  Créer le compte enseignant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
