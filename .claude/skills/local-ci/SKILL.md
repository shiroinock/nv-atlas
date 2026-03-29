---
name: local-ci
description: remote CI (GitHub Actions) 相当のチェックをローカルで実行。Biome check、テスト、ビルドを並列実行し、全てのチェックが成功したことを確認する。PR作成前の事前チェックに使用。
user-invocable: true
---

# Local CI スキル

**このスキルの役割**: remote CI (GitHub Actions) 相当のチェックを**ローカルマシン上**で実行するスキル。

## 実行手順

1. 開始メッセージを表示: `Local CI を実行します...`
2. 以下の 3 コマンドを **並列に Bash ツールで実行**（1 メッセージで 3 つの Bash tool call を送る）:
   - `pnpm lint`
   - `pnpm test`
   - `pnpm build`
3. 各コマンドの **exit code** で PASS/FAIL を判定
4. 結果をサマリーとして表示

## 使い方

```bash
/local-ci
```

## PASS/FAIL 判定ルール（厳守）

**exit code が唯一の判定基準である。それ以外の方法で PASS/FAIL を判定してはならない。**

| exit code | status |
|-----------|--------|
| 0         | PASSED |
| 0 以外    | FAILED |

### 禁止事項
- コマンドの **テキスト出力（stdout/stderr）を読んで PASS/FAIL を判断してはならない**
- 警告メッセージが出力されても、exit code が 0 なら **PASSED** である
- 「エラーがありそう」「問題がありそう」という推測で FAILED と報告してはならない

## サマリーフォーマット

全コマンド完了後、以下の形式で結果を表示:

```
## Local CI Results

| Check | Status | Duration |
|-------|--------|----------|
| Biome | PASSED/FAILED | Xs |
| Test  | PASSED/FAILED | Xs |
| Build | PASSED/FAILED | Xs |

{FAILED がある場合はエラー出力を引用}
```
