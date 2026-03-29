---
name: pr-watch
description: PR 作成後の CI 監視・レビュー議論・修正実装を一貫して行う。PR マージまでのサイクルを短縮する。「PR 見て」「CI 通った？」「レビュー対応」といった場面で使用。
user-invocable: true
---

# PR Watch スキル

PR 作成後の「CI 監視 → レビューコメント議論 → 修正実装」を一貫して行い、PR マージまでのサイクルを回す。
レビュー指摘への対応方針は PR スレッド上で議論・合意してから修正に入り、意思決定の過程を PR 上に残す。

## 使い方

```bash
/pr-watch 123       # PR #123 を監視
/pr-watch           # 現在ブランチの直近 PR を自動検出
```

## 自律行動原則

このスキルは**確認なしで自律的に進行**する。以下のルールに従う。

### 確認不要（自動で進める）
- **CI 失敗の修正**: エラーログ分析 → plan-fix → implement → local-ci → push → 再監視
- **レビュー指摘への返信**: 対応方針を PR スレッドに返信し、合意を待つ
- **スコープ内の修正**: Issue の受け入れ条件に合致する指摘は全て修正する
- **スコープ外の指摘**: `/create-issue` スキルで別 Issue に切り出す

### 確認が必要（ユーザーに聞く）
- **レビュー方針の合意**: スレッド上で方針を提案した後、ユーザーの合意を待つ
- **リトライ上限到達**: CI 修正を3回リトライしても解決しない場合
- **設計判断・スコープ変更**: Issue の受け入れ条件と合致しない変更が必要になった場合

## 実行フロー

### 0. PR の特定

```bash
# 引数あり: 指定された PR 番号を使用
PR_NUMBER=$1

# 引数なし: 現在ブランチの PR を自動検出
if [ -z "$PR_NUMBER" ]; then
  PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null)
fi

# PR 情報を取得
PR_INFO=$(gh pr view "$PR_NUMBER" --json number,title,headRefName,state)
BRANCH=$(echo "$PR_INFO" | jq -r '.headRefName')
```

### 1. Phase 1: CI 監視

```bash
# 最新のワークフロー実行を取得
RUN_ID=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId,status -q '.[0].databaseId')

# 完了を待機（--exit-status で成否を終了コードに反映）
gh run watch "$RUN_ID" --exit-status
```

**CI 成功時** → Phase 2 へ

**CI 失敗時**:
```bash
# 失敗ログを取得・分析（サンドボックス環境では GH_CACHE_DIR を $TMPDIR に変更）
GH_CACHE_DIR=$TMPDIR gh run view "$RUN_ID" --log-failed
```

1. エラーログを分析
2. `plan-fix` エージェントで修正計画を立案
3. `implement` エージェントで修正実装
4. `/local-ci` スキルでローカル検証
5. `git push` で再 push
6. Phase 1 に戻る（push で CI が再実行される）

**リトライ上限**: 最大3回。超過時はユーザーに報告。

### 2. Phase 2: レビューコメント議論

#### 2-1. 未解決レビュースレッドの取得

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            comments(first: 20) {
              nodes {
                databaseId
                body
                author { login }
                createdAt
              }
            }
          }
        }
      }
    }
  }' -f owner="shiroinock" -f repo="keyviz" -F number="$PR_NUMBER" \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isOutdated == false and .isResolved == false)'
```

- `isOutdated == true` のスレッドは `claude-code-review.yml` が自動 resolve するため対象外
- `isResolved == false` の未解決スレッドのみ対象

#### 2-2. レビューコメントなし → 完了

未解決スレッドがない場合、PR はマージ可能な状態。完了を報告する。

#### 2-3. レビューコメントあり → 議論・修正サイクル

各未解決スレッドに対して:

1. **指摘内容を表示**: パス・行番号・コメント本文をユーザーに提示
2. **対応方針を PR スレッドに返信**:
   ```bash
   # レビュースレッドに返信（in_reply_to で元コメントのスレッドに紐付け）
   gh api repos/shiroinock/keyviz/pulls/${PR_NUMBER}/comments \
     -f body="対応方針の提案内容" \
     -F in_reply_to=PARENT_COMMENT_DATABASE_ID
   ```
   - `in_reply_to` には GraphQL の `databaseId`（REST API の integer ID）を使用
   - `gh pr comment` はトップレベルコメントなので、レビュースレッドへの返信には使えない
3. **ユーザーの合意を確認**: スレッド上で方針合意を待つ
4. **合意した方針に基づいて修正**:
   - スコープ内: `plan-fix` → `implement` → `/local-ci`
   - スコープ外: `/create-issue` スキルで別 Issue に切り出す
5. **push → Phase 1 に戻る**: re-push で CI が再実行される

### 3. 完了

CI 成功 + 未解決レビューなし の状態になったら、完了を報告する。

```markdown
## PR Watch 完了レポート

**PR**: #{PR番号} {タイトル}
**ブランチ**: {ブランチ名}

### CI 結果
- 最終ステータス: PASS
- CI 修正サイクル: {回数}回

### レビュー対応
- 対応済みスレッド: {件数}件
- 別 Issue に切り出し: {件数}件

### ステータス
PR はマージ可能な状態です。
```

## エージェント起動例

**plan-fix エージェント**（CI 失敗時）:
```javascript
{
  "subagent_type": "plan-fix",
  "model": "opus",
  "prompt": "CI が失敗しました。以下のエラーログに基づき修正計画を作成してください。\n\nエラーログ:\n{log_failed_output}"
}
```

**implement エージェント**（修正実装）:
```javascript
{
  "subagent_type": "implement",
  "model": "sonnet",
  "prompt": "以下の修正計画に基づいて実装してください。\n\n修正計画:\n{plan_fix_output}"
}
```

**local-ci コマンド**（push 前検証）:
```javascript
Skill({
  "skill": "local-ci"
})
```

## 他ツールとの役割分担

| ツール | 実行主体 | タイミング | 役割 |
|--------|---------|-----------|------|
| **pr-watch**（このスキル） | ローカル CLI | PR 作成後に能動的に実行 | CI 監視・レビュー議論・修正実装 |
| **claude-code-review.yml** | GitHub Actions | PR push 時に自動実行 | コードレビュー + outdated スレッド resolve |
| **claude.yml** | GitHub Actions | `@claude` メンション時 | GitHub 上のイベントに受動的に応答 |

## エラーハンドリング

### CI 修正が3回で解決しない場合
→ ユーザーに報告し、手動対応を依頼する

### レビュースレッドへの返信が失敗する場合
→ `databaseId` と `in_reply_to` の整合性を確認。GraphQL node_id ではなく REST API の integer ID が必要

### PR が既にマージ済み・クローズ済みの場合
→ 状態を報告して終了する
