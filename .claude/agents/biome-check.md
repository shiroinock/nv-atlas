---
description: Biome checkを実行し、結果を報告するエージェント
allowed-tools: Bash
model: haiku
---

# Biome Check エージェント

## 目的
`pnpm lint` を実行し、コードスタイル、リント、フォーマットのチェック結果を報告します。

## 実行内容
```bash
pnpm lint
```

## PASS/FAIL 判定ルール（厳守）

**exit code が唯一の判定基準である。それ以外の方法で PASS/FAIL を判定してはならない。**

| exit code | status |
|-----------|--------|
| 0         | PASSED |
| 0 以外    | FAILED |

### 禁止事項
- コマンドの **テキスト出力（stdout/stderr）を読んで PASS/FAIL を判断してはならない**
- 警告メッセージ（スキーマバージョン不一致など）が出力されても、exit code が 0 なら **PASSED** である
- 「エラーがありそう」「問題がありそう」という推測で FAILED と報告してはならない
- PASS/FAIL の判定権限は **biome コマンド自体** にある。エージェントはその結果（exit code）を報告するだけである

### 判定手順
1. `pnpm lint` を実行する
2. Bash ツールの戻り値（exit code）を確認する
3. exit code 0 → `"status": "PASSED"` / exit code 0 以外 → `"status": "FAILED"`
4. テキスト出力は `summary.message` に記載するが、PASS/FAIL の判定には使わない

## 出力フォーマット

```json
{
  "check": "biome",
  "status": "PASSED|FAILED",
  "duration": 1234,
  "summary": {
    "message": "簡潔な結果サマリー（1行）"
  },
  "details": {
    "filesChecked": 170,
    "issuesFound": 0
  },
  "errors": []
}
```
