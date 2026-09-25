# ==============================================================================
# SCRIPT TỰ ĐỘNG SAO LƯU DỮ LIỆU POSTGRESQL (BACKUP)
# ==============================================================================

param(
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "shoes_store_db",
    [string]$DbUser = "postgres",
    [string]$BackupDir = "./backup/dumps"
)

# Tạo thư mục lưu backup nếu chưa tồn tại
if (!(Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir/backup_${DbName}_${Timestamp}.sql"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📦 BẮT ĐẦU SAO LƯU DỮ LIỆU POSTGRESQL" -ForegroundColor Cyan
Write-Host "Database: $DbName | Host: $DbHost" -ForegroundColor Yellow
Write-Host "Tập tin đích: $BackupFile" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# Thực hiện pg_dump
try {
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F p -b -v -f $BackupFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Sao lưu thành công: $BackupFile" -ForegroundColor Green
    } else {
        Write-Host "❌ Quá trình sao lưu thất bại (Exit code: $LASTEXITCODE)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Có lỗi xảy ra trong quá trình backup: $_" -ForegroundColor Red
}
