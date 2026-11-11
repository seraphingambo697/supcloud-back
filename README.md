# SUPCLOUD — Backend FastAPI Microservices

## Démarrage rapide

```bash
# 1. Configurer les secrets
cp .env.example .env
# Éditer .env (JWT_SECRET, DB password, OAuth keys)

# 2. Lancer 
docker compose up --build

# 3. Vérifier
curl http://localhost:8000/health
```



# SUPCLOUD-WEB — Frontend React

Interface web concurrente de Dropbox/Google Drive.
Stack : **Node.js 22+ + React 18 + Vite + Tailwind CSS + Axios + Recharts**

## Démarrage rapide

```bash
npm install
npm run dev          
```

## Build production

```bash
npm run build   
```

## Docker

```bash
docker build -t supcloud-web .
docker run -p 80:80 supcloud-web
```
