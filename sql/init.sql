-- sql/init.sql
-- PostgreSQL crée déjà POSTGRES_DB avec POSTGRES_USER comme owner
-- via les variables d'environnement Docker.
-- Ce script accorde juste les permissions nécessaires.

GRANT ALL PRIVILEGES ON DATABASE supfile TO supfile_user;
ALTER DATABASE supfile OWNER TO supfile_user;
