#!/usr/bin/env bash
# detect-merge.sh — PostToolUse(Bash) hook
# gh pr merge の成功を検知し、バリアチェック + 次セット自動ディスパッチを行う
set -euo pipefail

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
[[ "$COMMAND" == *"gh pr merge"* ]] || exit 0

# worktree パスから issue 番号を抽出
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
ISSUE=$(echo "$CWD" | grep -oE 'issue-[0-9]+' | grep -oE '[0-9]+' || true)
[[ -n "$ISSUE" ]] || exit 0

# プロジェクトルートを特定（worktree の 3 階層上 = .claude/worktrees/issue-N）
PROJECT_DIR=$(echo "$CWD" | sed 's|/.claude/worktrees/issue-[0-9]*.*||')
[[ -d "$PROJECT_DIR/.claude" ]] || exit 0

MANIFEST="$PROJECT_DIR/.claude/dispatch-manifest.json"
DONE_DIR="$PROJECT_DIR/.claude/dispatch-done"
SCRIPT_DIR="$PROJECT_DIR/.claude/scripts"

mkdir -p "$DONE_DIR"
touch "$DONE_DIR/$ISSUE"
echo "Merge detected: Issue #$ISSUE" >&2

# マニフェストがなければバリアチェック不要
[[ -f "$MANIFEST" ]] || exit 0

# 現在ディスパッチ中のセットを取得
current_set=$(jq -r '
    .sets[] | select(.status == "dispatched") | .issues | map(tostring) | join(" ")
' "$MANIFEST")
[[ -n "$current_set" ]] || exit 0

# バリアチェック
for num in $current_set; do
    [[ -f "$DONE_DIR/$num" ]] || exit 0
done

echo "All sessions in current set completed!" >&2

# 現在のセットを done に更新
jq '(.sets[] | select(.status == "dispatched")).status = "done"' "$MANIFEST" > "$MANIFEST.tmp"
mv "$MANIFEST.tmp" "$MANIFEST"

# 完了マーカーをクリーンアップ
for num in $current_set; do
    rm -f "$DONE_DIR/$num"
done

# 次の pending セットを取得
next_issues=$(jq -r '
    [.sets[] | select(.status == "pending")][0].issues // empty
' "$MANIFEST")

if [[ -z "$next_issues" || "$next_issues" == "null" ]]; then
    echo "All sets completed!" >&2
    rm -f "$MANIFEST"
    rmdir "$DONE_DIR" 2>/dev/null || true
    exit 0
fi

# main を最新化
echo "Pulling latest main..." >&2
git -C "$PROJECT_DIR" checkout main 2>/dev/null || true
git -C "$PROJECT_DIR" pull --ff-only origin main || true

# 次セットを dispatched に更新
jq '
    [.sets | to_entries[] | select(.value.status == "pending")][0].key as $idx |
    .sets[$idx].status = "dispatched"
' "$MANIFEST" > "$MANIFEST.tmp"
mv "$MANIFEST.tmp" "$MANIFEST"

# 次セットのコマンドを組み立ててディスパッチ
echo "Dispatching next set..." >&2
commands=()
for num in $(echo "$next_issues" | jq -r '.[]'); do
    commands+=("claude --worktree issue-${num} \"/tdd-next ${num}\" ; $SCRIPT_DIR/session-done.sh ${num} ; exit")
done

"$SCRIPT_DIR/ghostty-dispatch.sh" -d "$PROJECT_DIR" "${commands[@]}"
