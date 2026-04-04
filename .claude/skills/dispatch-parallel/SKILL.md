---
name: dispatch-parallel
description: propose-parallel-issues の分析結果から worktree セッションを Ghostty ペインに自動ディスパッチ。「並列実行して」「ディスパッチ」「並列で実装開始」といった場面で使用。
user-invocable: true
---

# 並列 Issue 自動ディスパッチスキル

`/propose-parallel-issues` の分析フローを実行し、推奨セットの `claude --worktree` コマンドを Ghostty のペイン分割に自動注入して並列実装セッションを起動する。

## 前提条件

- macOS + Ghostty 1.3.0 以上（AppleScript API）
- `.claude/scripts/ghostty-dispatch.sh` が実行可能
- `.claude/hooks/dispatch-on-write.sh` が PostToolUse フックとして設定済み

## 実行フロー

### 1. Issue 分析

`/propose-parallel-issues` スキル（`.claude/skills/propose-parallel-issues/SKILL.md`）の実行フロー（ステップ 1〜5）に従い、並列実装可能な組み合わせを特定する。

分析結果（Issue 一覧、コンフリクトマトリクス、推奨セット）をユーザーに表示する。

### 2. セット選択

- 推奨セットが **1つのみ** → そのセットを自動選択し、即座にステップ 3 へ
- 推奨セットが **複数** → ユーザーにどのセットを使うか確認
- 推奨セットが **0** → 理由を説明して終了

### 3. マニフェスト + キューファイル書き出し

2 つのファイルを Write ツールで書き出す。

#### 3-1. `.claude/dispatch-manifest.json`（連鎖ディスパッチ用）

全セットの情報を記録。`session-done.sh` がバリアチェック + 次セット自動ディスパッチに使用する。

```json
{
  "sets": [
    {
      "issues": [172, 182, 192, 194],
      "status": "dispatched"
    },
    {
      "issues": [171, 190],
      "status": "pending"
    }
  ]
}
```

- 最初のセット: `"dispatched"`
- 残りのセット: `"pending"`

#### 3-2. `.claude/dispatch-queue.json`（フックトリガー用）

最初のセットのコマンドを書き出す。PostToolUse フックが自動検知し、Ghostty にディスパッチする。

**コマンドには `; /absolute/path/to/project/.claude/scripts/session-done.sh {N} ; exit` を付与する**（ユーザーが `/exit` した後に worktree 削除 + ペイン自動クローズ）:

```json
{
  "commands": [
    "claude --worktree issue-172 \"/tdd-next 172\" ; /absolute/path/to/project/.claude/scripts/session-done.sh 172 ; exit",
    "claude --worktree issue-182 \"/tdd-next 182\" ; /absolute/path/to/project/.claude/scripts/session-done.sh 182 ; exit"
  ],
  "workdir": "/absolute/path/to/project"
}
```

### 4. 完了報告

フックが Ghostty ウィンドウを開いた後、以下を表示:

```
## ディスパッチ完了

| ペイン | Issue | タイトル |
|--------|-------|---------|
| 1      | #N1   | {title} |
| 2      | #N2   | {title} |

各セッションは worktree 内で自律的に TDD パイプラインを実行中。
全セッション完了時、セット 2 (#N3, #N4) が自動ディスパッチされます。
```

## 連鎖ディスパッチの仕組み

```
dispatch-queue.json 書き出し
  → PostToolUse hook が検知
    → ghostty-dispatch.sh で Ghostty ペインにコマンド注入
      → 各ペインで claude --worktree が自律実行
        → セッション終了時に session-done.sh が発火
          → バリアチェック: 全セッション完了？
            → Yes: dispatch-manifest.json の次セットを ghostty-dispatch.sh で自動ディスパッチ
            → No: 待機（他セッションの完了を待つ）
```

- ポーリングなし。各セッションの終了イベントがトリガー
- 最後に終わったセッションが次セットをディスパッチする
- manifest の全セットが完了するまで自動で連鎖する

## 注意事項

- 最大 8 ペイン（8 Issue）まで同時ディスパッチ可能（2行×4列）
- 各 worktree セッションは独立した Claude Code インスタンスとして `/tdd-next` を自律実行する
- In Progress の Issue は分析時に自動除外される
- ディスパッチ元の Claude セッション（このセッション）は引き続き利用可能
- `dispatch-queue.json` はフック実行後に自動削除される
- `dispatch-manifest.json` は全セット完了後に自動削除される
- セッションが crash・hang した場合、`session-done.sh` が呼ばれずバリアチェックが停止する。手動で `.claude/scripts/session-done.sh <Issue番号>` を実行してリカバリする
