#!/bin/sh
# Container entrypoint for the server image.
# Applies any pending Prisma migrations, then hands off to Node.
set -e

echo "→ prisma migrate deploy"
./node_modules/.bin/prisma migrate deploy

echo "→ start server"
exec node dist/index.js
