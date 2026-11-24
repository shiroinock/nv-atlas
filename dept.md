# dept: 187

依存ライブラリが最新版からどれだけ遅れているか。最新版までに出たリリースを major / minor / patch に分けて数え、重みを掛けて足したもの([スコアの定義](https://github.com/shiroinock/dept#スコアの定義))。

- 合計 **187** = major 2 × 30 + minor 12 × 3 + patch 91 × 1
- 11 / 13 パッケージが遅れている、7.4 libyears
- ロックファイル:`./pnpm-lock.yaml`

| SCORE | PACKAGE | CURRENT | LATEST | MAJ | MIN | PAT | LIBYEAR | KIND |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 40 | `vitest` | 4.1.11 | 5.1.1 | 1 | 1 | 7 | 0.3 | dev |
| 37 | `@biomejs/biome` | 2.4.9 | 2.6.9 | 0 | 2 | 31 | 0.7 | dev |
| 30 | `@testing-library/jest-dom` | 7.0.1 | 8.0.0 | 1 | 0 | 0 | 0.3 | dev |
| 19 | `vite` | 8.1.6 | 8.3.8 | 0 | 2 | 13 | 0.1 | dev |
| 16 | `@vitejs/plugin-react` | 6.0.1 | 6.3.0 | 0 | 3 | 7 | 0.7 | dev |
| 11 | `@testing-library/user-event` | 14.6.1 | 14.6.13 | 0 | 0 | 11 | 1.8 | dev |
| 9 | `react` | 19.2.4 | 19.3.1 | 0 | 1 | 6 | 0.7 | prod |
| 9 | `react-dom` | 19.2.4 | 19.3.1 | 0 | 1 | 6 | 0.7 | prod |
| 8 | `@types/react` | 19.2.14 | 19.3.1 | 0 | 1 | 5 | 0.8 | dev |
| 7 | `@types/react-dom` | 19.2.3 | 19.3.0 | 0 | 1 | 4 | 0.8 | dev |
| 1 | `@testing-library/react` | 16.3.2 | 16.3.3 | 0 | 0 | 1 | 0.6 | dev |

<details>
<summary>最新の依存(2 件)</summary>

| PACKAGE | VERSION | KIND |
| --- | --- | --- |
| `jsdom` | 31.0.1 | dev |
| `typescript` | 7.0.2 | dev |

</details>

---

[dept](https://github.com/shiroinock/dept) で作成
