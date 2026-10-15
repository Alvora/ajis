import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { User, UserRole, Role, Group } from '../types';
import { Users, Shield, UserCheck, Trash2, Plus, Key, XCircle, Settings, CheckSquare, Square, Briefcase, Layers, Info, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [roleGroups, setRoleGroups] = useState<any[]>([]);
  const [groupPageRights, setGroupPageRights] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'pending' | 'roles' | 'rights'>('users');
  const { user: currentUser, authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<number | null>(null);
  
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '' });
  const [newPassword, setNewPassword] = useState('');
  const [editDetails, setEditDetails] = useState({ username: '', email: '', roles: [] as UserRole[] });

  // Role Management State
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Group Management State
  const [newGroup, setNewGroup] = useState({ name: '', color: '#000000', description: '' });
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'user' | 'role' | 'group';
    id: number;
    name?: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // ... (fetchData remains same)

  // Role Handlers
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRole)
    });
    if (res.ok) {
      setNewRole({ name: '', description: '' });
      setShowRoleModal(false);
      fetchData();
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    const res = await authFetch(`/api/roles/${editingRole.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRole)
    });
    if (res.ok) {
      setEditingRole(null);
      fetchData();
    }
  };

  const handleDeleteRole = async (id: number) => {
    const res = await authFetch(`/api/roles/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteConfirmation(null);
      fetchData();
    }
  };

  // Group Handlers
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGroup)
    });
    if (res.ok) {
      setNewGroup({ name: '', color: '#000000', description: '' });
      setShowGroupModal(false);
      fetchData();
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    const res = await authFetch(`/api/groups/${editingGroup.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingGroup)
    });
    if (res.ok) {
      setEditingGroup(null);
      fetchData();
    }
  };

  const handleDeleteGroup = async (id: number) => {
    const res = await authFetch(`/api/groups/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteConfirmation(null);
      fetchData();
    }
  };


  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, groupsRes, roleGroupsRes, groupPageRightsRes, ticketsRes] = await Promise.all([
        authFetch('/api/users'),
        authFetch('/api/roles'),
        authFetch('/api/groups'),
        authFetch('/api/role-groups'),
        authFetch('/api/group-page-rights'),
        authFetch('/api/tickets')
      ]);
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      const groupsData = await groupsRes.json();
      const roleGroupsData = await roleGroupsRes.json();
      const groupPageRightsData = await groupPageRightsRes.json();
      const ticketsData = await ticketsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setRoleGroups(Array.isArray(roleGroupsData) ? roleGroupsData : []);
      setGroupPageRights(Array.isArray(groupPageRightsData) ? groupPageRightsData : []);
      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...newUser
    };
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setShowAddModal(false);
      setNewUser({ username: '', password: '', email: '' });
      fetchData();
    } else {
      const err = await res.json();
      alert(`Erreur : ${err.error}`);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditDetailsModal) return;
    
    // Update user details (username, email, and status if pending)
    const userRes = await authFetch(`/api/users/${showEditDetailsModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: editDetails.username, 
        email: editDetails.email,
        status: showEditDetailsModal.status === 'pending' ? 'active' : showEditDetailsModal.status
      })
    });

    if (!userRes.ok) {
      const err = await userRes.json();
      alert(`Erreur : ${err.error}`);
      return;
    }

    // Update roles
    const rolesRes = await authFetch(`/api/users/${showEditDetailsModal.id}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: editDetails.roles })
    });

    if (rolesRes.ok) {
      setShowEditDetailsModal(null);
      fetchData();
    } else {
      const err = await rolesRes.json();
      alert(`Erreur : ${err.error}`);
    }
  };

  const handleToggleRoleGroup = async (roleId: number, groupId: number, hasGroup: boolean) => {
    const method = hasGroup ? 'DELETE' : 'POST';
    const res = await authFetch('/api/role-groups', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId, group_id: groupId })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const handleChangeGroupRight = async (groupId: number, pageName: string, rightLevel: string) => {
    const res = await authFetch('/api/group-page-rights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, page_name: pageName, right_level: rightLevel })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal) return;
    const res = await authFetch(`/api/users/${showPasswordModal}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    if (res.ok) {
      setShowPasswordModal(null);
      setNewPassword('');
      alert("Mot de passe mis à jour.");
    } else {
      const err = await res.json();
      alert(`Erreur : ${err.error}`);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const res = await authFetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteConfirmation(null);
      fetchData();
    } else {
      const err = await res.json();
      alert(`Erreur : ${err.error}`);
    }
  };

  const handleUpdateUserStatus = async (userId: number, status: string) => {
    const res = await authFetch(`/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      fetchData();
    } else {
      const err = await res.json();
      alert(`Erreur : ${err.error}`);
    }
  };

  const toggleUserRole = async (userId: number, roleName: UserRole, currentRoles: UserRole[]) => {
    let newRoles: UserRole[];
    if (currentRoles.includes(roleName)) {
      newRoles = currentRoles.filter(r => r !== roleName);
    } else {
      newRoles = [...currentRoles, roleName];
    }

    const res = await authFetch(`/api/users/${userId}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: newRoles })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Erreur : ${err.error}`);
    }
    fetchData();
  };

  const canManageUsers = currentUser && (
    currentUser.groups?.some(g => g.name === 'Administrateur') ||
    currentUser.roles?.includes('Président·e')
  );

  if (!canManageUsers) {
    return <div className="p-8 text-center">Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <Shield className="text-brand-red" /> Gestion des Droits
          </h1>
          <p className="text-stone-500 text-sm">Gérez les accès, les rôles et les groupes de l'association.</p>
        </div>
        {activeTab === 'users' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-stone-800 transition-all shadow-sm"
          >
            <Plus size={20} /> Créer un utilisateur
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-stone-100 dark:bg-stone-900/50 p-1.5 rounded-2xl w-fit flex-wrap">
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === 'users' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          Utilisateurs
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
            activeTab === 'pending' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          En attente
          {users.filter(u => u.status === 'pending').length > 0 && (
            <span className="bg-brand-red text-white text-[10px] px-2 py-0.5 rounded-full">
              {users.filter(u => u.status === 'pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === 'roles' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          Fonctions
        </button>
        <button 
          onClick={() => setActiveTab('rights')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === 'rights' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          Droits et Groupes
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-bg-card rounded-3xl border border-border-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Utilisateur</th>
                  <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Fonctions</th>
                  <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Groupes (Automatique)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {users.filter(u => u.status !== 'pending').map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 overflow-hidden border border-stone-200">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={20} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-text-main">{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {roles.map(role => {
                          const isAssigned = u.roles.includes(role.name);
                          if (!isAssigned) return null;

                          return (
                            <div
                              key={role.id}
                              className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 bg-stone-900 border-stone-900 text-white"
                            >
                              <Shield size={10} />
                              {role.name}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {u.groups && u.groups.length > 0 ? (
                          u.groups.map(g => (
                            <span 
                              key={g.id} 
                              className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter text-white flex items-center gap-1 opacity-80"
                              style={{ backgroundColor: g.color }}
                            >
                              {g.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-stone-300 font-bold uppercase">Aucun groupe</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setShowEditDetailsModal(u);
                            setEditDetails({ 
                              username: u.username,
                              email: u.email || '',
                              roles: u.roles || []
                            });
                          }}
                          className="p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                          title="Modifier le statut et les fonctions"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => setShowPasswordModal(u.id)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                          title="Changer le mot de passe"
                        >
                          <Key size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmation({ type: 'user', id: u.id, name: u.username })}
                          disabled={u.id === currentUser.id}
                          className={cn(
                            "p-2 rounded-xl transition-colors",
                            u.id === currentUser.id ? "bg-stone-50 text-stone-300 cursor-not-allowed" : "bg-red-50 text-red-600 hover:bg-red-100"
                          )}
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'pending' ? (
        <div className="bg-bg-card rounded-3xl border border-border-card shadow-sm overflow-hidden p-6">
          <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
            <UserCheck className="text-brand-red" /> Inscriptions en attente
          </h2>
          {users.filter(u => u.status === 'pending').length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <p>Aucune inscription en attente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.filter(u => u.status === 'pending').map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center text-stone-500">
                      <UserIcon size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-lg">{u.username}</p>
                      <p className="text-sm text-stone-500">{u.email || 'Aucun email fourni'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setShowEditDetailsModal(u);
                        setEditDetails({ 
                          username: u.username,
                          email: u.email || '',
                          roles: u.roles || []
                        });
                      }}
                      className="px-4 py-2 bg-brand-green text-white rounded-xl font-bold text-sm hover:bg-brand-green/90 transition-colors shadow-sm"
                    >
                      Configurer & Approuver
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmation({ type: 'user', id: u.id, name: u.username })}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'roles' ? (
        <div className="space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Shield className="text-brand-red" /> Fonctions
              </h2>
              <button 
                onClick={() => setShowRoleModal(true)}
                className="bg-stone-900 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-stone-800 transition-all shadow-sm"
              >
                <Plus size={16} /> Ajouter une fonction
              </button>
            </div>
            <div className="bg-bg-card rounded-3xl border border-border-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Fonction</th>
                      <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Groupes Associés</th>
                      <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {roles.map(role => (
                      <tr key={role.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-text-main">
                          <div className="flex items-center gap-2">
                            <Shield size={16} className="text-brand-red" />
                            {role.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {groups.map(group => {
                              const hasGroup = roleGroups.some(rg => rg.roleId === role.id && rg.groupId === group.id);
                              return (
                                  <button
                                    key={group.id}
                                    onClick={() => handleToggleRoleGroup(role.id, group.id, hasGroup)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border shadow-sm",
                                      hasGroup 
                                        ? "text-white border-transparent" 
                                        : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400 hover:border-stone-300 hover:text-stone-600 dark:hover:text-stone-300"
                                    )}
                                    style={hasGroup ? { backgroundColor: group.color } : {}}
                                  >
                                    {hasGroup ? <CheckSquare size={12} /> : <Square size={12} />}
                                    {group.name}
                                  </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingRole(role);
                                setShowRoleModal(true);
                              }}
                              className="p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmation({ type: 'role', id: role.id, name: role.name })}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : activeTab === 'rights' ? (
        <div className="space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Layers className="text-blue-600" /> Droits et Groupes
              </h2>
              <button 
                onClick={() => setShowGroupModal(true)}
                className="bg-stone-900 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-stone-800 transition-all shadow-sm"
              >
                <Plus size={16} /> Ajouter un groupe
              </button>
            </div>
            <div className="bg-bg-card rounded-3xl border border-border-card shadow-sm overflow-hidden p-6">
              <p className="text-sm text-stone-500 mb-6">
                Définissez les droits d'accès pour chaque groupe sur les différentes pages de l'application.
                Les niveaux de droits sont : <strong className="text-stone-900">-</strong> (Aucun accès), <strong className="text-stone-900">R</strong> (Lecture seule), <strong className="text-stone-900">RW</strong> (Lecture/Écriture), <strong className="text-stone-900">RWD</strong> (Lecture/Écriture/Suppression).
              </p>
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 space-y-2">
                <p className="font-bold flex items-center gap-2"><Info size={14} /> Règles spécifiques Maraudes :</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li><strong>La maraude :</strong> R (Voir/Dérouler), RW (Créer/Modifier/Paramétrer/Équipes/Clôturer), RWD (Tout + Supprimer)</li>
                  <li><strong>Les équipes :</strong> R (Voir/S'inscrire membre), RW (Voir/S'inscrire chef/Clôturer équipe), RWD (Tout + Supprimer)</li>
                </ul>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-center min-w-[120px]">Groupe</th>
                      {['Tableau de bord', 'Gestion des stocks', 'Documents', 'Annonces', 'La maraude', 'Les équipes', 'Gestion des tickets'].map(page => (
                        <th key={page} className="p-4 border-b border-stone-200 dark:border-stone-800 text-[10px] font-black text-stone-400 uppercase tracking-widest text-center min-w-[120px]">
                          {page}
                        </th>
                      ))}
                      <th className="p-4 border-b border-stone-200 dark:border-stone-800 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {groups.map(group => (
                      <tr key={group.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
                        <td className="p-4 font-bold text-sm text-text-main">
                          <div className="flex items-center gap-2 p-2 rounded-xl border border-transparent transition-all" style={{ backgroundColor: group.color + '15', borderColor: group.color + '30' }}>
                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: group.color }}></div>
                            <span style={{ color: group.color }}>{group.name}</span>
                          </div>
                        </td>
                        {['Tableau de bord', 'Gestion des stocks', 'Documents', 'Annonces', 'La maraude', 'Les équipes', 'Gestion des tickets'].map(page => {
                          const right = groupPageRights.find(r => r.groupId === group.id && r.pageName === page)?.rightLevel || '-';
                          return (
                            <td key={page} className="p-4 text-center">
                               <select
                                value={right}
                                onChange={(e) => handleChangeGroupRight(group.id, page, e.target.value)}
                                className={cn(
                                  "text-[10px] font-black rounded-lg px-2.5 py-1.5 border-none outline-none cursor-pointer text-center appearance-none transition-all shadow-sm",
                                  right === '-' ? "bg-stone-100 dark:bg-stone-800 text-stone-400" :
                                  right === 'R' ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                                  right === 'RW' ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                  "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                )}
                              >
                                <option value="-" className="bg-white dark:bg-stone-900">-</option>
                                <option value="R" className="bg-white dark:bg-stone-900">R</option>
                                <option value="RW" className="bg-white dark:bg-stone-900">RW</option>
                                <option value="RWD" className="bg-white dark:bg-stone-900">RWD</option>
                              </select>
                            </td>
                          );
                        })}
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingGroup(group);
                                setShowGroupModal(true);
                              }}
                              className="p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmation({ type: 'group', id: group.id, name: group.name })}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-border-card">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black tracking-tight text-text-main">Nouvel Utilisateur</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <XCircle className="text-stone-400" size={24} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Nom d'utilisateur</label>
                  <input 
                    required 
                    type="text" 
                    value={newUser.username} 
                    onChange={e => setNewUser({...newUser, username: e.target.value})} 
                    className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Mot de passe</label>
                  <input 
                    required 
                    type="password" 
                    value={newUser.password} 
                    onChange={e => setNewUser({...newUser, password: e.target.value})} 
                    className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                <input 
                  type="email" 
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})} 
                  className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                  placeholder="Ex: benevole@example.com"
                />
              </div>
              
              <div className="p-4 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  En créant ce compte, vous confirmez que l'utilisateur a été informé de la collecte de ses données (nom, email, photo) pour les besoins de l'association, conformément au RGPD.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-bold text-stone-400">Annuler</button>
                <button type="submit" className="flex-[2] bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {showEditDetailsModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-border-card">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black tracking-tight text-text-main">Statut, Pôles & Fonctions</h2>
              <button onClick={() => setShowEditDetailsModal(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <XCircle className="text-stone-400" size={24} />
              </button>
            </div>
            <p className="text-sm text-stone-500 mb-8">Modifier le profil et les fonctions pour <strong>{showEditDetailsModal.username}</strong>.</p>
            
            <form onSubmit={handleUpdateDetails} className="space-y-8">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Nom d'utilisateur</label>
                  <input 
                    required 
                    type="text" 
                    value={editDetails.username} 
                    onChange={e => setEditDetails({...editDetails, username: e.target.value})} 
                    className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                  <input 
                    type="email" 
                    value={editDetails.email} 
                    onChange={e => setEditDetails({...editDetails, email: e.target.value})} 
                    className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-3 ml-1">Fonctions (Rôles)</label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        const current = editDetails.roles;
                        if (current.includes(role.name as UserRole)) {
                          setEditDetails({...editDetails, roles: current.filter(r => r !== role.name)});
                        } else {
                          setEditDetails({...editDetails, roles: [...current, role.name as UserRole]});
                        }
                      }}
                      className={cn(
                        "px-4 py-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between",
                        editDetails.roles.includes(role.name as UserRole)
                          ? "bg-stone-900 border-stone-900 text-white" 
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                      )}
                    >
                      <span>{role.description || role.name}</span>
                      {editDetails.roles.includes(role.name as UserRole) && <CheckSquare size={16} />}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowEditDetailsModal(null)} className="flex-1 py-4 font-bold text-stone-400">Annuler</button>
                <button type="submit" className="flex-[2] bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-border-card">
            <h2 className="text-3xl font-black mb-8 tracking-tight text-text-main">Nouveau mot de passe</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Mot de passe</label>
                <input 
                  required 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowPasswordModal(null)} className="flex-1 py-4 font-bold text-stone-400">Annuler</button>
                <button type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm">Mettre à jour</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Role Modal */}
      {(showRoleModal || editingRole) && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-border-card">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black tracking-tight text-text-main">{editingRole ? 'Modifier la fonction' : 'Nouvelle fonction'}</h2>
              <button onClick={() => { setShowRoleModal(false); setEditingRole(null); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <XCircle className="text-stone-400" size={24} />
              </button>
            </div>
            <form onSubmit={editingRole ? handleUpdateRole : handleAddRole} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Nom de la fonction</label>
                <input 
                  required 
                  type="text" 
                  value={editingRole ? editingRole.name : newRole.name} 
                  onChange={e => editingRole ? setEditingRole({...editingRole, name: e.target.value as UserRole}) : setNewRole({...newRole, name: e.target.value})} 
                  className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                <input 
                  type="text" 
                  value={editingRole ? editingRole.description : newRole.description} 
                  onChange={e => editingRole ? setEditingRole({...editingRole, description: e.target.value}) : setNewRole({...newRole, description: e.target.value})} 
                  className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowRoleModal(false); setEditingRole(null); }} className="flex-1 py-4 font-bold text-stone-400">Annuler</button>
                <button type="submit" className="flex-[2] bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm">{editingRole ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {(showGroupModal || editingGroup) && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-border-card">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black tracking-tight text-text-main">{editingGroup ? 'Modifier le groupe' : 'Nouveau groupe'}</h2>
              <button onClick={() => { setShowGroupModal(false); setEditingGroup(null); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <XCircle className="text-stone-400" size={24} />
              </button>
            </div>
            <form onSubmit={editingGroup ? handleUpdateGroup : handleAddGroup} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Nom du groupe</label>
                <input 
                  required 
                  type="text" 
                  value={editingGroup ? editingGroup.name : newGroup.name} 
                  onChange={e => editingGroup ? setEditingGroup({...editingGroup, name: e.target.value}) : setNewGroup({...newGroup, name: e.target.value})} 
                  className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Couleur</label>
                <input 
                  type="color" 
                  value={editingGroup ? editingGroup.color : newGroup.color} 
                  onChange={e => editingGroup ? setEditingGroup({...editingGroup, color: e.target.value}) : setNewGroup({...newGroup, color: e.target.value})} 
                  className="w-full h-14 bg-stone-50 dark:bg-stone-900 rounded-2xl px-2 py-2 outline-none focus:ring-2 focus:ring-brand-green transition-all cursor-pointer" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                <input 
                  type="text" 
                  value={editingGroup ? editingGroup.description || '' : newGroup.description} 
                  onChange={e => editingGroup ? setEditingGroup({...editingGroup, description: e.target.value}) : setNewGroup({...newGroup, description: e.target.value})} 
                  className="w-full bg-stone-50 dark:bg-stone-900 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-stone-900 dark:text-stone-100" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowGroupModal(false); setEditingGroup(null); }} className="flex-1 py-4 font-bold text-stone-400">Annuler</button>
                <button type="submit" className="flex-[2] bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm">{editingGroup ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-border-card">
            <h2 className="text-2xl font-black mb-4 tracking-tight text-text-main">Confirmer la suppression</h2>
            <p className="text-stone-500 mb-8">
              Êtes-vous sûr de vouloir supprimer {deleteConfirmation.type === 'user' ? "l'utilisateur" : deleteConfirmation.type === 'role' ? "la fonction" : "le groupe"} <strong>{deleteConfirmation.name}</strong> ?
              <br/>Cette action est irréversible.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmation(null)} 
                className="flex-1 py-4 font-bold text-stone-400 hover:bg-stone-50 rounded-2xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirmation.type === 'user') handleDeleteUser(deleteConfirmation.id);
                  if (deleteConfirmation.type === 'role') handleDeleteRole(deleteConfirmation.id);
                  if (deleteConfirmation.type === 'group') handleDeleteGroup(deleteConfirmation.id);
                }} 
                className="flex-[2] bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
