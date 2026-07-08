# Timetable Server Docker Run

This bundle contains:

- `timetable-app-server-20260622.tar`: Docker app image.
- `docker-compose.server.yml`: app + Postgres server compose file.
- `.env.server`: environment values for compose.
- `init-db/timetable_latest.dump`: database dump restored automatically on first database startup.
- `uploads/`: uploaded files directory, if files exist.
- `backups/`: database backup copies.

## Run On Server

1. Put these files in one directory on the server.
2. Rename `.env.server` to `.env` and edit `NEXTAUTH_URL` to your server URL or IP.
3. Load the app image:

```sh
docker load -i timetable-app-server-20260622.tar
```

4. Start the app:

```sh
docker compose -f docker-compose.server.yml up -d
```

5. Open:

```text
http://SERVER_IP:3080
```

The database restore happens only when the `postgres_data` volume is empty/new. If you rerun on a server with an existing `postgres_data` volume, Docker will keep that existing data.
