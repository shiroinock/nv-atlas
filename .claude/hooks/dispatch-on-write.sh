#!/usr/bin/env bash
# dispatch-on-write.sh — PostToolUse(Write) hook
# dispatch-queue.json 書き込みを検知し ghostty-dispatch.sh を実行する
set -euo pipefail

FILE_PATH=$(cat | jq -r '.tool_input.file_path // empty')
[[ "$FILE_PATH" == *"dispatch-queue.json" ]] || exit 0

PROJECT_DIR=$(dirname "$(dirname "$FILE_PATH")")
WORKDIR=$(jq -r '.workdir' "$FILE_PATH")
mapfile -t COMMANDS < <(jq -r '.commands[]' "$FILE_PATH")

"$PROJECT_DIR/.claude/scripts/ghostty-dispatch.sh" -d "$WORKDIR" "${COMMANDS[@]}"
rm -f "$FILE_PATH"
