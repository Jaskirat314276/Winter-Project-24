# Deploying SmartSchool ERP to AWS EC2

End-to-end runbook: from a fresh AWS account to a live HTTPS deployment with
push-to-deploy CI/CD. ~30 minutes the first time, then `git push` from then on.

---

## Architecture

```
GitHub  ─push─►  GitHub Actions  ─build/push─►  GHCR (image registry)
                          │
                          └─ssh deploy─►  EC2 t3.micro
                                            ├─ Caddy   (reverse proxy + TLS)
                                            ├─ Next.js (this app, port 3000)
                                            └─ Postgres (same box)
```

- **Compute**: 1 × EC2 t3.micro (free tier 12 mo, then ~$7/mo)
- **DB**: Postgres 16 in a Docker volume on the same box
- **TLS**: Caddy auto-issues Let's Encrypt
- **Domain**: free DuckDNS subdomain (`yourname.duckdns.org`)
- **CI/CD**: GitHub Actions (free tier)

---

## 0. Prerequisites

- AWS account, AWS CLI installed (`aws --version`)
- GitHub repo for this project (private is fine — GHCR free tier covers it)
- Local Docker working (`docker info`)

---

## 1. Get a free domain (DuckDNS)

1. Open https://duckdns.org → sign in with Google/GitHub.
2. Add a subdomain, e.g. `smartschool` → you now own `smartschool.duckdns.org`.
3. Leave the IP field blank for now — we'll fill it in after EC2 launches.

---

## 2. Launch the EC2 instance

```bash
aws configure   # one-time: paste access key, secret, region (e.g. ap-south-1)

# Create a security group that allows 22 (SSH), 80, 443.
aws ec2 create-security-group \
  --group-name smartschool-sg \
  --description "smartschool web + ssh"

# Allow ingress (replace YOUR_IP with your home IP for SSH safety).
aws ec2 authorize-security-group-ingress --group-name smartschool-sg \
  --protocol tcp --port 22 --cidr YOUR_IP/32
aws ec2 authorize-security-group-ingress --group-name smartschool-sg \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name smartschool-sg \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Create an SSH key pair and save the private key locally.
aws ec2 create-key-pair --key-name smartschool-key \
  --query 'KeyMaterial' --output text > ~/.ssh/smartschool-key.pem
chmod 600 ~/.ssh/smartschool-key.pem

# Launch a t3.micro running Amazon Linux 2023 in your region.
# Look up the latest AMI for your region first:
AMI=$(aws ec2 describe-images --owners amazon \
  --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" \
  --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text)

aws ec2 run-instances \
  --image-id "$AMI" \
  --instance-type t3.micro \
  --key-name smartschool-key \
  --security-groups smartschool-sg \
  --count 1 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=smartschool}]'
```

Wait ~30s, then grab the public IP:

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=smartschool" "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].PublicIpAddress' --output text
```

Paste this IP into your DuckDNS subdomain so `smartschool.duckdns.org` resolves.

---

## 3. One-time setup on the EC2 box

```bash
ssh -i ~/.ssh/smartschool-key.pem ec2-user@<PUBLIC_IP>
```

Then on the box:

```bash
# Install Docker + Compose
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Compose v2 plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -fsSL \
  https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Re-login so the docker group applies, then:
exit
ssh -i ~/.ssh/smartschool-key.pem ec2-user@<PUBLIC_IP>

# Project location matches the path the GitHub workflow expects.
sudo mkdir -p /opt/smartschool
sudo chown ec2-user:ec2-user /opt/smartschool
cd /opt/smartschool

# Clone the repo (only Caddyfile + docker-compose.yml + .env are actually used here).
git clone https://github.com/Jaskirat314276/Winter-Project-24.git .

# Create the production .env. Fill in real values — see "Environment vars" below.
cp .env.example .env   # if you don't have one, create .env directly with the keys below.
nano .env

# First boot: pull images, run migrations, start everything.
docker compose pull
docker compose up -d
docker compose logs -f app   # watch for "Ready"; Ctrl+C when up
```

Hit `https://smartschool.duckdns.org` — Caddy will be issuing a cert on first
request, which can take 5–15 seconds. After that you should see the sign-in page.

---

## 4. Environment variables (the EC2 `.env`)

Create `/opt/smartschool/.env` with:

```ini
# Domain Caddy serves
DOMAIN=smartschool.duckdns.org

# Image to run (overridden by deploy workflow, but needed for first boot)
APP_IMAGE=ghcr.io/jaskirat314276/winter-project-24:latest

# Postgres
POSTGRES_USER=smartschool
POSTGRES_PASSWORD=<long-random-password>
POSTGRES_DB=smartschool

# Clerk — create a NEW production app at https://dashboard.clerk.com
# and use those keys (the pk_test_/sk_test_ in dev .env are dev-only)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Cloudinary (same as dev is fine; the unsigned upload preset must exist)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=SMARTSCHOOLERP
```

In the **Clerk dashboard** for the production app:
- **Domains** → add `smartschool.duckdns.org`
- **Users** → create your first admin user, set `publicMetadata.role = "admin"`

---

## 5. CI/CD: wire GitHub Actions to deploy on every push

In your GitHub repo → **Settings → Secrets and variables → Actions → New
repository secret**, add:

| Name | Value |
|---|---|
| `EC2_HOST` | The EC2 public IP or `smartschool.duckdns.org` |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Full contents of `~/.ssh/smartschool-key.pem` (paste the whole `-----BEGIN ... -----END-----` block) |

Push to `main` and watch the **Actions** tab:

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

The workflow:
1. Builds the Docker image with caching.
2. Pushes to `ghcr.io/jaskirat314276/winter-project-24:latest` and `:sha-XXXXXXX`.
3. SSHes into the EC2 box and runs `docker compose pull && docker compose up -d`.

Total: ~2 minutes per deploy.

---

## 6. Database backups (manual, until you decide to automate)

```bash
# On the EC2 box:
docker compose exec postgres pg_dump -U smartschool smartschool \
  | gzip > backup-$(date +%F).sql.gz

# Pull it down to your laptop:
scp -i ~/.ssh/smartschool-key.pem \
  ec2-user@<EC2_HOST>:/opt/smartschool/backup-*.sql.gz ./
```

Cron line on the box for nightly backups:

```cron
0 3 * * * cd /opt/smartschool && docker compose exec -T postgres \
  pg_dump -U smartschool smartschool | gzip > /opt/smartschool/backups/$(date +\%F).sql.gz
```

---

## 7. Common operations

```bash
# Tail logs
docker compose logs -f app
docker compose logs -f caddy

# Run a Prisma migration manually
docker compose exec app npx prisma migrate deploy

# Open a Postgres shell
docker compose exec postgres psql -U smartschool

# Restart just the app
docker compose restart app

# Update Caddyfile and reload without downtime
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 8. Troubleshooting

- **"connection refused" on port 443**: Security group missing 443 ingress, or
  Caddy can't reach the app — check `docker compose ps`.
- **TLS handshake fails / Let's Encrypt rate-limited**: DuckDNS not pointing at
  this IP yet, or A record propagation. `dig smartschool.duckdns.org`.
- **Prisma "P1001: Can't reach database"**: Postgres healthcheck not green.
  `docker compose logs postgres`.
- **App boots but blank page**: Wrong Clerk keys (using `pk_test_` on a real
  domain). Check `docker compose logs app`.
- **GitHub Actions deploy fails at SSH step**: Wrong key (paste the full
  PEM, including `BEGIN/END` lines), wrong user (`ec2-user` for AL2023), or
  security group missing 22 ingress for GitHub Actions runner IP — for a
  permissive setup allow 22 from `0.0.0.0/0` (less safe), or use a bastion.
