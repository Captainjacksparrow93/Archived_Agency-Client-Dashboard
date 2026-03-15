#!/bin/sh
set -e

echo "Running prisma db push..."
npx prisma db push --skip-generate

echo "Checking if database needs seeding..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.user.count().then(c => { console.log(c); p.\$disconnect() }).catch(() => { console.log(0); p.\$disconnect() })
")

if [ "$USER_COUNT" = "0" ]; then
  echo "Seeding database..."
  node prisma/seed.prod.js
else
  echo "Database already seeded ($USER_COUNT users found), skipping."
fi

echo "Starting application..."
exec node server.js
