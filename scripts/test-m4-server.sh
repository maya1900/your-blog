#!/usr/bin/env bash
# E2E smoke test for M4 comments + interactions + /me/favorites.
# Assumes server running on :4000 and seed-articles ran.
set -eu

API=http://localhost:4000/api
PY="python3 -c"

step() { printf "\n\033[1;34m=== %s ===\033[0m\n" "$1"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }

step "Login as admin (TOKEN_A) and as testuser (TOKEN_U)"
TOKEN_A=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"admin123"}' "$API/auth/login" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
TOKEN_U=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"testuser","password":"testpass123"}' "$API/auth/login" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
[ -n "$TOKEN_A" ] && [ -n "$TOKEN_U" ] && ok "got both tokens" || fail "missing tokens"

step "Pick first published article to play with"
ART=$(curl -sS "$API/articles?pageSize=1" \
  | $PY "import sys,json;a=json.load(sys.stdin)['data']['items'][0];print(a['id'],a['slug'])")
ART_ID=$(echo "$ART" | cut -d' ' -f1)
ART_SLUG=$(echo "$ART" | cut -d' ' -f2)
ok "article id=$ART_ID slug=$ART_SLUG"

step "Comment as anonymous → expect 401"
CODE=$(curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"content":"anon"}' "$API/articles/$ART_ID/comments" -o /dev/null -w '%{http_code}')
[ "$CODE" = "401" ] && ok "anon comment blocked" || fail "expected 401 got $CODE"

step "Comment as testuser → expect 201"
COMMENT_ID=$(curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_U" \
  -d '{"content":"first comment from testuser"}' "$API/articles/$ART_ID/comments" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['id'])")
ok "created comment id=$COMMENT_ID"

step "List comments → expect ≥ 1"
TOTAL=$(curl -sS "$API/articles/$ART_ID/comments" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['total'])")
[ "$TOTAL" -ge "1" ] && ok "list returns $TOTAL comment(s)" || fail "expected ≥ 1 got $TOTAL"

step "Empty comment → expect 400"
CODE=$(curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_U" \
  -d '{"content":"  "}' "$API/articles/$ART_ID/comments" -o /dev/null -w '%{http_code}')
[ "$CODE" = "400" ] && ok "empty body blocked" || fail "expected 400 got $CODE"

step "Delete by ADMIN (not the commenter, not the author) → expect 204"
CODE=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_A" \
  "$API/articles/$ART_ID/comments/$COMMENT_ID" -o /dev/null -w '%{http_code}')
[ "$CODE" = "204" ] && ok "admin can delete any comment" || fail "expected 204 got $CODE"

step "Re-add comment so we can test commenter-self delete"
COMMENT_ID=$(curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_U" \
  -d '{"content":"another one"}' "$API/articles/$ART_ID/comments" \
  | $PY "import sys,json;print(json.load(sys.stdin)['data']['id'])")
ok "comment id=$COMMENT_ID"

step "Make a 3rd user, try to delete testuser's comment → expect 403"
TOKEN_T=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"third","password":"thirdpass123"}' "$API/auth/login" 2>/dev/null \
  | $PY "import sys,json;d=json.load(sys.stdin); print(d['data']['token'] if 'data' in d else '')")
if [ -z "$TOKEN_T" ]; then
  TOKEN_T=$(curl -sS -X POST -H 'Content-Type: application/json' \
    -d '{"username":"third","email":"third@moji.local","password":"thirdpass123"}' "$API/auth/register" \
    | $PY "import sys,json;print(json.load(sys.stdin)['data']['token'])")
fi
CODE=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_T" \
  "$API/articles/$ART_ID/comments/$COMMENT_ID" -o /dev/null -w '%{http_code}')
[ "$CODE" = "403" ] && ok "non-owner blocked" || fail "expected 403 got $CODE"

step "Delete by self (testuser) → expect 204"
CODE=$(curl -sS -X DELETE -H "Authorization: Bearer $TOKEN_U" \
  "$API/articles/$ART_ID/comments/$COMMENT_ID" -o /dev/null -w '%{http_code}')
[ "$CODE" = "204" ] && ok "commenter self-delete" || fail "expected 204 got $CODE"

step "Toggle LIKE as testuser → liked=true, count=1"
RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" "$API/articles/$ART_ID/like")
LIKED=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['liked'])")
COUNT=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['likeCount'])")
[ "$LIKED" = "True" ] && [ "$COUNT" -ge "1" ] && ok "liked=$LIKED count=$COUNT" || fail "got liked=$LIKED count=$COUNT"

step "Toggle LIKE again → liked=false"
RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" "$API/articles/$ART_ID/like")
LIKED=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['liked'])")
[ "$LIKED" = "False" ] && ok "unliked" || fail "expected unliked, got $LIKED"

step "Toggle LIKE w/o auth → 401"
CODE=$(curl -sS -X POST "$API/articles/$ART_ID/like" -o /dev/null -w '%{http_code}')
[ "$CODE" = "401" ] && ok "anon like blocked" || fail "expected 401 got $CODE"

step "Toggle FAVORITE as testuser → favorited=true"
RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" "$API/articles/$ART_ID/favorite")
FAV=$(echo "$RESP" | $PY "import sys,json;print(json.load(sys.stdin)['data']['favorited'])")
[ "$FAV" = "True" ] && ok "favorited" || fail "expected favorited got $FAV"

step "Article detail as testuser → liked / favorited reflected"
DETAIL=$(curl -sS -H "Authorization: Bearer $TOKEN_U" "$API/articles/$ART_SLUG")
SHAPE=$(echo "$DETAIL" | $PY "import sys,json;d=json.load(sys.stdin)['data'];print(f'liked={d[\"liked\"]} favorited={d[\"favorited\"]} likes={d[\"_count\"][\"likes\"]} favs={d[\"_count\"][\"favorites\"]}')")
ok "detail says $SHAPE"
echo "$SHAPE" | grep -q "favorited=True" || fail "expected favorited=True"

step "Article detail anonymous → liked=False favorited=False"
DETAIL=$(curl -sS "$API/articles/$ART_SLUG")
ANON=$(echo "$DETAIL" | $PY "import sys,json;d=json.load(sys.stdin)['data'];print(f'liked={d[\"liked\"]} favorited={d[\"favorited\"]}')")
[ "$ANON" = "liked=False favorited=False" ] && ok "$ANON" || fail "got: $ANON"

step "GET /api/users/me/favorites as testuser → contains article"
FAVS=$(curl -sS -H "Authorization: Bearer $TOKEN_U" "$API/users/me/favorites" \
  | $PY "import sys,json;d=json.load(sys.stdin)['data'];print(d['total'], any(a['id']==$ART_ID for a in d['items']))")
echo "  → total / contains target = $FAVS"
echo "$FAVS" | grep -qE "^[1-9].* True$" && ok "favorites includes the article" || fail "favorite missing: $FAVS"

step "Cleanup: untoggle favorite"
curl -sS -X POST -H "Authorization: Bearer $TOKEN_U" "$API/articles/$ART_ID/favorite" > /dev/null
ok "favorite removed"

printf "\n\033[1;32m✓ All M4 server tests passed.\033[0m\n"
