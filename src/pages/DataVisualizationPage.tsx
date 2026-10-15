import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Map as MapIcon, Utensils, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StatsData {
  maraudesCount: number;
  reposCount: number;
  distribCount: number;
  peopleHelped: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DataVisualizationPage() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Mocked timeseries data for visuals
  const mockTimeseries = Array.from({ length: 6 }).map((_, i) => ({
    name: format(subMonths(new Date(), 5 - i), 'MMM yyyy', { locale: fr }),
    maraudes: Math.floor(Math.random() * 20) + 5,
    repas: Math.floor(Math.random() * 500) + 100,
  }));

  const mockPieData = [
    { name: 'Repas Chauds', value: 400 },
    { name: 'Repas Froids', value: 300 },
    { name: 'Colis Hygiène', value: 150 },
    { name: 'Duvets', value: 50 },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-brand-green border-t-transparent animate-spin"/></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-stone-900 dark:text-white flex items-center gap-3">
          <TrendingUp className="text-brand-green" />
          Statistiques & Données
        </h1>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl">
                <MapIcon size={24} />
              </div>
              <h3 className="font-bold text-stone-600 dark:text-stone-400">Maraudes</h3>
            </div>
            <p className="text-4xl font-black text-stone-900 dark:text-white">{stats.maraudesCount}</p>
            <p className="text-xs text-stone-500 mt-2">+12% depuis le mois dernier</p>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <Users size={24} />
              </div>
              <h3 className="font-bold text-stone-600 dark:text-stone-400">Bénéficiaires</h3>
            </div>
            <p className="text-4xl font-black text-stone-900 dark:text-white">{stats.peopleHelped}</p>
            <p className="text-xs text-stone-500 mt-2">Repas et colis distribués</p>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <Utensils size={24} />
              </div>
              <h3 className="font-bold text-stone-600 dark:text-stone-400">Distributions</h3>
            </div>
            <p className="text-4xl font-black text-stone-900 dark:text-white">{stats.distribCount}</p>
            <p className="text-xs text-stone-500 mt-2">Points de contact enregistrés</p>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                <Activity size={24} />
              </div>
              <h3 className="font-bold text-stone-600 dark:text-stone-400">Rapports</h3>
            </div>
            <p className="text-4xl font-black text-stone-900 dark:text-white">{stats.reposCount}</p>
            <p className="text-xs text-stone-500 mt-2">CR finalisés</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-stone-900 dark:text-white mb-6">Évolution des Maraudes</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTimeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="maraudes" name="Nombre de Maraudes" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-stone-900 dark:text-white mb-6">Repas Distribués (Exemple Répartition)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
