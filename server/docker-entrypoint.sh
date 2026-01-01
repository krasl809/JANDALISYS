#!/bin/bash
set -e

# Wait for postgres
if [ "$DATABASE_URL" != "" ]; then
  echo "Waiting for postgres..."
  # Parse host and port from DATABASE_URL
  # Format: postgresql://user:password@host:port/db
  DB_HOST=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/:.*//' -e 's/\/.*//')
  DB_PORT=$(echo $DATABASE_URL | sed -e 's/.*://' -e 's/\/.*//')
  
  until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}"; do
    echo "Postgres is unavailable - sleeping"
    sleep 1
  done
  echo "Postgres is up - executing migrations"
  
  # Run migrations
  alembic upgrade head
fi

# Start application
exec "$@"
