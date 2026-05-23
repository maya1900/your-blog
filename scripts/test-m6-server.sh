#!/usr/bin/env bash
# E2E smoke test for M6 admin endpoints.
# Assumes server running on :4000 and seed-articles ran (admin/admin123 + testuser).
set -eu

API=http://localhost:4000/api
PY="python3 -c"

step() { printf "\n\033[1;34m=== %s ===\033[0m\n" "$1"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }

step "Login as admin (TOKEN_A) and testuser (TOKEN_U)"
TOKEN_A=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"admin123"}' "$API/auth/login" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
TOKEN_U=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"testuser","password":"testpass123"}' "$API/auth/login" 2>/dev/null \
  | $PY "import sys,json;d=json.load(sys.stdin); print(d['data']['token'] if 'data' in d else '')")
if [ -z "$TOKEN_U" ]; then
  TOKEN_U=$(curl -sS -X POST -H 'Content-Type: application/json' \
    -d '{"username":"testuser","email":"testuser@moji.local","password":"testpass123"}' "$API/auth/register" \
    | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
fi
[ -n "$TOKEN_A" ] && [ -n "$TOKEN_U" ] && ok "got both tokens" || fail "missing tokens"

# Read testuser id (we'll need it later for the user-update test)
USER_ID=$(curl -sS -H "Authorization: Bearer $TOKEN_U" "$API/auth/me" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['id'])")
ok "testuser id=$USER_ID"

# ---------------- AUTHZ ----------------

step "Anonymous /api/admin/stats → 401"
CODE=$(curl -sS "$API/admin/stats" -o /dev/null -w '%{http_code}')
[ "$CODE" = "401" ] && ok "anon blocked" || fail "expected 401 got $CODE"

step "Non-admin /api/admin/stats → 403"
CODE=$(curl -sS -H "Authorization: Bearer $TOKEN_U" "$API/admin/stats" -o /dev/null -w '%{http_code}')
[ "$CODE" = "403" ] && ok "non-admin blocked" || fail "expected 403 got $CODE"

# ---------------- STATS ----------------

step "Admin /api/admin/stats → 200 with shape"
RESP=$(curl -sS -H "Authorization: Bearer $TOKEN_A" "$API/admin/stats")
TOTALS_USERS=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['totals']['users'])")
TOTALS_ARTS=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['totals']['articles'])")
TREND_LEN=$(echo "$RESP" | $PY "import sys,json;print(len(json.load(sys.stdin)['data']['trend']))")
[ -n "$TOTALS_USERS" ] && [ "$TREND_LEN" = "30" ] \
  && ok "users=$TOTALS_USERS articles=$TOTALS_ARTS trend=$TREND_LEN" \
  || fail "shape mismatch: users=$TOTALS_USERS arts=$TOTALS_ARTS trend=$TREND_LEN"

# ---------------- USERS ----------------

step "Admin list users → 200 + items[]"
TOTAL=$(curl -sS -H "Authorization: Bearer $TOKEN_A" "$API/admin/users?pageSize=5" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['total'])")
[ -n "$TOTAL" ] && [ "$TOTAL" -ge "2" ] && ok "got $TOTAL users" || fail "expected ≥ 2 users got $TOTAL"

step "Admin search users with keyword=testuser → 1+ result"
HIT=$(curl -sS -H "Authorization: Bearer $TOKEN_A" "$API/admin/users?keyword=testuser" \
  | $PY "import sys,json;d=json.load(sys.stdin)['data'];print(d['total'])")
[ "$HIT" -ge "1" ] && ok "matched $HIT" || fail "expected ≥ 1 hit got $HIT"

step "Toggle testuser.isActive=false then back to true"
RESP=$(curl -sS -X PATCH -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"isActive":false}' "$API/admin/users/$USER_ID")
ACTIVE=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['isActive'])")
[ "$ACTIVE" = "False" ] && ok "deactivated" || fail "expected False got $ACTIVE"
# A deactivated user can't log in
CODE=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"testuser","password":"testpass123"}' "$API/auth/login" -o /dev/null -w '%{http_code}')
[ "$CODE" = "401" ] && ok "deactivated user login blocked" || fail "expected 401 got $CODE"
# Re-activate
curl -sS -X PATCH -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"isActive":true}' "$API/admin/users/$USER_ID" > /dev/null
ok "re-activated"

step "Admin cannot demote themselves"
ADMIN_ID=$(curl -sS -H "Authorization: Bearer $TOKEN_A" "$API/auth/me" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['id'])")
CODE=$(curl -sS -X PATCH -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"role":"USER"}' "$API/admin/users/$ADMIN_ID" -o /dev/null -w '%{http_code}')
[ "$CODE" = "403" ] && ok "self-demotion blocked" || fail "expected 403 got $CODE"

# ---------------- COMMENTS ----------------

step "Admin list ALL comments"
RESP=$(curl -sS -H "Authorization: Bearer $TOKEN_A" "$API/admin/comments?pageSize=5")
CTOTAL=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['total'])")
ok "got $CTOTAL comments total"

# ---------------- CATEGORIES ----------------

step "Create category (admin)"
CAT_RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"name":"M6 试验分类"}' "$API/admin/categories")
CAT_ID=$(echo "$CAT_RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['id'])")
CAT_SLUG=$(echo "$CAT_RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['slug'])")
[ -n "$CAT_ID" ] && ok "created id=$CAT_ID slug=$CAT_SLUG" || fail "no id"

step "Create duplicate name → 409"
CODE=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"name":"M6 试验分类"}' "$API/admin/categories" -o /dev/null -w '%{http_code}')
[ "$CODE" = "409" ] && ok "dup blocked" || fail "expected 409 got $CODE"

step "Rename category"
RESP=$(curl -sS -X PUT -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"name":"M6 已更名分类"}' "$API/admin/categories/$CAT_ID")
NEWNAME=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['name'])")
[ "$NEWNAME" = "M6 已更名分类" ] && ok "renamed → $NEWNAME" || fail "name=$NEWNAME"

step "Non-admin DELETE category → 403"
CODE=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_U" \
  "$API/admin/categories/$CAT_ID" -o /dev/null -w '%{http_code}')
[ "$CODE" = "403" ] && ok "non-admin blocked" || fail "expected 403 got $CODE"

step "Delete empty category → 204"
CODE=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_A" \
  "$API/admin/categories/$CAT_ID" -o /dev/null -w '%{http_code}')
[ "$CODE" = "204" ] && ok "deleted" || fail "expected 204 got $CODE"

step "Cannot delete a category that still has articles"
# Pick category 1 (前端) which the seed populated with articles
CODE=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_A" \
  "$API/admin/categories/1" -o /dev/null -w '%{http_code}')
[ "$CODE" = "400" ] && ok "non-empty category blocked" || fail "expected 400 got $CODE"

# ---------------- TAGS ----------------

step "Pick any tag, then delete it"
TAGS=$(curl -sS "$API/tags")
TAG_ID=$(echo "$TAGS" | $PY "import sys,json;d=json.load(sys.stdin)['data']; print(d[-1]['id'] if d else '')")
if [ -n "$TAG_ID" ]; then
  CODE=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_A" \
    "$API/admin/tags/$TAG_ID" -o /dev/null -w '%{http_code}')
  [ "$CODE" = "204" ] && ok "tag $TAG_ID deleted" || fail "expected 204 got $CODE"
else
  ok "no tags to test (skipped)"
fi

printf "\n\033[1;32mM6 all checks passed ✓\033[0m\n"
