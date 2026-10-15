import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserPlus, User as UserIcon, Mail, Lock, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [associationId, setAssociationId] = useState('');
  const [associations, setAssociations] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/intranet');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetch('/api/associations')
      .then(res => res.json())
      .then(data => setAssociations(data))
      .catch(err => console.error('Error fetching associations:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, associationId: parseInt(associationId) }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la demande');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-stone-50 dark:bg-stone-950">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-stone-900 p-8 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 w-full max-w-md text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white mb-4">Demande envoyée !</h1>
          <p className="text-stone-600 dark:text-stone-400 mb-8 leading-relaxed">
            Votre demande de création de compte a été transmise aux administrateurs. 
            Vous recevrez un accès dès qu'un administrateur aura validé votre profil et attribué vos rôles.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-brand-green/90 transition-all shadow-sm"
          >
            Retour à la connexion
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-stone-50 dark:bg-stone-950">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-stone-900 p-8 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-800 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-brand-green rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus size={32} />
          </div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white">Demande de Compte</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">
            Remplissez ce formulaire pour rejoindre l'intranet Bobos & Gamelles.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Association</label>
            <div className="relative">
              <select
                required
                value={associationId}
                onChange={(e) => setAssociationId(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-brand-green outline-none appearance-none transition-all text-stone-900 dark:text-white"
              >
                <option value="">Sélectionnez votre association</option>
                {associations.map((assoc) => (
                  <option key={assoc.id} value={assoc.id}>{assoc.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Nom d'utilisateur</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all text-stone-900 dark:text-white"
                placeholder="Ex: jdoe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Email professionnel</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all text-stone-900 dark:text-white"
                placeholder="j.doe@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Mot de passe souhaité</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all text-stone-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green text-white font-bold py-3 rounded-xl hover:bg-brand-green/90 transition-all shadow-sm disabled:opacity-50 mt-4"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full text-stone-500 dark:text-stone-400 text-sm hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            Annuler et retourner à la connexion
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
