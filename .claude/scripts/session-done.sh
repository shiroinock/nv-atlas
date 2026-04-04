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
LOCK_FILE="$PROJECT_DIR/.claude/dispatch.lock"

# Worktree 削除ヘルパー
cleanup_worktree() {
  local num="$1"
  local wt="$PROJECT_DIR/.claude/worktrees/issue-$num"
  if [[ -d "$wt" ]]; then
    local branch
    branch=$(git -C "$wt" branch --show-current 2>/dev/null || true)
    git -C "$PROJECT_DIR" worktree remove "$wt" --force 2>/dev/null || echo "worktree remove failed for $num" >&2
    [[ -n "$branch" ]] && git -C "$PROJECT_DIR" branch -D "$branch" 2>/dev/null || echo "branch delete failed: $branch" >&2
  fi
}

mkdir -p "$DONE_DIR"
touch "$DONE_DIR/$ISSUE"

[[ -f "$MANIFEST" ]] || { cleanup_worktree "$ISSUE"; exit 0; }

# flock で排他制御（TOCTOU 防止）
exec 9>"$LOCK_FILE"
flock -x 9

# バリアチェック: 現在セットの全セッション完了を確認（先頭1件に絞る）
mapfile -t current_set < <(jq -r '([.sets[] | select(.status == "dispatched")][0].issues // []) | .[] | tostring' "$MANIFEST")
[[ ${#current_set[@]} -gt 0 ]] || { cleanup_worktree "$ISSUE"; exit 0; }
for num in "${current_set[@]}"; do
  [[ -f "$DONE_DIR/$num" ]] || { cleanup_worktree "$ISSUE"; exit 0; }
done

# 全セッション完了 → worktree 一括削除
for num in "${current_set[@]}"; do cleanup_worktree "$num"; done

# manifest 更新、マーカー削除
jq '(.sets[] | select(.status == "dispatched")).status = "done"' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"
for num in "${current_set[@]}"; do rm -f "$DONE_DIR/$num"; done

# 次の pending セットを取得
next_issues=$(jq -r '[.sets[] | select(.status == "pending")][0].issues // empty' "$MANIFEST")
if [[ -z "$next_issues" || "$next_issues" == "null" ]]; then
  rm -f "$MANIFEST" "$LOCK_FILE"
  rmdir "$DONE_DIR" 2>/dev/null || true
  exit 0
fi

# main を最新化（HEAD を変更しないよう fetch のみ）
git -C "$PROJECT_DIR" fetch origin main 2>&1 || echo "fetch origin main failed, continuing with local state" >&2

# 次セットを dispatched に更新
jq '
  [.sets | to_entries[] | select(.value.status == "pending")][0].key as $idx |
  .sets[$idx].status = "dispatched"
' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"

mapfile -t issue_nums < <(echo "$next_issues" | jq -r '.[]')
commands=()
for num in "${issue_nums[@]}"; do
  commands+=("claude --worktree issue-${num} \"/tdd-next ${num}\" ; $SCRIPT_DIR/session-done.sh ${num} ; exit")
done

"$SCRIPT_DIR/ghostty-dispatch.sh" -d "$PROJECT_DIR" "${commands[@]}"
