import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useVialDevice } from "../../hooks/useVialDevice";
import { VialDeviceSection } from "./VialDeviceSection";

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
  onLoadLayout: vi.fn(),
  onLoadKeymap: vi.fn(),
};

describe("VialDeviceSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVialDevice.mockReturnValue(defaultVialReturn);
  });

  test("isSupported=true で Vial セクションが表示される", () => {
    render(<VialDeviceSection {...defaultProps} />);

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
    render(<VialDeviceSection {...defaultProps} />);

    expect(screen.queryByText("Vial デバイス")).not.toBeInTheDocument();
  });

  test("status='connecting' で接続中ボタンが disabled", () => {
    mockUseVialDevice.mockReturnValue({
      ...defaultVialReturn,
      status: "connecting",
    });
    render(<VialDeviceSection {...defaultProps} />);

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
    render(<VialDeviceSection {...defaultProps} />);

    expect(screen.getByText("Test KB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切断" })).toBeInTheDocument();
  });

  test("status='error' でエラーメッセージと再試行ボタンが表示される", () => {
    mockUseVialDevice.mockReturnValue({
      ...defaultVialReturn,
      status: "error",
      error: "No device selected",
    });
    render(<VialDeviceSection {...defaultProps} />);

    expect(screen.getByText("No device selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });

  test("「Vial デバイスから読み込み」ボタンクリックで connect が呼ばれる", async () => {
    const connect = vi.fn().mockResolvedValue(undefined);
    mockUseVialDevice.mockReturnValue({ ...defaultVialReturn, connect });
    const user = userEvent.setup();
    render(<VialDeviceSection {...defaultProps} />);

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
    render(<VialDeviceSection {...defaultProps} />);

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
    render(<VialDeviceSection {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "再試行" }));

    expect(connect).toHaveBeenCalledOnce();
  });
});
