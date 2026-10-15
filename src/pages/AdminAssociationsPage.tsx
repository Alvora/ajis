import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit3, Trash2, Users, Palette, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Association {
  id: number;
  name: string;
  username: string;
  email: string;
  color: string;
  is_admin: number;
  can_manage_maraudes: number;
}

const AdminAssociationsPage = () => {
  const { authFetch } = useAuth();
  const [associations, setAssociations] = useState<Association[]>([]);
  const [editingAsso, setEditingAsso] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssociations();
  }, []);

  const fetchAssociations = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/inter-asso/associations');
      if (res.ok) {
        setAssociations(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch associations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (asso: Association) => {
    try {
      const url = asso.id ? `/api/inter-asso/associations/${asso.id}` : '/api/inter-asso/associations';
      const method = asso.id ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asso)
      });
      if (res.ok) {
        fetchAssociations();
        setEditingAsso(null);
      }
    } catch (err) {
      console.error("Failed to save association", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette association ? Toutes les données liées (utilisateurs, événements, maraudes, rapports, annonces, ressources) seront définitivement supprimées.")) return;
    try {
      const res = await authFetch(`/api/inter-asso/associations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAssociations();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error("Failed to delete association", err);
      alert("Erreur réseau lors de la suppression");
    }
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-stone-900 dark:text-white">Gestion des Associations</h1>
        <button 
          onClick={() => setEditingAsso({ id: 0, name: '', username: '', email: '', color: '#6b7280', is_admin: 0, can_manage_maraudes: 1 })}
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-green/90 transition-colors"
        >
          <Plus size={18} /> Ajouter une association
        </button>
      </div>

      <div className="grid gap-4">
        {associations.map(asso => (
          <div key={asso.id} className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full" style={{ backgroundColor: asso.color }}></div>
              <div>
                <h3 className="font-bold text-stone-900 dark:text-white">{asso.name}</h3>
                <p className="text-xs text-stone-500">{asso.username} • {asso.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setEditingAsso(asso)}
                className="p-2 text-stone-500 hover:text-brand-green transition-colors"
                title="Modifier"
              >
                <Edit3 size={18} />
              </button>
              {asso.username !== 'bobosetgamelles' && (
                <button 
                  onClick={() => handleDelete(asso.id)}
                  className="p-2 text-stone-500 hover:text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingAsso && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">{editingAsso.id ? 'Modifier' : 'Ajouter'} une association</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nom" 
                value={editingAsso.name} 
                onChange={e => setEditingAsso({...editingAsso, name: e.target.value})}
                className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
              <input 
                type="text" 
                placeholder="Nom d'utilisateur" 
                value={editingAsso.username} 
                onChange={e => setEditingAsso({...editingAsso, username: e.target.value})}
                className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
              <input 
                type="email" 
                placeholder="Email" 
                value={editingAsso.email} 
                onChange={e => setEditingAsso({...editingAsso, email: e.target.value})}
                className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
              <input 
                type="color" 
                value={editingAsso.color} 
                onChange={e => setEditingAsso({...editingAsso, color: e.target.value})}
                className="w-full h-10 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setEditingAsso(null)}
                  className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-100 rounded-xl"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => handleSave(editingAsso)}
                  className="flex-1 py-3 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green/90"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssociationsPage;
