import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Heart, 
  ShieldCheck, 
  Users, 
  ArrowRight,
  Camera,
  User,
  Briefcase,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const HomePage = () => {
  const [gallery, setGallery] = useState<any[]>([]);
  const [bureauMembers, setBureauMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => setGallery(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch('/api/users')
      .then(res => res.json())
      .then(users => {
        if (!Array.isArray(users)) {
          setAllUsers([]);
          setBureauMembers([]);
          return;
        }
        const activeUsers = users.filter((u: any) => u.status !== 'pending');
        setAllUsers(activeUsers);
        
        // Filter users who belong to the "Bureau" group
        const members = activeUsers
          .filter((u: any) => u.groups?.some((g: any) => g.name === 'Bureau'))
          .map((u: any) => ({
            ...u,
            displayRole: u.title || 'Membre du Bureau',
            poles: u.groups?.filter((g: any) => g.name !== 'Bureau' && g.name !== 'Bénévole').map((g: any) => g.name) || []
          }));

        setBureauMembers(members);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center overflow-hidden bg-stone-900">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://picsum.photos/seed/charity/1920/1080?blur=2" 
            alt="Maraude" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/60 to-transparent z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="inline-block px-3 py-1 bg-brand-green/20 text-brand-green text-xs font-bold uppercase tracking-widest rounded-full mb-6 border border-brand-green/30">
              Solidarité & Bienveillance
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
              Plus qu'une aide, <br />
              <span className="text-brand-green">un lien humain.</span>
            </h1>
            <p className="text-xl text-stone-300 mb-10 leading-relaxed">
              Le Portail Maraudes va à la rencontre des plus démunis pour offrir repas, 
              soins de proximité et surtout, une oreille attentive.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/volunteer" 
                className="px-8 py-4 bg-brand-green hover:bg-brand-green/90 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm"
              >
                Nous rejoindre <ArrowRight size={20} />
              </Link>
              <Link to="/contact" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all backdrop-blur-sm border border-white/10">
                Nous contacter
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Presentation Section */}
      <section className="py-24 bg-bg-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-black mb-8 text-text-main tracking-tight">Qui sommes-nous ?</h2>
              <div className="space-y-6 text-lg text-text-main/80 leading-relaxed">
                <p>
                  Le Portail Maraudes est un projet solidaire engagé auprès des personnes en situation de précarité. 
                  À travers des maraudes, des distributions de repas et de produits essentiels, nous allons à la rencontre 
                  de celles et ceux qui en ont besoin pour offrir bien plus que de l’aide matérielle : 
                  de l’écoute, du soutien et du lien humain.
                </p>
                <p>
                  Dans un second volet, l’association développe progressivement un accompagnement sanitaire de proximité, 
                  avec des actions de “bobologie” et de prévention menées par des professionnels paramédicaux bénévoles.
                </p>
              </div>
            </motion.div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img src="https://picsum.photos/seed/food/400/600" alt="Distribution" className="rounded-3xl shadow-sm w-full h-64 object-cover" referrerPolicy="no-referrer" />
                <img src="https://picsum.photos/seed/team/400/400" alt="Equipe" className="rounded-3xl shadow-sm w-full h-48 object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="space-y-4 pt-8">
                <img src="https://picsum.photos/seed/care/400/400" alt="Soins" className="rounded-3xl shadow-sm w-full h-48 object-cover" referrerPolicy="no-referrer" />
                <img src="https://picsum.photos/seed/street/400/600" alt="Maraude" className="rounded-3xl shadow-sm w-full h-64 object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      {gallery.length > 0 && (
        <section className="py-24 bg-stone-900 text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="max-w-xl">
                <span className="text-brand-green text-xs font-black uppercase tracking-[0.3em] mb-4 block">Galerie d'actions</span>
                <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">La vitrine de <br /><span className="text-stone-500">nos actions terrain</span></h2>
                <p className="text-stone-400 text-lg">Quelques moments capturés lors de nos maraudes et événements, témoignant de la force du lien social.</p>
              </div>
              <div className="hidden md:block">
                <div className="w-24 h-24 rounded-full border border-stone-800 flex items-center justify-center text-stone-700">
                  <Camera size={40} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            {/* Gradient Masks for smooth edges */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-stone-900 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-stone-900 to-transparent z-10 pointer-events-none"></div>

            <div className="flex gap-8 overflow-x-auto pb-12 px-8 md:px-32 no-scrollbar snap-x">
              {gallery.map((img, idx) => (
                <motion.div 
                  key={img.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  className="flex-shrink-0 w-[300px] md:w-[450px] snap-center group"
                >
                  <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden mb-6 shadow-2xl">
                    <img 
                      src={img.url} 
                      alt={img.caption} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8">
                      <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <p className="text-white font-bold text-lg mb-1">{img.caption || 'Action terrain'}</p>
                        <p className="text-brand-green text-xs font-black uppercase tracking-widest">Portail Maraudes</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Values Section */}
      <section className="py-24 bg-bg-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-text-main">Nos piliers d'action</h2>
            <p className="text-text-main/80">Une approche holistique pour soutenir ceux qui en ont le plus besoin.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Maraudes Sociales",
                desc: "Distribution de repas chauds et produits de première nécessité au cœur de la ville.",
                icon: Heart,
                color: "bg-brand-red/10 text-brand-red"
              },
              {
                title: "Accompagnement Sanitaire",
                desc: "Actions de bobologie et prévention par des professionnels de santé bénévoles.",
                icon: ShieldCheck,
                color: "bg-brand-red/10 text-brand-red"
              },
              {
                title: "Lien Humain",
                desc: "Offrir un moment d'écoute et de dignité pour rompre l'isolement social.",
                icon: Users,
                color: "bg-brand-red/10 text-brand-red"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-bg-card p-10 rounded-[2.5rem] shadow-sm border border-border-card hover:shadow-md transition-all group"
              >
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform", feature.color)}>
                  <feature.icon size={32} />
                </div>
                <h3 className="text-xl font-black mb-4 tracking-tight text-stone-900 dark:text-white">{feature.title}</h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team / Bureau Section */}
      <section className="py-24 bg-bg-main border-t border-border-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-text-main">Notre Équipe</h2>
            <p className="text-text-main/80">Découvrez les membres du bureau et les responsables de pôles qui font vivre l'association au quotidien.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-24">
            {bureauMembers.map((member, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="bg-bg-card rounded-3xl p-6 border border-border-card shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4 overflow-hidden border-4 border-white dark:border-stone-900 shadow-sm group-hover:scale-105 transition-transform">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.username} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-stone-400" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-text-main mb-1">
                  {member.username ? member.username.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Poste vacant'}
                </h3>
                <p className="text-sm font-black text-brand-red uppercase tracking-widest mb-4">{member.displayRole}</p>
                
                <div className="flex flex-wrap justify-center gap-2 mt-auto pt-4 border-t border-border-card w-full">
                  {member.poles?.map((pole: string, pIdx: number) => (
                    <span key={pIdx} className="px-2 py-1 bg-brand-green/10 text-brand-green text-[10px] font-bold uppercase tracking-wider rounded-md">
                      {pole}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Poles Explanation Section */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-text-main">Nos Pôles d'Action</h2>
            <p className="text-text-main/80">L'association est structurée autour de plusieurs pôles stratégiques pour mener à bien nos missions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Pôle Aide Alimentaire",
                desc: "Cœur de notre action, ce pôle gère les stocks, organise les maraudes et assure la distribution de l'aide alimentaire aux bénéficiaires.",
                color: "brand-green"
              },
              {
                title: "Pôle Prévention Santé",
                desc: "Mise en place d'actions de prévention, suivi sanitaire et accompagnement santé de proximité pour les personnes en situation de précarité.",
                color: "rose-600"
              },
              {
                title: "Pôle Communication",
                desc: "Gestion de l'image de l'association, animation des réseaux sociaux, relations presse et communication interne pour faire rayonner nos actions.",
                color: "blue-600"
              },
              {
                title: "Pôle Innovation Sociales",
                desc: "Développement de nouveaux projets, recherche de partenariats innovants et amélioration continue de nos méthodes d'action sociale.",
                color: "purple-600"
              },
              {
                title: "Pôle Vie Associative",
                desc: "Animation de la communauté bénévole, organisation d'événements internes, intégration des nouveaux membres et maintien de la cohésion d'équipe.",
                color: "pink-600"
              },
              {
                title: "Pôle GRH Qualité",
                desc: "Gestion administrative des ressources humaines bénévoles, suivi des formations et garantie de la qualité de nos interventions sur le terrain.",
                color: "cyan-600"
              }
            ].map((pole, idx) => {
              // Find users who belong to this pole based on their groups
              const poleUsers = allUsers.filter(u => u.groups?.some((g: any) => g.name === pole.title));
              
              const referents = poleUsers.filter(u => u.groups?.some((g: any) => g.name === pole.title && g.is_referent)).map(u => u.username ? u.username.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : u.title).filter(Boolean);
              const reps = poleUsers.filter(u => !u.groups?.some((g: any) => g.name === pole.title && g.is_referent)).map(u => u.username ? u.username.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : u.title).filter(Boolean);
              
              return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-bg-card p-8 rounded-[2rem] border border-border-card shadow-sm flex flex-col"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-${pole.color}/10 text-${pole.color} flex items-center justify-center`}>
                    <Layers size={24} />
                  </div>
                  <h3 className={`text-xl font-black text-${pole.color}`}>{pole.title}</h3>
                </div>
                <p className="text-text-main/80 mb-6 flex-grow">{pole.desc}</p>
              </motion.div>
            )})}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-24 bg-brand-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tight">Prêt à sauter le pas ?</h2>
            <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto">
              Que vous ayez quelques heures par mois ou une envie de vous investir davantage, 
              votre aide est précieuse pour ceux qui n'ont rien.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link 
                to="/volunteer" 
                className="px-10 py-5 bg-white text-brand-green font-black rounded-2xl hover:bg-stone-100 transition-all shadow-xl flex items-center gap-2"
              >
                Devenir Bénévole <ArrowRight size={20} />
              </Link>
              <Link 
                to="/register" 
                className="px-10 py-5 bg-stone-900 text-white font-black rounded-2xl hover:bg-stone-800 transition-all shadow-xl flex items-center gap-2"
              >
                Créer un compte <User size={20} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
