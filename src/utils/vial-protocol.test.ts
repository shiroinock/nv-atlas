import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VialDevice } from "../types/vial";
import {
  COMMAND_TIMEOUT_MS,
  connectVialDevice,
  disconnectVialDevice,
  getKeyboardDefinition,
  getKeymapData,
  isWebHIDSupported,
} from "./vial-protocol";

// ============================================================
// HIDDevice モックファクトリ
// ============================================================

type InputReportHandler = (event: { data: DataView }) => void;

interface MockHIDDevice {
  opened: boolean;
  productName: string;
  vendorId: number;
  productId: number;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  sendReport: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  _inputReportHandler: InputReportHandler | null;
  _triggerInputReport: (data: Uint8Array) => void;
}

const createMockHIDDevice = (
  overrides: Partial<MockHIDDevice> = {},
): MockHIDDevice => {
  let inputReportHandler: InputReportHandler | null = null;

  const device: MockHIDDevice = {
    opened: false,
    productName: "Test Vial Keyboard",
    vendorId: 0x1234,
    productId: 0x5678,
    open: vi.fn(),
    close: vi.fn(),
    sendReport: vi.fn(),
    addEventListener: vi.fn((event: string, handler: InputReportHandler) => {
      if (event === "inputreport") {
        inputReportHandler = handler;
      }
    }),
    removeEventListener: vi.fn(),
    get _inputReportHandler() {
      return inputReportHandler;
    },
    _triggerInputReport(data: Uint8Array) {
      if (inputReportHandler) {
        inputReportHandler({ data: new DataView(data.buffer) });
      }
    },
    ...overrides,
  };

  device.open = vi.fn(async () => {
    device.opened = true;
  });
  device.close = vi.fn(async () => {
    device.opened = false;
  });

  return device;
};

// ============================================================
// navigator.hid モック
// ============================================================

const hidMock = {
  requestDevice: vi.fn(),
  getDevices: vi.fn(),
};

vi.stubGlobal("navigator", { ...navigator, hid: hidMock });

// ============================================================
// DecompressionStream モック
// ============================================================
// gzip 解凍をシミュレートするためのモック
// モック実装では入力データをそのまま返す（テストデータで制御する）

const createDecompressionStreamMock = (outputData: Uint8Array) => {
  const readable = {
    getReader: () => ({
      read: vi
        .fn()
        .mockResolvedValueOnce({ value: outputData, done: false })
        .mockResolvedValueOnce({ value: undefined, done: true }),
    }),
  };
  const writable = {
    getWriter: () => ({
      write: vi.fn(),
      close: vi.fn(),
    }),
  };
  return { readable, writable };
};

function setupDecompressionMocks(
  mockDevice: MockHIDDevice,
  dataBytes: Uint8Array,
) {
  const defSize = dataBytes.length;

  mockDevice.sendReport.mockImplementation(
    async (_reportId: number, data: Uint8Array) => {
      const cmd = data[0];
      const subcmd = data[1];
      setTimeout(() => {
        if (cmd === 0xfe && subcmd === 0x02) {
          const resp = new Uint8Array(32);
          resp[0] = defSize & 0xff;
          resp[1] = (defSize >> 8) & 0xff;
          mockDevice._triggerInputReport(resp);
        } else if (cmd === 0xfe && subcmd === 0x03) {
          const offset = (data[2] << 8) | data[3];
          const chunkSize = data[4];
          const resp = new Uint8Array(32);
          const chunk = dataBytes.slice(offset, offset + chunkSize);
          resp.set(chunk);
          mockDevice._triggerInputReport(resp);
        }
      }, 0);
    },
  );

  class DecompressionStreamMock {
    readable: ReturnType<typeof createDecompressionStreamMock>["readable"];
    writable: ReturnType<typeof createDecompressionStreamMock>["writable"];
    constructor() {
      const mock = createDecompressionStreamMock(dataBytes);
      this.readable = mock.readable;
      this.writable = mock.writable;
    }
  }
  vi.stubGlobal("DecompressionStream", DecompressionStreamMock);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// isWebHIDSupported
// ============================================================

describe("isWebHIDSupported", () => {
  it("navigator.hid が存在する場合 true を返す", () => {
    const result = isWebHIDSupported();

    expect(result).toBe(true);
  });

  it("navigator.hid が undefined の場合 false を返す", () => {
    vi.stubGlobal("navigator", { ...navigator, hid: undefined });

    const result = isWebHIDSupported();

    expect(result).toBe(false);

    // テスト後に元に戻す
    vi.stubGlobal("navigator", { ...navigator, hid: hidMock });
  });
});

// ============================================================
// connectVialDevice
// ============================================================

describe("connectVialDevice", () => {
  it("WebHID 非対応の場合エラーを投げる", async () => {
    vi.stubGlobal("navigator", { ...navigator, hid: undefined });

    await expect(connectVialDevice()).rejects.toThrow();

    vi.stubGlobal("navigator", { ...navigator, hid: hidMock });
  });

  it("requestDevice でデバイスが選択されなかった場合エラーを投げる", async () => {
    hidMock.requestDevice.mockResolvedValue([]);

    await expect(connectVialDevice()).rejects.toThrow();
  });

  it("デバイスの open が呼ばれ、VialDevice オブジェクトが返る", async () => {
    const mockDevice = createMockHIDDevice();
    hidMock.requestDevice.mockResolvedValue([mockDevice]);

    const result = await connectVialDevice();

    expect(mockDevice.open).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("hid");
  });

  it("既に open 済みのデバイスは再度 open しない", async () => {
    const mockDevice = createMockHIDDevice();
    mockDevice.opened = true;
    hidMock.requestDevice.mockResolvedValue([mockDevice]);

    await connectVialDevice();

    expect(mockDevice.open).not.toHaveBeenCalled();
  });

  it("返される VialDevice に productName が含まれる", async () => {
    const mockDevice = createMockHIDDevice();
    hidMock.requestDevice.mockResolvedValue([mockDevice]);

    const result = await connectVialDevice();

    expect(result).toHaveProperty("productName");
    expect(result.productName).toBe("Test Vial Keyboard");
  });
});

// ============================================================
// disconnectVialDevice
// ============================================================

describe("disconnectVialDevice", () => {
  it("デバイスの close が呼ばれる", async () => {
    const mockDevice = createMockHIDDevice();
    mockDevice.opened = true;
    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    await disconnectVialDevice(vialDevice);

    expect(mockDevice.close).toHaveBeenCalledTimes(1);
  });

  it("既に close 済みのデバイスでは close を呼ばない", async () => {
    const mockDevice = createMockHIDDevice();
    mockDevice.opened = false;
    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    await disconnectVialDevice(vialDevice);

    expect(mockDevice.close).not.toHaveBeenCalled();
  });
});

// ============================================================
// getKeyboardDefinition
// ============================================================

describe("getKeyboardDefinition", () => {
  it("Vial プロトコルで定義サイズを取得し、定義データを取得する", async () => {
    // sendReport が呼ばれるたびに対応する inputreport イベントをシミュレート
    const mockDevice = createMockHIDDevice();

    // KLE JSON として解凍される想定データ
    const kleJson = JSON.stringify([["0,0", "0,1"]]);
    const kleBytes = new TextEncoder().encode(kleJson);

    // gzip 圧縮されたデータ（テスト用に未圧縮バイトを直接使う）
    const defSize = kleBytes.length;

    // sendReport の呼び出しに応じて inputreport を返すモック
    mockDevice.sendReport.mockImplementation(
      async (_reportId: number, data: Uint8Array) => {
        const cmd = data[0];
        const subcmd = data[1];

        setTimeout(() => {
          if (cmd === 0xfe && subcmd === 0x02) {
            // vial_get_size: 4バイト LE uint32 でサイズを返す
            const resp = new Uint8Array(32);
            resp[0] = defSize & 0xff;
            resp[1] = (defSize >> 8) & 0xff;
            resp[2] = (defSize >> 16) & 0xff;
            resp[3] = (defSize >> 24) & 0xff;
            mockDevice._triggerInputReport(resp);
          } else if (cmd === 0xfe && subcmd === 0x03) {
            // vial_get_def: offset/size に応じたデータを返す
            const offset = (data[2] << 8) | data[3];
            const chunkSize = data[4];
            const resp = new Uint8Array(32);
            const chunk = kleBytes.slice(offset, offset + chunkSize);
            resp.set(chunk);
            mockDevice._triggerInputReport(resp);
          }
        }, 0);
      },
    );

    // DecompressionStream をモックして未圧縮データをそのまま返す
    class DecompressionStreamMock {
      readable: ReturnType<typeof createDecompressionStreamMock>["readable"];
      writable: ReturnType<typeof createDecompressionStreamMock>["writable"];
      constructor() {
        const mock = createDecompressionStreamMock(kleBytes);
        this.readable = mock.readable;
        this.writable = mock.writable;
      }
    }
    vi.stubGlobal("DecompressionStream", DecompressionStreamMock);

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const result = await getKeyboardDefinition(vialDevice);

    expect(result).toBeDefined();
    // sendReport が vial_get_size と vial_get_def で呼ばれること
    expect(mockDevice.sendReport).toHaveBeenCalled();
    const calls = mockDevice.sendReport.mock.calls as [number, Uint8Array][];
    const hasSizeCall = calls.some(([, d]) => d[0] === 0xfe && d[1] === 0x02);
    const hasDefCall = calls.some(([, d]) => d[0] === 0xfe && d[1] === 0x03);
    expect(hasSizeCall).toBe(true);
    expect(hasDefCall).toBe(true);
  });

  it("gzip 圧縮されたデータを解凍して KLE JSON オブジェクトを返す", async () => {
    const mockDevice = createMockHIDDevice();
    const kleJson = JSON.stringify([["0,0", "0,1", "0,2"]]);
    const kleBytes = new TextEncoder().encode(kleJson);
    const defSize = kleBytes.length;

    mockDevice.sendReport.mockImplementation(
      async (_reportId: number, data: Uint8Array) => {
        const cmd = data[0];
        const subcmd = data[1];
        setTimeout(() => {
          if (cmd === 0xfe && subcmd === 0x02) {
            const resp = new Uint8Array(32);
            resp[0] = defSize & 0xff;
            resp[1] = (defSize >> 8) & 0xff;
            mockDevice._triggerInputReport(resp);
          } else if (cmd === 0xfe && subcmd === 0x03) {
            const offset = (data[2] << 8) | data[3];
            const chunkSize = data[4];
            const resp = new Uint8Array(32);
            const chunk = kleBytes.slice(offset, offset + chunkSize);
            resp.set(chunk);
            mockDevice._triggerInputReport(resp);
          }
        }, 0);
      },
    );

    // DecompressionStream で KLE JSON バイト列を返すモック
    class DecompressionStreamMock {
      readable: ReturnType<typeof createDecompressionStreamMock>["readable"];
      writable: ReturnType<typeof createDecompressionStreamMock>["writable"];
      constructor() {
        const mock = createDecompressionStreamMock(kleBytes);
        this.readable = mock.readable;
        this.writable = mock.writable;
      }
    }
    vi.stubGlobal("DecompressionStream", DecompressionStreamMock);

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const result = await getKeyboardDefinition(vialDevice);

    // 返り値が KLE JSON としてパース可能なオブジェクトであること
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("通信エラー時に適切なエラーを投げる", async () => {
    const mockDevice = createMockHIDDevice();
    mockDevice.sendReport.mockRejectedValue(
      new Error("HID communication error"),
    );

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    await expect(getKeyboardDefinition(vialDevice)).rejects.toThrow();
  });

  it("デバイスからサイズ 0 が返った場合にエラーを投げる", async () => {
    const mockDevice = createMockHIDDevice();

    mockDevice.sendReport.mockImplementation(
      async (_reportId: number, data: Uint8Array) => {
        const cmd = data[0];
        const subcmd = data[1];
        setTimeout(() => {
          if (cmd === 0xfe && subcmd === 0x02) {
            // サイズ 0 を返す
            const resp = new Uint8Array(32);
            mockDevice._triggerInputReport(resp);
          }
        }, 0);
      },
    );

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    await expect(getKeyboardDefinition(vialDevice)).rejects.toThrow();
  });

  it("不正な JSON（文字列値）でバリデーションエラーを投げる", async () => {
    const mockDevice = createMockHIDDevice();
    const invalidBytes = new TextEncoder().encode(JSON.stringify("hello"));
    setupDecompressionMocks(mockDevice, invalidBytes);

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    await expect(getKeyboardDefinition(vialDevice)).rejects.toThrow();
  });

  it("不正な JSON（VIA定義でも KLE配列でもないオブジェクト）でバリデーションエラーを投げる", async () => {
    const mockDevice = createMockHIDDevice();
    const invalidBytes = new TextEncoder().encode(
      JSON.stringify({ foo: "bar" }),
    );
    setupDecompressionMocks(mockDevice, invalidBytes);

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    await expect(getKeyboardDefinition(vialDevice)).rejects.toThrow();
  });
});

// ============================================================
// getKeymapData
// ============================================================

describe("getKeymapData", () => {
  it("キーマップバッファを読み取り、{ layers: string[][] } 形式で返す", async () => {
    const mockDevice = createMockHIDDevice();

    // 1レイヤー、4キー（matrixSize=4）
    // 各キーコードは 2バイト big-endian
    // KC_A=0x0004, KC_B=0x0005, KC_C=0x0006, KC_D=0x0007
    const keycodes = [0x0004, 0x0005, 0x0006, 0x0007];
    const bufferBytes = new Uint8Array(keycodes.length * 2);
    for (let i = 0; i < keycodes.length; i++) {
      bufferBytes[i * 2] = (keycodes[i] >> 8) & 0xff;
      bufferBytes[i * 2 + 1] = keycodes[i] & 0xff;
    }

    mockDevice.sendReport.mockImplementation(
      async (_reportId: number, data: Uint8Array) => {
        const cmd = data[0];
        if (cmd === 0x12) {
          // dynamic_keymap_get_buffer
          const offset = (data[1] << 8) | data[2];
          const size = data[3];
          setTimeout(() => {
            const resp = new Uint8Array(32);
            const chunk = bufferBytes.slice(offset, offset + size);
            resp.set(chunk);
            mockDevice._triggerInputReport(resp);
          }, 0);
        }
      },
    );

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const result = await getKeymapData(vialDevice, 1, 4);

    expect(result).toHaveProperty("layers");
    expect(Array.isArray(result.layers)).toBe(true);
    expect(result.layers).toHaveLength(1);
    expect(Array.isArray(result.layers[0])).toBe(true);
    expect(result.layers[0]).toHaveLength(4);
  });

  it("各キーコードが QMK キーコード文字列形式で返される", async () => {
    const mockDevice = createMockHIDDevice();

    // KC_A = 0x0004
    const keycodes = [0x0004, 0x0005, 0x0006, 0x0007];
    const bufferBytes = new Uint8Array(keycodes.length * 2);
    for (let i = 0; i < keycodes.length; i++) {
      bufferBytes[i * 2] = (keycodes[i] >> 8) & 0xff;
      bufferBytes[i * 2 + 1] = keycodes[i] & 0xff;
    }

    mockDevice.sendReport.mockImplementation(
      async (_reportId: number, data: Uint8Array) => {
        if (data[0] === 0x12) {
          const offset = (data[1] << 8) | data[2];
          const size = data[3];
          setTimeout(() => {
            const resp = new Uint8Array(32);
            const chunk = bufferBytes.slice(offset, offset + size);
            resp.set(chunk);
            mockDevice._triggerInputReport(resp);
          }, 0);
        }
      },
    );

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const result = await getKeymapData(vialDevice, 1, 4);

    // 各要素が文字列であること
    for (const key of result.layers[0]) {
      expect(typeof key).toBe("string");
    }
    // KC_A（0x0004）が正しいキーコード文字列で返ること
    expect(result.layers[0][0]).toBe("KC_A");
  });

  it("複数レイヤーのキーマップを正しく取得する", async () => {
    const mockDevice = createMockHIDDevice();

    // 2レイヤー、2キー（matrixSize=2）
    // Layer 0: KC_A(0x0004), KC_B(0x0005)
    // Layer 1: KC_C(0x0006), KC_D(0x0007)
    const keycodes = [0x0004, 0x0005, 0x0006, 0x0007];
    const bufferBytes = new Uint8Array(keycodes.length * 2);
    for (let i = 0; i < keycodes.length; i++) {
      bufferBytes[i * 2] = (keycodes[i] >> 8) & 0xff;
      bufferBytes[i * 2 + 1] = keycodes[i] & 0xff;
    }

    mockDevice.sendReport.mockImplementation(
      async (_reportId: number, data: Uint8Array) => {
        if (data[0] === 0x12) {
          const offset = (data[1] << 8) | data[2];
          const size = data[3];
          setTimeout(() => {
            const resp = new Uint8Array(32);
            const chunk = bufferBytes.slice(offset, offset + size);
            resp.set(chunk);
            mockDevice._triggerInputReport(resp);
          }, 0);
        }
      },
    );

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const result = await getKeymapData(vialDevice, 2, 2);

    expect(result.layers).toHaveLength(2);
    expect(result.layers[0]).toHaveLength(2);
    expect(result.layers[1]).toHaveLength(2);
    // Layer 0 のキー
    expect(result.layers[0][0]).toBe("KC_A");
    expect(result.layers[0][1]).toBe("KC_B");
    // Layer 1 のキー
    expect(result.layers[1][0]).toBe("KC_C");
    expect(result.layers[1][1]).toBe("KC_D");
  });

  it("通信エラー時に適切なエラーを投げる", async () => {
    const mockDevice = createMockHIDDevice();
    mockDevice.sendReport.mockRejectedValue(
      new Error("HID communication error"),
    );

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    await expect(getKeymapData(vialDevice, 1, 4)).rejects.toThrow();
  });

  it("0 レイヤーを指定した場合に空の layers を返す", async () => {
    const mockDevice = createMockHIDDevice();

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const result = await getKeymapData(vialDevice, 0, 4);

    expect(result.layers).toHaveLength(0);
    // sendReport は呼ばれない（読み取るデータがないため）
    expect(mockDevice.sendReport).not.toHaveBeenCalled();
  });

  it("返り値が parseVIAKeymapFull に渡せる { layers: string[][] } 互換形式である", async () => {
    const mockDevice = createMockHIDDevice();

    const keycodes = [0x0004, 0x0005, 0x0006];
    const bufferBytes = new Uint8Array(keycodes.length * 2);
    for (let i = 0; i < keycodes.length; i++) {
      bufferBytes[i * 2] = (keycodes[i] >> 8) & 0xff;
      bufferBytes[i * 2 + 1] = keycodes[i] & 0xff;
    }

    mockDevice.sendReport.mockImplementation(
      async (_reportId: number, data: Uint8Array) => {
        if (data[0] === 0x12) {
          const offset = (data[1] << 8) | data[2];
          const size = data[3];
          setTimeout(() => {
            const resp = new Uint8Array(32);
            const chunk = bufferBytes.slice(offset, offset + size);
            resp.set(chunk);
            mockDevice._triggerInputReport(resp);
          }, 0);
        }
      },
    );

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const result = await getKeymapData(vialDevice, 1, 3);

    // { layers: string[][] } 互換チェック
    expect(result).toHaveProperty("layers");
    expect(Array.isArray(result.layers)).toBe(true);
    for (const layer of result.layers) {
      expect(Array.isArray(layer)).toBe(true);
      for (const key of layer) {
        expect(typeof key).toBe("string");
      }
    }
  });
});

// ============================================================
// sendCommand タイムアウト（getKeymapData 経由）
// ============================================================

describe("sendCommand タイムアウト", () => {
  it("デバイスが応答しない場合、COMMAND_TIMEOUT_MS 経過後に reject される", async () => {
    vi.useFakeTimers();

    const mockDevice = createMockHIDDevice();

    // sendReport は成功するが inputreport イベントを発火しない（デバイスが無応答）
    mockDevice.sendReport.mockResolvedValue(undefined);

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const promise = getKeymapData(vialDevice, 1, 4);
    // advanceTimersByTimeAsync 中に reject が発生するため、先にハンドラを登録して unhandled rejection を防ぐ
    const assertion = expect(promise).rejects.toThrow();

    // COMMAND_TIMEOUT_MS（5000ms）を超える時間を経過させる
    await vi.advanceTimersByTimeAsync(COMMAND_TIMEOUT_MS + 1);

    await assertion;

    vi.useRealTimers();
  });

  it("タイムアウト時に removeEventListener が呼ばれてリスナーがクリーンアップされる", async () => {
    vi.useFakeTimers();

    const mockDevice = createMockHIDDevice();

    // sendReport は成功するが inputreport イベントを発火しない（デバイスが無応答）
    mockDevice.sendReport.mockResolvedValue(undefined);

    const vialDevice: VialDevice = {
      hid: mockDevice as unknown as HIDDevice,
      productName: "Test Vial Keyboard",
    };

    const promise = getKeymapData(vialDevice, 1, 4);
    // advanceTimersByTimeAsync 中に reject が発生するため、先にハンドラを登録して unhandled rejection を防ぐ
    const assertion = expect(promise).rejects.toThrow();

    // タイムアウトを超える時間を経過させる
    await vi.advanceTimersByTimeAsync(COMMAND_TIMEOUT_MS + 1);

    // reject されることを確認（クリーンアップ後の状態検証のため先に待つ）
    await assertion;

    // タイムアウト時に addEventListener で登録したハンドラが removeEventListener で解除されること
    expect(mockDevice.removeEventListener).toHaveBeenCalledWith(
      "inputreport",
      expect.any(Function),
    );

    vi.useRealTimers();
  });
});
