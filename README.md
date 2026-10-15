# Maraude Map App

Cette application permet de gérer et de visualiser les maraudes (distributions d'aide) sur une carte interactive.

## Fonctionnalités Principales

### 1. Gestion des Maraudes
- **Création et Édition** : Planifiez de nouvelles maraudes en définissant la date, le lieu de préparation, le lieu de départ, et les équipes participantes.
- **Tracé des Circuits** : Dessinez les circuits de chaque équipe directement sur la carte en plaçant des points de passage.
- **Gestion des Équipes** : Assignez des couleurs et des noms aux différentes équipes pour les distinguer facilement sur la carte.

### 2. Points de Distribution
- **Distributions Terminées** : Placez des points sur la carte pour indiquer où une distribution a eu lieu et combien de personnes ont été aidées.
- **Besoins en Attente** : N'importe quel membre peut signaler un besoin sur la carte (point de distribution en attente). Ces points apparaissent avec un style différent et peuvent être confirmés ou annulés par la suite.

### 3. Visualisation sur la Carte
- **Filtres d'Affichage** : Utilisez les cases à cocher pour afficher ou masquer les circuits, les distributions terminées, et les distributions en attente.
- **Sélection Spécifique** : Sélectionnez une ou plusieurs maraudes spécifiques dans la liste pour ne voir que leurs circuits et points de distribution sur la carte.
- **Heatmap (Carte de Chaleur)** : Basculez en mode "Carte de chaleur" pour visualiser les zones où les distributions sont les plus fréquentes, avec la possibilité de filtrer par mois et par année.

### 4. Suivi et Rapports
- **Comptes Rendus** : Les chefs d'équipe peuvent rédiger des comptes rendus pour chaque maraude, détaillant le déroulement et le nombre total de personnes aidées.
- **Statistiques** : Visualisez le nombre total de personnes aidées et le nombre de maraudes terminées.

## Utilisation

- **Mode Maraudes** : C'est le mode par défaut. Il permet de voir les maraudes planifiées et passées. Cliquez sur une maraude dans la liste pour voir ses détails et zoomer sur son emplacement.
- **Signaler un besoin** : En mode Maraudes, cliquez sur le bouton "Signaler un besoin" en haut à droite de la carte, puis cliquez sur la carte pour placer le point.
- **Mode Heatmap** : Cliquez sur le bouton "Heatmap" pour voir la densité des distributions.

## Technologies Utilisées
- React
- Tailwind CSS
- Leaflet & React-Leaflet (pour la carte)
- SQLite (pour la base de données locale)
- Express (pour l'API backend)
