#!/bin/sh
set -e

echo "🚀 Starting Timetable Coordination System..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h ${POSTGRES_HOST:-db} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-postgres}; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Run database migrations using LOCAL prisma (not npx which downloads latest)
echo "📦 Running database migrations..."
./node_modules/.bin/prisma db push --accept-data-loss

echo "✅ Database migrations complete!"

# Start the application
echo "🎉 Starting Next.js server..."
exec "$@"
