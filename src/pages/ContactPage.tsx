import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Mail, 
  MapPin, 
  ExternalLink, 
  Globe,
  MessageSquare,
  Send,
  Instagram,
  Linkedin,
  Heart,
  Facebook,
  Link as LinkIcon
} from 'lucide-react';

const TikTokIcon = ({ size = 20, ...props }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);

const ContactPage = () => {
  const socialLinks = [
    { name: 'Instagram', url: 'https://www.instagram.com/bobosetgamelles/', icon: Instagram, color: 'hover:text-pink-500' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@bobosetgamelles', icon: TikTokIcon, color: 'hover:text-gray-800 dark:hover:text-gray-300' },
    { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61583436930051', icon: Facebook, color: 'hover:text-blue-600' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/company/bobos-et-gamelles', icon: Linkedin, color: 'hover:text-blue-500' },
    { name: 'Linktree', url: 'https://linktr.ee/bobosetgamelles', icon: LinkIcon, color: 'hover:text-green-500' },
    { name: 'HelloAsso', url: 'https://www.helloasso.com/associations/bobos-et-gamelles', icon: Heart, color: 'hover:text-brand-green' },
  ];

  return (
    <div className="min-h-screen bg-bg-main pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-black text-text-main mb-4 tracking-tight">Contact & Informations Légales</h1>
          <p className="text-text-main/80 max-w-2xl mx-auto">
            Vous souhaitez nous rejoindre, faire un don ou simplement en savoir plus sur nos actions ? 
            Retrouvez ici toutes les informations pour nous contacter et nos mentions légales.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Sidebar Info (Moved to top/left) */}
          <div className="lg:col-span-1">
            <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-sm">
              <h3 className="text-xl font-black mb-8 tracking-tight">Coordonnées</h3>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Email</p>
                    <p className="font-bold text-lg">bobosetgamelles@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Localisation</p>
                    <p className="font-bold text-lg">Toulouse, France</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Réseaux Sociaux</p>
                    <div className="flex gap-3 mt-3">
                      {socialLinks.map(link => (
                        <a 
                          key={link.name} 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(
                            "w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-all hover:-translate-y-1 hover:bg-white/20",
                            link.color
                          )}
                          title={link.name}
                        >
                          <link.icon size={20} />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-bg-card rounded-[2.5rem] shadow-sm border border-border-card p-8 md:p-12">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3 tracking-tight text-text-main">
                <MessageSquare className="text-brand-red" /> Envoyez-nous un message
              </h2>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Nom complet</label>
                    <input 
                      type="text" 
                      placeholder="Jean Dupont"
                      className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-brand-green transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      type="email" 
                      placeholder="jean@exemple.com"
                      className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-brand-green transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Sujet</label>
                  <select className="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-brand-green transition-all appearance-none bg-white dark:bg-stone-900 dark:text-white">
                    <option>Devenir bénévole</option>
                    <option>Faire un don / Partenariat</option>
                    <option>Question générale</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Message</label>
                  <textarea 
                    rows={6}
                    placeholder="Comment pouvons-nous vous aider ?"
                    className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-brand-green transition-all resize-none"
                  ></textarea>
                </div>
                <div className="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800">
                  <input 
                    required 
                    type="checkbox" 
                    id="gdpr" 
                    className="mt-1 w-4 h-4 rounded border-stone-300 text-brand-green focus:ring-brand-green"
                  />
                  <label htmlFor="gdpr" className="text-xs text-stone-500 leading-relaxed">
                    J'accepte que mes données (nom, email) soient collectées pour traiter ma demande. 
                    Consultez nos <a href="/legal" className="text-brand-green font-bold hover:underline">mentions légales</a> pour en savoir plus.
                  </label>
                </div>
                <button className="w-full md:w-auto px-10 py-4 bg-brand-green hover:bg-brand-green/90 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm">
                  Envoyer le message <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
