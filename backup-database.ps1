# ===============================================
# Database Backup Script for Windows
# ===============================================
# Run this script before deploying to server
# ===============================================

param(
    [string]$Host = "localhost",
    [string]$Port = "5433",
    [string]$User = "postgres",
    [string]$Database = "timetable_db",
    [string]$OutputDir = ".\backups"
)

Write-Host "🔄 Timetable Database Backup Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Create backup directory if it doesn't exist
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "📁 Created backup directory: $OutputDir" -ForegroundColor Green
}

# Generate timestamp for backup filename
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $OutputDir "timetable_backup_$timestamp.sql"
$dumpFile = Join-Path $OutputDir "timetable_backup_$timestamp.dump"

Write-Host ""
Write-Host "📊 Backup Configuration:" -ForegroundColor Yellow
Write-Host "   Host: $Host"
Write-Host "   Port: $Port"
Write-Host "   User: $User"
Write-Host "   Database: $Database"
Write-Host ""

# Check if pg_dump is available
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Host "❌ pg_dump not found! Please ensure PostgreSQL is installed and in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "1. Add PostgreSQL bin folder to PATH (e.g., C:\Program Files\PostgreSQL\16\bin)"
    Write-Host "2. Run this from PostgreSQL command prompt"
    Write-Host "3. Specify full path to pg_dump"
    exit 1
}

Write-Host "⏳ Creating SQL backup..." -ForegroundColor Yellow

# Set password environment variable (you'll be prompted if not set)
$env:PGPASSWORD = Read-Host -Prompt "Enter PostgreSQL password" -AsSecureString | 
    ForEach-Object { [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

try {
    # Create SQL format backup (more portable)
    & pg_dump -h $Host -p $Port -U $User -d $Database -f $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "✅ SQL Backup created: $backupFile ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "❌ SQL Backup failed!" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "⏳ Creating compressed dump backup..." -ForegroundColor Yellow
    
    # Create compressed dump format backup (faster restore)
    & pg_dump -h $Host -p $Port -U $User -d $Database -F c -f $dumpFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $dumpFile).Length / 1MB
        Write-Host "✅ Dump Backup created: $dumpFile ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "❌ Dump Backup failed!" -ForegroundColor Red
    }

} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    $env:PGPASSWORD = ""
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Backup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Files to copy to server:" -ForegroundColor Yellow
Write-Host "   - $backupFile (SQL format - use for manual inspection)"
Write-Host "   - $dumpFile (Dump format - use for faster restore)"
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy the entire project folder to your server"
Write-Host "2. Follow the instructions in DOCKER_DEPLOYMENT.md"
Write-Host ""
