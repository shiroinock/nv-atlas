---
name: issue-enrichment
description: GitHub Issue の中身を詰める。タイトルだけ・概要だけの Issue に対し、コードベースを探索して実装方針・対象ファイル・受け入れ条件を書き込む。「Issue 整理」「Issue 詰めよう」「実装計画を立てよう」といった場面で使用。
user-invocable: true
---

# Issue Enrichment スキル

タイトルや簡単な概要だけの GitHub Issue に対し、コードベースを探索して実装に必要な情報を書き込みます。
完了後に `status:ready` ラベルを付与し、`tdd-next` で実装着手可能な状態にします。

## 実行フロー

### 1. 対象 Issue の選定

```bash
# status:ready でも status:in-progress でもない open Issue を取得
gh issue list --state open --limit 10 --search "-label:status:ready -label:status:in-progress" --json number,title,labels,body
```

- `status:ready` および `status:in-progress` ラベルが**ない** Issue を候補として表示
- ユーザーに対象 Issue を確認

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

### 3. Issue 本文の作成

探索結果を元に、以下の構造で Issue 本文を作成します:

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

### 4. Issue の更新

```bash
# Issue 本文を更新
gh issue edit {番号} --body "{作成した本文}"

# status:ready ラベルを付与
gh issue edit {番号} --add-label "status:ready"
```

### 5. ユーザーへの報告

更新内容のサマリーを表示し、内容に問題がないか確認します。
ユーザーが修正を求めた場合は、フィードバックを反映して再度 `gh issue edit` します。

## 注意事項

- 既存の本文がある場合は上書きではなく、情報を**補完・拡充**する
- 探索結果に自信がない部分は「要確認」と明記する
- `future` ラベルの Issue も対象にできるが、実装優先度はユーザーに確認する
- 1回の実行で複数 Issue を処理してもよい（ユーザーの指示に従う）
