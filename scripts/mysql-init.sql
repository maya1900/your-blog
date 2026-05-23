-- Auto-run on first MySQL container init (via docker-entrypoint-initdb.d)
-- Grants blog user permission to create shadow databases needed by Prisma migrate.
-- Reference: https://pris.ly/d/migrate-shadow

GRANT ALL PRIVILEGES ON *.* TO 'blog'@'%';
FLUSH PRIVILEGES;
