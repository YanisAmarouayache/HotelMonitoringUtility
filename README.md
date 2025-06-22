# Hotel Monitoring Utility

Un MVP complet pour surveiller les prix des hôtels concurrents sur Booking.com avec des recommandations de yield management.

## 🏗️ Architecture

- **Backend**: Node.js + Apollo Server + GraphQL + Prisma + SQLite
- **Frontend**: React + TypeScript + Tailwind CSS + Apollo Client
- **Scraper**: Playwright + TypeScript (package séparé)
- **Base de données**: SQLite avec Prisma ORM

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn

### Installation complète

```bash
# Cloner le projet
git clone <repository-url>
cd HotelMonitoringUtility

# Installer toutes les dépendances
npm run install:all

# Configurer la base de données
npm run setup
```

### Installation manuelle

```bash
# Installer les dépendances racine
npm install

# Backend
cd apps/backend
npm install
npx prisma migrate dev --name init
npx prisma generate

# Frontend
cd ../../apps/frontend
npm install

# Scraper
cd ../../packages/scraper
npm install
npx playwright install
```

## 🏃‍♂️ Démarrage

### Développement

```bash
# Démarrer backend et frontend en parallèle
npm run dev

# Ou démarrer séparément
npm run dev:backend  # http://localhost:4000
npm run dev:frontend # http://localhost:5173
```

### Production

```bash
# Build
npm run build

# Démarrer
cd apps/backend && npm start
cd apps/frontend && npm run preview
```

## 📊 Fonctionnalités

### ✅ Implémentées

- **Gestion des hôtels**
  - Ajouter des hôtels via URL Booking.com
  - Liste des hôtels surveillés
  - Détails des hôtels avec métadonnées
  - Suppression d'hôtels

- **Scraping automatique**
  - Extraction des prix et disponibilités
  - Métadonnées (nom, localisation, notes, équipements)
  - Scraping manuel et automatique
  - Gestion des erreurs

- **Interface utilisateur**
  - Design moderne avec Tailwind CSS
  - Navigation latérale
  - Graphiques de prix avec Recharts
  - Formulaires avec validation

- **Historique personnel**
  - Import CSV des données historiques
  - Visualisation des tendances
  - Statistiques de réservations

- **Gestion des critères**
  - Ajout de critères personnalisés
  - Interface de configuration

### 🔄 En cours / À venir

- **Recommandations de yield**
  - Algorithme de recommandation avancé
  - Analyse des courbes de réservation
  - Impact des événements

- **Scheduling**
  - Scraping automatique quotidien
  - Notifications

- **Export/Import**
  - Export des données
  - Sauvegarde/restauration

## 🗄️ Base de données

### Modèles principaux

- **Hotel**: Informations des hôtels surveillés
- **DailyPrice**: Prix quotidiens par hôtel
- **OwnHotelHistory**: Historique personnel
- **Criterion**: Critères de comparaison
- **HotelCriterionWeight**: Poids des critères par saison
- **Event**: Événements spéciaux

### Migration

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma studio  # Interface graphique
```

## 🔧 Configuration

### Variables d'environnement

Créer un fichier `.env` dans `apps/backend/`:

```env
DATABASE_URL="file:./dev.db"
PORT=4000
NODE_ENV=development
```

### Configuration du scraper

Le scraper est configuré pour :
- Mode headless par défaut
- Timeout de 30 secondes
- User-Agent moderne
- Interception GraphQL

## 📁 Structure du projet

```
HotelMonitoringUtility/
├── apps/
│   ├── backend/           # API GraphQL
│   │   ├── src/
│   │   │   ├── index.ts       # Serveur Apollo
│   │   │   ├── schema.ts      # Schéma GraphQL
│   │   │   ├── resolvers.ts   # Resolvers
│   │   │   └── prismaClient.ts
│   │   └── prisma/
│   │       └── schema.prisma  # Modèles de données
│   └── frontend/          # Interface React
│       ├── src/
│       │   ├── components/    # Composants réutilisables
│       │   ├── pages/         # Pages principales
│       │   ├── App.tsx        # Application principale
│       │   └── main.tsx       # Point d'entrée
│       └── tailwind.config.js
├── packages/
│   └── scraper/           # Scraper Playwright
│       └── src/
│           ├── index.ts       # Fonction principale
│           ├── types.ts       # Types TypeScript
│           └── utils.ts       # Utilitaires
└── package.json           # Configuration monorepo
```

## 🧪 Tests

```bash
# Tests du scraper
cd packages/scraper
npm test

# Tests du backend (à implémenter)
cd apps/backend
npm test
```

## 🚀 Déploiement

### Local avec PM2

```bash
# Installer PM2
npm install -g pm2

# Démarrer les services
pm2 start apps/backend/dist/index.js --name "hotel-backend"
pm2 start "npm run preview" --name "hotel-frontend" --cwd apps/frontend

# Monitoring
pm2 monit
```

### Docker (à implémenter)

```bash
docker-compose up -d
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## ⚠️ Avertissements

- Ce projet est un MVP à des fins éducatives/démonstratives
- Respectez les conditions d'utilisation de Booking.com
- Utilisez le scraping de manière responsable et éthique
- Considérez les implications légales dans votre juridiction

## 🆘 Support

Pour toute question ou problème :
1. Vérifiez les issues existantes
2. Créez une nouvelle issue avec les détails
3. Incluez les logs d'erreur et la configuration

---

**Note**: Ce projet est en développement actif. Les fonctionnalités peuvent évoluer rapidement. 