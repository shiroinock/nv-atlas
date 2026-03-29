---
name: tdd-next
description: 実装フェーズに進むとき、次に取り組むタスクを決めるとき、GitHub Issue を実装するとき。壁打ちや設計の議論が終わり「実装しよう」「作ろう」「取りかかろう」となった場面で使用。
user-invocable: true
---

# TDD対応の次タスク実装

GitHub Issue から次のタスクを選定し、テストパターン判定に基づいて適切なTDDパイプラインで実装します。

## CI チェックに関する重要な区別

このパイプラインでは **local-ci コマンド**を使用します。以下の違いを理解しておいてください：

| コマンド | 実行場所 | 目的 | 使用場面 |
|---------|---------|------|----------|
| **local-ci** (このパイプラインで使用) | **local** | local CI チェック（remote CI 相当）をローカル実行 | TDD完了後、PR作成前の検証 |

- **local-ci**: ローカルマシン上で Biome check、Test、Build を並列実行（3つの sub agent を使用）

## 実行フロー

### 1. GitHub Issue から次タスクを選定

GitHub Project から実装可能な Issue を取得し、優先度の高いものを選定します。

```bash
# Project の Todo アイテム（実 Issue のみ、draft 除外）を取得
gh project item-list 6 --owner shiroinock --format json \
  | jq '[.items[] | select(.content.type == "Issue" and .status == "Todo")]'
```

取得した Issue について、依存関係（Blocked by）が全て解決済みかを確認します:

```bash
# Issue の blockedBy を確認（GraphQL）
gh api graphql -f query='
  query {
    repository(owner: "shiroinock", name: "keyviz") {
      issue(number: {番号}) {
        blockedBy(first: 10) {
          nodes { number state }
        }
      }
    }
  }
'
```

選定基準:
- Project の Status が **Todo** の実 Issue（draft は対象外）
- **Blocked by が全て CLOSED**（未解決の依存がない）
- `priority:high` ラベルがあるものを優先
- ラベルがない場合は番号が小さい（古い）ものを優先
- ユーザーに選定結果を提示し、確認を取る

> **Note**: 対象の Issue がない場合は、先に `issue-enrichment` スキルで Issue を詳細化するよう提案してください。

### 1.5. 排他制御（Project Status の更新）

Issue 選定・ユーザー確認後、実装開始前に Project の Status を **In Progress** に変更します。これにより、他セッションが同じ Issue を重複して着手することを防ぎます。

```bash
# Issue の Project item ID を取得
ITEM_ID=$(gh project item-list 6 --owner shiroinock --format json \
  | jq -r '.items[] | select(.content.number == {番号}) | .id')

# Status を In Progress に変更
gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "PVT_kwHOAq02ps4BTFDk" \
  --field-id "PVTSSF_lAHOAq02ps4BTFDkzhAbPBc" \
  --single-select-option-id "47fc9ee4"
```

### 2. ブランチ作成

Issue 内容に基づいて適切な名前でGitブランチを作成します。

**ブランチ命名規則**:
- **機能追加**: `feature/{issue番号}-{機能名}`
- **バグ修正**: `fix/{issue番号}-{修正内容}`
- **リファクタリング**: `refactor/{issue番号}-{対象}`
- **テスト追加**: `test/{issue番号}-{対象}`

**手順**:
1. 現在のブランチを確認: `git branch --show-current`
2. worktree 環境かどうかを判定:
   ```bash
   # .git がファイルなら worktree 環境、ディレクトリなら通常環境
   if [ -f .git ]; then echo "worktree"; else echo "normal"; fi
   ```
3. ブランチを作成:
   - **通常環境** (`.git` がディレクトリ):
     ```bash
     git checkout main
     git pull origin main
     git checkout -b {ブランチ名}
     ```
   - **worktree 環境** (`.git` がファイル):
     ```bash
     git checkout -b {ブランチ名}
     ```
     ※ worktree では main ブランチが親 worktree で使用中のため `git checkout main` は失敗する。worktree は main の HEAD から作成されるため、直接ブランチを作成すればよい。

**例**:
- Issue #5「入力バリデーション機能の追加」 → `feature/5-validation-input`
- Issue #12「データ変換のバグ修正」 → `fix/12-data-transform`

### 3. classify-files でテストパターン判定

Task ツールで classify-files エージェントを起動し、実装対象ファイルのテストパターンを判定します。

**プロンプト例**:
```
Issue #{番号}「{タイトル}」について、実装対象ファイルのテストパターンを判定してください。

Issue本文:
{Issue body}

対象ファイル: {ファイルパス}

以下を出力してください:
1. tddMode (test-first / test-later)
2. testPattern (unit / store / hook / component / integration)
3. placement (colocated / separated)
4. rationale (判定理由)
5. testFilePath (テストファイルの配置パス)
```

### 3.5. テストパターン別の方針

classify-files の判定結果に基づき、test-writer エージェントが適切なテストパターンを適用します。

各テストパターンの詳細な方針は **`.claude/agents/test-writer.md`** に記載されています。

#### component パターン（コンポーネントテスト）の概要

Reactコンポーネントのテストは、**セマンティックテスト**と**スナップショットテスト**を組み合わせます：

**セマンティックテスト**（優先）: ユーザー視点の振る舞い・状態変化を検証
- ステート分岐、条件付きレンダリング
- ユーザーインタラクション（クリック、入力など）
- propsによる動作の変化

**スナップショットテスト**: 構造・見た目の意図しない変更を検知
- コンポーネントの基本的なレンダリング結果
- 主要なpropsによる見た目のバリエーション

詳細は `test-writer.md` のセクション4を参照してください。

### 4. パイプライン選択と実行

classify-files の判定結果に基づき、適切なパイプラインを**順次実行**します。

**重要**: エージェント間に依存関係があるため、**必ず順次実行**してください。並列実行は不可です。

#### 4-1. テストファーストパイプライン (tddMode: test-first)

```
1. test-writer エージェント起動 【Red: テスト作成】
   目的: 失敗するテストを作成（TDD Red フェーズ）

2. test-runner エージェント起動 【Red確認】
   目的: テストが正しく失敗することを確認（TDDサイクル検証）
   - 期待する状態: RED_EXPECTED

3. implement エージェント起動 【Green: 実装】
   目的: テストを通す最小限の実装（TDD Green フェーズ）

4. test-runner エージェント起動 【Green確認（局所的）】
   目的: 実装したコードが新規テストを通すことを確認
   - 期待する状態: GREEN_EXPECTED
   - 判定: 全テスト成功 → 次へ / 失敗 → plan-fixへ

5. local-ci コマンド実行 【local CI 全体チェック（全体的）】
   目的: 既存コード全体への影響がないことを確認
   - Skill("local-ci") を呼び出し
   - 判定: 全て成功 → 次へ / 失敗 → plan-fixへ

6. (local-ci 成功時) review-file エージェント起動 【Refactor判断】
   目的: コード品質を確認（TDD Refactor フェーズ）
   - 判定: PASS → 完了 / WARN → ユーザーに確認 / FAIL → 必須修正

7. (失敗 or WARN承認 or FAIL 時) plan-fix → implement → local-ci → review-file
   最大3回までリトライ
```

#### 4-2. テストレイターパイプライン (tddMode: test-later)

```
1. implement エージェント起動 【実装】
2. test-writer エージェント起動 【テスト作成】
3. test-runner エージェント起動 【Green確認（局所的）】
4. local-ci コマンド実行 【local CI 全体チェック（全体的）】
5. (local-ci 成功時) review-file エージェント起動 【品質確認】
6. (失敗時) plan-fix → implement → local-ci → review-file（最大3回）
```

### 5. Issue 更新

タスク完了後、GitHub Issue を更新します:

```bash
# Issue にコメントを追加
gh issue comment {番号} --body "実装完了。ブランチ: {ブランチ名}

### 作成ファイル
- {実装ファイルパス}
- {テストファイルパス}

### テスト結果
- 実行: {total} tests
- 成功: {passed} passed"

# 正常完了時: Project Status を Done に変更（PR マージ時に Issue クローズされる想定）
ITEM_ID=$(gh project item-list 6 --owner shiroinock --format json \
  | jq -r '.items[] | select(.content.number == {番号}) | .id')
gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "PVT_kwHOAq02ps4BTFDk" \
  --field-id "PVTSSF_lAHOAq02ps4BTFDkzhAbPBc" \
  --single-select-option-id "98236657"

# Issue をクローズ（ユーザーに確認後）
# gh issue close {番号}
```

**エラー発生時のロールバック**:

パイプライン途中でエラーが発生し、リトライ上限に達して中断する場合は、Project Status を **Todo** に戻して他セッションが再着手できるようにします。

```bash
# エラー中断時: Status を Todo に戻す
ITEM_ID=$(gh project item-list 6 --owner shiroinock --format json \
  | jq -r '.items[] | select(.content.number == {番号}) | .id')
gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "PVT_kwHOAq02ps4BTFDk" \
  --field-id "PVTSSF_lAHOAq02ps4BTFDkzhAbPBc" \
  --single-select-option-id "f75ad846"
```

### 6. レポート生成

実行結果をレポートとして出力します:

```markdown
## タスク完了レポート

**Issue**: #{番号} {タイトル}
**ブランチ**: {ブランチ名}
**TDDモード**: {test-first / test-later}
**テストパターン**: {unit / store / hook / component / integration}

### 作成ファイル
- {実装ファイルパス}
- {テストファイルパス}

### テスト結果
- 実行: {total} tests
- 成功: {passed} passed
- 失敗: {failed} failed

### CI チェック結果
- Biome check: PASS/FAIL
- Tests: PASS/FAIL ({total} tests passed)
- Build: PASS/FAIL

### 次のアクション
- [ ] コードレビュー
- [ ] PR 作成
- [ ] Issue クローズ
```

## エージェント起動の注意点

### 並列 vs 順次実行

**重要**: エージェント間に依存関係があるため、**必ず順次実行**してください。

### 状態の受け渡し

各エージェントの出力結果を次のエージェントに渡します:

```
test-writer の出力:
  - testFilePath: "src/utils/helpers.test.ts"

→ test-runner に渡す:
  - targetFile: "src/utils/helpers.test.ts"
  - expectation: "RED_EXPECTED"

→ implement に渡す:
  - testFilePath: "src/utils/helpers.test.ts"
  - implFilePath: "src/utils/helpers.ts"
```

### エージェント起動例

**classify-files エージェント**:
```javascript
{
  "subagent_type": "classify-files",
  "model": "sonnet",
  "prompt": "Issue #{番号}「{タイトル}」について、実装対象ファイルのテストパターンを判定してください。..."
}
```

**test-writer エージェント**:
```javascript
{
  "subagent_type": "test-writer",
  "model": "sonnet",
  "prompt": "{testPattern} パターンで {testFilePath} にテストを作成してください。..."
}
```

**test-runner エージェント**:
```javascript
{
  "subagent_type": "test-runner",
  "model": "sonnet",
  "prompt": "{testFilePath} のテストを実行し、{expectation} であることを確認してください。"
}
```

**implement エージェント**:
```javascript
{
  "subagent_type": "implement",
  "model": "sonnet",
  "prompt": "{implFilePath} を実装してください。\n\nテストファイル: {testFilePath}\n\nテストを通す最小限の実装をしてください。"
}
```

**review-file エージェント**:
```javascript
{
  "subagent_type": "review-file",
  "model": "opus",
  "prompt": "review-perspective-selector skill を使用して {implFilePath} に適切なレビュー観点を選択してください。..."
}
```

**plan-fix エージェント**:
```javascript
{
  "subagent_type": "plan-fix",
  "model": "opus",
  "prompt": "review-file の指摘事項に基づき、{implFilePath} の修正計画を作成してください。"
}
```

**local-ci コマンド（Skill 呼び出し）**:
```javascript
Skill({
  "skill": "local-ci"
})
```

## エラーハンドリング

### テストが Red にならない場合 (test-writer 直後)
→ 警告を出力 → 続行するかユーザーに確認

### local-ci が失敗する場合 (implement 直後)
→ 全エラーを確認 → plan-fix → implement 再起動 → 最大3回リトライ → ユーザーに報告
→ リトライ上限で中断する場合は Project Status を In Progress → Todo にロールバック

### classify-files の判定が不明確な場合
→ ユーザーに確認 → 手動で tddMode と testPattern を選択

## 重要な注意事項

### 1. テストファイルパスの一貫性
classify-files が提案したパスを厳守:
- **colocated**: 同階層 (例: `src/utils/helpers.test.ts`)
- **separated**: `src/__tests__/integration/` (例: `src/__tests__/integration/dataFlow.test.ts`)

### 2. Issue の更新タイミング
- **全パイプライン完了後**に更新
- 途中でエラーが起きた場合は更新しない
- Issue のクローズはユーザーに確認してから

### 3. PR 作成・マージについて

#### PR 作成
- パイプライン完了後、ユーザーに PR 作成を提案する
- ユーザーが同意した場合のみ `gh pr create` を実行
- PR 本文に Issue 番号を含める（`Closes #{番号}`）

#### PR マージ

worktree 環境では `--delete-branch` が内部で `git checkout main` を実行し、`fatal: 'main' is already used by worktree` で失敗する。マージ自体は成功するが、コマンド全体がエラーコード 1 で終了するため混乱を招く。

**worktree 判定**:
```bash
# .git でなければ worktree 環境
IS_WORKTREE=$([ "$(git rev-parse --git-common-dir)" != ".git" ] && echo true || echo false)
```

**worktree 環境の場合** — マージとブランチ削除を分離:
```bash
# 1. マージのみ（--delete-branch を使わない）
gh pr merge {番号} --squash

# 2. リモートブランチを API で削除
BRANCH=$(gh pr view {番号} --json headRefName -q '.headRefName')
gh api repos/{owner}/{repo}/git/refs/heads/${BRANCH} -X DELETE
```
> ローカルブランチは worktree 終了時に自動クリーンアップされるため、リモート削除のみで十分。

**通常環境の場合**:
```bash
gh pr merge {番号} --squash --delete-branch
```

---

**Note**: このコマンドは複雑なパイプラインを実行します。各エージェントの完了を待ち、順次実行することを忘れないでください。
