# SUPCloud

- **Backend** : FastAPI en microservices (Gateway, Auth, Files, Shares) + PostgreSQL 16
- **Frontend web** : React 18, Vite, Tailwind CSS, Axios, Recharts, servi par Nginx
- **Déploiement** : Docker Compose (une seule commande lance tout)


## Démarrage rapide

```bash
# 1. Configurer les secrets
cp .env.example .env
# Éditer .env (voir « Variables d'environnement »)

# 2. Lancer tous les services (backend + base + frontend)
docker compose up -d --build

# 3. Vérifier
docker compose ps
curl http://localhost:8000/health
```

Application : <http://localhost:3000>

## Variables d'environnement (`.env`)

```env
JWT_SECRET=une-longue-valeur-aleatoire      # openssl rand -hex 32
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/oauth/google/callback
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost,http://localhost:3000
```

## Connexion Google

1. Console Google Cloud, **Identifiants**, créer un ID client **Application Web**.
2. URI de redirection autorisé : `http://localhost:8000/auth/oauth/google/callback`
3. Origine JavaScript autorisée : `http://localhost:3000`
4. Renseigner `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env`.
5. Tant que l'application est en mode « Test », ajouter les comptes dans
   **Utilisateurs de test**.

## Développement local (sans Docker pour le front)

```bash
docker compose up -d db migrate auth files shares gateway

cd supcloud-web
npm install
npm run dev          
```

Prérequis : Node.js 22+. Arrêter le conteneur `frontend` avant `npm run dev`
(le port 3000 doit être libre).

## Build du frontend seul

```bash
cd supcloud-web
npm run build
docker build -t supcloud-web .
docker run -p 3000:80 supcloud-web
```

## Commandes utiles

```bash
docker compose logs -f gateway auth files shares frontend
docker compose up -d --build frontend     # reconstruire le front seul
docker compose down                       # arrêter (garde les volumes)
```