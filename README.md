# 2iE Library Backend

## Description
Backend Node.js/Express pour la gestion de la bibliothèque universitaire 2iE, avec MySQL. Fournit toutes les API pour l'authentification, la gestion des livres, réservations, utilisateurs, statistiques, notifications, etc.

## Fonctionnalités principales
- Authentification JWT (étudiant/admin)
- Gestion des livres (CRUD, import, export)
- Réservations de livres (statuts, expiration automatique)
- Gestion des utilisateurs (activation, rôles)
- Statistiques dynamiques (emprunts, retards, utilisateurs actifs, etc.)
- Notifications (retards, rappels)
- Cron jobs pour gestion automatique des réservations/retards
- Sécurité (middlewares, validation, gestion des rôles)

## Structure du projet

```
Backend/
├── config/                 # Configuration DB (db.js)
├── controllers/            # Logique métier (authController.js, bookController.js, ...)
├── jobs/                   # Cron jobs (expireReservationsJob.js, notifyLateReturns.js)
├── middlewares/            # Auth, gestion erreurs, rôles
├── models/                 # Modèles (bookModel.js, userModel.js, ...)
├── routes/                 # Définition des routes (authRoutes.js, bookRoutes.js...)
├── utils/                  # Utilitaires (mailer.js, validator.js)
├── server.js               # Entrée principale serveur
├── database.sql            # Script SQL de création
├── admin-data.sql          # Données d'admin
├── importBooks.js          # Script d'import de livres
├── generateAdminPasswords.js # Génération de mots de passe admin
├── library.rest            # Collection REST Client
├── postman_collection.json # Collection Postman
└── README.md
```

## Endpoints principaux
- `/api/students/register` : Inscription étudiant
- `/api/students/login` : Connexion étudiant
- `/api/admins/login` : Connexion admin
- `/api/books` : Liste, ajout, édition, suppression de livres
- `/api/reservations` : Réserver, annuler, voir réservations
- `/api/comments` : Ajouter, voir, supprimer commentaires
- `/api/notifications/late` : Notifications de retard
- `/api/stats/borrowed-books` : Statistiques globales (dashboard admin)

## Démarrage rapide
```bash
cd Backend
npm install
npm run dev # ou npm start
```
- Configurer `.env` (voir `.env.example`)
- Importer la base de données avec `database.sql` et `admin-data.sql`

## Cron Job
- `jobs/expireReservationsJob.js` : Expire automatiquement les réservations dépassées
- `jobs/notifyLateReturns.js` : Notifie les retards

## Comptes de test

### Étudiant
```json
{
  "email": "sonita@2ie.edu",
  "password": "password124"
}
```

### Administrateur
```json
{
  "email": "traore.fatimata@2ie.edu",
  "password": "admin124"
}
```

## Contribution
- Fork, branche, PR, review (voir README d'origine)

## Licence
MIT

---
**2iE Library Backend** - API robuste pour la gestion de bibliothèque universitaire
