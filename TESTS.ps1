# GENERATO CON IA

# PROMPT: "Generate a PowerShell integration test script for a Node.js/Express REST API. The script must cover: input validation (zod schemas), authentication (JWT bearer token), NoSQL injection attempts, payload size limits, duplicate resource creation, and role-based access control. For each test case print PASS/FAIL with the actual vs expected HTTP status code. Use a shared helper function to avoid repetition. The API runs on localhost:3001."

$BASE = "http://localhost:3001/api"
$RUN = Get-Random -Minimum 10000 -Maximum 99999
$U1 = "tu1_$RUN"
$U2 = "tu2_$RUN"
$U3 = "tu3_$RUN"
$U4 = "tu4_$RUN"

# ─────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────
function Invoke-Api {
    # param($Method, $Url, $Body, $Token)
    param($Method, $Url, $Body, $Token, $RawBody)
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $params = @{ Method = $Method; Uri = $Url; Headers = $headers; ErrorAction = "Stop" }
        # if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Compress) }
        if ($RawBody) { $params["Body"] = $RawBody } elseif ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Compress) }
        $res = Invoke-WebRequest @params -UseBasicParsing
        return [PSCustomObject]@{ Status = $res.StatusCode; Body = ($res.Content | ConvertFrom-Json) }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        try { $body = ($_.ErrorDetails.Message | ConvertFrom-Json) } catch { $body = $_.ErrorDetails.Message }
        return [PSCustomObject]@{ Status = $status; Body = $body }
    }
}

function Test-Case {
    param($Name, $Got, $ExpectedStatus, $ExpectedKey)
    $statusOk = $Got.Status -eq $ExpectedStatus
    $bodyOk   = if ($ExpectedKey) { $Got.Body.PSObject.Properties.Name -contains $ExpectedKey } else { $true }
    $icon = if ($statusOk -and $bodyOk) { "PASS" } else { "FAIL" }
    Write-Host "[$icon] $Name  (got $($Got.Status), expected $ExpectedStatus)"
    if (-not $statusOk -or -not $bodyOk) { Write-Host "      body: $($Got.Body | ConvertTo-Json -Compress)" }
}

function Test-Check {
    param($Name, $Condition)
    $icon = if ($Condition) { "PASS" } else { "FAIL" }
    Write-Host "[$icon] $Name"
}

# ─────────────────────────────────────────────
# 1. AUTH — SIGNUP
# ─────────────────────────────────────────────
Write-Host "`n=== AUTH: SIGNUP ==="

# $r = Invoke-Api POST "$BASE/auth/signup" @{ username = "testuser1"; password = "Password1!" }
$r = Invoke-Api POST "$BASE/auth/signup" @{ username = $U1; password = "Password1!" }
Test-Case "Signup valido → 201 + token" $r 201 "token"
$TOKEN = $r.Body.token

# $r = Invoke-Api POST "$BASE/auth/signup" @{ username = "testuser1"; password = "Password1!" }
$r = Invoke-Api POST "$BASE/auth/signup" @{ username = $U1; password = "Password1!" }
Test-Case "Signup duplicato → 409" $r 409 "error"

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = "ab"; password = "Password1!" }
Test-Case "Username troppo corto (< 3) → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = "testuser2"; password = "short" }
Test-Case "Password troppo corta (< 8) → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = @{ '$gt' = "" }; password = "Password1!" }
Test-Case "NoSQL injection su username → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = "testuser3"; password = ("A" * 73) }
Test-Case "Password troppo lunga (> 72) → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = "user with spaces"; password = "Password1!" }
Test-Case "Username con spazi (non alfanumerico) → 400" $r 400 "error"

# ─────────────────────────────────────────────
# 2. AUTH — LOGIN
# ─────────────────────────────────────────────
Write-Host "`n=== AUTH: LOGIN ==="

# $r = Invoke-Api POST "$BASE/auth/login" @{ username = "testuser1"; password = "Password1!" }
$r = Invoke-Api POST "$BASE/auth/login" @{ username = $U1; password = "Password1!" }
Test-Case "Login valido → 200 + token" $r 200 "token"
$TOKEN = $r.Body.token

# $r = Invoke-Api POST "$BASE/auth/login" @{ username = "testuser1"; password = "wrongpassword" }
$r = Invoke-Api POST "$BASE/auth/login" @{ username = $U1; password = "wrongpassword" }
Test-Case "Password errata → 401" $r 401 "error"

$r = Invoke-Api POST "$BASE/auth/login" @{ username = "nonexistent"; password = "Password1!" }
Test-Case "Utente inesistente → 401" $r 401 "error"

$r = Invoke-Api POST "$BASE/auth/login" @{ username = @{ '$gt' = "" }; password = "Password1!" }
Test-Case "NoSQL injection su login → 400" $r 400 "error"

# ─────────────────────────────────────────────
# 3. PAYLOAD TROPPO GRANDE
# ─────────────────────────────────────────────
Write-Host "`n=== BODY LIMIT ==="

$bigBody = @{ username = "testuser1"; password = ("A" * 11000) }
$r = Invoke-Api POST "$BASE/auth/login" $bigBody
Test-Case "Payload > 10kb → 413" $r 413 "error"

$r = Invoke-Api PUT "$BASE/event/note" -RawBody '{"note": ' -Token $TOKEN
Test-Case "JSON malformato → 400 (non 500)" $r 400 "error"

# ─────────────────────────────────────────────
# 3b. HEADER DI SICUREZZA (helmet)
# ─────────────────────────────────────────────
Write-Host "`n=== HEADER DI SICUREZZA ==="

$h = Invoke-WebRequest "$BASE/health" -UseBasicParsing
Test-Check "Content-Security-Policy presente" ([bool]$h.Headers["Content-Security-Policy"])
Test-Check "Strict-Transport-Security presente" ([bool]$h.Headers["Strict-Transport-Security"])
Test-Check "X-Frame-Options presente" ([bool]$h.Headers["X-Frame-Options"])
Test-Check "X-Content-Type-Options = nosniff" ($h.Headers["X-Content-Type-Options"] -eq "nosniff")
Test-Check "X-Powered-By assente" (-not $h.Headers["X-Powered-By"])

# ─────────────────────────────────────────────
# 4. JWT — TOKEN MANCANTE / INVALIDO
# ─────────────────────────────────────────────
Write-Host "`n=== JWT ==="

$r = Invoke-Api GET "$BASE/event/me"
Test-Case "Nessun token → 401" $r 401 "error"

$r = Invoke-Api GET "$BASE/event/me" -Token "invalid.token.here"
Test-Case "Token non valido → 401" $r 401 "error"

$r = Invoke-Api GET "$BASE/event/me" -Token $TOKEN
Test-Case "Token valido → 200" $r 200 "username"

# ─────────────────────────────────────────────
# 5. ATTENDANCE
# ─────────────────────────────────────────────
Write-Host "`n=== ATTENDANCE ==="

$r = Invoke-Api PUT "$BASE/event/attendance" @{ attending = "yes" } $TOKEN
Test-Case "Attendance 'yes' valida → 200" $r 200 "attending"

$r = Invoke-Api PUT "$BASE/event/attendance" @{ attending = "maybe" } $TOKEN
Test-Case "Attendance valore non valido → 400" $r 400 "error"

$r = Invoke-Api PUT "$BASE/event/attendance" @{ attending = @{ '$gt' = "" } } $TOKEN
Test-Case "NoSQL injection su attendance → 400" $r 400 "error"

# ─────────────────────────────────────────────
# 6. NOTE
# ─────────────────────────────────────────────
Write-Host "`n=== NOTE ==="

$r = Invoke-Api PUT "$BASE/event/note" @{ note = "arrivo tardi" } $TOKEN
Test-Case "Nota valida → 200" $r 200 "note"

$r = Invoke-Api PUT "$BASE/event/note" @{ note = ("A" * 201) } $TOKEN
Test-Case "Nota > 200 caratteri → 400" $r 400 "error"

# ─────────────────────────────────────────────
# 6b. XSS — il payload è trattato come testo
# ─────────────────────────────────────────────
Write-Host "`n=== XSS ==="

$XSS = '<img src=x onerror=alert(1)>'
$r = Invoke-Api PUT "$BASE/event/note" @{ note = $XSS } $TOKEN
Test-Case "Nota con payload XSS → 200 (salvata come stringa)" $r 200 "note"
Test-Check "Payload restituito come stringa JSON identica, nessuna esecuzione lato server" ($r.Body.note -eq $XSS)

$r = Invoke-Api GET "$BASE/event/attendees" -Token $TOKEN
$me = @($r.Body) | Where-Object { $_.username -eq $U1 }
Test-Check "Lista partecipanti contiene l'utente con la nota (fix sanitizeFilter su `$ne)" ($me -and $me.note -eq $XSS)
Write-Host "      Verifica nel browser: la nota appare come testo letterale, nessun alert (escaping di Vue {{ }})"

# ─────────────────────────────────────────────
# 7. CARS — SEATS VALIDATION
# ─────────────────────────────────────────────
Write-Host "`n=== CARS: SEATS ==="

$r = Invoke-Api POST "$BASE/event/cars" @{ seats = 4 } $TOKEN
Test-Case "Crea macchina seats=4 → 201" $r 201 "driverUsername"
$CAR_ID = $r.Body._id

$r = Invoke-Api POST "$BASE/event/cars" @{ seats = 4 } $TOKEN
Test-Case "Crea macchina duplicata (stesso driver) → 409" $r 409 "error"

$r = Invoke-Api POST "$BASE/event/cars" @{ seats = 0 } $TOKEN
Test-Case "Seats = 0 → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/event/cars" @{ seats = 21 } $TOKEN
Test-Case "Seats = 21 (> 20) → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/event/cars" @{ seats = -1 } $TOKEN
Test-Case "Seats negativo → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/event/cars" @{ seats = 100 } $TOKEN
Test-Case "Seats = 100 → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/event/cars" @{ seats = "4" } $TOKEN
Test-Case "Seats come stringa → 400" $r 400 "error"

# ─────────────────────────────────────────────
# 8. CARS — ID VALIDATION
# ─────────────────────────────────────────────
Write-Host "`n=== CARS: ID VALIDATION ==="

$r = Invoke-Api DELETE "$BASE/event/cars/notanid" -Token $TOKEN
Test-Case "DELETE car ID non valido → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/event/cars/notanid/join" -Token $TOKEN
Test-Case "JOIN car ID non valido → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/event/cars/notanid/leave" -Token $TOKEN
Test-Case "LEAVE car ID non valido → 400" $r 400 "error"

$r = Invoke-Api PUT "$BASE/event/cars/notanid" @{ seats = 4 } $TOKEN
Test-Case "PUT car ID non valido → 400" $r 400 "error"

# ─────────────────────────────────────────────
# 8b. CARS — IDOR (utente diverso dal conducente)
# ─────────────────────────────────────────────
Write-Host "`n=== CARS: IDOR ==="

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = $U2; password = "Password1!" }
$TOKEN2 = $r.Body.token
$null = Invoke-Api PUT "$BASE/event/attendance" @{ attending = "yes" } $TOKEN2

$r = Invoke-Api DELETE "$BASE/event/cars/$CAR_ID" -Token $TOKEN2
Test-Case "Non conducente DELETE /cars/:id → 403" $r 403 "error"

$r = Invoke-Api PUT "$BASE/event/cars/$CAR_ID" @{ seats = 5 } $TOKEN2
Test-Case "Non conducente PUT /cars/:id → 403" $r 403 "error"

$r = Invoke-Api GET "$BASE/event/cars" -Token $TOKEN
Test-Check "La macchina esiste ancora dopo i tentativi del non conducente" (@($r.Body) | Where-Object { $_._id -eq $CAR_ID })

# ─────────────────────────────────────────────
# 8c. CARS — JOIN ATOMICO
# ─────────────────────────────────────────────
Write-Host "`n=== CARS: JOIN ATOMICO ==="

$r = Invoke-Api POST "$BASE/event/cars/$CAR_ID/join" -Token $TOKEN2
Test-Case "Join → 200" $r 200 "passengers"

$r = Invoke-Api POST "$BASE/event/cars/$CAR_ID/join" -Token $TOKEN2
Test-Case "Join ripetuto → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/event/cars/$CAR_ID/join" -Token $TOKEN
Test-Case "Conducente sulla propria macchina → 400" $r 400 "error"

$r = Invoke-Api POST "$BASE/event/cars" @{ seats = 1 } $TOKEN2
Test-Case "Macchina da 1 posto → 201" $r 201 "driverUsername"
$CAR2_ID = $r.Body._id

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = $U3; password = "Password1!" }
$TOKEN3 = $r.Body.token
$r = Invoke-Api POST "$BASE/auth/signup" @{ username = $U4; password = "Password1!" }
$TOKEN4 = $r.Body.token
$null = Invoke-Api PUT "$BASE/event/attendance" @{ attending = "yes" } $TOKEN3
$null = Invoke-Api PUT "$BASE/event/attendance" @{ attending = "yes" } $TOKEN4

$joinUrl = "$BASE/event/cars/$CAR2_ID/join"
$jobs = foreach ($t in @($TOKEN3, $TOKEN4)) {
    $ps = [powershell]::Create().AddScript({
        param($u, $t)
        try { (Invoke-WebRequest -Method POST -Uri $u -Headers @{ Authorization = "Bearer $t" } -UseBasicParsing -ErrorAction Stop).StatusCode }
        catch { $_.Exception.Response.StatusCode.value__ }
    }).AddArgument($joinUrl).AddArgument($t)
    [PSCustomObject]@{ PS = $ps; Handle = $ps.BeginInvoke() }
}
$codes = foreach ($j in $jobs) { $j.PS.EndInvoke($j.Handle); $j.PS.Dispose() }
$okCount = @($codes | Where-Object { $_ -eq 200 }).Count
Test-Check "Due join concorrenti su 1 posto → esattamente 1 successo (got $($codes -join ', '))" ($okCount -eq 1)

$r = Invoke-Api GET "$BASE/event/cars" -Token $TOKEN
$car2 = @($r.Body) | Where-Object { $_._id -eq $CAR2_ID }
Test-Check "Passeggeri <= posti ($(@($car2.passengers).Count)/$($car2.seats))" (@($car2.passengers).Count -le $car2.seats)

# ─────────────────────────────────────────────
# 9. ADMIN — accesso non admin
# ─────────────────────────────────────────────
Write-Host "`n=== ADMIN: ACCESSO NON ADMIN ==="

$r = Invoke-Api GET "$BASE/admin/users" -Token $TOKEN
Test-Case "Utente normale su /admin/users → 403" $r 403 "error"

$r = Invoke-Api DELETE "$BASE/admin/users/000000000000000000000001" -Token $TOKEN
Test-Case "Utente normale su DELETE /admin/users/:id → 403" $r 403 "error"

# ─────────────────────────────────────────────
# 10. ADMIN — ID non valido (richiede token admin)
#     Sostituire $ADMIN_TOKEN con un token admin reale
# ─────────────────────────────────────────────
Write-Host "`n=== ADMIN: ID VALIDATION (richiede token admin) ==="
Write-Host "  [SKIP] Imposta ADMIN_TOKEN per eseguire questi test"
# $ADMIN_TOKEN = "..."
# $r = Invoke-Api DELETE "$BASE/admin/users/notanid" -Token $ADMIN_TOKEN
# Test-Case "Admin DELETE user ID non valido → 400" $r 400 "error"
# $r = Invoke-Api PUT "$BASE/admin/cars/notanid" @{ seats = 4 } $ADMIN_TOKEN
# Test-Case "Admin PUT car ID non valido → 400" $r 400 "error"

Write-Host "`n=== FINE ==="
