param([string]$Base = "http://localhost:3001")
$p = 0; $f = 0

function OK($t) { Write-Host "  PASS $t" -ForegroundColor Green; $global:p++ }
function FAIL($t) { Write-Host "  FAIL $t" -ForegroundColor Red; $global:f++ }

function API($url, $method="GET", $json="") {
  $req = [System.Net.HttpWebRequest]::Create($url)
  $req.Method = $method
  if ($json) {
    $b = [Text.Encoding]::UTF8.GetBytes($json)
    $req.ContentType = "application/json"; $req.ContentLength = $b.Length
    $s = $req.GetRequestStream(); $s.Write($b,0,$b.Length); $s.Close()
  }
  try {
    $r = $req.GetResponse()
    $txt = (New-Object IO.StreamReader($r.GetResponseStream())).ReadToEnd()
    return @{ code=[int]$r.StatusCode; body=($txt|ConvertFrom-Json -EA SilentlyContinue) }
  } catch [Net.WebException] {
    $txt = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    return @{ code=[int]$_.Exception.Response.StatusCode; body=($txt|ConvertFrom-Json -EA SilentlyContinue) }
  }
}

# ── 1. TypeScript ────────────────────────────────────────────────────────────
Write-Host "`n[1] TypeScript" -ForegroundColor Cyan
$tsc = & npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) { OK "0 type errors" } else { FAIL "TS errors: $tsc" }

# ── 2. Auth pages ────────────────────────────────────────────────────────────
Write-Host "`n[2] Auth Pages" -ForegroundColor Cyan
$login  = Invoke-WebRequest "$Base/login"  -UseBasicParsing
$signup = Invoke-WebRequest "$Base/signup" -UseBasicParsing
if ($login.StatusCode  -eq 200) { OK "Login page 200" }  else { FAIL "Login $($login.StatusCode)" }
if ($signup.StatusCode -eq 200) { OK "Signup page 200" } else { FAIL "Signup $($signup.StatusCode)" }
if ($login.Content  -match "Continue with Google") { OK "Login has Google button" }  else { FAIL "Login missing Google" }
if ($signup.Content -match "Continue with Google") { OK "Signup has Google button" } else { FAIL "Signup missing Google" }
if ($login.Content  -match "Sign In")              { OK "Login has email form" }     else { FAIL "Login missing form" }

# ── 3. Unauthenticated = 401 ─────────────────────────────────────────────────
Write-Host "`n[3] Auth Protection (expect 401)" -ForegroundColor Cyan
foreach ($path in @("/api/meals","/api/payments","/api/bill","/api/settings","/api/clear-data")) {
  $r = API "$Base$path"
  if ($r.code -eq 401) { OK "$path → 401" } else { FAIL "$path → $($r.code)" }
}

# ── 4. NextAuth providers ─────────────────────────────────────────────────────
Write-Host "`n[4] NextAuth" -ForegroundColor Cyan
$prov = API "$Base/api/auth/providers"
if ($prov.body.google)      { OK "Google provider" }      else { FAIL "Google provider missing" }
if ($prov.body.credentials) { OK "Credentials provider" } else { FAIL "Credentials missing" }
$csrf = Invoke-WebRequest "$Base/api/auth/csrf" -UseBasicParsing
if ($csrf.StatusCode -eq 200) { OK "CSRF endpoint" } else { FAIL "CSRF $($csrf.StatusCode)" }

# ── 5. Register ───────────────────────────────────────────────────────────────
Write-Host "`n[5] Register" -ForegroundColor Cyan
$email = "test$(Get-Random -Max 9999)@tiffin.test"
$r = API "$Base/api/auth/register" "POST" "{`"name`":`"Rohan`",`"email`":`"$email`",`"password`":`"test123`"}"
if ($r.code -eq 201 -and $r.body.success) { OK "Register → 201" } else { FAIL "Register → $($r.code): $($r.body.error)" }
$r2 = API "$Base/api/auth/register" "POST" "{`"name`":`"X`",`"email`":`"$email`",`"password`":`"test123`"}"
if ($r2.code -eq 409) { OK "Duplicate email → 409" } else { FAIL "Duplicate → $($r2.code)" }
$r3 = API "$Base/api/auth/register" "POST" "{`"name`":`"X`",`"email`":`"bad`",`"password`":`"test123`"}"
if ($r3.code -eq 400) { OK "Bad email → 400" } else { FAIL "Bad email → $($r3.code)" }
$r4 = API "$Base/api/auth/register" "POST" "{`"name`":`"X`",`"email`":`"x@x.com`",`"password`":`"12`"}"
if ($r4.code -eq 400) { OK "Short password → 400" } else { FAIL "Short pass → $($r4.code)" }

# ── 6. Migration ──────────────────────────────────────────────────────────────
Write-Host "`n[6] DB Migration" -ForegroundColor Cyan
$mg = API "$Base/api/migrate"
if ($mg.body.success) { OK "Migration OK" } else { FAIL "Migration failed" }

# ── 7. SIGNED-IN flows (use session cookie) ───────────────────────────────────
Write-Host "`n[7] Signed-in API flows" -ForegroundColor Cyan

# Get CSRF token
$csrfBody = (Invoke-WebRequest "$Base/api/auth/csrf" -UseBasicParsing).Content | ConvertFrom-Json
$csrfToken = $csrfBody.csrfToken

# Sign in via credentials
$session = New-Object Net.CookieContainer
$signInReq = [Net.HttpWebRequest]::Create("$Base/api/auth/callback/credentials")
$signInReq.Method = "POST"; $signInReq.ContentType = "application/x-www-form-urlencoded"
$signInReq.AllowAutoRedirect = $false; $signInReq.CookieContainer = $session
$postData = "email=$email&password=test123&csrfToken=$csrfToken&callbackUrl=%2F&json=true"
$sb = [Text.Encoding]::UTF8.GetBytes($postData)
$signInReq.ContentLength = $sb.Length
$st = $signInReq.GetRequestStream(); $st.Write($sb,0,$sb.Length); $st.Close()
try { $signInResp = $signInReq.GetResponse() } catch {}
$sessionToken = ($session.GetCookies([Uri]"$Base") | Where-Object { $_.Name -match "session" } | Select-Object -First 1)
Write-Host "  Session token obtained: $($null -ne $sessionToken)"

function AuthAPI($url, $method="GET", $json="") {
  $req = [Net.HttpWebRequest]::Create($url)
  $req.Method = $method; $req.CookieContainer = $session
  if ($json) {
    $b = [Text.Encoding]::UTF8.GetBytes($json)
    $req.ContentType = "application/json"; $req.ContentLength = $b.Length
    $st2 = $req.GetRequestStream(); $st2.Write($b,0,$b.Length); $st2.Close()
  }
  try {
    $r = $req.GetResponse()
    $txt = (New-Object IO.StreamReader($r.GetResponseStream())).ReadToEnd()
    return @{ code=[int]$r.StatusCode; body=($txt|ConvertFrom-Json -EA SilentlyContinue) }
  } catch [Net.WebException] {
    $txt = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    return @{ code=[int]$_.Exception.Response.StatusCode; body=($txt|ConvertFrom-Json -EA SilentlyContinue) }
  }
}

# Settings
$s = AuthAPI "$Base/api/settings"
if ($s.code -eq 200 -and $s.body.success) { OK "Settings GET → 200, price=$($s.body.data.mealPrice)" } else { FAIL "Settings GET → $($s.code)" }

$su = AuthAPI "$Base/api/settings" "PUT" '{"mealPrice":75}'
if ($su.body.data.mealPrice -eq 75) { OK "Settings update → mealPrice=75" } else { FAIL "Settings update → $($su.code)" }
AuthAPI "$Base/api/settings" "PUT" '{"mealPrice":60}' | Out-Null  # reset

# Meals CRUD
$today = (Get-Date).ToString("yyyy-MM-dd")
$ml = AuthAPI "$Base/api/meals" "POST" "{`"date`":`"$today`",`"mealType`":`"lunch`",`"status`":`"received`"}"
if ($ml.body.success -and $ml.body.data.price -eq 60) { OK "Meal create lunch=received ₹60" } else { FAIL "Meal create → $($ml.code): $($ml.body.error)" }

$md = AuthAPI "$Base/api/meals" "POST" "{`"date`":`"$today`",`"mealType`":`"dinner`",`"status`":`"received`"}"
if ($md.body.success) { OK "Meal create dinner=received" } else { FAIL "Meal create dinner → $($md.body.error)" }

# Bill
$b = AuthAPI "$Base/api/bill"
if ($b.body.data.totalBill -ge 120) { OK "Bill = ₹$($b.body.data.totalBill) (≥120)" } else { FAIL "Bill wrong: $($b.body.data.totalBill)" }
if ($b.body.data.lunchCount -ge 1) { OK "lunchCount=$($b.body.data.lunchCount)" } else { FAIL "lunchCount wrong" }

# Edit meal
$lunchId = $ml.body.data._id
$me = AuthAPI "$Base/api/meals/$lunchId" "PUT" '{"status":"not_received"}'
if ($me.body.data.status -eq "not_received") { OK "Edit meal → not_received" } else { FAIL "Edit meal → $($me.code)" }
$b2 = AuthAPI "$Base/api/bill"
if ($b2.body.data.totalBill -lt $b.body.data.totalBill) { OK "Bill recalculated after edit (₹$($b2.body.data.totalBill))" } else { FAIL "Bill not recalculated" }

# Payment
$pr = AuthAPI "$Base/api/payments" "POST" "{`"amount`":50,`"date`":`"$today`",`"note`":`"UPI`"}"
if ($pr.body.success) { OK "Payment add ₹50" } else { FAIL "Payment add → $($pr.body.error)" }

$b3 = AuthAPI "$Base/api/bill"
if ($b3.body.remaining -lt $b3.body.totalBill) { OK "Remaining updated after payment" } else { FAIL "Remaining wrong" }

# Overpayment guard
$bigPay = AuthAPI "$Base/api/payments" "POST" "{`"amount`":99999,`"date`":`"$today`"}"
if ($bigPay.code -eq 400) { OK "Overpayment blocked → 400" } else { FAIL "Overpayment NOT blocked → $($bigPay.code)" }

# History filters
$hist = AuthAPI "$Base/api/meals?mealType=lunch"
$allLunch = ($hist.body.data | Where-Object { $_.mealType -ne "lunch" }).Count -eq 0
if ($allLunch) { OK "History filter mealType=lunch works" } else { FAIL "Filter mealType broken" }

$month = (Get-Date).ToString("yyyy-MM")
$mhist = AuthAPI "$Base/api/meals?month=$month"
if ($mhist.body.success) { OK "History filter month=$month works ($($mhist.body.data.Count) records)" } else { FAIL "Month filter broken" }

# Delete meal
$delId = $md.body.data._id
$del = AuthAPI "$Base/api/meals/$delId" "DELETE"
if ($del.body.success) { OK "Delete meal" } else { FAIL "Delete → $($del.code)" }

# Delete payment
$payId = $pr.body.data._id
$pdel = AuthAPI "$Base/api/payments/$payId" "DELETE"
if ($pdel.body.success) { OK "Delete payment" } else { FAIL "Delete payment → $($pdel.code)" }

# Export CSV
$exportReq = [Net.HttpWebRequest]::Create("$Base/api/export?startDate=$today&endDate=$today&format=csv")
$exportReq.CookieContainer = $session
$exportResp = $exportReq.GetResponse()
$csvCode = [int]$exportResp.StatusCode
$csvType = $exportResp.ContentType
$csvDisp = $exportResp.Headers["Content-Disposition"]
if ($csvCode -eq 200 -and $csvType -match "text/csv") { OK "Export CSV → 200 text/csv" } else { FAIL "Export CSV → $csvCode $csvType" }
if ($csvDisp -match "\.csv") { OK "CSV filename correct ($csvDisp)" } else { FAIL "CSV filename wrong: $csvDisp" }

# Export PDF
$pdfReq = [Net.HttpWebRequest]::Create("$Base/api/export?startDate=$today&endDate=$today&format=pdf")
$pdfReq.CookieContainer = $session
$pdfResp = $pdfReq.GetResponse()
$pdfCode = [int]$pdfResp.StatusCode
$pdfType = $pdfResp.ContentType
if ($pdfCode -eq 200 -and $pdfType -match "pdf") { OK "Export PDF → 200 application/pdf" } else { FAIL "Export PDF → $pdfCode $pdfType" }

# Clear data
$cl = AuthAPI "$Base/api/clear-data" "DELETE"
if ($cl.body.success) { OK "Clear data" } else { FAIL "Clear data → $($cl.code)" }
$bFinal = AuthAPI "$Base/api/bill"
if ($bFinal.body.data.totalBill -eq 0) { OK "Bill = 0 after clear" } else { FAIL "Bill not 0 after clear" }

# ── 8. Git safety ─────────────────────────────────────────────────────────────
Write-Host "`n[8] Security" -ForegroundColor Cyan
$tracked = & git ls-files ".env.local" 2>&1
if (-not $tracked) { OK ".env.local NOT in git" } else { FAIL ".env.local IS in git!" }
$gi = Get-Content ".gitignore" -Raw
if ($gi -match "\.env\*\.local") { OK ".gitignore protects secrets" } else { FAIL ".gitignore missing rule" }

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " $global:p PASSED  |  $global:f FAILED" -ForegroundColor $(if($global:f -eq 0){"Green"}else{"Yellow"})
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
