# ==============================================================================
# SCRIPT TỰ ĐỘNG PHỤC HỒI DỮ LIỆU POSTGRESQL (RESTORE)
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "shoes_store_db",
    [string]$DbUser = "postgres"
)

if (!(Test-Path -Path $BackupFile)) {
    Write-Host "❌ Không tìm thấy tập tin sao lưu: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔄 BẮT ĐẦU PHỤC HỒI DỮ LIỆU POSTGRESQL" -ForegroundColor Cyan
Write-Host "Tập tin nguồn: $BackupFile" -ForegroundColor Yellow
Write-Host "Database đích: $DbName | Host: $DbHost" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

try {
    & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $BackupFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Phục hồi dữ liệu thành công!" -ForegroundColor Green
    } else {
        Write-Host "❌ Quá trình phục hồi thất bại (Exit code: $LASTEXITCODE)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Có lỗi xảy ra trong quá trình restore: $_" -ForegroundColor Red
}
