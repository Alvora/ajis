import React from 'react';
import { motion } from 'motion/react';
import { Users, CheckCircle, Calendar, MessageSquare } from 'lucide-react';

const VolunteerPage = () => {
  return (
    <div className="py-20 bg-bg-main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-6 text-text-main"
          >
            Rejoignez l'aventure humaine
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-text-main/80 leading-relaxed"
          >
            Notre action repose sur des bénévoles engagés, animés par des valeurs de solidarité, 
            de bienveillance et de respect. Rejoindre ce projet, c’est s’engager concrètement, 
            à son rythme, et participer à une aventure humaine collective.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <div className="bg-bg-card p-8 rounded-3xl shadow-sm border border-border-card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-text-main">
              <Users className="text-brand-red" /> Pourquoi nous rejoindre ?
            </h2>
            <ul className="space-y-4">
              {[
                "Agir concrètement pour les personnes en situation de précarité.",
                "Intégrer une équipe soudée et bienveillante.",
                "Apporter vos compétences (santé, logistique, écoute).",
                "S'engager à son rythme, selon ses disponibilités.",
                "Participer à une réelle différence au quotidien."
              ].map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <CheckCircle className="text-brand-red mt-1 flex-shrink-0" size={20} />
                  <span className="text-text-main">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-brand-green p-8 rounded-3xl shadow-sm text-white flex flex-col justify-center items-center text-center">
            <h2 className="text-3xl font-bold mb-6">Prêt à sauter le pas ?</h2>
            <p className="text-white/90 mb-8 text-lg">
              Nous gérons nos candidatures et missions via la plateforme officielle de l'État : JeVeuxAider.gouv.fr.
            </p>
            <a 
              href="https://www.jeveuxaider.gouv.fr/organisations/30833-bobos-gamelles#presentation" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white text-brand-green font-bold py-4 px-8 rounded-xl hover:bg-stone-100 transition-colors shadow-sm hover:-translate-y-1 inline-block text-lg"
            >
              Voir nos missions sur JeVeuxAider
            </a>
            <p className="mt-6 text-sm text-white/60 italic">
              * Note : La liaison automatique entre JeVeuxAider.gouv.fr et cet intranet est actuellement à l'étude.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-bg-card rounded-3xl border border-border-card">
            <div className="w-12 h-12 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} />
            </div>
            <h3 className="font-bold mb-2 text-text-main">Flexibilité</h3>
            <p className="text-sm text-text-main/70">Choisissez vos créneaux selon votre emploi du temps.</p>
          </div>
          <div className="text-center p-6 bg-bg-card rounded-3xl border border-border-card">
            <div className="w-12 h-12 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={24} />
            </div>
            <h3 className="font-bold mb-2 text-text-main">Formation</h3>
            <p className="text-sm text-text-main/70">Nous vous accompagnons lors de vos premières maraudes.</p>
          </div>
          <div className="text-center p-6 bg-bg-card rounded-3xl border border-border-card">
            <div className="w-12 h-12 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} />
            </div>
            <h3 className="font-bold mb-2 text-text-main">Communication</h3>
            <p className="text-sm text-text-main/70">Un groupe WhatsApp dédié pour échanger et s'organiser facilement entre membres.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerPage;
