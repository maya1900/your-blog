#!/usr/bin/env bash
# Security-focused smoke checks. Assumes server running on :4000.
set -eu

API=${API:-http://localhost:4000/api}
PY="python3 -c"

step() { printf "\n\033[1;34m=== %s ===\033[0m\n" "$1"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }
wait_api() {
  for _ in {1..50}; do
    curl -fsS "$API/health" >/dev/null 2>&1 && return 0
    sleep 0.2
  done
  fail "server not ready at $API"
}

wait_api

step "Login as testuser → TOKEN_U"
TOKEN_U=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"testuser","password":"testpass123"}' "$API/auth/login" \
  | $PY "import sys,json;d=json.load(sys.stdin); print(d['data']['token'] if 'data' in d else '')")
if [ -z "$TOKEN_U" ]; then
  step "testuser unavailable, registering throwaway security user"
  USERNAME="sectest$(date +%s)"
  TOKEN_U=$(curl -sS -X POST -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USERNAME\",\"email\":\"$USERNAME@moji.local\",\"password\":\"testpass123\"}" "$API/auth/register" \
    | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
fi
[ -n "$TOKEN_U" ] && ok "got token" || fail "no token"

step "Anonymous /api/link-preview → expect 401"
CODE=$(curl -sS "$API/link-preview?url=https://example.com" -o /dev/null -w '%{http_code}')
[ "$CODE" = "401" ] && ok "anon blocked" || fail "expected 401 got $CODE"

step "Link preview localhost SSRF attempt → expect 400"
CODE=$(curl -sS -H "Authorization: Bearer $TOKEN_U" \
  "$API/link-preview?url=http://127.0.0.1:4000/api/health" \
  -o /dev/null -w '%{http_code}')
[ "$CODE" = "400" ] && ok "localhost blocked" || fail "expected 400 got $CODE"

step "Link preview private IP SSRF attempt → expect 400"
CODE=$(curl -sS -H "Authorization: Bearer $TOKEN_U" \
  "$API/link-preview?url=http://10.0.0.1/" \
  -o /dev/null -w '%{http_code}')
[ "$CODE" = "400" ] && ok "private IP blocked" || fail "expected 400 got $CODE"

printf "\n\033[1;32m✓ Security smoke checks passed.\033[0m\n"
