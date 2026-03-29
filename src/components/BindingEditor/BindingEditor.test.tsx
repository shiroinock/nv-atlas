import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import * as KeybindingContextModule from "../../context/KeybindingContext";
import type { Keybinding, KeybindingConfig } from "../../types/keybinding";
import { emptyBindings } from "../../types/keybinding";
import { BindingEditor } from "./BindingEditor";

const mockDispatch = vi.fn();

const makeBinding = (overrides: Partial<Keybinding> = {}): Keybinding => ({
  lhs: "j",
  name: "↓",
  description: "下に移動",
  category: "motion",
  source: "default",
  noremap: false,
  ...overrides,
});

const makeConfig = (bindings: Keybinding[] = []): KeybindingConfig => ({
  version: 1,
  name: "test",
  bindings: { ...emptyBindings(), n: bindings },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

function setupMockContext(config: KeybindingConfig) {
  vi.spyOn(KeybindingContextModule, "useKeybindingContext").mockReturnValue({
    config,
    dispatch: mockDispatch,
    getBinding: vi.fn(),
    bindingsByLhs: {} as never,
  });
}

describe("BindingEditor", () => {
  describe("バインディング一覧表示", () => {
    test("lhs、コマンド名、カテゴリ、ソースが表示される", () => {
      setupMockContext(
        makeConfig([
          makeBinding({
            lhs: "j",
            name: "↓",
            category: "motion",
            source: "default",
          }),
        ]),
      );
      render(<BindingEditor />);

      expect(screen.getByText("j")).toBeInTheDocument();
      expect(screen.getByText("↓")).toBeInTheDocument();
      expect(screen.getByText("移動")).toBeInTheDocument();
      expect(screen.getByText("デフォルト")).toBeInTheDocument();
    });

    test("description がある場合は説明も表示される", () => {
      setupMockContext(makeConfig([makeBinding({ description: "下に移動" })]));
      render(<BindingEditor />);

      expect(screen.getByText("下に移動")).toBeInTheDocument();
    });

    test("複数バインディングがすべて表示される", () => {
      setupMockContext(
        makeConfig([
          makeBinding({ lhs: "j", name: "↓" }),
          makeBinding({ lhs: "k", name: "↑" }),
        ]),
      );
      render(<BindingEditor />);

      expect(screen.getByText("j")).toBeInTheDocument();
      expect(screen.getByText("k")).toBeInTheDocument();
    });
  });

  describe("バインディングなし", () => {
    test("バインディングが空の場合に空メッセージが表示される", () => {
      setupMockContext(makeConfig([]));
      render(<BindingEditor />);

      expect(
        screen.getByText("このモードにバインディングはありません"),
      ).toBeInTheDocument();
    });

    test("バインディングが空の場合にテーブルは表示されない", () => {
      setupMockContext(makeConfig([]));
      const { container } = render(<BindingEditor />);

      expect(container.querySelector("table")).not.toBeInTheDocument();
    });
  });

  describe("行クリックで編集開始", () => {
    test("行クリックで KeyCapture が表示される", () => {
      setupMockContext(makeConfig([makeBinding()]));
      render(<BindingEditor />);

      const row = screen.getByText("j").closest("tr");
      expect(row).not.toBeNull();
      fireEvent.click(row as HTMLElement);

      expect(screen.getByLabelText("キー入力キャプチャ")).toBeInTheDocument();
    });

    test("行クリック後は kbd 表示が消える", () => {
      setupMockContext(makeConfig([makeBinding()]));
      render(<BindingEditor />);

      const row = screen.getByText("j").closest("tr");
      expect(row).not.toBeNull();
      fireEvent.click(row as HTMLElement);

      expect(screen.queryByRole("term")).not.toBeInTheDocument();
    });
  });

  describe("「変更」ボタンクリックで編集開始", () => {
    test("「変更」ボタンクリックで KeyCapture が表示される", () => {
      setupMockContext(makeConfig([makeBinding()]));
      render(<BindingEditor />);

      fireEvent.click(screen.getByRole("button", { name: "変更" }));

      expect(screen.getByLabelText("キー入力キャプチャ")).toBeInTheDocument();
    });

    test("「変更」ボタンクリック後に操作ボタンが非表示になる", () => {
      setupMockContext(makeConfig([makeBinding()]));
      render(<BindingEditor />);

      fireEvent.click(screen.getByRole("button", { name: "変更" }));

      expect(
        screen.queryByRole("button", { name: "変更" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "削除" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("KeyCapture 確定時", () => {
    test("UPDATE_BINDING が正しい引数で dispatch される", () => {
      setupMockContext(makeConfig([makeBinding({ lhs: "j" })]));
      render(<BindingEditor />);

      fireEvent.click(screen.getByRole("button", { name: "変更" }));
      const captureEl = screen.getByLabelText("キー入力キャプチャ");
      fireEvent.keyDown(captureEl, { key: "k" });
      fireEvent.keyDown(captureEl, { key: "Enter" });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "UPDATE_BINDING",
        mode: "n",
        index: 0,
        binding: { lhs: "k" },
      });
    });

    test("確定後に編集状態が解除される", () => {
      setupMockContext(makeConfig([makeBinding()]));
      render(<BindingEditor />);

      fireEvent.click(screen.getByRole("button", { name: "変更" }));
      const captureEl = screen.getByLabelText("キー入力キャプチャ");
      fireEvent.keyDown(captureEl, { key: "k" });
      fireEvent.keyDown(captureEl, { key: "Enter" });

      expect(
        screen.queryByLabelText("キー入力キャプチャ"),
      ).not.toBeInTheDocument();
    });
  });

  describe("KeyCapture キャンセル時", () => {
    test("Escape で編集状態が解除される", () => {
      setupMockContext(makeConfig([makeBinding()]));
      render(<BindingEditor />);

      fireEvent.click(screen.getByRole("button", { name: "変更" }));
      const captureEl = screen.getByLabelText("キー入力キャプチャ");
      fireEvent.keyDown(captureEl, { key: "Escape" });

      expect(
        screen.queryByLabelText("キー入力キャプチャ"),
      ).not.toBeInTheDocument();
    });

    test("キャンセル時に dispatch は呼ばれない", () => {
      setupMockContext(makeConfig([makeBinding()]));
      mockDispatch.mockClear();
      render(<BindingEditor />);

      fireEvent.click(screen.getByRole("button", { name: "変更" }));
      const captureEl = screen.getByLabelText("キー入力キャプチャ");
      fireEvent.keyDown(captureEl, { key: "Escape" });

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("「削除」ボタンクリック", () => {
    test("REMOVE_BINDING が正しい引数で dispatch される", () => {
      setupMockContext(makeConfig([makeBinding()]));
      mockDispatch.mockClear();
      render(<BindingEditor />);

      fireEvent.click(screen.getByRole("button", { name: "削除" }));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "REMOVE_BINDING",
        mode: "n",
        index: 0,
      });
    });

    test("削除後にバインディングが空になると空メッセージが表示される", () => {
      setupMockContext(makeConfig([makeBinding()]));
      render(<BindingEditor />);

      fireEvent.click(screen.getByRole("button", { name: "変更" }));
      expect(screen.getByLabelText("キー入力キャプチャ")).toBeInTheDocument();

      setupMockContext(makeConfig([]));
      render(<BindingEditor />);

      expect(
        screen.getByText("このモードにバインディングはありません"),
      ).toBeInTheDocument();
    });
  });

  describe("スナップショット", () => {
    test("バインディングありの基本レンダリング", () => {
      setupMockContext(
        makeConfig([
          makeBinding({
            lhs: "j",
            name: "↓",
            description: "下に移動",
            category: "motion",
            source: "default",
          }),
          makeBinding({
            lhs: "k",
            name: "↑",
            description: "上に移動",
            category: "motion",
            source: "layout-derived",
          }),
        ]),
      );
      const { container } = render(<BindingEditor />);
      expect(container.firstChild).toMatchSnapshot();
    });

    test("バインディングなしの場合", () => {
      setupMockContext(makeConfig([]));
      const { container } = render(<BindingEditor />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
