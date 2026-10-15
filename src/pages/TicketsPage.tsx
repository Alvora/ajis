import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

const TicketsPage = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const { user: currentUser, authFetch } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const ticketsRes = await authFetch('/api/tickets');
    const data = await ticketsRes.json();
    setTickets(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: string) => {
    const res = await authFetch(`/api/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!confirm("Supprimer ce ticket ?")) return;
    const res = await authFetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
    }
  };

  const canManageTickets = currentUser && (
    currentUser.rights?.['Gestion des tickets'] === 'RW' || 
    currentUser.rights?.['Gestion des tickets'] === 'RWD' ||
    currentUser.groups?.some(g => g.name === 'Administrateur') ||
    currentUser.roles?.includes('Président·e')
  );

  if (!canManageTickets) {
    return <div className="p-8 text-center">Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <MessageSquare className="text-brand-green" /> Tickets Support
          </h1>
          <p className="text-stone-500 text-sm">Gérez les demandes de support des utilisateurs.</p>
        </div>
      </header>

      <div className="bg-bg-card rounded-3xl border border-border-card shadow-sm overflow-hidden p-6">
        <div className="space-y-4">
          {loading ? (
            <p className="text-stone-500 text-center py-8">Chargement...</p>
          ) : tickets.length === 0 ? (
            <p className="text-stone-500 text-center py-8">Aucun ticket pour le moment.</p>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-stone-800">{ticket.subject}</h3>
                    <p className="text-xs text-stone-500">Par {ticket.user_name} le {new Date(ticket.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={ticket.status}
                      onChange={(e) => handleUpdateTicketStatus(ticket.id, e.target.value)}
                      className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full border outline-none",
                        ticket.status === 'open' ? "bg-amber-100 text-amber-700 border-amber-200" :
                        ticket.status === 'in_progress' ? "bg-blue-100 text-blue-700 border-blue-200" :
                        "bg-brand-green/10 text-brand-green border-brand-green/20"
                      )}
                    >
                      <option value="open">Ouvert</option>
                      <option value="in_progress">En cours</option>
                      <option value="closed">Fermé</option>
                    </select>
                    <button 
                      onClick={() => handleDeleteTicket(ticket.id)}
                      className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">{ticket.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;
