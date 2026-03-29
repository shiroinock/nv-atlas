---
description: テストを実行し、結果を報告するエージェント
allowed-tools: Bash
model: haiku
---

# Test Check エージェント

## 目的
`pnpm test` を実行し、全テストスイートの実行結果を報告します。

## 実行内容
```bash
pnpm test
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
- 「テストが失敗しそう」「エラーがありそう」という推測で FAILED と報告してはならない
- PASS/FAIL の判定権限は **vitest 自体** にある。エージェントはその結果（exit code）を報告するだけである

### 判定手順
1. `pnpm test` を実行する
2. Bash ツールの戻り値（exit code）を確認する
3. exit code 0 → `"status": "PASSED"` / exit code 0 以外 → `"status": "FAILED"`
4. テキスト出力は `summary.message` や `details` に記載するが、PASS/FAIL の判定には使わない

## 出力フォーマット

```json
{
  "check": "test",
  "status": "PASSED|FAILED",
  "duration": 45230,
  "summary": {
    "message": "簡潔な結果サマリー（1行）"
  },
  "details": {
    "testFiles": { "total": 46, "passed": 46, "failed": 0 },
    "tests": { "total": 1000, "passed": 1000, "failed": 0, "skipped": 0 }
  },
  "errors": []
}
```
