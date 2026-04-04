---
name: propose-parallel-issues
description: Project 上の実装可能な Issue 間のファイル競合を判定し、worktree で同時実装可能な組み合わせを提案する。「並列でやれるの何？」「同時に進められる Issue は？」といった場面で使用。
user-invocable: true
---

# 並列実装可能 Issue 提案スキル

GitHub Project（nv-atlas #6）から実装可能な Issue を取得し、対象ファイルの競合がない同時実装可能な組み合わせを提案します。
`enrich-issue` で書き込まれた「対象ファイル」セクションを前提とします。

## GitHub Project 情報

- **Project**: `shiroinock` owner, number `6`（nv-atlas）

## 実行フロー

### 1. 実装可能な Issue の取得

Project の Todo アイテム（実 Issue のみ）を取得し、依存関係が全て解決済みのものを抽出します。

```bash
# Project の Todo アイテム（実 Issue、draft 除外）を取得
gh project item-list 6 --owner shiroinock --limit 100 --format json \
  | jq '[.items[] | select(.content.type == "Issue" and .status == "Todo")]'
```

各 Issue について Blocked by を確認し、未解決の依存がある Issue は除外:

```bash
# Issue の blockedBy を確認（GraphQL）
gh api graphql -f query='
  query {
    repository(owner: "shiroinock", name: "nv-atlas") {
      issue(number: {番号}) {
        blockedBy(first: 10) {
          nodes { number state }
        }
      }
    }
  }
'
```

In Progress の Issue も除外します（他セッションが実装中）。

### 2. 対象ファイルの抽出

各 Issue 本文の `## 対象ファイル` セクションからファイルパスを抽出します。

**抽出対象フォーマット**:
```
- `{path}` — {説明}
```

パス部分（バッククォート内）を正規表現で取得:
```
/- `([^`]+)`/
```

**対象ファイルセクションがない Issue の扱い**:
- 抽出できなかった Issue はスキップし、一覧の末尾で以下を表示:
  > Issue #{番号}「{タイトル}」には対象ファイルセクションがありません。`/enrich-issue` で詳細化してください。

### 3. 早期リターン判定

- 対象ファイルを抽出できた Issue が **0〜1 件**の場合:
  > 並列実装の候補がありません（対象ファイル付き Issue が {n} 件のみ）。
- そのまま終了

### 4. コンフリクト判定

Issue ペアごとにファイルパスの競合を判定します。

#### 4-1. 完全一致チェック

2つの Issue が同じファイルパスを含む場合、コンフリクトと判定。

#### 4-2. ディレクトリ階層チェック

同一ディレクトリに新規ファイルを追加する場合も注意が必要です。以下のケースを検出:

- **同一ディレクトリ配下**: パスの親ディレクトリが一致する場合は「要注意」として警告
  - 例: Issue A が `src/utils/foo.ts`、Issue B が `src/utils/bar.ts` → 同一ディレクトリ警告
- **親子関係**: 一方のパスが他方のディレクトリ配下にある場合も警告
  - 例: Issue A が `src/components/Keyboard/Key.tsx`、Issue B が `src/components/Keyboard/index.ts`

#### 判定結果の分類

| 分類 | 条件 | 表示 |
|------|------|------|
| **安全** | ファイルパスの重複なし、ディレクトリも完全に独立 | 同時実装可能 |
| **要注意** | ファイル重複なしだが同一ディレクトリ配下 | 同時実装可能（マージ時に注意） |
| **競合** | 同じファイルを変更する | 同時実装不可 |

### 5. 結果の出力

#### 5-1. Issue 一覧と対象ファイル

```markdown
## 対象 Issue 一覧

| # | タイトル | 対象ファイル数 |
|---|---------|-------------|
| {番号} | {タイトル} | {ファイル数} |
```

#### 5-2. コンフリクトマトリクス

Issue 数が 3 件以上の場合、マトリクス形式で競合関係を表示:

```markdown
## コンフリクトマトリクス

|       | #14 | #17 | #19 |
|-------|-----|-----|-----|
| #14   | -   |  -  |  -  |
| #17   | -   | -   |  -  |
| #19   | -   |  -  | -   |

凡例: - 安全 / ! 要注意 / X 競合
```

#### 5-3. 同時実装可能な組み合わせの提案

```markdown
## 同時実装可能な組み合わせ

### 推奨セット 1
- Issue #14「読み込んだレイアウト・キーマップの永続化」
- Issue #19「同時実装可能な Issue を提案する skill の作成」
→ ファイル競合なし、ディレクトリも独立

### 要注意セット
- Issue #14「...」+ Issue #17「...」
→ ファイル競合なしだが、`src/utils/` 配下で同一ディレクトリ
```

#### 5-4. 競合がある場合の詳細

```markdown
## 競合の詳細

### Issue #A ↔ Issue #B: 競合
競合ファイル:
- `src/components/Keyboard/Key.tsx`
```

#### 5-5. 起動コマンド

推奨セットごとに、`claude --worktree` を使った起動コマンドをコピペ可能な形で出力します。

`--worktree` フラグにより、worktree 作成・`.worktreeinclude` に基づくファイルコピー・セッション開始が1コマンドで完了します。

```markdown
## 起動コマンド

### 推奨セット 1

\`\`\`bash
# Issue #14: 読み込んだレイアウト・キーマップの永続化
claude --worktree issue-14 "/tdd-next 14"
\`\`\`

\`\`\`bash
# Issue #19: 同時実装可能な Issue を提案する skill の作成
claude --worktree issue-19 "/tdd-next 19"
\`\`\`
```

**注意**:
- 各コマンドブロックを別ターミナルで実行すること
- worktree は `.claude/worktrees/issue-{番号}` に作成される
- セッション終了時に worktree を keep/remove するか聞かれる

## 注意事項

- `enrich-issue` の「対象ファイル」セクションフォーマット（`` - `{path}` — {説明} ``）に依存しています。フォーマット変更時は抽出ロジックの調整が必要です
- In Progress の Issue は除外されます（他セッションが実装中）
- **新規作成**と明記されたファイルは、既存ファイルの変更よりコンフリクトリスクが低いですが、同一パスの場合は競合として扱います
- ファイル探索には Glob ツールを優先し、Bash の `find` は使わないこと（`.gitignore` を自動尊重し、`node_modules` 等の大量ヒットを回避）
