# ProjetWEB
# 🎮 GameHub — Plateforme multijoueur en ligne

## 📌 Présentation

GameHub est une plateforme web multijoueur permettant à des utilisateurs de jouer en ligne à différents jeux classiques comme le **Tic-Tac-Toe** et le **Puissance 4**.
Le projet met l’accent sur une expérience utilisateur fluide, responsive et interactive grâce à une communication quasi temps réel entre les clients et le serveur.

Les utilisateurs peuvent :

* créer un compte et se connecter ;
* gérer leur profil et leurs préférences de jeu ;
* consulter les joueurs disponibles ;
* envoyer des invitations de jeu ;
* jouer en ligne avec chat intégré.

---

# ✨ Fonctionnalités

## 👤 Gestion des utilisateurs

* Création de compte
* Connexion / Déconnexion
* Modification des paramètres du compte
* Gestion de la disponibilité :

  * Disponible
  * Indisponible

---

## 🎲 Gestion des jeux

Jeux disponibles :

* Tic-Tac-Toe
* Puissance 4

Fonctionnalités associées :

* Consultation des règles et descriptions des jeux
* Historique des parties
* Nombre de victoires et défaites par jeu
* Sauvegarde des préférences de jeux
* Statistiques des victoires aux différents jeux

---

## 🌐 Gestion des joueurs

### Liste des utilisateurs

Affichage de :

* tous les utilisateurs inscrits ;
* leurs jeux favoris ;
* leurs statistiques par jeu :

  * parties jouées ;
  * parties gagnées.

### Liste des utilisateurs connectés

Affichage en temps réel :

* disponibilité actuelle ;
* statut de jeu en cours ;
* adversaire actuel.

---

## 📩 Invitations et interactions

### Invitations différées

Un joueur peut proposer une partie à un utilisateur hors ligne :

* choix du jeu ;
* choix de la date ;
* choix de l’heure ;
* envoi automatique d’un email.

### Alertes en direct

Un joueur peut envoyer une alerte instantanée à un utilisateur :

* connecté ;
* indisponible ;
* déjà en partie.

Une notification apparaît directement sur l’écran du joueur ciblé.

### Invitations immédiates

Deux joueurs disponibles peuvent :

* envoyer une invitation instantanée ;
* accepter/refuser la demande ;
* confirmer le lancement de la partie.

---

## 💬 Chat temps réel

Chaque partie contient :

* un chat intégré ;
* des échanges instantanés entre les joueurs.

---

## 📱 Responsive Design

Le site est entièrement responsive :

* mobile ;
* tablette ;
* ordinateur.

L’interface utilise :

* Bootstrap ;
* CSS personnalisé ;
* une navigation optimisée ;
* une expérience utilisateur fluide.

---

# 🛠️ Technologies utilisées

## Frontend

* HTML5
* CSS3
* Bootstrap
* JavaScript
* jQuery
* EJS

## Backend

* Node.js
* Express.js
* Dotenv
* Nodemailer
* Express-session
* Argon2

## Base de données

* PostgreSQL
* pg (node-postgres)

---

# ⚙️ Prérequis

Avant de lancer le projet, installer :

* Node.js ≥ 18
* PostgreSQL ≥ 14
* npm

---

# 🚀 Installation

## 1. Cloner le dépôt

```bash
git clone https://github.com/votre-utilisateur/gamehub.git
cd gamehub
```

---

## 2. Installer les dépendances

```bash
npm install
```

---

## 3. Configurer PostgreSQL

Créer une base de données :

```sql
CREATE DATABASE gamehub;
```

---

## 4. Initialiser la base de données

```bash
psql -U postgres -d gamehub -f database/init.sql
```

---

## 5. Fichier de configuration : 

Pour le bon fonctionnement du site un fichier de configurations et nécéssaire.
Il doit être placer à la racine du projet et s'appeler : **config.env**.

Son contenu doit être le suivant : 

```env
DB_PASSWORD=P@risCite2026
SECRET_SESSION_KEY=oOM9pHuBlRPQv73jsKlsiwdQ5QmKSyI+ESw
```
Notez que pour **SECRET_SESSION_KEY** n'importe quel mot de passe sécurisé suffit. En effet car c'est le 
mot de passe pour les sessions.

---

## 6. Lancer le serveur

```bash
npm start
```

Application accessible sur :

```bash
http://localhost:4321
```

---

# 🧪 Comptes de démonstration

| Utilisateur | Mot de passe |
| ----------- | ------------ |
| john_doe    | 12345678     |
| jane_smith  | 12345678     |

---

# 📄 Contraintes techniques respectées

✅ Responsive design
✅ Utilisation de PostgreSQL
✅ Initialisation SQL complète
✅ Utilisation d’Express et EJS
✅ Utilisation d’AJAX
✅ Gestion multi-utilisateurs
✅ Jeux multijoueurs
✅ Chat en temps réel simulé
✅ Aucune donnée codée en dur
✅ Matchmaking automatique
