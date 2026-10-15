import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, UserCheck, Merge, Edit2, Trash2, X, History, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Beneficiary {
  id: number;
  first_name: string;
  last_name: string;
  encounter_count: number;
  last_encounter: string;
}

interface Encounter {
  comment: string;
  created_at: string;
  lat: number;
  lng: number;
  team_name: string;
  event_date: string;
  direct_help: number;
  mobile_meal: number;
  mobile_meal_type: string | null;
}

export default function BeneficiariesPage() {
  const { authFetch } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [primaryMergeId, setPrimaryMergeId] = useState<number | null>(null);
  
  const [historyModal, setHistoryModal] = useState<number | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  
  const [editModal, setEditModal] = useState<Beneficiary | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');

  const fetchBeneficiaries = async () => {
    try {
      const res = await authFetch('/api/beneficiaries');
      const data = await res.json();
      setBeneficiaries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch beneficiaries:", error);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handleMerge = async () => {
    if (!primaryMergeId || selectedIds.length < 2) return;
    const secondaryIds = selectedIds.filter(id => id !== primaryMergeId);
    
    try {
      const res = await authFetch('/api/beneficiaries/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_id: primaryMergeId, secondary_ids: secondaryIds })
      });
      if (res.ok) {
        setIsMergeModalOpen(false);
        setSelectedIds([]);
        setPrimaryMergeId(null);
        fetchBeneficiaries();
      }
    } catch (error) {
      console.error("Merge failed:", error);
    }
  };

  const handleEdit = async () => {
    if (!editModal) return;
    try {
      const res = await authFetch(`/api/beneficiaries/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: editFirstName, last_name: editLastName })
      });
      if (res.ok) {
        setEditModal(null);
        fetchBeneficiaries();
      }
    } catch (error) {
      console.error("Edit failed:", error);
    }
  };

  const openHistory = async (id: number) => {
    setHistoryModal(id);
    try {
      const res = await authFetch(`/api/beneficiaries/${id}/history`);
      const data = await res.json();
      setEncounters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const filteredBeneficiaries = beneficiaries.filter(b => 
    `${b.first_name} ${b.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <UserCheck className="text-brand-green" /> Recensement
          </h1>
          <p className="text-stone-500">Gérez la liste des bénéficiaires rencontrés lors des maraudes.</p>
        </div>
        
        {selectedIds.length > 1 && (
          <button
            onClick={() => setIsMergeModalOpen(true)}
            className="px-4 py-2 bg-brand-green text-white rounded-xl font-bold hover:bg-brand-green/90 transition-colors flex items-center gap-2"
          >
            <Merge size={18} /> Fusionner ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un bénéficiaire..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    onChange={e => setSelectedIds(e.target.checked ? filteredBeneficiaries.map(b => b.id) : [])}
                    checked={selectedIds.length === filteredBeneficiaries.length && filteredBeneficiaries.length > 0}
                    className="rounded text-brand-green focus:ring-brand-green"
                  />
                </th>
                <th className="p-4 font-bold">Nom / Prénom</th>
                <th className="p-4 font-bold">Rencontres</th>
                <th className="p-4 font-bold">Dernière rencontre</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredBeneficiaries.map(b => (
                <tr key={b.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(b.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedIds([...selectedIds, b.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== b.id));
                      }}
                      className="rounded text-brand-green focus:ring-brand-green"
                    />
                  </td>
                  <td className="p-4 font-medium text-stone-900">
                    {b.first_name} {b.last_name}
                  </td>
                  <td className="p-4 text-stone-600">
                    <span className="inline-flex items-center justify-center px-2 py-1 bg-stone-100 rounded-full text-xs font-bold">
                      {b.encounter_count}
                    </span>
                  </td>
                  <td className="p-4 text-stone-600">
                    {b.last_encounter ? new Date(b.last_encounter).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => openHistory(b.id)}
                      className="p-2 text-stone-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors"
                      title="Historique"
                    >
                      <History size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setEditModal(b);
                        setEditFirstName(b.first_name);
                        setEditLastName(b.last_name);
                      }}
                      className="p-2 text-stone-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBeneficiaries.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500">
                    Aucun bénéficiaire trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Merge Modal */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-border-card">
            <div className="p-6 border-b border-border-card flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                <Merge size={20} className="text-brand-green" /> Fusionner des fiches
              </h3>
              <button onClick={() => setIsMergeModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-stone-500">
                Vous avez sélectionné {selectedIds.length} fiches. Choisissez la fiche principale à conserver. Les autres fiches seront supprimées et leur historique sera transféré vers la fiche principale.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {beneficiaries.filter(b => selectedIds.includes(b.id)).map(b => (
                  <label key={b.id} className="flex items-center gap-3 p-3 border border-stone-200 dark:border-stone-700 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800">
                    <input 
                      type="radio" 
                      name="primaryMerge" 
                      checked={primaryMergeId === b.id}
                      onChange={() => setPrimaryMergeId(b.id)}
                      className="text-brand-green focus:ring-brand-green"
                    />
                    <div>
                      <div className="font-bold text-text-main">{b.first_name} {b.last_name}</div>
                      <div className="text-xs text-stone-500">{b.encounter_count} rencontres</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 bg-stone-50 dark:bg-stone-900/50 flex gap-3">
              <button 
                onClick={() => setIsMergeModalOpen(false)}
                className="flex-1 py-2 font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleMerge}
                disabled={!primaryMergeId}
                className="flex-1 py-2 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green/90 transition-colors disabled:opacity-50"
              >
                Confirmer la fusion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-border-card">
            <div className="p-6 border-b border-border-card flex justify-between items-center">
              <h3 className="text-lg font-bold text-text-main">Modifier la fiche</h3>
              <button onClick={() => setEditModal(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Prénom</label>
                <input 
                  type="text" 
                  value={editFirstName}
                  onChange={e => setEditFirstName(e.target.value)}
                  className="w-full p-2 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-green bg-white dark:bg-stone-800 text-text-main"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nom</label>
                <input 
                  type="text" 
                  value={editLastName}
                  onChange={e => setEditLastName(e.target.value)}
                  className="w-full p-2 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-green bg-white dark:bg-stone-800 text-text-main"
                />
              </div>
            </div>
            <div className="p-6 bg-stone-50 dark:bg-stone-900/50 flex gap-3">
              <button 
                onClick={() => setEditModal(null)}
                className="flex-1 py-2 font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleEdit}
                className="flex-1 py-2 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green/90 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col border border-border-card">
            <div className="p-6 border-b border-border-card flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2 text-text-main">
                <History size={20} className="text-brand-green" /> Historique des rencontres
              </h3>
              <button onClick={() => setHistoryModal(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {encounters.length === 0 ? (
                <p className="text-center text-stone-500">Aucun historique disponible.</p>
              ) : (
                <div className="space-y-4">
                  {encounters.map((enc, idx) => (
                    <div key={idx} className="bg-stone-50 dark:bg-stone-900/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-stone-700 dark:text-stone-300">
                          <Calendar size={14} />
                          {new Date(enc.created_at).toLocaleString()}
                        </div>
                        {enc.team_name && (
                          <span className="text-xs font-medium bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-1 rounded-full">
                            {enc.team_name}
                          </span>
                        )}
                      </div>
                      {enc.comment && (
                        <p className="text-sm text-stone-600 dark:text-stone-400 mb-2 bg-white dark:bg-stone-800 p-3 rounded-lg border border-stone-100 dark:border-stone-700">
                          "{enc.comment}"
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {enc.direct_help === 1 && (
                          <span className="text-[10px] font-bold bg-brand-green/10 text-brand-green px-2 py-1 rounded-lg border border-brand-green/20">
                            Aide directe
                          </span>
                        )}
                        {enc.mobile_meal === 1 && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-lg border border-amber-200">
                            Repas mobile {enc.mobile_meal_type ? `(${enc.mobile_meal_type})` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-stone-400">
                        <MapPin size={12} />
                        {enc.lat != null && enc.lng != null ? `${enc.lat.toFixed(4)}, ${enc.lng.toFixed(4)}` : 'Position inconnue'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
