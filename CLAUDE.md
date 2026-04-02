# nv-atlas

カスタムキーボード配列で Neovim キーバインドを可視化する Web アプリ。

## Tech Stack

- React 19 + Vite + TypeScript
- CSS Modules
- パッケージマネージャ: pnpm

## 開発コマンド

- `pnpm dev` — 開発サーバー起動
- `pnpm build` — プロダクションビルド
- `pnpm exec tsc --noEmit` — 型チェック

## アーキテクチャ

- `src/utils/kle-parser.ts` — VIA/KLE JSON パーサー（物理レイアウト）
- `src/utils/via-keymap-parser.ts` — VIA キーマップ JSON パーサー（キー割り当て）
- `src/data/keymap.ts` — カスタム配列 ↔ QWERTY マッピング
- `src/data/vim-commands.ts` — Vim コマンド定義（カテゴリ・説明）
- `src/components/Keyboard/` — キーボード描画
- `src/components/CommandDetail/` — ホバー時の Vim コマンド詳細
- `src/components/LayoutLoader/` — JSON ファイル読み込み UI

## キーマッピングの仕組み

VIA キーマップ読み込み時:
1. マトリクス座標 → VIA キーマップから出力文字を取得
2. 出力文字 → `invertKeymap()` で QWERTY 位置に逆引き（= langmap と同等の変換）
3. QWERTY 位置 → Vim コマンドを引き当て

## Worktree 環境での pnpm

Worktree エージェント（sandbox 内）では `pnpm` シェル関数（safe-chain ラッパー）がプロキシサーバーの listen で EPERM になる。スキル・エージェントでは以下のワンライナーで worktree を検出し、直接バイナリにフォールバックする:

```bash
PNPM=$( [ "$(git rev-parse --git-common-dir 2>/dev/null)" != ".git" ] && echo /etc/profiles/per-user/shiroino/bin/pnpm || echo pnpm )
$PNPM lint
```

- メインセッション（`.git` がディレクトリ）: `pnpm`（safe-chain 経由）
- Worktree（`.git` がファイル）: Nix の pnpm バイナリを直接使用

## ロードマップ

[ROADMAP.md](./ROADMAP.md) を参照。
