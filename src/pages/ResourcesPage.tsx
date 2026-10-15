import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Resource, Announcement, GalleryImage } from '../types';
import { FolderOpen, Image as ImageIcon, MessageSquare, Plus, Trash2, ExternalLink, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import ReportsPage from './ReportsPage';

const ResourcesPage = () => {
  const { user, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<'resources' | 'gallery' | 'announcements' | 'reports'>('resources');
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [newResource, setNewResource] = useState({ title: '', url: '', category: 'Lien' });
  const [newImage, setNewImage] = useState({ url: '', caption: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  const canEdit = user && (
    user.rights?.['Documents'] === 'RW' || 
    user.rights?.['Documents'] === 'RWD' ||
    user.groups?.some(g => g.name === 'Administrateur') ||
    user.roles?.includes('Président·e')
  );

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 1MB for DB storage)
    if (file.size > 1024 * 1024) {
      alert('L\'image est trop lourde (max 1Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setIsUploading(true);
    reader.onload = async () => {
      const base64 = reader.result as string;
      setNewImage(prev => ({ ...prev, url: base64 }));
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Erreur lors de la lecture du fichier.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const fetchData = async () => {
    if (activeTab === 'resources') {
      const res = await authFetch('/api/resources');
      const data = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } else if (activeTab === 'gallery') {
      const res = await authFetch('/api/gallery');
      const data = await res.json();
      setGallery(Array.isArray(data) ? data : []);
    } else {
      const res = await authFetch('/api/announcements');
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    await authFetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newResource)
    });
    setNewResource({ title: '', url: '', category: 'Lien' });
    fetchData();
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    await authFetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newImage)
    });
    setNewImage({ url: '', caption: '' });
    fetchData();
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await authFetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newAnnouncement, author_name: user?.username })
    });
    setNewAnnouncement({ title: '', content: '' });
    fetchData();
  };

  const handleDelete = async (type: string, id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    await authFetch(`/api/${type}/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
          <FolderOpen className="text-brand-red" /> Ressources & Communication
        </h1>
        <p className="text-stone-500 text-sm mt-2">Gérez les documents partagés, la galerie publique et les annonces internes.</p>
      </header>

      <div className="flex gap-2 mb-8 bg-stone-100 p-1.5 rounded-2xl w-fit overflow-x-auto">
        <button 
          onClick={() => setActiveTab('resources')}
          className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap", activeTab === 'resources' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700")}
        >
          <div className="flex items-center gap-2"><FolderOpen size={16} /> Documents & Liens</div>
        </button>
        <button 
          onClick={() => setActiveTab('gallery')}
          className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap", activeTab === 'gallery' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700")}
        >
          <div className="flex items-center gap-2"><ImageIcon size={16} /> Galerie Publique</div>
        </button>
        <button 
          onClick={() => setActiveTab('announcements')}
          className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap", activeTab === 'announcements' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700")}
        >
          <div className="flex items-center gap-2"><MessageSquare size={16} /> Annonces Internes</div>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap", activeTab === 'reports' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700")}
        >
          <div className="flex items-center gap-2"><FileText size={16} /> Comptes-rendus</div>
        </button>
      </div>

      {activeTab === 'resources' && (
        <div className="space-y-8">
          {canEdit && (
            <div className="bg-bg-card p-6 rounded-3xl border border-border-card shadow-sm space-y-6">
              <form onSubmit={handleAddResource} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Ajouter un lien externe</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand-green text-stone-900 dark:text-white" placeholder="Titre (ex: Drive Association)" />
                    <input required type="url" value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand-green text-stone-900 dark:text-white" placeholder="https://..." />
                  </div>
                </div>
                <button type="submit" className="bg-brand-green text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm whitespace-nowrap">
                  Ajouter le lien
                </button>
              </form>

              <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-4 ml-1">Ou importer un document (PDF, Doc, etc.)</label>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <input 
                    type="file" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        alert('Le fichier est trop lourd (max 2Mo).');
                        return;
                      }
                      const reader = new FileReader();
                      setIsUploading(true);
                      reader.onload = async () => {
                        const base64 = reader.result as string;
                        // Automatically create a resource with this base64
                        await authFetch('/api/resources', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            title: file.name, 
                            url: base64, 
                            category: 'Document' 
                          })
                        });
                        setIsUploading(false);
                        fetchData();
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="flex-1 text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-brand-red/10 file:text-brand-red hover:file:bg-brand-red/20"
                  />
                  {isUploading && <span className="text-xs font-bold text-brand-red animate-pulse">Téléchargement en cours...</span>}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map(r => (
              <div key={r.id} className="bg-bg-card p-6 rounded-3xl border border-border-card shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <FolderOpen size={20} />
                    </div>
                    {canEdit && (
                      <button onClick={() => handleDelete('resources', r.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <h3 className="font-bold text-text-main mb-1">{r.title}</h3>
                  <p className="text-xs text-stone-400 mb-4">Ajouté le {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-stone-50 text-stone-600 rounded-xl font-bold hover:bg-stone-100 transition-colors">
                  Ouvrir le lien <ExternalLink size={16} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="space-y-8">
          {canEdit && (
            <form onSubmit={handleAddImage} className="bg-bg-card p-6 rounded-3xl border border-border-card shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Importer une photo</label>
                <div className="flex gap-4 items-center">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="flex-1 text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-brand-green/10 file:text-brand-green hover:file:bg-brand-green/20"
                  />
                  {newImage.url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-stone-200">
                      <img src={newImage.url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Légende (optionnel)</label>
                <input type="text" value={newImage.caption} onChange={e => setNewImage({...newImage, caption: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand-green text-stone-900 dark:text-white" placeholder="Ex: Maraude d'hiver..." />
              </div>
              <button 
                type="submit" 
                disabled={isUploading || !newImage.url}
                className="bg-brand-green text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm whitespace-nowrap disabled:opacity-50"
              >
                {isUploading ? 'Téléchargement...' : 'Ajouter à la galerie'}
              </button>
            </form>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map(img => (
              <div key={img.id} className="relative group rounded-3xl overflow-hidden aspect-square bg-stone-100 border border-stone-200">
                <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-white text-sm font-medium truncate">{img.caption}</p>
                </div>
                {canEdit && (
                  <button onClick={() => handleDelete('gallery', img.id)} className="absolute top-3 right-3 p-2 bg-white/90 text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-8">
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex gap-4 items-start">
            <AlertCircle className="text-blue-500 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">À propos de l'intégration WhatsApp</h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                Il n'est techniquement pas possible d'afficher directement les messages d'un groupe WhatsApp sur le site sans utiliser des solutions complexes et fragiles (limitations de Meta). 
                <br/><br/>
                <strong>Solution :</strong> Utilisez cet espace d'annonces interne pour les communications importantes qui doivent rester accessibles à tous les membres sur le site.
              </p>
            </div>
          </div>

          {canEdit && (
            <form onSubmit={handleAddAnnouncement} className="bg-bg-card p-6 rounded-3xl border border-border-card shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Titre de l'annonce</label>
                <input required type="text" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand-green text-stone-900 dark:text-white" placeholder="Ex: Réunion générale ce vendredi" />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Contenu</label>
                <textarea required value={newAnnouncement.content} onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})} className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand-green min-h-[100px] text-stone-900 dark:text-white" placeholder="Détails de l'annonce..." />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-brand-green text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm">
                  Publier l'annonce
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {announcements.map(a => (
              <div key={a.id} className="bg-bg-card p-6 rounded-3xl border border-border-card shadow-sm relative group">
                {canEdit && (
                  <button onClick={() => handleDelete('announcements', a.id)} className="absolute top-6 right-6 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={18} />
                  </button>
                )}
                <h3 className="text-xl font-bold text-text-main mb-2">{a.title}</h3>
                <p className="text-stone-600 whitespace-pre-wrap mb-4">{a.content}</p>
                <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-wider">
                  <span>Par {a.author_name}</span>
                  <span>•</span>
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="mt-[-2rem]">
          <ReportsPage />
        </div>
      )}
    </div>
  );
};

export default ResourcesPage;
