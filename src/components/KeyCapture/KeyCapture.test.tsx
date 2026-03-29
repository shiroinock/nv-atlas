import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { KeyCapture } from "./KeyCapture";

const createProps = () => ({
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
});

describe("KeyCapture", () => {
  describe("初期表示", () => {
    test("キー入力待ち状態のプレースホルダーが表示される", () => {
      render(<KeyCapture {...createProps()} />);
      expect(screen.getByText("キーを押してください…")).toBeInTheDocument();
    });

    test("初期状態ではプレビュー（kbd要素）が表示されない", () => {
      const { container } = render(<KeyCapture {...createProps()} />);
      expect(container.querySelector("kbd")).not.toBeInTheDocument();
    });
  });

  describe("キーキャプチャ", () => {
    test("通常キーを押すとプレースホルダーが消えVim表記がプレビュー表示される", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "a" });
      expect(
        screen.queryByText("キーを押してください…"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("a")).toBeInTheDocument();
    });

    test("キャプチャ後にヒントテキストが表示される", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "a" });
      expect(
        screen.getByText("Enter または同じキーで確定 / Escape でキャンセル"),
      ).toBeInTheDocument();
    });
  });

  describe("修飾キー付き入力", () => {
    test("Ctrl+a を押すと '<C-a>' がプレビュー表示される", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), {
        key: "a",
        ctrlKey: true,
      });
      expect(screen.getByText("<C-a>")).toBeInTheDocument();
    });

    test("Alt+f を押すと '<A-f>' がプレビュー表示される", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), {
        key: "f",
        altKey: true,
      });
      expect(screen.getByText("<A-f>")).toBeInTheDocument();
    });
  });

  describe("修飾キー単体は無視", () => {
    test("Control キー単体を押しても表示が変わらない", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "Control" });
      expect(screen.getByText("キーを押してください…")).toBeInTheDocument();
    });

    test("Shift キー単体を押しても表示が変わらない", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "Shift" });
      expect(screen.getByText("キーを押してください…")).toBeInTheDocument();
    });

    test("Alt キー単体を押しても表示が変わらない", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "Alt" });
      expect(screen.getByText("キーを押してください…")).toBeInTheDocument();
    });
  });

  describe("Escape でキャンセル", () => {
    test("Escape を押すと onCancel が呼ばれる", () => {
      const props = createProps();
      render(<KeyCapture {...props} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "Escape" });
      expect(props.onCancel).toHaveBeenCalledOnce();
    });

    test("Escape を押しても onConfirm は呼ばれない", () => {
      const props = createProps();
      render(<KeyCapture {...props} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "Escape" });
      expect(props.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("Enter で確定", () => {
    test("キーキャプチャ後に Enter を押すと onConfirm がキャプチャしたキーで呼ばれる", () => {
      const props = createProps();
      render(<KeyCapture {...props} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "a" });
      fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledWith("a");
    });

    test("修飾キー付きキーキャプチャ後に Enter を押すと onConfirm が正しい Vim 表記で呼ばれる", () => {
      const props = createProps();
      render(<KeyCapture {...props} />);
      fireEvent.keyDown(screen.getByRole("application"), {
        key: "a",
        ctrlKey: true,
      });
      fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
      expect(props.onConfirm).toHaveBeenCalledWith("<C-a>");
    });
  });

  describe("同じキーで確定", () => {
    test("同じキーを2回押すと onConfirm が呼ばれる", () => {
      const props = createProps();
      render(<KeyCapture {...props} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "a" });
      fireEvent.keyDown(screen.getByRole("application"), { key: "a" });
      expect(props.onConfirm).toHaveBeenCalledWith("a");
    });

    test("同じキーを2回押すと onConfirm はキャプチャしたキーで1回呼ばれる", () => {
      const props = createProps();
      render(<KeyCapture {...props} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "f" });
      fireEvent.keyDown(screen.getByRole("application"), { key: "f" });
      expect(props.onConfirm).toHaveBeenCalledOnce();
      expect(props.onConfirm).toHaveBeenCalledWith("f");
    });
  });

  describe("Enter（未キャプチャ時）", () => {
    test("キャプチャ前に Enter を押すと '<CR>' がキャプチャされる", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
      expect(screen.getByText("<CR>")).toBeInTheDocument();
    });

    test("キャプチャ前に Enter を押しても onConfirm は呼ばれない", () => {
      const props = createProps();
      render(<KeyCapture {...props} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "Enter" });
      expect(props.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("キーの上書き", () => {
    test("別のキーを押すとプレビューが更新される", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "a" });
      expect(screen.getByText("a")).toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole("application"), { key: "b" });
      expect(screen.queryByText("a")).not.toBeInTheDocument();
      expect(screen.getByText("b")).toBeInTheDocument();
    });

    test("修飾キー付きから別のキーに上書きできる", () => {
      render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), {
        key: "a",
        ctrlKey: true,
      });
      expect(screen.getByText("<C-a>")).toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole("application"), { key: "j" });
      expect(screen.queryByText("<C-a>")).not.toBeInTheDocument();
      expect(screen.getByText("j")).toBeInTheDocument();
    });
  });

  describe("スナップショット", () => {
    test("初期状態（キー入力待ち）のスナップショット", () => {
      const { container } = render(<KeyCapture {...createProps()} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    test("キーキャプチャ後のプレビュー状態のスナップショット", () => {
      const { container } = render(<KeyCapture {...createProps()} />);
      fireEvent.keyDown(screen.getByRole("application"), { key: "a" });
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
