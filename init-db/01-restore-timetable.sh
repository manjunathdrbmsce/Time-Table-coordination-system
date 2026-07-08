#!/bin/sh
set -e

DUMP_FILE="/docker-entrypoint-initdb.d/timetable_latest.dump"

if [ -f "$DUMP_FILE" ]; then
  echo "Restoring timetable database from $DUMP_FILE"
  pg_restore --no-owner --role="$POSTGRES_USER" -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$DUMP_FILE"
else
  echo "No timetable dump found at $DUMP_FILE; starting with an empty database"
fi
