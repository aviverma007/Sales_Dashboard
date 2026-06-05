# auto_fetch_qms.ps1
# Fetches QMS data automatically using Windows session
# Schedule this via Task Scheduler to run every 30 minutes

$DataDir = "$PSScriptRoot\data"
if (!(Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }

$BASE = "https://smartworlddevelopersonline.com/bi-power"

$APIs = @{
    "qms_pr.json"  = "$BASE/bi_prs.php"
    "qms_nfa.json" = "$BASE/bi_nfas.php"
    "qms_mkt.json" = "$BASE/bi_market_place.php"
    "qms_eot.json" = "$BASE/bi_eot.php"
}

# Use IE/Edge session (uses your Windows/browser cookies automatically)
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "Fetching QMS data at $(Get-Date -Format 'HH:mm:ss')..."

foreach ($file in $APIs.Keys) {
    $url = $APIs[$file]
    $out = Join-Path $DataDir $file
    try {
        $response = Invoke-WebRequest -Uri $url `
            -WebSession $session `
            -UseDefaultCredentials `
            -Headers @{ "Accept"="application/json"; "X-Requested-With"="XMLHttpRequest" } `
            -UseBasicParsing `
            -TimeoutSec 30

        if ($response.StatusCode -eq 200 -and $response.Content -ne '{"status":"unauthorized"}') {
            $response.Content | Out-File -FilePath $out -Encoding UTF8
            $data = $response.Content | ConvertFrom-Json
            $count = if ($data.data) { $data.data.Count } else { $data.Count }
            Write-Host "  ✅ $file → $count rows"
        } else {
            Write-Host "  ❌ $file → unauthorized or empty"
        }
    } catch {
        Write-Host "  ❌ $file → $_"
    }
}

# Signal Node server to reload
try {
    Invoke-WebRequest -Uri "http://localhost:3001/api/reload" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "  🔄 Server reloaded"
} catch {}

Write-Host "Done at $(Get-Date -Format 'HH:mm:ss')"
