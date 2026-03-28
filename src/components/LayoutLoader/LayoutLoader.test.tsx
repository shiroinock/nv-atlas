import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { LayoutLoader } from "./LayoutLoader";

const defaultProps = {
  layoutName: "ANSI 60%",
  keymapFileName: null,
  onLoadLayout: vi.fn(),
  onLoadKeymap: vi.fn(),
  onClearStorage: vi.fn(),
  error: null,
};

describe("LayoutLoader", () => {
  test("デフォルト props で 2 つのドロップゾーンとクリアボタンが表示される", () => {
    render(<LayoutLoader {...defaultProps} />);

    expect(screen.getByText("1. キーボードレイアウト")).toBeInTheDocument();
    expect(screen.getByText("2. キーマップ")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "保存データをクリア" }),
    ).toBeInTheDocument();
  });

  test("layoutName が 'ANSI 60%' の場合、レイアウトドロップゾーンにファイル名が表示されない", () => {
    render(<LayoutLoader {...defaultProps} layoutName="ANSI 60%" />);

    expect(screen.queryByText("ANSI 60%")).not.toBeInTheDocument();
    expect(
      screen.getByText("VIA 定義 JSON をドロップ or クリック"),
    ).toBeInTheDocument();
  });

  test("layoutName が 'ANSI 60%' 以外の場合、ファイル名が表示される", () => {
    render(
      <LayoutLoader {...defaultProps} layoutName="my-custom-layout.json" />,
    );

    expect(screen.getByText("my-custom-layout.json")).toBeInTheDocument();
    expect(
      screen.queryByText("VIA 定義 JSON をドロップ or クリック"),
    ).not.toBeInTheDocument();
  });

  test("keymapFileName が設定されている場合、キーマップドロップゾーンにファイル名が表示される", () => {
    render(<LayoutLoader {...defaultProps} keymapFileName="my-keymap.json" />);

    expect(screen.getByText("my-keymap.json")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "VIA エクスポートした keymap JSON をドロップ or クリック",
      ),
    ).not.toBeInTheDocument();
  });

  test("error が設定されている場合、エラーメッセージが表示される", () => {
    render(
      <LayoutLoader {...defaultProps} error="JSON の解析に失敗しました" />,
    );

    expect(screen.getByText("JSON の解析に失敗しました")).toBeInTheDocument();
  });

  test("error が null の場合、エラーメッセージが表示されない", () => {
    render(<LayoutLoader {...defaultProps} error={null} />);

    expect(
      screen.queryByText("JSON の解析に失敗しました"),
    ).not.toBeInTheDocument();
  });

  test("「保存データをクリア」ボタンをクリックすると onClearStorage が呼ばれる", async () => {
    const onClearStorage = vi.fn();
    const user = userEvent.setup();
    render(<LayoutLoader {...defaultProps} onClearStorage={onClearStorage} />);

    await user.click(
      screen.getByRole("button", { name: "保存データをクリア" }),
    );

    expect(onClearStorage).toHaveBeenCalledOnce();
  });
});
