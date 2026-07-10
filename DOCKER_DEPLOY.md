# OEM Docker Deploy

This setup runs the app with Docker Compose:

- `frontend`: React build served by Nginx
- `backend`: Node/Express API
- `workflow-sync`: one-shot job that syncs OEM Flow stages/phases into MySQL
- `mysql`: MySQL 8.4 with persistent volume
- `phpmyadmin`: browser UI for managing MySQL

## Files

```text
OEM/
  docker-compose.yml
  .env.production.example
  oem-workflow/
    Dockerfile
    nginx.conf

OEM-backend/
  Dockerfile
  .dockerignore
```

The compose file expects to run from the frontend repository root. Jenkins clones
backend into `./OEM-backend` before building.

## First Deploy

Copy the production env example and edit the secrets:

```bash
cp .env.production.example .env.production
```

Set strong values for:

```text
MYSQL_ROOT_PASSWORD
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
CLIENT_ORIGIN
APP_PORT
PHPMYADMIN_PORT
```

Start the stack:

```bash
docker compose --env-file .env.production up -d --build
```

Open:

```text
http://SERVER_IP:8088
```

Open phpMyAdmin:

```text
http://SERVER_IP:8089
```

phpMyAdmin connects to the `mysql` container. Login uses the MySQL root password from `.env.production`.

## Useful Commands

View logs:

```bash
docker compose --env-file .env.production logs -f
```

Restart after code changes:

```bash
docker compose --env-file .env.production up -d --build
```

Stop the stack without deleting database data:

```bash
docker compose --env-file .env.production down --remove-orphans
```

Avoid `docker compose down -v` on production unless you intentionally want to delete the MySQL volume and reset the database.

Run workflow sync again:

```bash
docker compose --env-file .env.production run --rm workflow-sync
```

Backup database:

```bash
docker compose --env-file .env.production exec mysql \
  mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" oem_app > oem_app_backup.sql
```

Do not expose MySQL to the public internet. Put Nginx/Caddy or an internal load balancer in front of `APP_PORT` if you need HTTPS/domain routing. If the server is reachable outside the company network, restrict `PHPMYADMIN_PORT` with firewall/VPN.
