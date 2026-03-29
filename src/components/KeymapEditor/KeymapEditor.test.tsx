import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/storage")>()),
  saveKeybindingConfig: vi.fn(),
  loadKeybindingConfig: vi.fn(() => null),
}));

import { KeybindingProvider } from "../../context/KeybindingContext";
import type { KeybindingConfig } from "../../types/keybinding";
import { createDefaultConfig } from "../../utils/keybinding-defaults";
import { KeymapEditor } from "./KeymapEditor";

function renderWithContext(customKeymap?: Record<string, string>) {
  const config: KeybindingConfig = {
    ...createDefaultConfig(),
    customKeymap,
  };
  return render(
    <KeybindingProvider initial={config}>
      <KeymapEditor />
    </KeybindingProvider>,
  );
}

const ALL_QWERTY_KEYS = [
  "q",
  "w",
  "e",
  "r",
  "t",
  "y",
  "u",
  "i",
  "o",
  "p",
  "a",
  "s",
  "d",
  "f",
  "g",
  "h",
  "j",
  "k",
  "l",
  ";",
  "z",
  "x",
  "c",
  "v",
  "b",
  "n",
  "m",
  ",",
  ".",
  "/",
];

/** テスト用の QWERTY → QWERTY 同一キーマップ（重複なし） */
const IDENTITY_KEYMAP: Record<string, string> = Object.fromEntries(
  ALL_QWERTY_KEYS.map((k) => [k, k]),
);

/** テスト用の重複あり customKeymap（q と w に同じ "a" を割り当て） */
const DUPLICATE_KEYMAP: Record<string, string> = {
  ...IDENTITY_KEYMAP,
  q: "a",
  w: "a",
  a: "b",
  b: "n",
  n: "m",
  m: ",",
  ",": ".",
  ".": "/",
  "/": "-",
};

/** テスト用の defaultCustomKeymap 相当のキーマップ */
const DEFAULT_KEYMAP: Record<string, string> = {
  q: "q",
  w: "l",
  e: "h",
  r: "c",
  t: "f",
  y: "p",
  u: "b",
  i: "u",
  o: ",",
  p: ".",
  a: "a",
  s: "n",
  d: "r",
  f: "s",
  g: "w",
  h: "k",
  j: "t",
  k: "e",
  l: "o",
  ";": "i",
  z: "-",
  x: "z",
  c: "y",
  v: "m",
  b: "v",
  n: "g",
  m: "d",
  ",": "j",
  ".": "x",
  "/": ";",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("KeymapEditor", () => {
  describe("テーブル表示", () => {
    test("ルートコンテナが data-testid='keymap-editor' で表示される", () => {
      renderWithContext();

      expect(screen.getByTestId("keymap-editor")).toBeInTheDocument();
    });

    test("30キー全ての output-cell が表示される", () => {
      renderWithContext();

      for (const key of ALL_QWERTY_KEYS) {
        expect(screen.getByTestId(`output-cell-${key}`)).toBeInTheDocument();
      }
    });

    test("30キー分の output-cell がちょうど30個存在する", () => {
      const { container } = renderWithContext();

      const cells = container.querySelectorAll("[data-testid^='output-cell-']");
      expect(cells).toHaveLength(30);
    });
  });

  describe("customKeymap の値表示", () => {
    test("customKeymap の出力文字が正しく表示される", () => {
      renderWithContext(DEFAULT_KEYMAP);

      const cellQ = screen.getByTestId("output-cell-q");
      expect(cellQ).toHaveTextContent("q");

      const cellW = screen.getByTestId("output-cell-w");
      expect(cellW).toHaveTextContent("l");

      const cellJ = screen.getByTestId("output-cell-j");
      expect(cellJ).toHaveTextContent("t");
    });

    test("customKeymap 未設定時は defaultCustomKeymap の値が表示される", () => {
      renderWithContext(undefined);

      // defaultCustomKeymap の w → l のマッピングが表示される
      const cellW = screen.getByTestId("output-cell-w");
      expect(cellW).toHaveTextContent("l");

      // defaultCustomKeymap の j → t のマッピングが表示される
      const cellJ = screen.getByTestId("output-cell-j");
      expect(cellJ).toHaveTextContent("t");
    });
  });

  describe("インライン編集モード開始", () => {
    test("出力文字ボタンをクリックすると input が表示される", async () => {
      const user = userEvent.setup();
      renderWithContext({ q: "q", w: "w" });

      const cellQ = screen.getByTestId("output-cell-q");
      const button = cellQ.querySelector("button");
      expect(button).toBeTruthy();
      await user.click(button as HTMLElement);

      expect(screen.getByTestId("output-input-q")).toBeInTheDocument();
    });

    test("クリック前は input が表示されていない", () => {
      renderWithContext();

      expect(screen.queryByTestId("output-input-q")).not.toBeInTheDocument();
    });

    test("編集モード開始時に input に現在の値がセットされる", async () => {
      const user = userEvent.setup();
      renderWithContext({ q: "myval", w: "w" });

      const cellQ = screen.getByTestId("output-cell-q");
      const button = cellQ.querySelector("button");
      expect(button).toBeTruthy();
      await user.click(button as HTMLElement);

      const input = screen.getByTestId("output-input-q");
      expect(input).toHaveValue("myval");
    });
  });

  describe("Enter で確定", () => {
    test("input に新しい値を入力し Enter で確定すると input が消える", async () => {
      const user = userEvent.setup();
      renderWithContext(IDENTITY_KEYMAP);

      const cellQ = screen.getByTestId("output-cell-q");
      const button = cellQ.querySelector("button");
      expect(button).toBeTruthy();
      await user.click(button as HTMLElement);

      const input = screen.getByTestId("output-input-q");
      await user.clear(input);
      await user.type(input, "z");
      await user.keyboard("{Enter}");

      expect(screen.queryByTestId("output-input-q")).not.toBeInTheDocument();
    });

    test("Enter で確定すると更新された値が output-cell に反映される", async () => {
      const user = userEvent.setup();
      renderWithContext(IDENTITY_KEYMAP);

      const cellW = screen.getByTestId("output-cell-w");
      const button = cellW.querySelector("button");
      expect(button).toBeTruthy();
      await user.click(button as HTMLElement);

      const input = screen.getByTestId("output-input-w");
      await user.clear(input);
      await user.type(input, "Z");
      await user.keyboard("{Enter}");

      expect(screen.getByTestId("output-cell-w")).toHaveTextContent("Z");
    });
  });

  describe("Escape でキャンセル", () => {
    test("input 表示中に Escape を押すと input が消える", async () => {
      const user = userEvent.setup();
      renderWithContext({ q: "q", w: "w" });

      const cellQ = screen.getByTestId("output-cell-q");
      const button = cellQ.querySelector("button");
      expect(button).toBeTruthy();
      await user.click(button as HTMLElement);

      expect(screen.getByTestId("output-input-q")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(screen.queryByTestId("output-input-q")).not.toBeInTheDocument();
    });

    test("Escape キャンセル後は元の値が output-cell に残っている", async () => {
      const user = userEvent.setup();
      renderWithContext({ ...IDENTITY_KEYMAP, q: "original" });

      const cellQ = screen.getByTestId("output-cell-q");
      const button = cellQ.querySelector("button");
      expect(button).toBeTruthy();
      await user.click(button as HTMLElement);

      const input = screen.getByTestId("output-input-q");
      await user.clear(input);
      await user.type(input, "changed");
      await user.keyboard("{Escape}");

      // キャンセルしたので元の値に戻る（dispatch が発行されない）
      expect(screen.getByTestId("output-cell-q")).toHaveTextContent("original");
    });
  });

  describe("バリデーション: 重複エラー表示", () => {
    test("同じ出力文字が複数キーに割り当てられると data-error='true' が付く", () => {
      renderWithContext(DUPLICATE_KEYMAP);

      expect(screen.getByTestId("output-cell-q")).toHaveAttribute(
        "data-error",
        "true",
      );
      expect(screen.getByTestId("output-cell-w")).toHaveAttribute(
        "data-error",
        "true",
      );
    });

    test("同じ出力文字が複数キーに割り当てられるとエラーメッセージが表示される", () => {
      renderWithContext(DUPLICATE_KEYMAP);

      // q または w にエラーメッセージが表示される
      const errorQ = screen.queryByTestId("error-q");
      const errorW = screen.queryByTestId("error-w");
      expect(errorQ ?? errorW).not.toBeNull();
    });

    test("重複がないキーには data-error 属性が付かない", () => {
      renderWithContext(DEFAULT_KEYMAP);

      for (const key of ALL_QWERTY_KEYS) {
        expect(screen.getByTestId(`output-cell-${key}`)).not.toHaveAttribute(
          "data-error",
          "true",
        );
      }
    });
  });

  describe("スナップショット", () => {
    test("defaultCustomKeymap でレンダリングした結果のスナップショット", () => {
      const { container } = renderWithContext(undefined);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
