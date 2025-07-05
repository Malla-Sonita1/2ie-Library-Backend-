# 2iE Library Backend

## Description
Backend Node.js/Express pour la gestion de la bibliothèque universitaire 2iE, avec MySQL. Fournit toutes les API pour l'authentification, la gestion des livres, réservations, utilisateurs, statistiques, notifications, etc.

---

## 📁 Structure du Backend

```
Backend/
├── config/           # Configuration de la base de données (db.js)
├── controllers/      # Logique métier (un contrôleur par ressource)
│   ├── authController.js
│   ├── bookController.js
│   ├── commentsController.js
│   ├── loanController.js
│   ├── notificationsController.js
│   ├── reservationController.js
│   └── statsController.js
├── jobs/             # Tâches planifiées (cron jobs)
│   ├── expireReservationsJob.js
│   └── notifyLateReturns.js
├── middlewares/      # Middlewares Express (auth, gestion des rôles, erreurs)
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   └── roleMiddleware.js
├── models/           # Modèles de données (abstraction SQL, si utilisé)
│   ├── bookModel.js
│   ├── commentModel.js
│   ├── reservationModel.js
│   └── userModel.js
├── routes/           # Définition des routes API (un fichier par ressource)
│   ├── adminLoanRoutes.js
│   ├── authRoutes.js
│   ├── bookRoutes.js
│   ├── commentsRoutes.js
│   ├── loanRoutes.js
│   ├── notificationRoutes.js
│   ├── reservationRoutes.js
│   └── statsRoutes.js
├── utils/            # Fonctions utilitaires (envoi d'emails, validation, etc.)
│   ├── mailer.js
│   └── validator.js
├── admin-data.sql    # Données d'admin (import initial)
├── database.sql      # Script SQL de création des tables
├── generateAdminPasswords.js # Génération de mots de passe admin
├── importBooks.js    # Script d'import de livres
├── library.rest      # Fichier de requêtes HTTP pour tests (REST Client)
├── package.json      # Dépendances et scripts npm
├── postman_collection.json # Collection Postman pour tests API
├── server.js         # Point d'entrée principal du serveur Express
└── README.md         # Documentation
```

### Rôle des principaux dossiers/fichiers
- **config/** : Connexion à la base de données MySQL.
- **controllers/** : Contient la logique métier pour chaque ressource (livres, utilisateurs, réservations, etc.).
- **routes/** : Définit les endpoints REST et les relie aux contrôleurs.
- **middlewares/** : Gère l'authentification, les rôles, la gestion des erreurs.
- **jobs/** : Tâches automatiques (expiration des réservations, notifications de retard).
- **models/** : (optionnel) Abstraction des entités si besoin.
- **utils/** : Fonctions utilitaires (envoi d'emails, validation de données).
- **server.js** : Initialise Express, configure les routes, démarre le serveur.
- **database.sql** : Script de création de toutes les tables nécessaires.
- **admin-data.sql** : Données d'admin à importer après génération.
- **importBooks.js** : Script pour remplir la base de livres de test.
- **library.rest** : Fichier de requêtes pour tester l'API avec REST Client (VS Code).

---

## 🔄 Logique métier principale

- **Authentification** : JWT, middlewares pour sécuriser les routes, gestion des rôles (admin/étudiant).
- **Livres** : CRUD complet, recherche, import automatique.
- **Réservations** : File d'attente, réservation même si le livre est emprunté, notification à la disponibilité, transformation en emprunt.
- **Emprunts** : Gestion des statuts (emprunté, retourné, expiré), historique, retour de livre, gestion des retards.
- **Commentaires** : Ajout, suppression, affichage par livre.
- **Notifications** : Envoi d'emails et notifications in-app (retard, disponibilité, etc.).
- **Statistiques** : Statistiques d'emprunts, réservations, utilisateurs pour le dashboard admin.
- **Cron jobs** : Expiration automatique des réservations, notifications de retards.

---

## 🗄️ Création et Remplissage de la Base de Données

### 1. Création de la base de données et des tables

1. **Créer la base de données**
   - Ouvrez votre client MySQL (ex : MySQL Workbench, phpMyAdmin ou terminal).
   - Exécutez :
     ```sql
     CREATE DATABASE library;
     USE library;
     ```
2. **Créer les tables**
   - Exécutez le script `database.sql` fourni dans le dossier Backend. Ce script crée toutes les tables nécessaires (`users`, `books`, `reservations`, etc.).
   - Exemple :
     ```bash
     mysql -u root -p library < database.sql
     ```

### 2. Remplir la table des administrateurs

- Utilisez le script `generateAdminPasswords.js` pour générer des administrateurs avec des mots de passe hashés :
  ```bash
  node generateAdminPasswords.js
  ```
- Ce script crée un fichier `admin-data.sql` contenant des requêtes d'insertion d'admins avec mots de passe sécurisés.
- Importez ce fichier dans la base :
  ```bash
  mysql -u root -p library < admin-data.sql
  ```

### 3. Remplir la table des livres (optionnel, pour tests)

- Utilisez le script `importBooks.js` pour importer des livres depuis OpenLibrary :
  ```bash
  node importBooks.js
  ```
- Ce script ajoute automatiquement des livres variés dans la table `books` (catégories, images, description, etc.).

### 4. Ajouter des étudiants/testeurs
- Vous pouvez ajouter des étudiants manuellement via SQL ou via l'interface d'inscription du frontend.
- Exemple SQL :
  ```sql
  INSERT INTO users (name, email, password, role, is_active, created_at, updated_at) VALUES ('Aminata Ouedraogo', 'aminata.ouedraogo@2ie.edu', '<hash>', 'student', true, NOW(), NOW());
  ```
  (Utilisez bcrypt pour générer le hash du mot de passe, ou inscrivez-vous via le frontend.)

### 5. Vérification
- Vérifiez que les tables `users` (admins et étudiants) et `books` sont bien remplies :
  ```sql
  SELECT * FROM users;
  SELECT * FROM books;
  ```

## 🛠️ Démarrage du Backend
1. Installez les dépendances :
   ```bash
   npm install
   ```
2. Configurez le fichier `.env` (voir `.env.example`).
3. Lancez le serveur :
   ```bash
   npm run dev # ou npm start
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

## Cron Job
- `jobs/expireReservationsJob.js` : Expire automatiquement les réservations dépassées
- `jobs/notifyLateReturns.js` : Notifie les retards


## Contribution
- Fork, branche, PR, review (voir README d'origine)

## Licence
MIT

---
**2iE Library Backend** - API robuste pour la gestion de bibliothèque universitaire
