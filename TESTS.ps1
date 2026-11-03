# GENERATO CON IA

# PROMPT: "Generate a PowerShell integration test script for a Node.js/Express REST API. The script must cover: input validation (zod schemas), authentication (JWT bearer token), NoSQL injection attempts, payload size limits, duplicate resource creation, and role-based access control. For each test case print PASS/FAIL with the actual vs expected HTTP status code. Use a shared helper function to avoid repetition. The API runs on localhost:3001."

$BASE = "http://localhost:3001/api"

# ─────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────
function Invoke-Api {
    param($Method, $Url, $Body, $Token)
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $params = @{ Method = $Method; Uri = $Url; Headers = $headers; ErrorAction = "Stop" }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Compress) }
        $res = Invoke-WebRequest @params
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

# ─────────────────────────────────────────────
# 1. AUTH — SIGNUP
# ─────────────────────────────────────────────
Write-Host "`n=== AUTH: SIGNUP ==="

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = "testuser1"; password = "Password1!" }
Test-Case "Signup valido → 201 + token" $r 201 "token"
$TOKEN = $r.Body.token

$r = Invoke-Api POST "$BASE/auth/signup" @{ username = "testuser1"; password = "Password1!" }
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

$r = Invoke-Api POST "$BASE/auth/login" @{ username = "testuser1"; password = "Password1!" }
Test-Case "Login valido → 200 + token" $r 200 "token"
$TOKEN = $r.Body.token

$r = Invoke-Api POST "$BASE/auth/login" @{ username = "testuser1"; password = "wrongpassword" }
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
