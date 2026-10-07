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
