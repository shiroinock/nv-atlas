#!/usr/bin/env bash
# dispatch-on-write.sh — PostToolUse(Write) hook
# dispatch-queue.json 書き込みを検知し ghostty-dispatch.sh を実行する
set -euo pipefail

FILE_PATH=$(cat | jq -r '.tool_input.file_path // empty')
[[ "$FILE_PATH" == *"dispatch-queue.json" ]] || exit 0

PROJECT_DIR=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || dirname "$(dirname "$FILE_PATH")")
WORKDIR=$(jq -r '.workdir // empty' "$FILE_PATH")
[[ -n "$WORKDIR" ]] || { echo "dispatch-queue.json に workdir がありません" >&2; exit 1; }

mapfile -t COMMANDS < <(jq -r '.commands[]' "$FILE_PATH")
[[ ${#COMMANDS[@]} -gt 0 ]] || { echo "dispatch-queue.json に commands がありません" >&2; exit 1; }

"$PROJECT_DIR/.claude/scripts/ghostty-dispatch.sh" -d "$WORKDIR" "${COMMANDS[@]}"
rm -f "$FILE_PATH"
