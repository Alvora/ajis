import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Users, 
  Map as MapIcon, 
  Package, 
  FileText, 
  Menu, 
  X, 
  ChevronRight,
  Plus,
  Info,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Shield,
  ExternalLink,
  Globe,
  HelpCircle,
  FolderOpen,
  MessageSquare,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { cn } from './lib/utils';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeToggle } from './components/ThemeToggle';
import { Logo } from './components/Logo';
const StockPage = React.lazy(() => import('./pages/StockPage'));

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-8">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-stone-200">
            <h2 className="text-2xl font-black text-red-500 mb-4">Oups ! Quelque chose s'est mal passé.</h2>
            <p className="text-stone-600 mb-6">L'application a rencontré une erreur inattendue.</p>
            <div className="bg-stone-50 p-4 rounded-xl mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-600">{this.state.error?.message}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy loaded Pages
const AdminAssociationsPage = React.lazy(() => import('./pages/AdminAssociationsPage'));
const ShowcasePage = React.lazy(() => import('./pages/ShowcasePage'));
const MutualizedMapPage = React.lazy(() => import('./pages/MutualizedMapPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const VolunteerPage = React.lazy(() => import('./pages/VolunteerPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const MaraudeMapPage = React.lazy(() => import('./pages/MaraudeMapPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const AdminUsersPage = React.lazy(() => import('./pages/AdminUsersPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const LegalPage = React.lazy(() => import('./pages/LegalPage'));
const ResourcesPage = React.lazy(() => import('./pages/ResourcesPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const TicketsPage = React.lazy(() => import('./pages/TicketsPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const BeneficiariesPage = React.lazy(() => import('./pages/BeneficiariesPage'));
const DataVisualizationPage = React.lazy(() => import('./pages/DataVisualizationPage'));

const ProtectedRoute = ({ children, roles, pageName }: { children: React.ReactNode, roles?: string[], pageName?: string }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="p-8">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (roles) {
    const hasRole = roles.some(r => {
      if (user.roles?.includes(r as any)) return true;
      
      // Map codes to French names or Groups
      if (r === 'PRESIDENT' && user.roles?.includes('Président·e')) return true;
      if (r === 'ADMIN_SITE' && user.groups?.some(g => g.name === 'Administrateur')) return true;

      // Super admin checks
      if (user.groups?.some(g => g.name === 'Administrateur')) return true;
      if (user.roles?.includes('Président·e') && r !== 'ADMIN_SITE') return true;
      
      return false;
    });
    if (!hasRole) return <Navigate to="/intranet" />;
  }

  if (pageName && user.rights) {
    const isAdmin = user.groups?.some(g => g.name === 'Administrateur') || user.roles?.includes('Président·e');
    if (!isAdmin) {
      const right = user.rights[pageName];
      if (!right || right === '-') {
        return <Navigate to="/intranet" />;
      }
    }
  }
  
  return <>{children}</>;
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isIntranetMenuOpen, setIsIntranetMenuOpen] = useState(false);
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const location = useLocation();
  const { user, logout, authFetch } = useAuth();
  const isMemberArea = location.pathname.startsWith('/intranet');

  const handleTicketSubmit = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim() || !user) return;
    setIsSubmittingTicket(true);
    try {
      const res = await authFetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          subject: ticketSubject,
          message: ticketMessage
        })
      });
      if (res.ok) {
        setTicketModalOpen(false);
        setTicketSubject('');
        setTicketMessage('');
        alert('Votre ticket a été envoyé à l\'administrateur.');
      } else {
        alert('Erreur lors de l\'envoi du ticket.');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'envoi du ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const vitrineLinks = [
    { name: 'Accueil', path: '/', icon: Globe },
    { name: 'Contact', path: '/contact', icon: MessageSquare },
    { name: 'Mentions Légales', path: '/legal', icon: FileText },
  ];

  const memberLinks = [
    { name: 'Tableau de bord', path: '/intranet', icon: LayoutDashboard },
    ...(user?.groups?.some(g => g.name === 'Administrateur') || user?.roles?.includes('Président·e') || user?.rights?.['Gestion des stocks'] && user.rights['Gestion des stocks'] !== '-' ? [{ name: 'Stock', path: '/intranet/stock', icon: Package }] : []),
    ...(user?.groups?.some(g => g.name === 'Administrateur') || user?.roles?.includes('Président·e') || (user?.rights?.['La maraude'] && user.rights['La maraude'] !== '-') || (user?.rights?.['Les équipes'] && user.rights['Les équipes'] !== '-') ? [{ name: 'Maraudes', path: '/intranet/map', icon: MapIcon }] : []),
    ...(user?.groups?.some(g => g.name === 'Administrateur') || user?.roles?.includes('Président·e') || user?.rights?.['Recensement'] && user.rights['Recensement'] !== '-' ? [{ name: 'Recensement', path: '/intranet/beneficiaries', icon: UserCheck }] : []),
    ...(user?.groups?.some(g => g.name === 'Administrateur') || user?.roles?.includes('Président·e') || user?.rights?.['Documents'] && user.rights['Documents'] !== '-' ? [{ name: 'Ressources', path: '/intranet/resources', icon: FolderOpen }] : []),
    ...(user?.groups?.some(g => g.name === 'Administrateur') || user?.roles?.includes('Président·e') ? [
      { name: 'Stats', path: '/intranet/stats', icon: TrendingUp },
      { name: 'Droits', path: '/intranet/users', icon: Shield },
      { name: 'Tickets', path: '/intranet/tickets', icon: MessageSquare }
    ] : []),
  ];

  const mutualizedLinks = [
    { name: 'Carte', path: '/mutualized', icon: Globe },
    ...(user?.groups?.some(g => g.name === 'Administrateur') || user?.roles?.includes('Président·e') || user?.rights?.['Carte Mutualisée'] !== '-' ? [
      { name: 'Gestion des associations', path: '/mutualized/associations', icon: Users }
    ] : []),
  ];

  const getActiveSection = () => {
    if (location.pathname.startsWith('/intranet')) return 'intranet';
    if (location.pathname.startsWith('/mutualized')) return 'mutualized';
    return 'vitrine';
  };

  const activeSection = getActiveSection();
  const subLinks = activeSection === 'intranet' ? memberLinks : activeSection === 'mutualized' ? mutualizedLinks : vitrineLinks;
  const currentSubLink = subLinks.find(l => l.path === location.pathname) || subLinks[0];

  const roleLabels: Record<string, string> = {
    'ADMIN_SITE': 'Administrateur Site',
    'PRESIDENT': 'Président',
    'TRESORIERE': 'Trésorière',
    'VICE_PRESIDENT': 'Vice-Président',
    'SECRETARIAT': 'Secrétariat',
    'RESP_AIDE_ALIMENTAIRE': 'Resp. Aide Alimentaire',
    'RESP_LOGISTIQUE': 'Resp. Logistique',
    'RESP_COMMUNICATION': 'Resp. Communication',
    'RESP_INNOVATION_SOCIALE': 'Resp. Innovation Sociale',
    'RESP_PREV_SANTE': 'Resp. Prév. Santé',
    'BENEVOLE': 'Bénévole',
    'VISITEUR': 'Visiteur'
  };

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isMemberArea ? "bg-stone-900 text-white border-stone-800" : "bg-nav-bg text-text-main backdrop-blur-md border-stone-500/10"
      )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <Logo size="md" />
            </Link>
            <div className="relative group">
              <button 
                onClick={() => setIsSectionMenuOpen(!isSectionMenuOpen)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider border flex items-center gap-3 cursor-pointer transition-all shadow-sm shrink-0",
                  location.pathname.startsWith('/intranet') 
                    ? "bg-brand-red/10 border-brand-red/20 text-brand-red hover:bg-brand-red/20 shadow-brand-red/5" 
                    : location.pathname === '/mutualized' 
                      ? "bg-brand-green/10 border-brand-green/20 text-brand-green hover:bg-brand-green/20 shadow-brand-green/5" 
                      : "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20 shadow-blue-500/5"
                )}
              >
                {location.pathname.startsWith('/intranet') ? 'Intranet B&G' : location.pathname === '/mutualized' ? 'Carte Mutualisée' : 'Vitrine'}
                <ChevronRight size={16} className={cn("transition-transform", isSectionMenuOpen ? "rotate-90" : "")} />
              </button>
              
              <AnimatePresence>
                {isSectionMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsSectionMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        "absolute left-0 mt-2 w-56 rounded-2xl shadow-xl z-20 border overflow-hidden",
                        isMemberArea ? "bg-stone-800 border-stone-700 shadow-black/20" : "bg-white border-stone-200 dark:bg-stone-800 dark:border-stone-700 shadow-stone-200/50"
                      )}
                    >
                      <div className="p-2 space-y-1">
                        <Link
                          to="/"
                          onClick={() => setIsSectionMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                            activeSection === 'vitrine' 
                              ? (isMemberArea ? "bg-stone-700 text-blue-500" : "bg-blue-50/50 text-blue-600 dark:bg-stone-700 dark:text-blue-400") 
                              : (isMemberArea ? "text-stone-300 hover:bg-white/5" : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5")
                          )}
                        >
                          Vitrine
                        </Link>
                        <Link
                          to="/intranet"
                          onClick={() => setIsSectionMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                            activeSection === 'intranet' 
                              ? (isMemberArea ? "bg-stone-700 text-brand-red" : "bg-brand-red/10 text-brand-red dark:bg-stone-700") 
                              : (isMemberArea ? "text-stone-300 hover:bg-white/5" : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5")
                          )}
                        >
                          Intranet B&G
                        </Link>
                        <Link
                          to="/mutualized"
                          onClick={() => setIsSectionMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                            activeSection === 'mutualized' 
                              ? (isMemberArea ? "bg-stone-700 text-brand-green" : "bg-brand-green/10 text-brand-green dark:bg-stone-700") 
                              : (isMemberArea ? "text-stone-300 hover:bg-white/5" : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5")
                          )}
                        >
                          Carte Mutualisée
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            {/* Desktop Sub-Tabs Dropdown */}
            <div className="hidden lg:flex items-center gap-1 pl-4 border-l border-stone-500/10">
              <div className="relative">
                <button 
                  onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-3 cursor-pointer transition-all shadow-sm border",
                    isMemberArea 
                      ? "bg-stone-800 border-stone-700 text-white hover:bg-stone-700" 
                      : "bg-white border-stone-200 text-stone-900 hover:bg-stone-50 shadow-stone-100"
                  )}
                >
                  {currentSubLink?.icon && <currentSubLink.icon size={18} className="text-brand-green" />}
                  {currentSubLink?.name}
                  <ChevronRight size={16} className={cn("transition-transform opacity-50", isSubMenuOpen ? "rotate-90" : "")} />
                </button>

                <AnimatePresence>
                  {isSubMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSubMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                          "absolute left-0 mt-2 w-56 rounded-2xl shadow-xl z-20 border overflow-hidden",
                          isMemberArea ? "bg-stone-800 border-stone-700 shadow-black/20" : "bg-white border-stone-200 shadow-stone-200/50"
                        )}
                      >
                        <div className="p-2 space-y-1">
                          {subLinks.map((link) => (
                            <Link
                              key={link.path}
                              to={link.path}
                              onClick={() => setIsSubMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                location.pathname === link.path 
                                  ? (isMemberArea ? "bg-stone-700 text-brand-green" : "bg-brand-green/10 text-brand-green") 
                                  : (isMemberArea ? "text-stone-300 hover:bg-white/5" : "text-stone-700 hover:bg-stone-50")
                              )}
                            >
                              <link.icon size={18} className={cn(location.pathname === link.path ? "text-brand-green" : "text-stone-400")} />
                              {link.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-4 relative">
                <ThemeToggle />
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 hover:bg-stone-500/10 p-2 rounded-xl transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-800 overflow-hidden bg-stone-100 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon size={16} className="text-stone-400" />
                      )}
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] font-black text-brand-green uppercase tracking-tighter">
                        {user.title || roleLabels[user.role]}
                      </span>
                      <span className="text-[10px] opacity-60">{user.username}</span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsProfileOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className={cn(
                            "absolute right-0 mt-2 w-48 rounded-2xl shadow-xl z-20 border overflow-hidden",
                            isMemberArea ? "bg-stone-800 border-stone-700" : "bg-white border-stone-100"
                          )}
                        >
                          <div className="p-2 space-y-1">
                            <Link 
                              to="/intranet/profile" 
                              onClick={() => setIsProfileOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                isMemberArea ? "text-stone-300 hover:bg-white/5" : "text-stone-700 hover:bg-stone-50"
                              )}
                            >
                              <UserIcon size={18} className="text-brand-green" />
                              Mon Profil
                            </Link>
                            <button 
                              onClick={() => { setTicketModalOpen(true); setIsProfileOpen(false); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors",
                                isMemberArea ? "text-stone-300 hover:bg-white/5" : "text-stone-700 hover:bg-stone-50"
                              )}
                            >
                              <HelpCircle size={18} className="text-amber-500" />
                              Signaler un problème
                            </button>
                            <button 
                              onClick={() => { logout(); setIsProfileOpen(false); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors text-red-500",
                                isMemberArea ? "hover:bg-white/5" : "hover:bg-stone-50"
                              )}
                            >
                              <LogOut size={18} />
                              Déconnexion
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
            {!user && (
              <div className="flex items-center gap-4 pl-4 border-l border-stone-500/20">
                <ThemeToggle />
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Link to="/member/profile" className="flex items-center gap-2 mr-2">
                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-800 overflow-hidden bg-stone-100 flex items-center justify-center">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon size={16} className="text-stone-400" />
                  )}
                </div>
              </Link>
            )}
            {isMemberArea && (
              <button onClick={() => setIsOpen(!isOpen)} className="p-2">
                {isOpen ? <X /> : <Menu />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "md:hidden border-b overflow-hidden",
              isMemberArea ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"
            )}
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {subLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg transition-colors",
                    location.pathname === link.path
                      ? "bg-brand-green/10 text-brand-green"
                      : "text-stone-500 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-white/5"
                  )}
                >
                  <link.icon size={20} className="text-brand-green" />
                  {link.name}
                </Link>
              ))}
              {user && (
                <button
                  onClick={() => { logout(); setIsOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg text-red-500",
                    isMemberArea ? "hover:bg-white/5" : "hover:bg-stone-50"
                  )}
                >
                  <LogOut size={20} />
                  Déconnexion
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>

      {ticketModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-amber-50">
              <div>
                <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                  <HelpCircle size={20} /> Signaler un problème
                </h3>
                <p className="text-xs text-amber-700">Envoyez un message à l'administrateur.</p>
              </div>
              <button onClick={() => setTicketModalOpen(false)} className="p-2 hover:bg-amber-100 rounded-full transition-colors">
                <X size={20} className="text-amber-900" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Sujet</label>
                <input 
                  type="text" 
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder="Ex: Problème avec mon compte"
                  className="w-full p-3 rounded-xl border border-stone-200 bg-white text-stone-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Message</label>
                <textarea 
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  placeholder="Décrivez votre problème en détail..."
                  className="w-full h-32 p-3 rounded-xl border border-stone-200 bg-white text-stone-900 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 bg-stone-50 flex gap-3">
              <button 
                onClick={() => setTicketModalOpen(false)}
                className="flex-1 py-3 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleTicketSubmit}
                disabled={isSubmittingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm disabled:bg-amber-300"
              >
                {isSubmittingTicket ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Footer = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/intranet/map') || location.pathname.startsWith('/mutualized')) return null;

  return (
    <footer className="bg-stone-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <Logo size="lg" />
            <div>
              <h3 className="font-black text-xl tracking-tighter">
                <span className="text-brand-red">BOBOS</span> <span className="text-blue-400">&</span> <span className="text-brand-green">GAMELLES</span>
              </h3>
              <p className="text-stone-400 text-xs uppercase tracking-widest font-bold">Association de solidarité</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://www.tiktok.com/@bobosetgamelles" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center justify-center border border-white/5" title="TikTok">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
            </a>
            <a href="https://www.instagram.com/bobosetgamelles/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center justify-center border border-white/5" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61583436930051" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center justify-center border border-white/5" title="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://www.linkedin.com/company/bobos-et-gamelles" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center justify-center border border-white/5" title="LinkedIn">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="https://linktr.ee/bobosetgamelles" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center justify-center border border-white/5" title="Linktree">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </a>
            <a href="https://www.helloasso.com/associations/bobos-et-gamelles/formulaires/1" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-brand-green hover:bg-brand-green/90 rounded-xl transition-all flex items-center gap-2 text-sm font-bold shadow-sm">
              Faire un don
            </a>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-stone-500 uppercase tracking-widest font-bold">
          <div>© {new Date().getFullYear()} Bobos et Gamelles. Tous droits réservés.</div>
          <div className="flex gap-6">
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link to="/legal" className="hover:text-white transition-colors">Mentions Légales</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
            <ToastProvider>
              <Router>
                <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-grow pt-16">
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                    <Routes>
                      <Route path="/" element={<ShowcasePage />} />
                      <Route path="/mutualized" element={<MutualizedMapPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/legal" element={<LegalPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      
                      {/* Intranet Area */}
                      <Route path="/intranet" element={<ProtectedRoute pageName="Tableau de bord"><DashboardPage /></ProtectedRoute>} />
                      <Route path="/intranet/stock" element={<ProtectedRoute pageName="Gestion des stocks"><StockPage /></ProtectedRoute>} />
                      <Route path="/intranet/map" element={<ProtectedRoute pageName="La maraude"><MaraudeMapPage /></ProtectedRoute>} />
                      <Route path="/intranet/beneficiaries" element={<ProtectedRoute pageName="Recensement"><BeneficiariesPage /></ProtectedRoute>} />
                      <Route path="/intranet/resources" element={<ProtectedRoute pageName="Documents"><ResourcesPage /></ProtectedRoute>} />
                      <Route path="/intranet/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                      <Route path="/intranet/users" element={<ProtectedRoute roles={['PRESIDENT', 'ADMIN_SITE']}><AdminUsersPage /></ProtectedRoute>} />
                      <Route path="/mutualized/associations" element={<ProtectedRoute roles={['PRESIDENT', 'ADMIN_SITE']}><AdminAssociationsPage /></ProtectedRoute>} />
                      <Route path="/intranet/tickets" element={<ProtectedRoute pageName="Gestion des tickets"><TicketsPage /></ProtectedRoute>} />
                      <Route path="/intranet/stats" element={<ProtectedRoute><DataVisualizationPage /></ProtectedRoute>} />
                    </Routes>
                  </Suspense>
                </main>
              
                <Footer />
              </div>
            </Router>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
