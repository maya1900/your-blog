#!/usr/bin/env bash
# E2E smoke test for M5 upload endpoint.
# Assumes server running on :4000 and testuser exists (seeded by M1 or earlier M4 run).
set -eu

API=http://localhost:4000/api
ORIGIN=http://localhost:4000
PY="python3 -c"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

step() { printf "\n\033[1;34m=== %s ===\033[0m\n" "$1"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }

step "Login as testuser → TOKEN_U"
TOKEN_U=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"testuser","password":"testpass123"}' "$API/auth/login" \
  | $PY "import sys,json;d=json.load(sys.stdin); print(d['data']['token'] if 'data' in d else '')")
if [ -z "$TOKEN_U" ]; then
  step "testuser not found, registering"
  TOKEN_U=$(curl -sS -X POST -H 'Content-Type: application/json' \
    -d '{"username":"testuser","email":"testuser@moji.local","password":"testpass123"}' "$API/auth/register" \
    | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
fi
[ -n "$TOKEN_U" ] && ok "got token" || fail "no token"

step "Build fixtures: a real 67-byte PNG, a fake PDF, and a 6MB blob"
# Smallest valid PNG (1x1 transparent), base64-decoded into a real file.
$PY "import base64,sys; open('$TMP/ok.png','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='))"
printf '%%PDF-1.4\n%%fake\n' > "$TMP/evil.pdf"
# 6 MB of zeros, with a .png extension to test the size limit specifically.
dd if=/dev/zero of="$TMP/big.png" bs=1024 count=6144 status=none
ok "fixtures ready in $TMP"

step "POST /api/upload/image without auth → expect 401"
CODE=$(curl -sS -X POST -F "file=@$TMP/ok.png;type=image/png" \
  "$API/upload/image" -o /dev/null -w '%{http_code}')
[ "$CODE" = "401" ] && ok "anon blocked" || fail "expected 401 got $CODE"

step "POST with empty form (no file) → expect 400"
CODE=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" \
  "$API/upload/image" -o /dev/null -w '%{http_code}')
[ "$CODE" = "400" ] && ok "empty body blocked" || fail "expected 400 got $CODE"

step "Upload valid PNG → expect 201 + url + reachable static path"
RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" \
  -F "file=@$TMP/ok.png;type=image/png" "$API/upload/image")
URL=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['url'])")
SIZE=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['size'])")
MIME=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['mimeType'])")
[ -n "$URL" ] && ok "url=$URL size=$SIZE mime=$MIME" || fail "no url"
[ "$MIME" = "image/png" ] || fail "expected mime image/png got $MIME"

step "Static GET $URL → expect 200"
CODE=$(curl -sS "$ORIGIN$URL" -o /dev/null -w '%{http_code}')
[ "$CODE" = "200" ] && ok "static serve works" || fail "static fetch failed: $CODE"

step "Upload PDF (wrong mime + ext) → expect 400"
CODE=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" \
  -F "file=@$TMP/evil.pdf;type=application/pdf" "$API/upload/image" \
  -o /dev/null -w '%{http_code}')
[ "$CODE" = "400" ] && ok "PDF rejected" || fail "expected 400 got $CODE"

step "Upload image with mismatched ext (.txt) → expect 400"
cp "$TMP/ok.png" "$TMP/sneaky.txt"
CODE=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" \
  -F "file=@$TMP/sneaky.txt;type=image/png" "$API/upload/image" \
  -o /dev/null -w '%{http_code}')
[ "$CODE" = "400" ] && ok ".txt rejected even with image/png mime" || fail "expected 400 got $CODE"

step "Upload 6MB file → expect 413"
CODE=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" \
  -F "file=@$TMP/big.png;type=image/png" "$API/upload/image" \
  -o /dev/null -w '%{http_code}')
[ "$CODE" = "413" ] && ok "size limit enforced" || fail "expected 413 got $CODE"

printf "\n\033[1;32m✓ All M5 server tests passed.\033[0m\n"
