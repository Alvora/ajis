import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Map as MapIcon, Users, Building, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';

const ShowcasePage = () => {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                <span className="text-brand-red">Bobos</span> <span className="text-blue-400">&</span> <span className="text-brand-green">Gamelles</span>
              </h1>
              <p className="text-xl text-stone-600 dark:text-stone-400 mb-10 leading-relaxed">
                Nourrir les ventres, et surtout le cœur. Bienvenue sur la vitrine de l'association Bobos et Gamelles. Découvrez nos actions et consultez la carte mutualisée des maraudes prévues sur notre territoire.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  to="/intranet" 
                  className="px-8 py-4 bg-brand-red text-white rounded-2xl font-bold text-lg hover:bg-brand-red/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  Intranet B&G <ArrowRight size={20} />
                </Link>
                <Link 
                  to="/mutualized" 
                  className="px-8 py-4 bg-brand-green text-white rounded-2xl font-bold text-lg hover:bg-brand-green/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <MapIcon size={20} /> Carte Mutualisée
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-green/5 rounded-full blur-3xl -z-10"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black tracking-tight mb-4">Notre mission</h2>
            <p className="text-stone-500 max-w-2xl mx-auto">
              Soutenir et accompagner les personnes en situation de précarité, en proposant bien au-delà qu'un simple repas, en retissant du lien social là où il s'est perdu.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
              <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center mb-6">
                <HeartHandshake size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Lien Social</h3>
              <p className="text-stone-600 dark:text-stone-400">
                Nos maraudes sont l'occasion d'échanger, de partager et de redonner de la dignité. Le repas est un prétexte à la rencontre et à la discussion.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
              <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center mb-6">
                <MapIcon size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Carte Mutualisée</h3>
              <p className="text-stone-600 dark:text-stone-400">
                Notre carte des maraudes répertorie les actions de toutes les associations partenaires pour éviter les passages en doublon et couvrir au mieux les besoins.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
              <div className="w-14 h-14 bg-brand-red/10 text-brand-red rounded-2xl flex items-center justify-center mb-6">
                <Building size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Espace Bénévoles</h3>
              <p className="text-stone-600 dark:text-stone-400">
                L'Intranet de Bobos & Gamelles permet à nos membres de centraliser la logistique : parcours, fiches bénéficiaires, recensements et gestion des stocks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ShieldCheck size={48} className="mx-auto text-brand-green mb-6" />
          <h2 className="text-3xl font-black mb-6">Découvrez notre association</h2>
          <p className="text-stone-600 dark:text-stone-400 mb-8 text-lg">
            Soutenez nos actions, rejoignez l'équipe des bénévoles ou apprenez-en plus sur notre mission quotidienne.
          </p>
          <a href="https://www.helloasso.com/associations/bobos-et-gamelles" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl font-bold text-lg hover:bg-stone-800 dark:hover:bg-stone-100 transition-all inline-flex items-center gap-2">
            Nous soutenir sur HelloAsso <ArrowRight size={20}/>
          </a>
        </div>
      </section>
    </div>
  );
};

export default ShowcasePage;
