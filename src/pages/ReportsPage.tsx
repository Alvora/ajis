import React, { useState, useEffect } from 'react';
import { FileText, Plus, Send, User, ShieldAlert, Calendar, Edit2, Trash2, X, Check } from 'lucide-react';
import { Report, MaraudeEvent, MaraudeTeam } from '../types';
import { useAuth } from '../contexts/AuthContext';

const MAX_REPORT_LENGTH = 2000;

const ReportsPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [events, setEvents] = useState<MaraudeEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newReport, setNewReport] = useState({ maraude_team_id: '', content: '', author: '' });
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const { user, authFetch } = useAuth();

  const canCreateReport = user && (
    user.rights?.['La maraude'] === 'RW' || 
    user.rights?.['La maraude'] === 'RWD' ||
    user.rights?.['Les équipes'] === 'RW' ||
    user.rights?.['Les équipes'] === 'RWD' ||
    user.groups?.some(g => g.name === 'Administrateur') ||
    user.roles?.includes('Président·e')
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, eventsRes] = await Promise.all([
        authFetch('/api/reports'),
        authFetch('/api/maraude-events')
      ]);
      const reportsData = await reportsRes.json();
      const eventsData = await eventsRes.json();
      
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error("Error fetching reports data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateReport || newReport.content.length > MAX_REPORT_LENGTH) return;

    await authFetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newReport, user_id: user?.id })
    });
    setNewReport({ maraude_team_id: '', content: '', author: '' });
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce compte-rendu ?')) return;
    try {
      const res = await authFetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        alert("Erreur lors de la suppression : " + err.error);
      }
    } catch (error) {
      console.error("Delete report error:", error);
      alert("Erreur réseau lors de la suppression.");
    }
  };

  const handleEdit = (report: Report) => {
    setEditingReportId(report.id);
    setEditContent(report.content);
  };

  const handleSaveEdit = async (id: number) => {
    if (editContent.length > MAX_REPORT_LENGTH) return;
    await authFetch(`/api/reports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent })
    });
    setEditingReportId(null);
    fetchData();
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="text-brand-red" /> Comptes-rendus
          </h1>
          <p className="text-stone-500">Historique des maraudes et retours terrain.</p>
        </div>
        {canCreateReport ? (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-green text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-green/90 transition-colors"
          >
            <Plus size={20} /> Nouveau Rapport
          </button>
        ) : (
          <div className="flex items-center gap-2 text-stone-400 text-sm italic">
            <ShieldAlert size={16} />
            Seuls les chefs de groupe peuvent publier
          </div>
        )}
      </div>

      {showForm && (
        <div className="mb-8 bg-bg-card p-6 rounded-2xl border border-border-card shadow-sm animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Équipe concernée</label>
                <select 
                  required
                  value={newReport.maraude_team_id}
                  onChange={e => setNewReport({...newReport, maraude_team_id: e.target.value})}
                  className="w-full bg-white dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green outline-none"
                >
                  <option value="">Sélectionnez une équipe</option>
                  {events.map(event => (
                    event.teams.map(team => (
                      <option key={team.id} value={team.id} className="dark:bg-stone-800">
                        {new Date(event.date).toLocaleDateString()} - {team.team_name}
                      </option>
                    ))
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Auteur</label>
                <input 
                  required
                  type="text" 
                  placeholder="Votre nom"
                  value={newReport.author}
                  onChange={e => setNewReport({...newReport, author: e.target.value})}
                  className="w-full bg-white dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green outline-none" 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium">Contenu du rapport</label>
                <span className={`text-xs ${newReport.content.length > MAX_REPORT_LENGTH ? 'text-red-500 font-bold' : 'text-stone-400'}`}>
                  {newReport.content.length} / {MAX_REPORT_LENGTH}
                </span>
              </div>
              <textarea 
                required
                rows={6}
                placeholder="Détaillez le déroulement de la maraude, les rencontres, les besoins identifiés..."
                value={newReport.content}
                onChange={e => setNewReport({...newReport, content: e.target.value})}
                className={`w-full bg-white dark:bg-stone-800 text-stone-900 dark:text-white border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green outline-none resize-none ${newReport.content.length > MAX_REPORT_LENGTH ? 'border-red-500' : 'border-stone-200 dark:border-stone-700'}`} 
              ></textarea>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-stone-500 font-medium">Annuler</button>
              <button 
                type="submit" 
                disabled={newReport.content.length > MAX_REPORT_LENGTH}
                className="bg-brand-green text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-brand-green/90 disabled:opacity-50"
              >
                <Send size={18} /> Publier le rapport
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {reports.map((report) => {
          let teamInfo = 'Équipe inconnue';
          let dateInfo = '';
          
          for (const event of events) {
            const team = event.teams.find(t => t.id === report.maraude_team_id);
            if (team) {
              teamInfo = team.team_name;
              dateInfo = new Date(event.date).toLocaleDateString();
              break;
            }
          }

          return (
            <div key={report.id} className="bg-bg-card p-6 rounded-2xl border border-border-card shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-text-main">
                    {teamInfo} {dateInfo && ` - ${dateInfo}`}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-stone-400 mt-1 uppercase font-bold tracking-wider">
                    <User size={12} /> {report.author} • {new Date(report.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-stone-100 text-stone-500 text-[10px] font-bold rounded-full uppercase">
                    Maraude effectuée
                  </span>
                  {canCreateReport && (
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => handleEdit(report)} className="p-1.5 text-stone-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(report.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {editingReportId === report.id ? (
                <div className="mt-4">
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-medium">Modifier le rapport</label>
                    <span className={`text-xs ${editContent.length > MAX_REPORT_LENGTH ? 'text-red-500 font-bold' : 'text-stone-400'}`}>
                      {editContent.length} / {MAX_REPORT_LENGTH}
                    </span>
                  </div>
                  <textarea 
                    rows={6}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className={`w-full bg-white dark:bg-stone-800 text-stone-900 dark:text-white border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green outline-none resize-none mb-2 ${editContent.length > MAX_REPORT_LENGTH ? 'border-red-500' : 'border-stone-200 dark:border-stone-700'}`} 
                  ></textarea>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingReportId(null)} className="px-3 py-1.5 text-stone-500 hover:bg-stone-100 rounded-lg flex items-center gap-1 text-sm font-medium">
                      <X size={14} /> Annuler
                    </button>
                    <button 
                      onClick={() => handleSaveEdit(report.id)} 
                      disabled={editContent.length > MAX_REPORT_LENGTH}
                      className="px-3 py-1.5 bg-brand-green text-white rounded-lg flex items-center gap-1 text-sm font-bold hover:bg-brand-green/90 disabled:opacity-50"
                    >
                      <Check size={14} /> Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                  {report.content}
                </p>
              )}
            </div>
          );
        })}
        {reports.length === 0 && (
          <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
            <FileText className="mx-auto text-stone-300 mb-4" size={48} />
            <p className="text-stone-500">Aucun compte-rendu pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
