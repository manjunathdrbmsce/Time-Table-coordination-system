# 🚀 Docker Deployment Guide - Timetable Coordination System

## For Windows 11 Server with Docker Desktop

This guide will help you deploy the application on your **Windows 11 server** with Docker Desktop for campus-wide access.

---

## 📋 Prerequisites

### On Your Server (Windows 11)
- ✅ **Docker Desktop** installed and running
- ✅ **WSL 2** enabled (Docker Desktop requirement)
- ✅ At least 4GB RAM available for Docker
- ✅ At least 10GB free disk space

### On Your Development Machine (Current PC)
- ✅ **PostgreSQL** installed (for pg_dump backup command)

---

## 📦 Step 1: Backup Your Current Database

### Option A: Using the Backup Script (Easiest)

Simply double-click:
```
backup-database.bat
```

Or run in PowerShell:
```powershell
.\backup-database.bat
```

### Option B: Manual Backup

```powershell
# Navigate to project directory
cd "D:\Apps\time table\reports\Timetable coordination system"

# Create backups folder
New-Item -ItemType Directory -Force -Path backups

# Set your PostgreSQL password (will prompt)
$env:PGPASSWORD = Read-Host "Enter PostgreSQL password"

# Create SQL backup
pg_dump -h localhost -p 5433 -U postgres -d timetable_db -f backups\timetable_backup.sql

# Create compressed dump backup (faster restore)
pg_dump -h localhost -p 5433 -U postgres -d timetable_db -F c -f backups\timetable_backup.dump

# Clear password
$env:PGPASSWORD = ""
```

✅ **Backup files will be in the `backups` folder**

---

## 📁 Step 2: Copy Project to Server

### Option A: USB Drive (Simplest)
1. Copy the entire project folder to USB drive
2. Plug USB into server
3. Copy to `C:\Apps\Timetable`

### Option B: Network Share
```powershell
# On the server - run as Administrator
Copy-Item -Path "\\YOUR_PC_NAME\SharedFolder\Timetable coordination system" -Destination "C:\Apps\Timetable" -Recurse
```

### Option C: Git Clone (If using version control)
```powershell
cd C:\Apps
git clone <your-repository-url> Timetable
```

### Option D: ZIP and Transfer
1. Right-click project folder → Send to → Compressed (zipped) folder
2. Copy ZIP to server
3. Extract to `C:\Apps\Timetable`

---

## ⚙️ Step 3: Configure Environment Variables

1. **Open PowerShell on the server** and navigate to project:
```powershell
cd "C:\Apps\Timetable"
```

2. **Copy the environment template:**
```powershell
Copy-Item .env.docker .env
```

3. **Edit the `.env` file:**
```powershell
notepad .env
```

4. **Update these values:**

```env
# Database Configuration
POSTGRES_USER=timetable_user
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_DB=timetable_db

# Application URL (use your server's IP address)
# Find your IP: ipconfig | Select-String "IPv4"
NEXTAUTH_URL=http://192.168.1.100:3080

# Generate a secure secret (see below)
AUTH_SECRET=your-32-character-random-string-here

# Database connection string (update password to match above)
DATABASE_URL=postgresql://timetable_user:YourSecurePassword123!@db:5432/timetable_db
```

### 🔑 Generate AUTH_SECRET:
Run this in PowerShell:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```
Copy the output and paste as your `AUTH_SECRET`.

### 🌐 Find Your Server IP:
```powershell
ipconfig | Select-String "IPv4"
```
Use the IPv4 address (e.g., `192.168.1.100`) in `NEXTAUTH_URL`.

---

## 🔨 Step 4: Build and Start Containers

Open **PowerShell as Administrator** on the server:

```powershell
# Navigate to project
cd "C:\Apps\Timetable"

# Build Docker images (takes 5-10 minutes first time)
docker compose build

# Start containers
docker compose up -d
```

### ✅ Verify containers are running:
```powershell
docker compose ps
```

You should see:
```
NAME              STATUS    PORTS
timetable-app     running   0.0.0.0:3080->3000/tcp
timetable-db      running   0.0.0.0:5433->5432/tcp
```

### 📋 Check logs if there are issues:
```powershell
docker compose logs app
docker compose logs db
```

---

## 🔄 Step 5: Restore Database from Backup

### Method 1: For SQL Backup (.sql file)
```powershell
# Copy backup into container
docker cp backups\timetable_backup.sql timetable-db:/backup.sql

# Restore the backup
docker exec timetable-db psql -U timetable_user -d timetable_db -f /backup.sql
```

### Method 2: For Dump Backup (.dump file)
```powershell
# Copy backup into container
docker cp backups\timetable_backup.dump timetable-db:/backup.dump

# Restore the backup
docker exec timetable-db pg_restore -U timetable_user -d timetable_db --clean --if-exists /backup.dump
```

### Method 3: Direct Pipe (SQL only)
```powershell
type backups\timetable_backup.sql | docker exec -i timetable-db psql -U timetable_user -d timetable_db
```

---

## 🔥 Step 6: Configure Windows Firewall

Run **PowerShell as Administrator**:

```powershell
# Allow web application port
New-NetFirewallRule -DisplayName "Timetable Web App (3080)" -Direction Inbound -Port 3080 -Protocol TCP -Action Allow

# Allow database port (only if external access needed)
New-NetFirewallRule -DisplayName "Timetable Database (5433)" -Direction Inbound -Port 5433 -Protocol TCP -Action Allow
```

### Verify rules were created:
```powershell
Get-NetFirewallRule -DisplayName "Timetable*" | Format-Table Name, DisplayName, Enabled
```

---

## 🌐 Step 7: Access Your Application

### On the server itself:
```
http://localhost:3080
```

### From other computers on campus:
```
http://YOUR_SERVER_IP:3080
```

Example: `http://192.168.1.100:3080`

---

## 🔄 Auto-Start on Windows Boot

### Step 1: Enable Docker Desktop Auto-Start
1. Open **Docker Desktop**
2. Go to **Settings** → **General**
3. ✅ Enable **"Start Docker Desktop when you sign in"**

### Step 2: Create Startup Script

Save this as `C:\Apps\Timetable\start-timetable.bat`:
```batch
@echo off
cd /d C:\Apps\Timetable
timeout /t 30 /nobreak
docker compose up -d
```

### Step 3: Add to Windows Startup
1. Press `Win + R`
2. Type `shell:startup` and press Enter
3. Right-click → New → Shortcut
4. Location: `C:\Apps\Timetable\start-timetable.bat`
5. Name: `Start Timetable`

---

## 🛠️ Troubleshooting

### View Logs
```powershell
# All logs
docker compose logs

# App logs only
docker compose logs app

# Database logs only  
docker compose logs db

# Follow logs live
docker compose logs -f
```

### Restart Services
```powershell
docker compose restart
```

### Stop Everything
```powershell
docker compose down
```

### Rebuild After Changes
```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Check What's Using a Port
```powershell
netstat -ano | findstr :3080
```

### Enter Container Shell
```powershell
# App container
docker exec -it timetable-app sh

# Database (psql prompt)
docker exec -it timetable-db psql -U timetable_user -d timetable_db
```

---

## 📊 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Port 3080 already in use** | Change port in `docker-compose.yml` or stop conflicting service |
| **Docker not running** | Start Docker Desktop from Start menu |
| **Database connection refused** | Wait 30 seconds, then check logs: `docker compose logs db` |
| **Can't access from other PCs** | Check firewall rules and use correct server IP |
| **App shows errors** | Check logs: `docker compose logs app` |

---

## 📅 Scheduled Backups on Server

### Create Backup Script
Save as `C:\Apps\Timetable\daily-backup.bat`:
```batch
@echo off
set BACKUP_DIR=C:\Apps\Timetable\backups
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

docker exec timetable-db pg_dump -U timetable_user -d timetable_db > "%BACKUP_DIR%\backup_%TIMESTAMP%.sql"

echo Backup created: %BACKUP_DIR%\backup_%TIMESTAMP%.sql
```

### Schedule with Task Scheduler
1. Open **Task Scheduler** (`taskschd.msc`)
2. Click **Create Basic Task**
3. Name: `Timetable Daily Backup`
4. Trigger: **Daily** at **2:00 AM**
5. Action: **Start a program** → `C:\Apps\Timetable\daily-backup.bat`
6. ✅ Check "Run whether user is logged on or not"

---

## 📋 Quick Command Reference

| Command | Description |
|---------|-------------|
| `docker compose build` | Build images |
| `docker compose up -d` | Start containers |
| `docker compose down` | Stop containers |
| `docker compose logs -f` | View live logs |
| `docker compose ps` | List running containers |
| `docker compose restart` | Restart containers |
| `docker compose pull` | Update base images |

---

## 🔌 Ports Used

| Service | Port | Purpose |
|---------|------|---------|
| **Web Application** | 3080 | Access via `http://SERVER_IP:3080` |
| **PostgreSQL** | 5433 | Database (external access) |

---

## 📞 Need Help?

1. Check logs: `docker compose logs`
2. Verify `.env` file has correct values
3. Ensure Docker Desktop is running
4. Check firewall allows ports 3080/5433
5. Restart Docker Desktop if issues persist

---

## ✅ Quick Deployment Checklist

- [ ] Database backed up (`backup-database.bat`)
- [ ] Project copied to server (`C:\Apps\Timetable`)
- [ ] `.env` file configured with correct IP and password
- [ ] Docker images built (`docker compose build`)
- [ ] Containers started (`docker compose up -d`)
- [ ] Database restored (if migrating data)
- [ ] Firewall configured (port 3080 allowed)
- [ ] Tested from another PC on campus
- [ ] Auto-start configured (Docker Desktop + startup script)
