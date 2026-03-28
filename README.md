# KeyViz

カスタムキーボード配列で Neovim キーバインドを可視化する Web アプリ。

Colemak や Dvorak などの非 QWERTY 配列を使っていると、Vim のキーバインドガイドがそのまま当てはまりません。KeyViz は VIA のキーマップ JSON を読み込み、自分の配列上でどのキーがどの Vim 操作に対応するかをキーボード上に表示します。

## 機能

- **可視化モード** — キーボード上に Vim コマンドをカテゴリ別に色分け表示。キーをホバーすると詳細説明を確認できます
- **練習モード** — 「`j` を押して下に移動」のようなプロンプトに対して正しい物理キーを押す練習ができます
- **辞書モード** — Vim コマンドの一覧から検索し、対応するキーをキーボード上でハイライト表示
- **Neovim 連携** — ローカルの Neovim から実際のキーマップを取得して反映
- **Vim モード切替** — Normal / Visual / Insert / Operator-pending モードごとのキーバインドを表示
- **スプリットキーボード対応** — Corne 等のカラムスタガー・回転サムクラスターに対応

## 使い方

### 必要なもの

- VIA 定義 JSON（キーボードの物理レイアウト）
- VIA キーマップ JSON（キーの割り当て）

どちらも [VIA](https://usevia.app/) や [Vial](https://get.vial.today/) からエクスポートできます。

### セットアップ

```bash
pnpm install
pnpm dev
```

ブラウザで表示されたら、VIA 定義 JSON とキーマップ JSON を読み込ませてください。

## Tech Stack

- React 19 + Vite + TypeScript
- CSS Modules
- Biome (リンタ・フォーマッタ)
- Vitest (テスト)

## 開発

```bash
pnpm dev          # 開発サーバー
pnpm build        # プロダクションビルド
pnpm test         # テスト実行
pnpm lint         # Lint チェック
pnpm lint:fix     # Lint 自動修正
```

## ライセンス

[MIT](./LICENSE)
