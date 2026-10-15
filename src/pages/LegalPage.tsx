import React from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

const LegalPage = () => {
  return (
    <div className="py-20 bg-bg-main min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card rounded-[2.5rem] shadow-sm border border-border-card p-8 md:p-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-brand-red/10 text-brand-red rounded-2xl flex items-center justify-center">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-black text-text-main">Mentions Légales</h1>
          </div>

          <div className="space-y-8 text-text-main/80">
            <section>
              <h2 className="text-xl font-bold text-text-main mb-4">1. Éditeur du site</h2>
              <div className="space-y-2">
                <p><strong>Association :</strong> Bobos et Gamelles</p>
                <p><strong>Siège social :</strong> Toulouse, France</p>
                <p><strong>Statut :</strong> Association loi 1901 à but non lucratif</p>
                <p><strong>Contact :</strong> bobosetgamelles@gmail.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-main mb-4">2. Hébergement</h2>
              <p>
                Ce site est hébergé par Google Cloud Platform (GCP) - Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-main mb-4">3. Propriété intellectuelle</h2>
              <p>
                L'ensemble de ce site (structure, présentation, logos, textes, photos) est la propriété exclusive de l'association Bobos et Gamelles. Toute reproduction, représentation, modification ou publication, totale ou partielle, est strictement interdite sans accord écrit préalable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-main mb-4">4. Protection des données personnelles (RGPD)</h2>
              <div className="space-y-4">
                <p>
                  Conformément au Règlement Général sur la Protection des Données (RGPD), Bobos et Gamelles s'engage à protéger vos données personnelles.
                </p>
                
                <h3 className="font-bold text-text-main underline decoration-brand-red decoration-2 underline-offset-4">Collecte et Finalités</h3>
                <p>Nous collectons des données pour les finalités suivantes :</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Gestion des membres :</strong> Inscription et gestion des rôles au sein de l'intranet.</li>
                  <li><strong>Coordination des maraudes :</strong> Organisation des tournées, avec la collecte de votre position GPS uniquement dans le but de positionner les équipes sur la carte lors des actions.</li>
                  <li><strong>Communication :</strong> Réponse aux demandes via le formulaire de contact.</li>
                  <li><strong>Images et Médias :</strong> Nous demandons l'accord sur les droits à l'image avant de poster des photos ou des vidéos, dans le seul but de promouvoir les actions de l'association. Vous avez à tout moment le droit de vous rétracter et de demander la suppression des médias vous concernant.</li>
                </ul>

                <h3 className="font-bold text-text-main underline decoration-brand-red decoration-2 underline-offset-4">Sécurité</h3>
                <p>Les mots de passe sont hachés (bcrypt) et les accès sont restreints aux membres habilités. Le site utilise un protocole HTTPS sécurisé.</p>

                <h3 className="font-bold text-text-main underline decoration-brand-red decoration-2 underline-offset-4">Vos droits</h3>
                <p>
                  Vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour toute demande : <strong>bobosetgamelles@gmail.com</strong>.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-text-main mb-4">5. Cookies</h2>
              <p>
                Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement de l'espace membre. Aucun cookie de traçage publicitaire n'est utilisé.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LegalPage;
