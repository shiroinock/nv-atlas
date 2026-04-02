---
name: tdd-next
description: 実装フェーズに進むとき、次に取り組むタスクを決めるとき、GitHub Issue を実装するとき。壁打ちや設計の議論が終わり「実装しよう」「作ろう」「取りかかろう」となった場面で使用。
user-invocable: true
---

# TDD対応の次タスク実装

GitHub Issue から次のタスクを選定し、テストパターン判定に基づいて適切なTDDパイプラインで実装します。

## 自律行動原則

このパイプラインは**確認なしで自律的に最後まで進行**する。以下のルールに従い、判断に迷う場面以外ではユーザーに質問しない。

### 確認不要（自動で進める）
- **Issue 選定**: 選定基準に合致する Issue を選び、そのまま着手する
- **classify-files 結果**: 判定結果に従って即座にパイプラインを開始する
- **review WARN / レビュー指摘**: 現在の Issue スコープ内の指摘は全て修正する。スコープ外の指摘は `/create-issue` スキル で別 Issue に切り出す。判断基準は Issue の受け入れ条件と照合すること
- **テストが Red にならない**: 原因を調査し、テストが正しく失敗するよう修正を試みる（最大3回）。解決しない場合のみ警告を出力して続行する
- **local-ci 失敗**: plan-fix → implement → local-ci のリトライを自動で回す（最大3回）
- **PR 作成**: パイプライン完了後、自動で PR を作成する
- **PR 作成後**: `/pr-watch` スキルで CI 監視・レビュー対応・修正サイクルを回す
- **PR マージ**: 新たなレビュー指摘がなくなったら自己判断でマージする

### 確認が必要（ユーザーに聞く）
- **classify-files が判定不能**: tddMode / testPattern を手動選択してもらう
- **リトライ上限到達**: 3回リトライしても解決しない場合のみ報告する
- **設計判断・スコープ変更**: Issue の受け入れ条件と合致しない変更が必要になった場合

## CI チェックに関する重要な区別

このパイプラインでは **local-ci コマンド**を使用します。以下の違いを理解しておいてください：

| コマンド | 実行場所 | 目的 | 使用場面 |
|---------|---------|------|----------|
| **local-ci** (このパイプラインで使用) | **local** | local CI チェック（remote CI 相当）をローカル実行 | TDD完了後、PR作成前の検証 |

- **local-ci**: ローカルマシン上で Biome check、Test、Build を並列実行（3つの sub agent を使用）

### Remote CI の監視と失敗ログ取得（サンドボックス環境）

PR 作成後の remote CI 監視は `/pr-watch` スキルに委譲するが、サンドボックス環境での制約を理解しておく必要がある。

#### CI watch

```bash
# PR の CI チェックを監視（完了まで待機）
gh pr checks {番号} --watch --fail-fast
```

#### CI 失敗時のログ取得

サンドボックス環境では `gh` のキャッシュディレクトリ（`~/.cache/gh/`）への書き込みが制限される。`XDG_CACHE_HOME` を `$TMPDIR`（サンドボックス許可ディレクトリ）に変更して回避する:

```bash
# Run ID を取得
RUN_ID=$(gh run list --branch {ブランチ名} --limit 1 --json databaseId,status -q '.[0].databaseId')

# 失敗ログを取得（XDG_CACHE_HOME でキャッシュ先をサンドボックス許可ディレクトリに変更）
XDG_CACHE_HOME=$TMPDIR gh run view "$RUN_ID" --log-failed
```

#### アンチパターン: `gh api .../logs` を使わない

```bash
# ❌ これは使わない — Azure Blob Storage へのリダイレクトがサンドボックスで遮断される
gh api repos/{owner}/{repo}/actions/jobs/{job_id}/logs
```

GitHub API のログエンドポイントは実体が Azure Blob Storage (`blob.core.windows.net`) にホストされており、302 リダイレクトが発生する。サンドボックスのネットワーク許可リストにこのホストが含まれないため `Forbidden` で失敗する。**常に `gh run view --log-failed` を使用すること。**

## 実行フロー

### 1. GitHub Issue から次タスクを選定

GitHub Project から実装可能な Issue を取得し、優先度の高いものを選定します。

```bash
# Project の Todo アイテム（実 Issue のみ、draft 除外）を取得
gh project item-list 6 --owner shiroinock --limit 100 --format json \
  | jq '[.items[] | select(.content.type == "Issue" and .status == "Todo")]'
```

取得した Issue について、依存関係（Blocked by）が全て解決済みかを確認します:

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

選定基準:
- Project の Status が **Todo** の実 Issue（draft は対象外）
- **Blocked by が全て CLOSED**（未解決の依存がない）
- `priority:high` ラベルがあるものを優先
- ラベルがない場合は番号が小さい（古い）ものを優先
- 選定結果はレポートに記載し、確認なしでそのまま着手する

> **Note**: 対象の Issue がない場合は、先に `issue-enrichment` スキルで Issue を詳細化するよう提案してください。

### 1.5. 排他制御（Project Status の更新）

Issue 選定・ユーザー確認後、実装開始前に Project の Status を **In Progress** に変更します。これにより、他セッションが同じ Issue を重複して着手することを防ぎます。

```bash
# Issue の Project item ID を取得
ITEM_ID=$(gh project item-list 6 --owner shiroinock --limit 100 --format json \
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
   - 判定: PASS → 完了 / WARN → スコープ内は全修正、スコープ外は /create-issue / FAIL → 必須修正

7. (失敗 or WARN or FAIL 時) plan-fix → implement → local-ci → review-file
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

### 5. 完了フロー

パイプライン完了後、git 追跡対象ファイルに変更があるかで完了フローを分岐します。

**分岐条件**:
- `git diff --name-only` や `git status` で **git 追跡対象ファイルに変更がある** → **パス A**（PR あり）
- 変更が `.gitignore` 対象ファイルのみ（例: `settings.local.json`）で **git 追跡対象に差分がない** → **パス B**（PR なし）

> **Note**: スキル定義ファイル（`.claude/skills/`）や設定ファイルであっても、git 追跡対象であればパス A を使用する。

#### パス A: PR あり完了（通常フロー）

git 追跡対象ファイルに変更がある場合のフローです。

```bash
# 1. Issue にコメントを追加
gh issue comment {番号} --body "実装完了。ブランチ: {ブランチ名}

### 作成ファイル
- {実装ファイルパス}
- {テストファイルパス}

### テスト結果
- 実行: {total} tests
- 成功: {passed} passed"

# 2. PR 作成（本文に Closes #{番号} を含める）
#    → PR マージ時に GitHub が自動で Issue をクローズする
#    → PR 作成・マージの手順はセクション「3. PR 作成・マージについて」を参照

# 3. PR マージ確認後、Project Status を Done に変更
ITEM_ID=$(gh project item-list 6 --owner shiroinock --limit 100 --format json \
  | jq -r '.items[] | select(.content.number == {番号}) | .id')

for i in 1 2 3; do
  gh project item-edit \
    --id "$ITEM_ID" \
    --project-id "PVT_kwHOAq02ps4BTFDk" \
    --field-id "PVTSSF_lAHOAq02ps4BTFDkzhAbPBc" \
    --single-select-option-id "98236657"

  # 反映確認
  STATUS=$(gh project item-list 6 --owner shiroinock --limit 100 --format json \
    | jq -r '.items[] | select(.content.number == {番号}) | .status')
  if [ "$STATUS" = "Done" ]; then
    echo "✓ Project Status が Done に更新されました"
    break
  fi

  if [ "$i" -lt 3 ]; then
    echo "⚠ Status が Done に反映されていません（試行 $i/3）。5秒後にリトライ..."
    sleep 5
  fi
done

if [ "$STATUS" != "Done" ]; then
  echo "⚠ 警告: 3回リトライしましたが Project Status が Done に反映されませんでした。"
  echo "GitHub Project ボード（https://github.com/orgs/shiroinock/projects/6）を手動で確認してください。"
fi
```

> **Note**: `gh issue close` は実行しない。PR 本文の `Closes #{番号}` によりマージ時に自動クローズされる。

#### パス B: PR なし完了

変更が `.gitignore` 対象ファイルのみで、git 追跡対象に差分がない場合のフローです。

```bash
# 1. Issue にコメントを追加
gh issue comment {番号} --body "実装完了（PR なし）。

### 変更ファイル
- {変更ファイルパス}

### 変更内容
{変更の概要}"

# 2. Issue をクローズ
gh issue close {番号}

# 3. Project Status を Done に変更
ITEM_ID=$(gh project item-list 6 --owner shiroinock --limit 100 --format json \
  | jq -r '.items[] | select(.content.number == {番号}) | .id')

for i in 1 2 3; do
  gh project item-edit \
    --id "$ITEM_ID" \
    --project-id "PVT_kwHOAq02ps4BTFDk" \
    --field-id "PVTSSF_lAHOAq02ps4BTFDkzhAbPBc" \
    --single-select-option-id "98236657"

  # 反映確認
  STATUS=$(gh project item-list 6 --owner shiroinock --limit 100 --format json \
    | jq -r '.items[] | select(.content.number == {番号}) | .status')
  if [ "$STATUS" = "Done" ]; then
    echo "✓ Project Status が Done に更新されました"
    break
  fi

  if [ "$i" -lt 3 ]; then
    echo "⚠ Status が Done に反映されていません（試行 $i/3）。5秒後にリトライ..."
    sleep 5
  fi
done

if [ "$STATUS" != "Done" ]; then
  echo "⚠ 警告: 3回リトライしましたが Project Status が Done に反映されませんでした。"
  echo "GitHub Project ボード（https://github.com/orgs/shiroinock/projects/6）を手動で確認してください。"
fi
```

**エラー発生時のロールバック**:

パイプライン途中でエラーが発生し、リトライ上限に達して中断する場合は、Project Status を **Todo** に戻して他セッションが再着手できるようにします。

```bash
# エラー中断時: Status を Todo に戻す
ITEM_ID=$(gh project item-list 6 --owner shiroinock --limit 100 --format json \
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

### 次のアクション（パス A: PR あり）
- [ ] コードレビュー
- [ ] PR 作成（`Closes #{番号}` を本文に含める）
- [ ] `/pr-watch {PR番号}` で CI 監視・レビュー対応を開始
- [ ] PR マージ（GitHub が自動で Issue クローズ）
- [ ] Project Status → Done

### 次のアクション（パス B: PR なし）
- [x] Issue クローズ済み
- [x] Project Status → Done 済み
```

## エージェント起動の注意点

### ツール選択ガイドライン（全エージェント共通）

エージェント起動プロンプトに以下の指示を含めること:

> ファイル探索には Glob、コード検索には Grep ツールを優先してください。Bash の find/grep は node_modules 等が大量ヒットするため原則禁止です。
>
> 検索戦略:
> - 2回検索して見つからなければ「存在しない」と判断し方針転換する。3回以上のリトライは禁止
> - 複雑な正規表現より単純なパターンを優先する。まずキーワード1語で検索する
> - 未実装 Issue の番号を git log やローカルファイルで検索しない。Issue 内容はプロンプトを信頼する
> - GitHub Issue は `gh issue view` で取得し、ローカルファイル内を検索しない

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
→ 原因を調査（テストが既存実装で満たされていないか、アサーション条件が甘くないか等を確認）→ test-writer を再起動してテストを修正 → test-runner で Red 確認 → 最大3回リトライ → 解決しない場合のみ警告を出力して続行する

### local-ci が失敗する場合 (implement 直後)
→ 全エラーを確認 → plan-fix → implement 再起動 → 最大3回リトライ → ユーザーに報告
→ リトライ上限で中断する場合は Project Status を In Progress → Todo にロールバック

### classify-files の判定が不明確な場合
→ ユーザーに確認し、tddMode と testPattern を手動選択してもらう（数少ない確認が必要なケース）

## 重要な注意事項

### 1. テストファイルパスの一貫性
classify-files が提案したパスを厳守:
- **colocated**: 同階層 (例: `src/utils/helpers.test.ts`)
- **separated**: `src/__tests__/integration/` (例: `src/__tests__/integration/dataFlow.test.ts`)

### 2. Issue の更新タイミング
- **全パイプライン完了後**に更新
- 途中でエラーが起きた場合は更新しない
- 完了フローは「パス A（PR あり）」と「パス B（PR なし）」に分岐する（セクション 5 参照）

### 3. PR 作成・マージについて

#### PR 作成
- パイプライン完了後、確認なしで `gh pr create` を実行する
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
