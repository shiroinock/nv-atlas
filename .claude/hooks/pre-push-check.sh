#!/usr/bin/env bash
# -e は wait の exit code 取得前にスクリプトが中断するため省略
set -uo pipefail

COMMAND=$(cat | jq -r '.tool_input.command // empty')
[[ "$COMMAND" == *"git push"* ]] || exit 0

UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo "origin/main")
CHANGED_FILES=$(git diff --name-only "${UPSTREAM}...HEAD" 2>/dev/null || true)

NON_CLAUDE_FILES=$(echo "$CHANGED_FILES" | grep -v '^\.claude/' | grep -v '^$' || true)
if [[ -z "$NON_CLAUDE_FILES" ]]; then
  echo "変更は .claude/ 配下のみ — pre-push チェックをスキップ"
  exit 0
fi

PNPM=/etc/profiles/per-user/shiroino/bin/pnpm

TMPDIR_HOOK=$(mktemp -d "${TMPDIR:-/tmp}/pre-push-check.XXXXXX")
trap 'rm -rf "$TMPDIR_HOOK"' EXIT

$PNPM lint  > "$TMPDIR_HOOK/lint.log"  2>&1 &  LINT_PID=$!
$PNPM test  > "$TMPDIR_HOOK/test.log"  2>&1 &  TEST_PID=$!
$PNPM build > "$TMPDIR_HOOK/build.log" 2>&1 &  BUILD_PID=$!

wait $LINT_PID;  LINT_EXIT=$?
wait $TEST_PID;  TEST_EXIT=$?
wait $BUILD_PID; BUILD_EXIT=$?

lint_status()  { [ $LINT_EXIT  -eq 0 ] && echo "PASS ✓" || echo "FAIL ✗"; }
test_status()  { [ $TEST_EXIT  -eq 0 ] && echo "PASS ✓" || echo "FAIL ✗"; }
build_status() { [ $BUILD_EXIT -eq 0 ] && echo "PASS ✓" || echo "FAIL ✗"; }

echo ""
echo "=== Pre-push チェック結果 ==="
echo "lint:  $(lint_status)"
echo "test:  $(test_status)"
echo "build: $(build_status)"

if [ $LINT_EXIT -ne 0 ] || [ $TEST_EXIT -ne 0 ] || [ $BUILD_EXIT -ne 0 ]; then
  echo ""
  [ $LINT_EXIT  -ne 0 ] && { echo "--- lint エラー ---"; cat "$TMPDIR_HOOK/lint.log"; }
  [ $TEST_EXIT  -ne 0 ] && { echo "--- test エラー ---"; cat "$TMPDIR_HOOK/test.log"; }
  [ $BUILD_EXIT -ne 0 ] && { echo "--- build エラー ---"; cat "$TMPDIR_HOOK/build.log"; }
  exit 2
fi

exit 0
