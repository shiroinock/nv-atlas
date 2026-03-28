---
name: issue-enrichment
description: Issue を詳細化して実装可能にする。コードベースを探索して実装方針・対象ファイル・受け入れ条件を書き込み、スコープが大きければ分割する。「Issue 整理」「Issue 詰めよう」「実装計画を立てよう」といった場面で使用。
user-invocable: true
---

# Issue Enrichment スキル

`draft` ラベル付きの Issue をコードベース探索で詳細化し、Project に登録します。
スコープが大きい場合は 1 PR = 1 モジュールに閉じるよう分割します。

## GitHub Project 情報

- **Project**: `shiroinock` owner, number `6`（KeyViz）
- **Status フィールド ID**: `PVTSSF_lAHOAq02ps4BTFDkzhAbPBc`
- **Status オプション**: Todo (`f75ad846`), In Progress (`47fc9ee4`), Done (`98236657`)

## 実行フロー

### 1. 対象の選定

```bash
# draft ラベル付きの Issue を取得（enrichment 未完了）
gh issue list --state open --label "draft" --limit 10 --json number,title,body

# または、引数で Issue 番号が指定された場合はその Issue を直接対象にする
gh issue view {番号} --json number,title,labels,body
```

- ユーザーに対象を確認

### 2. コードベース探索

Explore エージェントを使い、Issue のタイトル・概要から関連コードを調査します。

**調査観点**:
- 既存の関連ファイル・関数の特定
- 現在のアーキテクチャとの整合性
- 影響を受ける既存コードの範囲
- 必要な新規ファイル・モジュール

**Explore エージェント起動例**:
```javascript
{
  "subagent_type": "Explore",
  "prompt": "Issue #{番号}「{タイトル}」に関連するコードを調査してください。\n\n概要: {body}\n\n以下を特定してください:\n1. 直接変更が必要なファイル\n2. 参照・影響を受けるファイル\n3. 新規作成が必要なファイル\n4. 関連する型定義・インターフェース"
}
```

### 3. スコープ判定と分割

探索結果から、Issue の変更が **複数モジュールにまたがるか** を判定します。

**分割の基準**:
- PR が 1 モジュール（1 コンポーネント / 1 ユーティリティ / 1 データ層）の変更に閉じるか
- レビュアーが「この PR は何を変えたか」を一言で説明できるか

**分割が必要な場合**:

1. 変更を依存関係の順にグループ化し、各グループが 1 モジュールに閉じるよう分割する
2. 元 Issue を「親 Issue」として概要・背景を残す
3. 子 Issue をそれぞれ作成し、親の sub-issue として紐付ける
4. 子 Issue 間に依存関係がある場合は GitHub Relationships（Blocked by / Is blocking）を設定する
5. 全ての子 Issue を Project に追加し、Status を Todo にする

```bash
# 子 Issue を作成（--label は個別指定、カンマ区切り不可）
gh issue create --title "{子タイトル}" --body "{子本文}" --label "{ラベル1}" --label "{ラベル2}"

# node_id を取得（sub-issue・依存関係の設定に必要）
gh api graphql -f query='
  query {
    repository(owner: "shiroinock", name: "keyviz") {
      parent: issue(number: {親番号}) { id }
      child: issue(number: {子番号}) { id }
    }
  }
'

# 親 Issue の sub-issue として紐付け（gh CLI 未サポート、GraphQL を使用）
gh api graphql -f query='
  mutation {
    addSubIssue(input: {issueId: "{親のnode_id}", subIssueId: "{子のnode_id}"}) {
      issue { number }
    }
  }
'

# 依存関係の設定（Blocked by）
gh api graphql -f query='
  mutation {
    addBlockedBy(input: {issueId: "{ブロックされる側のnode_id}", blockingIssueId: "{ブロックする側のnode_id}"}) {
      issue { number }
    }
  }
'

# 子 Issue を Project に追加し、Status を Todo に設定
gh project item-add 6 --owner shiroinock --url {子IssueのURL}
# → 返却された item id を使って Status を設定
gh project item-edit --id "{item_id}" \
  --project-id "PVT_kwHOAq02ps4BTFDk" \
  --field-id "PVTSSF_lAHOAq02ps4BTFDkzhAbPBc" \
  --single-select-option-id "f75ad846"
```

**分割不要な場合**: そのまま次のステップへ進む。

### 4. Issue 本文の作成

探索結果を元に、以下の構造で Issue 本文を作成します。
分割した場合は子 Issue ごとにこのテンプレートを適用します。

```markdown
## 概要
{既存の概要があれば保持、なければタイトルから作成}

## 背景・動機
{なぜこの変更が必要か}

## 対象ファイル
- `{ファイルパス}` — {変更内容の概要}
- `{ファイルパス}` — {変更内容の概要}

## 実装方針
1. {ステップ1}
2. {ステップ2}
3. ...

## 受け入れ条件
- [ ] {条件1}
- [ ] {条件2}
- [ ] {条件3}

## 技術的な注意点
{探索で見つかった懸念事項・依存関係など。なければ省略}
```

**親 Issue（分割した場合）** は概要・背景のみ残し、子 Issue へは sub-issues で構造化されているためリンクの列挙は不要。

### 5. Issue の更新と Project 登録

```bash
# Issue 本文を更新
gh issue edit {番号} --body "{作成した本文}"

# draft ラベルを剥がす
gh issue edit {番号} --remove-label "draft"

# Issue を Project に追加
gh project item-add 6 --owner shiroinock --url {IssueのURL}
```

- `draft` ラベルは対象 Issue（親含む）全てから剥がす
- 親 Issue は Project に追加し、Status を **In Progress** にする（epic として進行中）
- 子 Issue は Project に追加し、Status を **Todo** にする

### 6. ユーザーへの報告

更新内容のサマリーを表示し、内容に問題がないか確認します。
分割した場合は、分割の理由と各子 Issue の概要・依存関係を説明します。
ユーザーが修正を求めた場合は、フィードバックを反映して再度 `gh issue edit` します。

## 注意事項

- 既存の本文がある場合は上書きではなく、情報を**補完・拡充**する
- 探索結果に自信がない部分は「要確認」と明記する
- `future` ラベルの Issue も対象にできるが、実装優先度はユーザーに確認する
- 1回の実行で複数 Issue を処理してもよい（ユーザーの指示に従う）
- 依存関係は GitHub Relationships（Blocked by / Is blocking）で設定する。Issue 本文には書かない
