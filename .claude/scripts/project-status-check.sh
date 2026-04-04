#!/usr/bin/env bash
# project-status-check.sh — PostToolUse(Bash) hook
# gh issue edit --remove-label draft 実行後に Project 登録漏れを検出する
set -euo pipefail

COMMAND=$(cat | jq -r '.tool_input.command // empty')

# draft ラベル削除コマンドでなければ早期 return
if ! [[ "$COMMAND" =~ gh[[:space:]]+issue[[:space:]]+edit[[:space:]]+([0-9]+).*--remove-label.*draft ]]; then
  exit 0
fi

ISSUE_NUMBER="${BASH_REMATCH[1]}"

# Issue の URL を取得
ISSUE_URL=$(gh issue view "$ISSUE_NUMBER" --json url -q '.url' 2>/dev/null || true)
if [[ -z "$ISSUE_URL" ]]; then
  echo "WARNING: Issue #${ISSUE_NUMBER} の URL を取得できませんでした" >&2
  exit 0
fi

# Project に登録済みか確認（Issue URL で絞り込む）
REGISTERED=$(gh project item-list 6 --owner shiroinock --limit 100 --format json 2>/dev/null \
  | jq --arg url "$ISSUE_URL" '[.items[] | select(.content.url == $url)] | length')

if [[ "$REGISTERED" -eq 0 ]]; then
  echo ""
  echo "WARNING: Issue #${ISSUE_NUMBER} が Project に未登録です。"
  echo "以下のコマンドで登録してください:"
  echo ""
  echo "  gh project item-add 6 --owner shiroinock --url ${ISSUE_URL}"
  echo ""
fi
