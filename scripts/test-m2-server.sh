#!/usr/bin/env bash
# E2E smoke test for M2 article CRUD.
# Assumes server running on :4000 and seed data loaded (admin/admin123).
set -eu

API=http://localhost:4000/api
PY="python3 -c"

step() { printf "\n\033[1;34m=== %s ===\033[0m\n" "$1"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }

step "Login as admin → get TOKEN_A"
TOKEN_A=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"admin123"}' "$API/auth/login" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
[ -n "$TOKEN_A" ] && ok "admin token: ${TOKEN_A:0:24}…" || fail "no admin token"

step "Login as testuser → get TOKEN_U"
TOKEN_U=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"testuser","password":"testpass123"}' "$API/auth/login" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
[ -n "$TOKEN_U" ] && ok "user token:  ${TOKEN_U:0:24}…" || fail "no user token"

step "Get category id (前端)"
CAT_ID=$(curl -sS "$API/categories" \
  | $PY "import sys,json;data=json.load(sys.stdin)['data'];print(next(c['id'] for c in data if c['name']=='前端'))")
ok "category 前端 id=$CAT_ID"

step "Create DRAFT article as testuser"
CREATE=$(curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_U" \
  -d "{\"title\":\"测试文章 · TanStack Query 缓存策略\",\"summary\":\"草稿示例\",\"content\":\"# Hello\\n\\nThis is a draft.\",\"categoryId\":$CAT_ID,\"tags\":[\"React\",\"TanStack\",\"缓存\"],\"status\":\"DRAFT\"}" \
  "$API/articles")
ARTICLE_ID=$(echo "$CREATE" | $PY "import sys,json;print(json.load(sys.stdin)['data']['id'])")
ARTICLE_SLUG=$(echo "$CREATE" | $PY "import sys,json;print(json.load(sys.stdin)['data']['slug'])")
TAG_COUNT=$(echo "$CREATE" | $PY "import sys,json;print(len(json.load(sys.stdin)['data']['tags']))")
ok "created id=$ARTICLE_ID slug=$ARTICLE_SLUG tags=$TAG_COUNT"
[ "$TAG_COUNT" = "3" ] || fail "expected 3 tags, got $TAG_COUNT"

step "GET draft by slug as visitor → expect 404 (drafts hidden)"
CODE=$(curl -sS -o /dev/null -w '%{http_code}' "$API/articles/$ARTICLE_SLUG")
[ "$CODE" = "404" ] && ok "visitor sees draft as 404" || fail "expected 404 got $CODE"

step "GET draft by slug as author → expect 200"
CODE=$(curl -sS -H "Authorization: Bearer $TOKEN_U" -o /dev/null -w '%{http_code}' "$API/articles/$ARTICLE_SLUG")
[ "$CODE" = "200" ] && ok "author can read own draft" || fail "expected 200 got $CODE"

step "GET draft by slug as admin → expect 200"
CODE=$(curl -sS -H "Authorization: Bearer $TOKEN_A" -o /dev/null -w '%{http_code}' "$API/articles/$ARTICLE_SLUG")
[ "$CODE" = "200" ] && ok "admin can read any draft" || fail "expected 200 got $CODE"

step "List public articles → draft should NOT appear"
LIST_HAS_DRAFT=$(curl -sS "$API/articles" \
  | $PY "import sys,json;ids=[a['id'] for a in json.load(sys.stdin)['data']['items']];print($ARTICLE_ID in ids)")
[ "$LIST_HAS_DRAFT" = "False" ] && ok "draft hidden from public list" || fail "draft leaked into public list"

step "Publish article"
PUBLISH=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" "$API/articles/$ARTICLE_ID/publish")
STATUS=$(echo "$PUBLISH" | $PY "import sys,json;print(json.load(sys.stdin)['data']['status'])")
PUBLISHED_AT=$(echo "$PUBLISH" | $PY "import sys,json;print(json.load(sys.stdin)['data']['publishedAt'])")
[ "$STATUS" = "PUBLISHED" ] && ok "status=PUBLISHED publishedAt=$PUBLISHED_AT" || fail "status=$STATUS"

step "List public articles → published one SHOULD appear"
LIST_HAS_PUB=$(curl -sS "$API/articles" \
  | $PY "import sys,json;ids=[a['id'] for a in json.load(sys.stdin)['data']['items']];print($ARTICLE_ID in ids)")
[ "$LIST_HAS_PUB" = "True" ] && ok "published article in public list" || fail "published article missing"

step "Search by keyword → title hit"
KW_HIT=$(curl -sS --get --data-urlencode "keyword=测试文章" "$API/articles" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['total'])")
[ "$KW_HIT" -ge "1" ] && ok "keyword search returns $KW_HIT result(s)" || fail "keyword search returned 0"

step "Filter by tag"
TAG_HIT=$(curl -sS --get --data-urlencode "tag=TanStack" "$API/articles" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['total'])")
[ "$TAG_HIT" -ge "1" ] && ok "tag filter returns $TAG_HIT result(s)" || fail "tag filter returned 0"

step "Update article as testuser → title changed"
UPDATED=$(curl -sS -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_U" \
  -d '{"title":"测试文章 (已更新)","tags":["React"]}' \
  "$API/articles/$ARTICLE_ID" \
  | $PY "import sys,json;d=json.load(sys.stdin)['data'];print(d['title']+'|'+str(len(d['tags'])))")
[ "$UPDATED" = "测试文章 (已更新)|1" ] && ok "title + tags updated" || fail "update result: $UPDATED"

step "Update article as DIFFERENT user (admin) → admin override should work"
ADMIN_UPDATE=$(curl -sS -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d '{"summary":"admin override summary"}' \
  "$API/articles/$ARTICLE_ID" -o /dev/null -w '%{http_code}')
[ "$ADMIN_UPDATE" = "200" ] && ok "admin can update any article" || fail "admin update got $ADMIN_UPDATE"

step "Create draft as testuser, then admin lists drafts via ?authorId + ?status"
DRAFT2=$(curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_U" \
  -d "{\"title\":\"draft for admin filter test\",\"content\":\"x\",\"categoryId\":$CAT_ID,\"tags\":[],\"status\":\"DRAFT\"}" \
  "$API/articles" | $PY "import sys,json;print(json.load(sys.stdin)['data']['id'])")
USER_ID=$(curl -sS -H "Authorization: Bearer $TOKEN_U" "$API/auth/me" | $PY "import sys,json;print(json.load(sys.stdin)['data']['id'])")
DRAFTS_COUNT=$(curl -sS -H "Authorization: Bearer $TOKEN_A" "$API/articles?authorId=$USER_ID&status=DRAFT" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['total'])")
[ "$DRAFTS_COUNT" -ge "1" ] && ok "admin can list user's drafts (total=$DRAFTS_COUNT)" || fail "drafts not listable: $DRAFTS_COUNT"

step "Delete by non-owner (admin already privileged → use another regular user)"
# Register a 3rd user
THIRD=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"username":"third","email":"third@moji.local","password":"thirdpass123"}' "$API/auth/register" 2>&1)
TOKEN_T=$(echo "$THIRD" | $PY "import sys,json;d=json.load(sys.stdin); print(d['data']['token'] if 'data' in d else '')")
if [ -z "$TOKEN_T" ]; then
  # Already exists, just login
  TOKEN_T=$(curl -sS -X POST -H 'Content-Type: application/json' \
    -d '{"identifier":"third","password":"thirdpass123"}' "$API/auth/login" \
    | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
fi
NONOWNER_DEL=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_T" "$API/articles/$ARTICLE_ID" \
  -o /dev/null -w '%{http_code}')
[ "$NONOWNER_DEL" = "403" ] && ok "non-owner delete blocked with 403" || fail "expected 403 got $NONOWNER_DEL"

step "Delete as author"
DEL=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_U" "$API/articles/$ARTICLE_ID" \
  -o /dev/null -w '%{http_code}')
[ "$DEL" = "204" ] && ok "author delete returns 204" || fail "expected 204 got $DEL"

step "Verify deletion: slug now 404"
CODE=$(curl -sS -o /dev/null -w '%{http_code}' "$API/articles/$ARTICLE_SLUG")
[ "$CODE" = "404" ] && ok "deleted article returns 404" || fail "expected 404 got $CODE"

# Cleanup second draft so subsequent runs stay clean
curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_U" "$API/articles/$DRAFT2" > /dev/null

step "Validation: empty title → 400"
CODE=$(curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_U" \
  -d "{\"title\":\"\",\"content\":\"x\",\"categoryId\":$CAT_ID}" \
  "$API/articles" -o /dev/null -w '%{http_code}')
[ "$CODE" = "400" ] && ok "empty title → 400" || fail "expected 400 got $CODE"

step "Auth: create without token → 401"
CODE=$(curl -sS -X POST -H "Content-Type: application/json" \
  -d "{\"title\":\"x\",\"content\":\"x\",\"categoryId\":$CAT_ID}" \
  "$API/articles" -o /dev/null -w '%{http_code}')
[ "$CODE" = "401" ] && ok "anonymous create → 401" || fail "expected 401 got $CODE"

printf "\n\033[1;32m✓ All M2 server tests passed.\033[0m\n"
