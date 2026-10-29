param([string]$Base = "http://localhost:3000")
$p = 0; $f = 0

function OK($t)   { Write-Host "  ✅ $t" -ForegroundColor Green; $global:p++ }
function FAIL($t) { Write-Host "  ❌ $t" -ForegroundColor Red;   $global:f++ }

function API($url, $method="GET", $json="", [System.Net.CookieContainer]$jar=$null) {
  $req = [Net.HttpWebRequest]::Create($url)
  $req.Method = $method
  if ($jar) { $req.CookieContainer = $jar }
  if ($json) {
    $b = [Text.Encoding]::UTF8.GetBytes($json)
    $req.ContentType = "application/json"; $req.ContentLength = $b.Length
    $s = $req.GetRequestStream(); $s.Write($b,0,$b.Length); $s.Close()
  }
  try {
    $r = $req.GetResponse()
    $txt = (New-Object IO.StreamReader($r.GetResponseStream())).ReadToEnd()
    return @{ code=[int]$r.StatusCode; body=($txt|ConvertFrom-Json -EA SilentlyContinue); raw=$txt }
  } catch [Net.WebException] {
    $txt = ""
    try { $txt = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
    return @{ code=[int]$_.Exception.Response.StatusCode; body=($txt|ConvertFrom-Json -EA SilentlyContinue); raw=$txt }
  }
}

# ── 1. TypeScript ──────────────────────────────────────────────────────────
Write-Host "`n[1] TypeScript" -ForegroundColor Cyan
$tsc = & npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) { OK "0 type errors" } else { FAIL "TS errors: $($tsc -join ' ')" }

# ── 2. Pages load ──────────────────────────────────────────────────────────
Write-Host "`n[2] Page availability" -ForegroundColor Cyan
foreach ($page in @("/login", "/signup", "/offline", "/privacy")) {
  $r = Invoke-WebRequest "$Base$page" -UseBasicParsing -ErrorAction SilentlyContinue
  if ($r.StatusCode -eq 200) { OK "$page → 200" } else { FAIL "$page → $($r.StatusCode)" }
}

# ── 3. Login page content ──────────────────────────────────────────────────
Write-Host "`n[3] Auth page content" -ForegroundColor Cyan
$lp = Invoke-WebRequest "$Base/login" -UseBasicParsing
if ($lp.Content -match "Continue with Google")  { OK "Login has Google button" }  else { FAIL "Login missing Google button" }
if ($lp.Content -match "Sign In")                { OK "Login has email form" }     else { FAIL "Login missing email form" }
$sp = Invoke-WebRequest "$Base/signup" -UseBasicParsing
if ($sp.Content -match "Create Account")         { OK "Signup renders" }           else { FAIL "Signup broken" }
if ($sp.Content -match "Continue with Google")   { OK "Signup has Google button" } else { FAIL "Signup missing Google" }

# ── 4. NextAuth ────────────────────────────────────────────────────────────
Write-Host "`n[4] NextAuth" -ForegroundColor Cyan
$csrf = Invoke-WebRequest "$Base/api/auth/csrf" -UseBasicParsing
if ($csrf.StatusCode -eq 200)                       { OK "CSRF endpoint" }       else { FAIL "CSRF $($csrf.StatusCode)" }
$prov = API "$Base/api/auth/providers"
if ($prov.body.google)                              { OK "Google provider" }      else { FAIL "Google provider missing" }
if ($prov.body.credentials)                         { OK "Credentials provider" } else { FAIL "Credentials missing" }
$callbackUrl = $prov.body.google.callbackUrl
if ($callbackUrl -notmatch "5vz4nn|localhost:3000$" -or $callbackUrl -match "localhost:3000") {
  OK "Google callback URL: $callbackUrl"
} else { FAIL "Google callback URL is wrong: $callbackUrl" }

# ── 5. Auth protection (401) ───────────────────────────────────────────────
Write-Host "`n[5] Auth protection" -ForegroundColor Cyan
foreach ($path in @("/api/meals","/api/payments","/api/bill","/api/settings","/api/export?startDate=2026-10-01&endDate=2026-10-31","/api/push/subscribe","/api/push/send")) {
  $r = API "$Base$path"
  if ($r.code -eq 401) { OK "$path → 401" } else { FAIL "$path → $($r.code) (expected 401)" }
}

# ── 6. Register ────────────────────────────────────────────────────────────
Write-Host "`n[6] Register endpoint" -ForegroundColor Cyan
$email = "test$(Get-Random -Max 9999)@tiffin.test"

$r1 = API "$Base/api/register" "POST" "{`"name`":`"Rohan`",`"email`":`"$email`",`"password`":`"test123`"}"
if ($r1.code -eq 201 -and $r1.body.success) { OK "Register new user → 201" } else { FAIL "Register → $($r1.code): $($r1.body.error)" }

$r2 = API "$Base/api/register" "POST" "{`"name`":`"X`",`"email`":`"$email`",`"password`":`"test123`"}"
if ($r2.code -eq 409) { OK "Duplicate email → 409" } else { FAIL "Duplicate → $($r2.code)" }

$r3 = API "$Base/api/register" "POST" "{`"name`":`"X`",`"email`":`"bademail`",`"password`":`"test123`"}"
if ($r3.code -eq 400) { OK "Bad email → 400" } else { FAIL "Bad email → $($r3.code)" }

$r4 = API "$Base/api/register" "POST" "{`"name`":`"X`",`"email`":`"x@x.com`",`"password`":`"12`"}"
if ($r4.code -eq 400) { OK "Short password → 400" } else { FAIL "Short password → $($r4.code)" }

# ── 7. Authenticated flow (sign in via credentials) ────────────────────────
Write-Host "`n[7] Authenticated API flows" -ForegroundColor Cyan

$jar = New-Object Net.CookieContainer
$csrfToken = (API "$Base/api/auth/csrf").body.csrfToken

# Sign in
$signInReq = [Net.HttpWebRequest]::Create("$Base/api/auth/callback/credentials")
$signInReq.Method = "POST"; $signInReq.ContentType = "application/x-www-form-urlencoded"
$signInReq.AllowAutoRedirect = $false; $signInReq.CookieContainer = $jar
$postData = [Text.Encoding]::UTF8.GetBytes("email=$email&password=test123&csrfToken=$csrfToken&callbackUrl=%2F&json=true")
$signInReq.ContentLength = $postData.Length
$st = $signInReq.GetRequestStream(); $st.Write($postData,0,$postData.Length); $st.Close()
try { $signInReq.GetResponse() | Out-Null } catch {}

$hasCookie = ($jar.GetCookies([Uri]"$Base") | Where-Object { $_.Name -match "session" }).Count -gt 0
if ($hasCookie) { OK "Session cookie set after login" } else { FAIL "No session cookie after login" }

function AuthAPI($url, $method="GET", $json="") { return API $url $method $json $jar }

# Settings
$s = AuthAPI "$Base/api/settings"
if ($s.code -eq 200 -and $s.body.success) { OK "Settings GET → price=₹$($s.body.data.mealPrice)" } else { FAIL "Settings GET → $($s.code)" }

$su = AuthAPI "$Base/api/settings" "PUT" '{"mealPrice":75}'
if ($su.body.data.mealPrice -eq 75) { OK "Settings update mealPrice → 75" } else { FAIL "Settings PUT → $($su.code)" }
AuthAPI "$Base/api/settings" "PUT" '{"mealPrice":60}' | Out-Null

# Meals - single
$today = (Get-Date).ToString("yyyy-MM-dd")
$ml = AuthAPI "$Base/api/meals" "POST" "{`"date`":`"$today`",`"mealType`":`"lunch`",`"status`":`"received`"}"
if ($ml.body.success -and $ml.body.data.price -eq 60) { OK "Create lunch=received ₹60" } else { FAIL "Create lunch → $($ml.code): $($ml.body.error)" }

$md = AuthAPI "$Base/api/meals" "POST" "{`"date`":`"$today`",`"mealType`":`"dinner`",`"status`":`"received`"}"
if ($md.body.success) { OK "Create dinner=received ₹60" } else { FAIL "Create dinner → $($md.body.error)" }

# Dual meals for specific date (the new feature)
$yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
$dl = AuthAPI "$Base/api/meals" "POST" "{`"date`":`"$yesterday`",`"mealType`":`"lunch`",`"status`":`"received`"}"
$dd = AuthAPI "$Base/api/meals" "POST" "{`"date`":`"$yesterday`",`"mealType`":`"dinner`",`"status`":`"not_received`"}"
if ($dl.body.success -and $dd.body.success) { OK "Dual meal (lunch+dinner) for specific date → both saved" } else { FAIL "Dual meal save failed" }
$dayMeals = AuthAPI "$Base/api/meals?date=$yesterday"
if ($dayMeals.body.data.Count -eq 2) { OK "Both meals retrieved for date: $yesterday" } else { FAIL "Expected 2 meals, got $($dayMeals.body.data.Count)" }

# Bill
$b = AuthAPI "$Base/api/bill"
if ($b.body.data.totalBill -ge 120) { OK "Bill = ₹$($b.body.data.totalBill)" } else { FAIL "Bill wrong: $($b.body.data.totalBill)" }

# Edit
$lunchId = $ml.body.data._id
$me = AuthAPI "$Base/api/meals/$lunchId" "PUT" '{"status":"not_received"}'
if ($me.body.data.status -eq "not_received") { OK "Edit meal → not_received" } else { FAIL "Edit → $($me.code)" }
$b2 = AuthAPI "$Base/api/bill"
if ($b2.body.data.totalBill -lt $b.body.data.totalBill) { OK "Bill recalculated after edit (₹$($b2.body.data.totalBill))" } else { FAIL "Bill not recalculated" }

# Payment
$remaining = $b2.body.data.remaining
$payAmt = [Math]::Min(50, $remaining)
$pr = AuthAPI "$Base/api/payments" "POST" "{`"amount`":$payAmt,`"date`":`"$today`",`"note`":`"UPI`"}"
if ($pr.body.success) { OK "Add payment ₹$payAmt" } else { FAIL "Payment → $($pr.body.error)" }

# Overpayment guard
$bigPay = AuthAPI "$Base/api/payments" "POST" "{`"amount`":99999,`"date`":`"$today`"}"
if ($bigPay.code -eq 400) { OK "Overpayment blocked → 400" } else { FAIL "Overpayment NOT blocked → $($bigPay.code)" }

# History filters
$hist = AuthAPI "$Base/api/meals?mealType=lunch"
$allLunch = ($hist.body.data | Where-Object { $_.mealType -ne "lunch" }).Count -eq 0
if ($allLunch) { OK "Filter mealType=lunch works" } else { FAIL "Filter mealType broken" }

$month = (Get-Date).ToString("yyyy-MM")
$mhist = AuthAPI "$Base/api/meals?month=$month"
if ($mhist.body.success -and $mhist.body.data.Count -gt 0) { OK "Filter month=$month ($($mhist.body.data.Count) records)" } else { FAIL "Month filter broken" }

# Monthly bill
$mb = AuthAPI "$Base/api/bill?month=$month"
if ($mb.body.success -and $mb.body.data.totalBill -ge 0) { OK "Monthly bill → ₹$($mb.body.data.totalBill)" } else { FAIL "Monthly bill broken" }

# Delete meal
$del = AuthAPI "$Base/api/meals/$lunchId" "DELETE"
if ($del.body.success) { OK "Delete meal" } else { FAIL "Delete meal → $($del.code)" }

# Delete payment
$payId = $pr.body.data._id
$pdel = AuthAPI "$Base/api/payments/$payId" "DELETE"
if ($pdel.body.success) { OK "Delete payment" } else { FAIL "Delete payment → $($pdel.code)" }

# Export CSV
$expReq = [Net.HttpWebRequest]::Create("$Base/api/export?startDate=$today&endDate=$today&format=csv")
$expReq.CookieContainer = $jar
$expResp = try { $expReq.GetResponse() } catch { $null }
if ($expResp -and [int]$expResp.StatusCode -eq 200 -and $expResp.ContentType -match "csv") {
  OK "Export CSV → 200 text/csv | filename: $($expResp.Headers['Content-Disposition'])"
} else { FAIL "Export CSV failed" }

# Export PDF
$pdfReq = [Net.HttpWebRequest]::Create("$Base/api/export?startDate=$today&endDate=$today&format=pdf")
$pdfReq.CookieContainer = $jar
$pdfResp = try { $pdfReq.GetResponse() } catch { $null }
if ($pdfResp -and [int]$pdfResp.StatusCode -eq 200 -and $pdfResp.ContentType -match "pdf") {
  OK "Export PDF → 200 application/pdf"
} else { FAIL "Export PDF failed" }

# Migration (idempotent)
$mg = API "$Base/api/migrate"
if ($mg.body.success) { OK "DB migration idempotent" } else { FAIL "Migration failed" }

# Push subscribe endpoint (needs auth, returns 400 for empty body — not 401)
$pushNoSub = AuthAPI "$Base/api/push/subscribe" "POST" "{}"
if ($pushNoSub.code -eq 400) { OK "Push subscribe: empty body → 400" } else { FAIL "Push subscribe → $($pushNoSub.code)" }

# Clear data
$cl = AuthAPI "$Base/api/clear-data" "DELETE"
if ($cl.body.success) { OK "Clear data" } else { FAIL "Clear data → $($cl.code)" }
$bFinal = AuthAPI "$Base/api/bill"
if ($bFinal.body.data.totalBill -eq 0) { OK "Bill = ₹0 after clear" } else { FAIL "Bill not 0 after clear: ₹$($bFinal.body.data.totalBill)" }

# ── 8. Security ────────────────────────────────────────────────────────────
Write-Host "`n[8] Security" -ForegroundColor Cyan
$tracked = & git ls-files ".env.local" 2>&1
if (-not $tracked) { OK ".env.local not in git" } else { FAIL ".env.local IS in git!" }
$gi = Get-Content ".gitignore" -Raw
if ($gi -match "\.env\*\.local") { OK ".gitignore protects secrets" } else { FAIL ".gitignore missing rule" }

# ── 9. Key files exist ─────────────────────────────────────────────────────
Write-Host "`n[9] Required files" -ForegroundColor Cyan
foreach ($f in @("public/manifest.json","public/sw-custom.js","public/icons/icon-192x192.png","src/components/ui/dialog.tsx","src/components/ui/switch.tsx","src/components/ui/button.tsx","src/models/PushSubscription.ts","vercel.json")) {
  if (Test-Path $f) { OK "$f exists" } else { FAIL "$f MISSING" }
}

# ── 10. Vercel.json has NEXTAUTH_URL ───────────────────────────────────────
Write-Host "`n[10] Vercel config" -ForegroundColor Cyan
$vj = Get-Content "vercel.json" -Raw | ConvertFrom-Json
if ($vj.env.NEXTAUTH_URL -eq "https://tiffin-tracker-ashy.vercel.app") { OK "vercel.json NEXTAUTH_URL correct" } else { FAIL "vercel.json NEXTAUTH_URL wrong: $($vj.env.NEXTAUTH_URL)" }

# ── Summary ────────────────────────────────────────────────────────────────
Write-Host "`n════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  $global:p PASSED  |  $global:f FAILED" -ForegroundColor $(if($global:f -eq 0){"Green"}else{"Yellow"})
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
