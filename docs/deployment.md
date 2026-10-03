# Deployment

Production runs on a single Ubuntu 24.04 VPS with Docker Compose. GitHub Actions verifies every pull request and, on each push to `main`, builds the images, pushes them to GitHub Container Registry (GHCR), and restarts the stack on the VPS over SSH.

```
Internet ──80/443──► caddy (automatic HTTPS for integraa.site)
                       ├── /api/*  ──► api  (NestJS :3001, /api prefix stripped)
                       └── /*      ──► web  (Next.js standalone :3000)
                     api ──► postgres (named volume, not published)
                     migrate: `prisma migrate deploy`, runs before api on every `up`
```

| File                          | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `Dockerfile`                  | One multi-stage build with targets `api`, `web`, and `migrate`     |
| `deploy/docker-compose.yml`   | Production stack; uploaded to `/opt/integra` by the workflow       |
| `deploy/Caddyfile`            | Reverse proxy and TLS                                              |
| `deploy/.env.example`         | Template for `/opt/integra/.env`, which exists only on the VPS     |
| `.github/workflows/ci-cd.yml` | `verify` (PRs and `main`), then `build` and `deploy` (`main` only) |

The web app is built with `NEXT_PUBLIC_API_URL=/api`, so the browser calls the API on the same origin. The session cookie is `Secure` in production, so the app must be served over HTTPS; plain `http://<ip>` cannot log in.

## 1. DNS

At your domain registrar, create two records pointing to the VPS public IPv4 address:

| Type | Name  | Value    |
| ---- | ----- | -------- |
| A    | `@`   | `VPS_IP` |
| A    | `www` | `VPS_IP` |

Check propagation from your machine with `nslookup integraa.site` before the first deploy; Caddy needs it to obtain certificates.

## 2. Base system (as root)

```bash
ssh root@VPS_IP
apt update && apt upgrade -y
apt install -y ca-certificates curl ufw
timedatectl set-timezone Asia/Jakarta
reboot   # only if the upgrade installed a new kernel
```

## 3. Deploy user and SSH

Create a non-root user that owns the deployment:

```bash
adduser deploy
usermod -aG sudo deploy
# Reuse root's authorized SSH keys, if root logs in with a key:
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

If you log in with a password instead, add your public key from your own computer (PowerShell):

```powershell
ssh-keygen -t ed25519            # skip if ~/.ssh/id_ed25519 already exists
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh deploy@VPS_IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Confirm `ssh deploy@VPS_IP` works **in a new terminal**, then disable root and password logins:

```bash
sudo tee /etc/ssh/sshd_config.d/00-hardening.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sudo systemctl restart ssh
```

Keep your current session open until a fresh `ssh deploy@VPS_IP` succeeds.

## 4. Firewall and swap

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

Docker-published ports bypass ufw rules; only Caddy publishes ports (80/443), and PostgreSQL is reachable only inside the Compose network.

On a VPS with 2 GB RAM or less, add swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 5. Docker Engine and Compose

Install from Docker's official apt repository:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

Limit container log size so logs cannot fill the disk:

```bash
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
sudo systemctl restart docker
```

Log out and back in (for the `docker` group), then verify with `docker run --rm hello-world` and `docker compose version`.

## 6. Application directory and secrets

```bash
sudo mkdir -p /opt/integra
sudo chown deploy:deploy /opt/integra
cd /opt/integra
nano .env        # paste deploy/.env.example, then fill in the values below
chmod 600 .env
```

Generate the secrets on the VPS:

```bash
openssl rand -hex 24      # POSTGRES_PASSWORD (URL-safe; it is embedded in DATABASE_URL)
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # TOTP_ENCRYPTION_KEY
```

Set `LLM_API_KEY` to the real provider key. Keep `TOTP_ENCRYPTION_KEY` and `POSTGRES_PASSWORD` stable after the first deploy: the key decrypts stored authenticator secrets, and PostgreSQL keeps the password it was initialized with.

## 7. GitHub Actions access

Create a dedicated key pair for the workflow on your own computer (PowerShell):

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\integra_deploy -C "github-actions-deploy" -N '""'
type $env:USERPROFILE\.ssh\integra_deploy.pub | ssh deploy@VPS_IP "cat >> ~/.ssh/authorized_keys"
ssh-keyscan -H VPS_IP     # output becomes VPS_KNOWN_HOSTS
```

Compare the keyscan fingerprint with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the VPS before trusting it.

In GitHub, open **Settings → Environments → New environment**, name it `production`, and add these environment secrets:

| Secret            | Value                                               |
| ----------------- | --------------------------------------------------- |
| `VPS_HOST`        | VPS public IP                                       |
| `VPS_USER`        | `deploy`                                            |
| `VPS_SSH_KEY`     | Full contents of `integra_deploy` (the private key) |
| `VPS_KNOWN_HOSTS` | Full output of `ssh-keyscan -H VPS_IP`              |

GHCR needs no extra secret: the workflow pushes with its own `GITHUB_TOKEN` and logs the VPS in with a short-lived token on each deploy, so the images may stay private.

## 8. First deploy

Merge the pull request into `main`, or run **Actions → CI/CD → Run workflow** on `main`. The `deploy` job uploads `docker-compose.yml` and `Caddyfile` to `/opt/integra`, pulls the images tagged with the commit SHA, runs migrations, and waits for the API health check.

On the VPS:

```bash
cd /opt/integra
docker compose ps
docker compose logs -f caddy     # certificate issuance
```

Open `https://integraa.site`, then create the first account from **Sign up** and enroll the authenticator.

## Operations

All commands run in `/opt/integra`.

| Task                      | Command                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Status                    | `docker compose ps`                                                                                                          |
| Logs                      | `docker compose logs -f --tail=200 api` (or `web`, `caddy`, `migrate`, `postgres`)                                           |
| Restart after `.env` edit | `docker compose up -d`                                                                                                       |
| Roll back to a commit     | `IMAGE_TAG=<commit-sha> docker compose up -d` (migrations are forward-only)                                                  |
| Free demo seed            | `docker compose run --rm migrate npm run seed:demo`                                                                          |
| Backup database           | `docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > integra-$(date +%F).dump`          |
| Restore database          | `docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean' < integra-YYYY-MM-DD.dump` |

`data:generate` and claim analysis make paid LLM calls; run them only on purpose. Each deploy prunes unused images built more than 7 days ago, so recent rollback targets stay on the VPS; pulling an older image from a private GHCR package requires `docker login ghcr.io` with a personal access token that has `read:packages`.
