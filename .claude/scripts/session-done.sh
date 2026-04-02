#!/usr/bin/env bash
# session-done.sh — worktree セッション完了時のバリアチェック + 次セット自動ディスパッチ
#
# Usage: session-done.sh <issue-number>

set -euo pipefail

ISSUE="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST="$PROJECT_DIR/.claude/dispatch-manifest.json"
DONE_DIR="$PROJECT_DIR/.claude/dispatch-done"

mkdir -p "$DONE_DIR"
touch "$DONE_DIR/$ISSUE"

# Worktree 削除
WT_PATH="$PROJECT_DIR/.claude/worktrees/issue-$ISSUE"
if [[ -d "$WT_PATH" ]]; then
  BRANCH=$(git -C "$WT_PATH" branch --show-current 2>/dev/null || true)
  git -C "$PROJECT_DIR" worktree remove "$WT_PATH" --force 2>/dev/null || true
  [[ -n "$BRANCH" ]] && git -C "$PROJECT_DIR" branch -D "$BRANCH" 2>/dev/null || true
fi

[[ -f "$MANIFEST" ]] || exit 0

# バリアチェック: 現在セットの全セッション完了を確認
current_set=$(jq -r '.sets[] | select(.status == "dispatched") | .issues | map(tostring) | join(" ")' "$MANIFEST")
for num in $current_set; do
  [[ -f "$DONE_DIR/$num" ]] || exit 0
done

# 現在セット完了 → manifest 更新、マーカー削除
jq '(.sets[] | select(.status == "dispatched")).status = "done"' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"
for num in $current_set; do rm -f "$DONE_DIR/$num"; done

# 次の pending セットを取得
next_issues=$(jq -r '[.sets[] | select(.status == "pending")][0].issues // empty' "$MANIFEST")
if [[ -z "$next_issues" || "$next_issues" == "null" ]]; then
  rm -f "$MANIFEST"
  rmdir "$DONE_DIR" 2>/dev/null || true
  exit 0
fi

# main を最新化してから次セットをディスパッチ
git -C "$PROJECT_DIR" checkout main 2>/dev/null || true
git -C "$PROJECT_DIR" pull --ff-only origin main 2>/dev/null || true

# 次セットを dispatched に更新
jq '
  [.sets | to_entries[] | select(.value.status == "pending")][0].key as $idx |
  .sets[$idx].status = "dispatched"
' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"

commands=()
for num in $(echo "$next_issues" | jq -r '.[]'); do
  commands+=("claude --worktree issue-${num} \"/tdd-next ${num}\" ; $SCRIPT_DIR/session-done.sh ${num} ; exit")
done

"$SCRIPT_DIR/ghostty-dispatch.sh" -d "$PROJECT_DIR" "${commands[@]}"
