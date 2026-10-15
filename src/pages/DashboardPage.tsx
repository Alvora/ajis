import React, { useState, useEffect } from 'react';
import { 
  Package, 
  FileText, 
  Map as MapIcon, 
  TrendingUp, 
  Users,
  AlertCircle,
  Plus,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  MessageSquare,
  Shield,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StockItem, Report, MaraudeEvent, Announcement, Distribution } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { PageSkeleton } from '../components/Skeleton';

const DashboardPage = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [events, setEvents] = useState<MaraudeEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, authFetch } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await authFetch('/api/dashboard/summary');
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard summary");
      }
      
      const { stock, reports, events, announcements, distributions } = await res.json();
      
      setStock(Array.isArray(stock) ? stock : []);
      setReports(Array.isArray(reports) ? reports : []);
      setEvents(Array.isArray(events) ? events : []);
      setAnnouncements(Array.isArray(announcements) ? announcements : []);
      setDistributions(Array.isArray(distributions) ? distributions : []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user && (
    user.groups?.some(g => g.name === 'Administrateur') ||
    user.roles?.includes('Président·e')
  );

  // Calculate stats from completed maraudes
  const completedEvents = events.filter(e => e.status === 'completed');
  const completedTeamIds = completedEvents.flatMap(e => (e.teams || []).map(t => t.id));
  
  // A distribution is linked to a maraude_team_id
  const completedDistributions = distributions.filter(d => completedTeamIds.includes(d.maraude_team_id));
  const peopleMet = completedDistributions.reduce((sum, d) => sum + (d.people_helped || 0), 0);
  const peopleHelped = completedDistributions.reduce((sum, d) => sum + (d.total_helped_count || 0), 0);

  const stats = [
    { label: 'Maraudes prévues', value: events.filter(e => e.status === 'planned' || e.status === 'in-progress').length.toString(), icon: MapIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Personnes rencontrées', value: peopleMet.toString(), icon: Users, color: 'text-brand-green', bg: 'bg-brand-green/10' },
    { label: 'Personnes aidées', value: peopleHelped.toString(), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Calculate stock distribution by category
  const stockByCategory = stock.reduce((acc, item) => {
    if (item.status === 'available') {
      const catName = item.category_name || 'Autre';
      if (!acc[catName]) {
        acc[catName] = { value: 0, color: item.category_color || '#78716c' };
      }
      acc[catName].value += 1;
    }
    return acc;
  }, {} as Record<string, { value: number, color: string }>);

  const pieData = Object.entries(stockByCategory).map(([name, data]) => ({ name, value: data.value, color: data.color }));

  if (loading) return <PageSkeleton />;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-stone-50 dark:bg-stone-950 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Tableau de bord membre</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">Bienvenue dans votre espace de gestion solidaire.</p>
        </div>
        <a 
          href="https://chat.whatsapp.com/example" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-sm dark:shadow-none"
        >
          <MessageCircle size={20} /> Rejoindre le WhatsApp Membres
        </a>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-stone-800 p-6 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-text-main">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Announcements */}
        <div className="bg-white dark:bg-stone-800 p-8 rounded-[2rem] border border-stone-200 dark:border-stone-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black flex items-center gap-2 tracking-tight text-text-main">
              <MessageSquare className="text-brand-green" /> Annonces Internes
            </h2>
            <Link to="/intranet/resources" className="text-sm text-brand-green font-bold hover:underline">Voir tout</Link>
          </div>

          <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {announcements.length > 0 ? announcements.slice(0, 3).map(a => (
              <div key={a.id} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-sm text-text-main">{a.title}</span>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">{a.content}</p>
                <div className="mt-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">Par {a.author_name}</div>
              </div>
            )) : (
              <div className="py-12 text-center text-stone-400 text-sm italic border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-2xl">
                Aucune annonce récente.
              </div>
            )}
          </div>
        </div>

        {/* Stock Preview */}
        <div className="bg-white dark:bg-stone-800 p-8 rounded-[2rem] border border-stone-200 dark:border-stone-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black flex items-center gap-2 tracking-tight text-text-main">
              <Package className="text-brand-green" /> Répartition des stocks
            </h2>
            <Link to="/intranet/stock" className="text-sm text-brand-green font-bold hover:underline">Voir tout</Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1c1917' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1 grid grid-cols-1 gap-4">
          <Link to="/intranet/map" className="p-6 bg-stone-900 text-white rounded-[2rem] flex items-center justify-between group hover:bg-stone-800 transition-all shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <MapIcon size={24} />
              </div>
              <div>
                <p className="font-black text-lg">Gérer les Maraudes</p>
                <p className="text-xs text-stone-400">Circuits, équipes et points</p>
              </div>
            </div>
            <ExternalLink size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link to="/intranet/stock" className="p-6 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-[2rem] flex items-center justify-between group hover:bg-stone-200 dark:hover:bg-stone-700 transition-all shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center">
                <Package size={24} />
              </div>
              <div>
                <p className="font-black text-lg">Inventaire Complet</p>
                <p className="text-xs text-stone-500">Stock détaillé et péremption</p>
              </div>
            </div>
            <ExternalLink size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
          </Link>
          {isAdmin && (
            <Link to="/intranet/users" className="p-6 bg-brand-red text-white rounded-[2rem] flex items-center justify-between group hover:bg-brand-red/90 transition-all shadow-sm dark:shadow-none">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Shield size={24} />
                </div>
                <div>
                  <p className="font-black text-lg">Gestion des Droits</p>
                  <p className="text-xs text-white/80">Utilisateurs, rôles et accès</p>
                </div>
              </div>
              <ExternalLink size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
