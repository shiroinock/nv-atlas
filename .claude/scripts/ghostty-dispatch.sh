#!/usr/bin/env bash
# ghostty-dispatch.sh — Ghostty ペイン分割にコマンドを注入する
#
# Usage: ghostty-dispatch.sh [-d DIR] "cmd1" "cmd2" ...

set -euo pipefail

workdir="$PWD"
while getopts "d:" opt; do
  case $opt in d) workdir="$OPTARG" ;; esac
done
shift $((OPTIND - 1))

commands=("$@")
n=${#commands[@]}
if ((n > 4)); then
  echo "警告: ${n} 件中先頭 4 件のみディスパッチします" >&2
  n=4
fi

escape_as() {
  local s="${1//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  printf '%s' "$s"
}

as="tell application \"Ghostty\"
  activate
  set cfg to new surface configuration
  set initial working directory of cfg to \"$(escape_as "$workdir")\"
  set win to new window with configuration cfg
  set pane1 to terminal 1 of selected tab of win
"

case $n in
  2) as+='  set pane2 to split pane1 direction right with configuration cfg
' ;;
  3) as+='  set pane2 to split pane1 direction right with configuration cfg
  set pane3 to split pane2 direction down with configuration cfg
' ;;
  4) as+='  set pane2 to split pane1 direction right with configuration cfg
  set pane3 to split pane1 direction down with configuration cfg
  set pane4 to split pane2 direction down with configuration cfg
' ;;
esac

for ((i = 0; i < n; i++)); do
  p=$((i + 1))
  ((i > 0)) && as+="  delay ${GHOSTTY_PANE_DELAY:-3}
"
  as+="  input text \"$(escape_as "${commands[$i]}")\" to pane${p}
  send key \"enter\" to pane${p}
"
done

as+='  focus pane1
end tell'

echo "$as" | osascript
