import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVialDevice } from "./useVialDevice";

vi.mock("../utils/vial-protocol", () => ({
  isWebHIDSupported: vi.fn(),
  connectVialDevice: vi.fn(),
  disconnectVialDevice: vi.fn(),
  getKeyboardDefinition: vi.fn(),
  getKeymapData: vi.fn(),
}));

import {
  connectVialDevice,
  disconnectVialDevice,
  getKeyboardDefinition,
  getKeymapData,
  isWebHIDSupported,
} from "../utils/vial-protocol";

const mockIsWebHIDSupported = vi.mocked(isWebHIDSupported);
const mockConnectVialDevice = vi.mocked(connectVialDevice);
const mockDisconnectVialDevice = vi.mocked(disconnectVialDevice);
const mockGetKeyboardDefinition = vi.mocked(getKeyboardDefinition);
const mockGetKeymapData = vi.mocked(getKeymapData);

const mockHIDDevice = {
  opened: true,
  productName: "Test Keyboard",
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockVialDevice = {
  hid: mockHIDDevice,
  productName: "Test Keyboard",
};

const VALID_VIA_DEFINITION = {
  name: "Test KB",
  layouts: {
    keymap: [[{ c: "#777777" }, "0,0", { c: "#cccccc" }, "0,1"]],
  },
  matrix: { rows: 4, cols: 12 },
};

const MOCK_KEYMAP_DATA = {
  layers: [
    ["KC_A", "KC_B"],
    ["KC_TRNS", "KC_C"],
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsWebHIDSupported.mockReturnValue(true);
});

describe("初期状態", () => {
  it("status='disconnected', error=null, deviceName=null で初期化される", () => {
    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    expect(result.current.status).toBe("disconnected");
    expect(result.current.error).toBeNull();
    expect(result.current.deviceName).toBeNull();
  });
});

describe("isSupported", () => {
  it("isWebHIDSupported が true を返す場合、isSupported=true になる", () => {
    mockIsWebHIDSupported.mockReturnValue(true);

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    expect(result.current.isSupported).toBe(true);
  });

  it("isWebHIDSupported が false を返す場合、isSupported=false になる", () => {
    mockIsWebHIDSupported.mockReturnValue(false);

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    expect(result.current.isSupported).toBe(false);
  });
});

describe("connect()", () => {
  it("接続成功時に onLoadLayout と onLoadKeymap が呼ばれ、status='connected', deviceName が設定される", async () => {
    mockConnectVialDevice.mockResolvedValue(
      mockVialDevice as unknown as Awaited<
        ReturnType<typeof connectVialDevice>
      >,
    );
    mockGetKeyboardDefinition.mockResolvedValue(VALID_VIA_DEFINITION);
    mockGetKeymapData.mockResolvedValue(MOCK_KEYMAP_DATA);

    const onLoadLayout = vi.fn();
    const onLoadKeymap = vi.fn();

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout, onLoadKeymap }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("connected");
    expect(result.current.deviceName).toBe("Test Keyboard");
    expect(result.current.error).toBeNull();
    expect(onLoadLayout).toHaveBeenCalledWith(
      JSON.stringify(VALID_VIA_DEFINITION),
    );
    expect(onLoadKeymap).toHaveBeenCalledWith(JSON.stringify(MOCK_KEYMAP_DATA));
  });

  it("connect() 呼び出し中に status='connecting' を経由する", async () => {
    let resolveConnect!: (value: unknown) => void;
    const connectPromise = new Promise((resolve) => {
      resolveConnect = resolve;
    });

    mockConnectVialDevice.mockReturnValue(
      connectPromise as ReturnType<typeof connectVialDevice>,
    );

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    mockGetKeyboardDefinition.mockResolvedValue(VALID_VIA_DEFINITION);
    mockGetKeymapData.mockResolvedValue(MOCK_KEYMAP_DATA);

    act(() => {
      void result.current.connect();
    });

    expect(result.current.status).toBe("connecting");

    await act(async () => {
      resolveConnect(mockVialDevice);
    });
  });

  it("connectVialDevice が reject した場合、status='error', error にメッセージがセットされる", async () => {
    mockConnectVialDevice.mockRejectedValue(new Error("No device selected"));

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("No device selected");
  });

  it("getKeyboardDefinition が reject した場合、status='error' になる", async () => {
    mockConnectVialDevice.mockResolvedValue(
      mockVialDevice as unknown as Awaited<
        ReturnType<typeof connectVialDevice>
      >,
    );
    mockGetKeyboardDefinition.mockRejectedValue(
      new Error("Keyboard definition size is 0"),
    );

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Keyboard definition size is 0");
  });

  it("getKeymapData に matrix.rows * matrix.cols を matrixSize として渡す", async () => {
    mockConnectVialDevice.mockResolvedValue(
      mockVialDevice as unknown as Awaited<
        ReturnType<typeof connectVialDevice>
      >,
    );
    mockGetKeyboardDefinition.mockResolvedValue(VALID_VIA_DEFINITION);
    mockGetKeymapData.mockResolvedValue(MOCK_KEYMAP_DATA);

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    await act(async () => {
      await result.current.connect();
    });

    // matrix: { rows: 4, cols: 12 } → matrixSize = 48
    expect(mockGetKeymapData).toHaveBeenCalledWith(
      mockVialDevice,
      expect.any(Number),
      48,
    );
  });

  it("layers のデフォルト値 4 で getKeymapData を呼ぶ", async () => {
    const definitionWithoutLabels = {
      name: "Test KB",
      layouts: {
        keymap: [[{ c: "#777777" }, "0,0"]],
      },
      matrix: { rows: 4, cols: 12 },
    };

    mockConnectVialDevice.mockResolvedValue(
      mockVialDevice as unknown as Awaited<
        ReturnType<typeof connectVialDevice>
      >,
    );
    mockGetKeyboardDefinition.mockResolvedValue(definitionWithoutLabels);
    mockGetKeymapData.mockResolvedValue(MOCK_KEYMAP_DATA);

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(mockGetKeymapData).toHaveBeenCalledWith(
      mockVialDevice,
      4,
      expect.any(Number),
    );
  });
});

describe("disconnect()", () => {
  it("接続済み状態から disconnect() を呼ぶと status='disconnected', deviceName=null になる", async () => {
    mockConnectVialDevice.mockResolvedValue(
      mockVialDevice as unknown as Awaited<
        ReturnType<typeof connectVialDevice>
      >,
    );
    mockGetKeyboardDefinition.mockResolvedValue(VALID_VIA_DEFINITION);
    mockGetKeymapData.mockResolvedValue(MOCK_KEYMAP_DATA);
    mockDisconnectVialDevice.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("connected");

    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.status).toBe("disconnected");
    expect(result.current.deviceName).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockDisconnectVialDevice).toHaveBeenCalledWith(mockVialDevice);
  });
});

describe("デバイス切断イベント", () => {
  it("HIDDevice の disconnect イベント発火で自動的に status='disconnected' に遷移する", async () => {
    let capturedDisconnectHandler: (() => void) | null = null;

    const mockHIDDeviceWithCapture = {
      ...mockHIDDevice,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === "disconnect") {
          capturedDisconnectHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
    };

    const mockVialDeviceWithCapture = {
      hid: mockHIDDeviceWithCapture,
      productName: "Test Keyboard",
    };

    mockConnectVialDevice.mockResolvedValue(
      mockVialDeviceWithCapture as unknown as Awaited<
        ReturnType<typeof connectVialDevice>
      >,
    );
    mockGetKeyboardDefinition.mockResolvedValue(VALID_VIA_DEFINITION);
    mockGetKeymapData.mockResolvedValue(MOCK_KEYMAP_DATA);

    const { result } = renderHook(() =>
      useVialDevice({ onLoadLayout: vi.fn(), onLoadKeymap: vi.fn() }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("connected");
    expect(capturedDisconnectHandler).not.toBeNull();

    act(() => {
      capturedDisconnectHandler!();
    });

    expect(result.current.status).toBe("disconnected");
  });
});
