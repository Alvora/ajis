import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Camera, Link as LinkIcon, Shield, Key, Edit2, Save, X, AlertCircle, CheckCircle, Briefcase, Users, Eye, EyeOff } from 'lucide-react';

const ProfilePage = () => {
  const { user, login, authFetch } = useAuth();
  const [isLinking, setIsLinking] = useState(false);
  
  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState(user?.avatar_url || '');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Feedback states
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-stone-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: 'Faible', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Moyen', color: 'bg-amber-500' };
    return { score, label: 'Fort', color: 'bg-brand-green' };
  };

  if (!user) return null;

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 1MB for DB storage)
    if (file.size > 1024 * 1024) {
      setMessage({ type: 'error', text: 'L\'image est trop lourde (max 1Mo).' });
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setIsProcessing(true);
    reader.onload = async () => {
      const base64 = reader.result as string;
      setNewAvatarUrl(base64);
      setMessage({ type: 'success', text: 'Image chargée. N\'oubliez pas d\'enregistrer pour confirmer.' });
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Erreur lors de la lecture du fichier.' });
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async () => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await authFetch(`/api/users/${user.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, avatar_url: newAvatarUrl })
      });
      
      if (res.ok) {
        login({ ...user, email: newEmail, avatar_url: newAvatarUrl });
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
        setIsEditingEmail(false);
        setIsEditingAvatar(false);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la mise à jour.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername === user.username) {
      setIsEditingName(false);
      return;
    }
    
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await authFetch(`/api/users/${user.id}/username`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername })
      });
      
      const data = await res.json();
      if (res.ok) {
        login({ ...user, username: newUsername });
        setMessage({ type: 'success', text: 'Nom d\'utilisateur mis à jour avec succès.' });
        setIsEditingName(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la mise à jour.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Veuillez entrer une adresse email valide.' });
      return;
    }
    handleUpdateProfile();
  };

  const handleUpdateAvatar = async () => {
    if (!newAvatarUrl.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer une URL valide.' });
      return;
    }
    handleUpdateProfile();
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer votre ancien mot de passe.' });
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await authFetch(`/api/users/${user.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword, oldPassword })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
        setIsEditingPassword(false);
        setNewPassword('');
        setOldPassword('');
        setShowOldPassword(false);
        setShowNewPassword(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la mise à jour.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-stone-900 dark:text-white tracking-tight">Mon Profil</h1>

      <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="h-32 bg-brand-green/20 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-stone-900 overflow-hidden bg-stone-100 flex items-center justify-center">
                {newAvatarUrl ? (
                  <img 
                    src={newAvatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-stone-400" />
                )}
              </div>
              <button 
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                className="absolute bottom-0 right-0 p-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors shadow-sm"
              >
                <Camera size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8">
          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          {isEditingAvatar && (
            <div className="mb-8 p-4 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-200 dark:border-stone-800 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Importer une photo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-brand-green/10 file:text-brand-green hover:file:bg-brand-green/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Ou URL de l'image</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newAvatarUrl} 
                      onChange={e => setNewAvatarUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-green"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setIsEditingAvatar(false)} className="px-4 py-2 text-stone-500 text-sm font-bold">Annuler</button>
                <button onClick={handleUpdateAvatar} disabled={isProcessing} className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-bold hover:bg-brand-green/90 transition-colors disabled:opacity-50">
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="text" 
                    value={newUsername} 
                    onChange={e => setNewUsername(e.target.value)}
                    className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-green"
                    autoFocus
                  />
                  <button onClick={handleUpdateUsername} disabled={isProcessing} className="p-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50">
                    <Save size={16} />
                  </button>
                  <button onClick={() => { setIsEditingName(false); setNewUsername(user.username); }} className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white">{user.username}</h2>
                  <button onClick={() => setIsEditingName(true)} className="p-1.5 text-stone-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              
              <div className="flex flex-col gap-1 mt-1">
                {user.title && (
                  <p className="text-brand-green dark:text-brand-green text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={14} /> {user.title}
                  </p>
                )}
                
                {isEditingEmail ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="email" 
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value)}
                      className="px-3 py-1.5 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-green"
                      autoFocus
                    />
                    <button onClick={handleUpdateEmail} disabled={isProcessing} className="p-1.5 bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50">
                      <Save size={14} />
                    </button>
                    <button onClick={() => { setIsEditingEmail(false); }} className="p-1.5 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <p className="text-stone-500 flex items-center gap-2 text-sm">
                      <Mail size={14} /> {newEmail}
                    </p>
                    <button onClick={() => setIsEditingEmail(true)} className="p-1 text-stone-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Shield size={12} /> {user.title || roleLabels[user.role]}
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                {user.groups?.map(g => (
                  <span 
                    key={g.id} 
                    className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter text-white"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-t border-stone-100 dark:border-stone-800 pt-6">
              <h3 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-widest mb-4">Sécurité</h3>
              
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-lg flex items-center justify-center">
                      <Key size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-white text-sm">Mot de passe</p>
                      <p className="text-xs text-stone-500">Mettez à jour votre mot de passe pour sécuriser votre compte.</p>
                    </div>
                  </div>
                  {!isEditingPassword && (
                    <button onClick={() => setIsEditingPassword(true)} className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-bold hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                      Modifier
                    </button>
                  )}
                </div>
                
                {isEditingPassword && (
                  <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700 flex flex-col gap-3">
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <input 
                          type={showOldPassword ? "text" : "password"} 
                          placeholder="Ancien mot de passe"
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-green"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                        >
                          {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          placeholder="Nouveau mot de passe"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-green"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      
                      {newPassword && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${getPasswordStrength(newPassword).color}`}
                              style={{ width: `${(getPasswordStrength(newPassword).score / 3) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-stone-500 uppercase w-12 text-right">
                            {getPasswordStrength(newPassword).label}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={handleUpdatePassword} disabled={isProcessing} className="flex-1 py-2 bg-brand-green text-white rounded-lg text-sm font-bold hover:bg-brand-green/90 transition-colors disabled:opacity-50">
                        Enregistrer
                      </button>
                      <button onClick={() => { setIsEditingPassword(false); setNewPassword(''); setOldPassword(''); setShowOldPassword(false); setShowNewPassword(false); }} className="flex-1 py-2 bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg text-sm font-bold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
