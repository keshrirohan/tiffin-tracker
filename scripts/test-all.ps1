param([string]$Base = "http://localhost:3001")

$pass = 0; $fail = 0

function OK([string]$label) {
    Write-Host "  [PASS] $label" -ForegroundColor Green
    $global:pass++
}
function FAIL([string]$label) {
    Write-Host "  [FAIL] $label" -ForegroundColor Red
    $global:fail++
}

function Invoke-Api {
    param([string]$url, [string]$method = "GET", [string]$body = "")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.Method = $method
    if ($body) { $req.ContentType = "application/json"; $req.ContentLength = $bytes.Length }
    if ($body) { $s = $req.GetRequestStream(); $s.Write($bytes,0,$bytes.Length); $s.Close() }
    try {
        $resp = $req.GetResponse()
        $r = New-Object System.IO.StreamReader($resp.GetResponseStream())
        return @{ code=[int]$resp.StatusCode; body=($r.ReadToEnd() | ConvertFrom-Json) }
    } catch [System.Net.WebException] {
        $r = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $text = $r.ReadToEnd()
        $parsed = try { $text | ConvertFrom-Json } catch { @{} }
        return @{ code=[int]$_.Exception.Response.StatusCode; body=$parsed }
    }
}

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 1] Page availability" -ForegroundColor Cyan

$lr = Invoke-WebRequest "$Base/login" -UseBasicParsing
if ($lr.StatusCode -eq 200) { OK "Login page 200" } else { FAIL "Login page $($lr.StatusCode)" }

$sr = Invoke-WebRequest "$Base/signup" -UseBasicParsing
if ($sr.StatusCode -eq 200) { OK "Signup page 200" } else { FAIL "Signup page $($sr.StatusCode)" }

if ($lr.Content -match "Continue with Google") { OK "Login has Google button" } else { FAIL "Login missing Google button" }
if ($lr.Content -match "Sign In") { OK "Login has Sign In form" } else { FAIL "Login missing Sign In" }
if ($sr.Content -match "Create Account") { OK "Signup page renders" } else { FAIL "Signup missing content" }
if ($sr.Content -match "Continue with Google") { OK "Signup has Google button" } else { FAIL "Signup missing Google" }

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 2] Unauthenticated API returns 401" -ForegroundColor Cyan

foreach ($path in @("/api/meals", "/api/payments", "/api/bill", "/api/settings", "/api/export?startDate=2026-10-01&endDate=2026-10-31")) {
    $r = Invoke-Api "$Base$path"
    if ($r.code -eq 401) { OK "$path → 401" } else { FAIL "$path → $($r.code) (expected 401)" }
}

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 3] User registration" -ForegroundColor Cyan

$email1 = "testuser_$(Get-Random -Maximum 9999)@tiffin.test"

# Valid registration
$r = Invoke-Api "$Base/api/auth/register" "POST" "{`"name`":`"Rohan Test`",`"email`":`"$email1`",`"password`":`"test123`"}"
if ($r.code -eq 201 -and $r.body.success) { OK "Register new user → 201" } else { FAIL "Register → $($r.code): $($r.body.error)" }

# Duplicate email
$r2 = Invoke-Api "$Base/api/auth/register" "POST" "{`"name`":`"Dup`",`"email`":`"$email1`",`"password`":`"test123`"}"
if ($r2.code -eq 409) { OK "Duplicate email → 409" } else { FAIL "Duplicate → $($r2.code)" }

# Missing fields
$r3 = Invoke-Api "$Base/api/auth/register" "POST" "{`"email`":`"only@email.com`"}"
if ($r3.code -eq 400) { OK "Missing fields → 400" } else { FAIL "Missing fields → $($r3.code)" }

# Short password
$r4 = Invoke-Api "$Base/api/auth/register" "POST" "{`"name`":`"X`",`"email`":`"x@x.com`",`"password`":`"123`"}"
if ($r4.code -eq 400) { OK "Short password → 400" } else { FAIL "Short password → $($r4.code)" }

# Invalid email format
$r5 = Invoke-Api "$Base/api/auth/register" "POST" "{`"name`":`"Test`",`"email`":`"bademail`",`"password`":`"test123`"}"
if ($r5.code -eq 400) { OK "Bad email → 400" } else { FAIL "Bad email → $($r5.code)" }

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 4] NextAuth endpoints" -ForegroundColor Cyan

# CSRF endpoint should exist
$csrf = Invoke-WebRequest "$Base/api/auth/csrf" -UseBasicParsing
if ($csrf.StatusCode -eq 200) { OK "NextAuth CSRF endpoint" } else { FAIL "NextAuth CSRF $($csrf.StatusCode)" }

# Providers endpoint lists google + credentials
$prov = Invoke-Api "$Base/api/auth/providers"
if ($prov.body.google) { OK "Google provider registered" } else { FAIL "Google provider missing" }
if ($prov.body.credentials) { OK "Credentials provider registered" } else { FAIL "Credentials provider missing" }

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 5] Settings API (unauthenticated)" -ForegroundColor Cyan

$r = Invoke-Api "$Base/api/settings"
if ($r.code -eq 401) { OK "Settings needs auth → 401" } else { FAIL "Settings → $($r.code)" }

$r2 = Invoke-Api "$Base/api/settings" "PUT" "{`"mealPrice`":70}"
if ($r2.code -eq 401) { OK "Settings PUT needs auth → 401" } else { FAIL "Settings PUT → $($r2.code)" }

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 6] PDF/CSV export endpoint (unauthenticated)" -ForegroundColor Cyan

$r = Invoke-Api "$Base/api/export?startDate=2026-10-01&endDate=2026-10-31&format=pdf"
if ($r.code -eq 401) { OK "Export PDF needs auth → 401" } else { FAIL "Export PDF → $($r.code)" }

$r2 = Invoke-Api "$Base/api/export?startDate=2026-10-01&endDate=2026-10-31&format=csv"
if ($r2.code -eq 401) { OK "Export CSV needs auth → 401" } else { FAIL "Export CSV → $($r2.code)" }

# Export without dates → 401 (auth checked first)
$r3 = Invoke-Api "$Base/api/export"
if ($r3.code -eq 401) { OK "Export no params → 401 (auth first)" } else { FAIL "Export → $($r3.code)" }

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 7] Clear-data needs auth" -ForegroundColor Cyan

$bytes = [System.Text.Encoding]::UTF8.GetBytes("")
$req = [System.Net.HttpWebRequest]::Create("$Base/api/clear-data")
$req.Method = "DELETE"; $req.ContentLength = 0
try {
    $resp = $req.GetResponse()
    FAIL "Clear-data should need auth, got $([int]$resp.StatusCode)"
} catch [System.Net.WebException] {
    $code = [int]$_.Exception.Response.StatusCode
    if ($code -eq 401) { OK "Clear-data needs auth → 401" } else { FAIL "Clear-data → $code" }
}

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 8] TypeScript + Build" -ForegroundColor Cyan

$tsc = & npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) { OK "TypeScript: 0 errors" } else { FAIL "TypeScript errors: $tsc" }

# ─────────────────────────────────────────────────────────
Write-Host "`n[TEST 9] .env.local not in git" -ForegroundColor Cyan

$staged = & git status --short 2>&1
if ($staged -match "env.local") { FAIL ".env.local is tracked by git!" } else { OK ".env.local NOT in git (secrets safe)" }

$tracked = & git ls-files ".env.local" 2>&1
if ($tracked) { FAIL ".env.local is in git history!" } else { OK ".env.local not in git history" }

$gitignore = Get-Content ".gitignore" -Raw
if ($gitignore -match "\.env\*\.local") { OK ".gitignore covers .env*.local" } else { FAIL ".gitignore missing .env.local rule" }

# ─────────────────────────────────────────────────────────
Write-Host "`n════════════════════════════════════" -ForegroundColor Cyan
Write-Host " RESULTS: $global:pass passed  |  $global:fail failed" -ForegroundColor $(if($global:fail -eq 0){"Green"}else{"Yellow"})
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
