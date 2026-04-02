import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_LAYOUT_NAME } from "../../data/default-layout";
import { defaultCustomKeymap } from "../../data/keymap";
import { useVialDevice } from "../../hooks/useVialDevice";
import { LayoutLoader } from "./LayoutLoader";

vi.mock("../../hooks/useVialDevice");

const mockUseVialDevice = vi.mocked(useVialDevice);

const defaultVialReturn = {
  status: "disconnected" as const,
  error: null,
  deviceName: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  isSupported: true,
};

const defaultProps = {
  layoutName: DEFAULT_LAYOUT_NAME,
  keymapFileName: null,
  customKeymap: defaultCustomKeymap,
  onLoadLayout: vi.fn(),
  onLoadKeymap: vi.fn(),
  onSelectPreset: vi.fn(),
  onClearStorage: vi.fn(),
  error: null,
};

describe("LayoutLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVialDevice.mockReturnValue(defaultVialReturn);
  });

  test("デフォルト props で 2 つのドロップゾーンとクリアボタンが表示される", () => {
    render(<LayoutLoader {...defaultProps} />);

    expect(screen.getByText("1. キーボードレイアウト")).toBeInTheDocument();
    expect(screen.getByText("2. キーマップ")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "保存データをクリア" }),
    ).toBeInTheDocument();
  });

  test("layoutName が 'ANSI 60%' の場合、レイアウトドロップゾーンにファイル名が表示されない", () => {
    render(<LayoutLoader {...defaultProps} layoutName={DEFAULT_LAYOUT_NAME} />);

    expect(screen.queryByText(DEFAULT_LAYOUT_NAME)).not.toBeInTheDocument();
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
      screen.queryByText("または VIA JSON をドロップ or クリック"),
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

  test("プリセット選択ドロップダウンが表示される", () => {
    render(<LayoutLoader {...defaultProps} />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("QWERTY")).toBeInTheDocument();
    expect(screen.getByText("Colemak DH")).toBeInTheDocument();
    expect(screen.getByText("Dvorak")).toBeInTheDocument();
  });

  test("customKeymap がプリセットに一致する場合、そのプリセットが選択状態になる", () => {
    const qwertyKeymap = Object.fromEntries(
      [
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
      ].map((k) => [k, k]),
    );
    render(<LayoutLoader {...defaultProps} customKeymap={qwertyKeymap} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("qwerty");
  });

  test("customKeymap がプリセットに一致しない場合、「カスタム」選択肢が表示される", () => {
    const customKeymap = { a: "z", z: "a" };
    render(<LayoutLoader {...defaultProps} customKeymap={customKeymap} />);

    expect(screen.getByText("カスタム")).toBeInTheDocument();
  });

  test("プリセットを選択すると onSelectPreset が対応する keymap で呼ばれる", async () => {
    const onSelectPreset = vi.fn();
    const user = userEvent.setup();
    render(<LayoutLoader {...defaultProps} onSelectPreset={onSelectPreset} />);

    await user.selectOptions(screen.getByRole("combobox"), "qwerty");

    expect(onSelectPreset).toHaveBeenCalledOnce();
    // QWERTY キーマップは各キーが自身にマップされている
    const calledWith = onSelectPreset.mock.calls[0][0] as Record<
      string,
      string
    >;
    expect(calledWith.q).toBe("q");
    expect(calledWith.a).toBe("a");
  });

  describe("Vial デバイス接続", () => {
    test("isSupported=true で Vial セクションが表示される", () => {
      render(<LayoutLoader {...defaultProps} />);

      expect(screen.getByText("Vial デバイス")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Vial デバイスから読み込み" }),
      ).toBeInTheDocument();
    });

    test("isSupported=false で Vial セクションが非表示", () => {
      mockUseVialDevice.mockReturnValue({
        ...defaultVialReturn,
        isSupported: false,
      });
      render(<LayoutLoader {...defaultProps} />);

      expect(screen.queryByText("Vial デバイス")).not.toBeInTheDocument();
    });

    test("status='connecting' で接続中ボタンが disabled", () => {
      mockUseVialDevice.mockReturnValue({
        ...defaultVialReturn,
        status: "connecting",
      });
      render(<LayoutLoader {...defaultProps} />);

      expect(screen.getByRole("button", { name: "接続中..." })).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: "Vial デバイスから読み込み" }),
      ).not.toBeInTheDocument();
    });

    test("status='connected' でデバイス名と切断ボタンが表示される", () => {
      mockUseVialDevice.mockReturnValue({
        ...defaultVialReturn,
        status: "connected",
        deviceName: "Test KB",
      });
      render(<LayoutLoader {...defaultProps} />);

      expect(screen.getByText("Test KB")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "切断" })).toBeInTheDocument();
    });

    test("status='error' でエラーメッセージと再試行ボタンが表示される", () => {
      mockUseVialDevice.mockReturnValue({
        ...defaultVialReturn,
        status: "error",
        error: "No device selected",
      });
      render(<LayoutLoader {...defaultProps} />);

      expect(screen.getByText("No device selected")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "再試行" }),
      ).toBeInTheDocument();
    });

    test("「Vial デバイスから読み込み」ボタンクリックで connect が呼ばれる", async () => {
      const connect = vi.fn().mockResolvedValue(undefined);
      mockUseVialDevice.mockReturnValue({ ...defaultVialReturn, connect });
      const user = userEvent.setup();
      render(<LayoutLoader {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: "Vial デバイスから読み込み" }),
      );

      expect(connect).toHaveBeenCalledOnce();
    });

    test("「切断」ボタンクリックで disconnect が呼ばれる", async () => {
      const disconnect = vi.fn().mockResolvedValue(undefined);
      mockUseVialDevice.mockReturnValue({
        ...defaultVialReturn,
        status: "connected",
        deviceName: "Test KB",
        disconnect,
      });
      const user = userEvent.setup();
      render(<LayoutLoader {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "切断" }));

      expect(disconnect).toHaveBeenCalledOnce();
    });

    test("「再試行」ボタンクリックで connect が呼ばれる", async () => {
      const connect = vi.fn().mockResolvedValue(undefined);
      mockUseVialDevice.mockReturnValue({
        ...defaultVialReturn,
        status: "error",
        error: "No device selected",
        connect,
      });
      const user = userEvent.setup();
      render(<LayoutLoader {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "再試行" }));

      expect(connect).toHaveBeenCalledOnce();
    });
  });
});
