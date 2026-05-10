$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$Host.UI.RawUI.WindowTitle = 'GitHub Upload'
Set-Location -LiteralPath $PSScriptRoot

function Show-ErrorAndExit($message, $code = 1) {
    Write-Host "`n[Error] $message" -ForegroundColor Red
    exit $code
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  GitHub Upload' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

$topic = Read-Host 'Enter commit message'
if ([string]::IsNullOrWhiteSpace($topic)) {
    Show-ErrorAndExit 'Commit message required. Aborted.'
}

Write-Host ''
Write-Host '[1/3] Staging changes...' -ForegroundColor Yellow

& git add .
if ($LASTEXITCODE -ne 0) {
    Show-ErrorAndExit 'Git add failed.'
}

$added = (& git diff --cached --name-only).Count
$deleted = (& git diff --cached --diff-filter=D --name-only).Count
if ($added -eq 0 -and $deleted -eq 0) {
    Write-Host 'No changes to commit.' -ForegroundColor Green
    exit 0
}

Write-Host "       $added changed, $deleted deleted" -ForegroundColor Gray

Write-Host ''
Write-Host '[2/3] Committing...' -ForegroundColor Yellow
& git commit -m $topic
if ($LASTEXITCODE -ne 0) {
    Show-ErrorAndExit 'Commit failed.'
}

Write-Host ''
Write-Host '[3/3] Pushing to GitHub...' -ForegroundColor Yellow
$pushLog = Join-Path $env:TEMP 'photo-map-git-push.log'
if (Test-Path $pushLog) { Remove-Item $pushLog -Force -ErrorAction SilentlyContinue }

& git push origin master *> $pushLog
if ($LASTEXITCODE -ne 0) {
    $logText = ''
    if (Test-Path $pushLog) {
        $logText = Get-Content -LiteralPath $pushLog -Raw -ErrorAction SilentlyContinue
    }
    Write-Host "`n[Error] Push failed:" -ForegroundColor Red
    if ($logText) { Write-Host $logText -ForegroundColor DarkYellow }
    exit 1
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host '  PUSH SUCCESS' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
& git log -1 --oneline
Write-Host ''
exit 0
