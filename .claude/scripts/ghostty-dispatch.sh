#!/usr/bin/env bash
# ghostty-dispatch.sh — Ghostty ペイン分割にコマンドを注入する
#
# Usage: ghostty-dispatch.sh [-d DIR] "cmd1" "cmd2" ...

set -euo pipefail

[[ "$(uname)" == "Darwin" ]] || { echo "macOS 専用スクリプトです" >&2; exit 1; }

workdir="$PWD"
while getopts "d:" opt; do
  case $opt in d) workdir="$OPTARG" ;; esac
done
shift $((OPTIND - 1))

commands=("$@")
n=${#commands[@]}
if ((n > 8)); then
  echo "警告: ${n} 件中先頭 8 件のみディスパッチします" >&2
  n=8
fi

escape_as() {
  local s="${1//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

as="tell application \"Ghostty\"
  activate
  set cfg to new surface configuration
  set initial working directory of cfg to \"$(escape_as "$workdir")\"
  set win to new window with configuration cfg
  set pane1 to terminal 1 of selected tab of win
"

# ペイン分割 + 視覚順序マッピング
# pane_order: コマンドindex → ペイン番号（左→右、上→下の視覚順）
pane_order=(1)
case $n in
  2) as+='  set pane2 to split pane1 direction right with configuration cfg
'
    pane_order=(1 2)
    ;;
  3) as+='  set pane2 to split pane1 direction right with configuration cfg
  set pane3 to split pane2 direction down with configuration cfg
'
    pane_order=(1 2 3)
    ;;
  4) as+='  set pane2 to split pane1 direction right with configuration cfg
  set pane3 to split pane1 direction down with configuration cfg
  set pane4 to split pane2 direction down with configuration cfg
'
    pane_order=(1 2 3 4)
    ;;
  5) # 3列: [1(50%)|2(25%)|3(25%)] / [4|5]
    as+='  set pane2 to split pane1 direction right with configuration cfg
  set pane3 to split pane2 direction right with configuration cfg
  set pane4 to split pane1 direction down with configuration cfg
  set pane5 to split pane2 direction down with configuration cfg
'
    pane_order=(1 2 3 4 5)
    ;;
  6) # 2×3: [1(50%)|2(25%)|3(25%)] / [4|5|6]
    as+='  set pane2 to split pane1 direction right with configuration cfg
  set pane3 to split pane2 direction right with configuration cfg
  set pane4 to split pane1 direction down with configuration cfg
  set pane5 to split pane2 direction down with configuration cfg
  set pane6 to split pane3 direction down with configuration cfg
'
    pane_order=(1 2 3 4 5 6)
    ;;
  7) # 4列均等: [1|3|2|4] / [5|6|7]
    as+='  set pane2 to split pane1 direction right with configuration cfg
  set pane3 to split pane1 direction right with configuration cfg
  set pane4 to split pane2 direction right with configuration cfg
  set pane5 to split pane1 direction down with configuration cfg
  set pane6 to split pane3 direction down with configuration cfg
  set pane7 to split pane2 direction down with configuration cfg
'
    pane_order=(1 3 2 4 5 6 7)
    ;;
  8) # 2×4均等: [1|3|2|4] / [5|6|7|8]
    as+='  set pane2 to split pane1 direction right with configuration cfg
  set pane3 to split pane1 direction right with configuration cfg
  set pane4 to split pane2 direction right with configuration cfg
  set pane5 to split pane1 direction down with configuration cfg
  set pane6 to split pane3 direction down with configuration cfg
  set pane7 to split pane2 direction down with configuration cfg
  set pane8 to split pane4 direction down with configuration cfg
'
    pane_order=(1 3 2 4 5 6 7 8)
    ;;
esac

for ((i = 0; i < n; i++)); do
  p=${pane_order[$i]}
  ((i > 0)) && as+="  delay ${GHOSTTY_PANE_DELAY:-3}
"
  as+="  input text \"$(escape_as "${commands[$i]}")\" to pane${p}
  send key \"enter\" to pane${p}
"
done

as+='  focus pane1
end tell'

echo "$as" | osascript
