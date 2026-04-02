import { useCallback, useEffect, useRef, useState } from "react";
import type { VIADefinition } from "../types/keyboard";
import type { VialDevice } from "../types/vial";
import {
  connectVialDevice,
  disconnectVialDevice,
  getKeyboardDefinition,
  getKeymapData,
  isWebHIDSupported,
} from "../utils/vial-protocol";

type VialConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

const DEFAULT_LAYERS = 4;
const DEFAULT_MATRIX = { rows: 1, cols: 1 } as const;
const CONNECT_ERROR_MESSAGE = "接続に失敗しました";

interface UseVialDeviceOptions {
  onLoadLayout: (json: string) => void;
  onLoadKeymap: (json: string) => void;
}

interface UseVialDeviceReturn {
  status: VialConnectionStatus;
  error: string | null;
  deviceName: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isSupported: boolean;
}

/**
 * Vial デバイスから取得した定義が VIADefinition であることを検証する
 */
function assertVIADefinition(value: unknown): asserts value is VIADefinition {
  if (
    Array.isArray(value) ||
    typeof value !== "object" ||
    value === null ||
    !("matrix" in value) ||
    typeof (value as VIADefinition).matrix !== "object"
  ) {
    throw new Error(
      "Unexpected keyboard definition format: expected VIA definition",
    );
  }
}

export function useVialDevice(
  options: UseVialDeviceOptions,
): UseVialDeviceReturn {
  const { onLoadLayout, onLoadKeymap } = options;

  const [status, setStatus] = useState<VialConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const isSupported = useRef(isWebHIDSupported()).current;

  // disconnect 時に参照できるようデバイスを ref で保持
  const deviceRef = useRef<VialDevice | null>(null);
  const disconnectHandlerRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      // 既存デバイスがあれば先に切断
      if (deviceRef.current !== null) {
        if (disconnectHandlerRef.current !== null) {
          deviceRef.current.hid.removeEventListener(
            "disconnect",
            disconnectHandlerRef.current,
          );
          disconnectHandlerRef.current = null;
        }
        await disconnectVialDevice(deviceRef.current);
        deviceRef.current = null;
      }
      const device = await connectVialDevice();
      deviceRef.current = device;

      const definition = await getKeyboardDefinition(device);
      assertVIADefinition(definition);

      const matrix = definition.matrix ?? DEFAULT_MATRIX;
      const matrixSize = matrix.rows * matrix.cols;
      const layers = DEFAULT_LAYERS;

      const keymapData = await getKeymapData(device, layers, matrixSize);

      onLoadLayout(JSON.stringify(definition));
      onLoadKeymap(JSON.stringify(keymapData));

      setDeviceName(device.productName);
      setStatus("connected");

      // 物理切断イベントを検知して状態をリセットする
      const handleDisconnect = () => {
        setStatus("disconnected");
        setDeviceName(null);
        setError(null);
        deviceRef.current = null;
        disconnectHandlerRef.current = null;
      };
      device.hid.addEventListener("disconnect", handleDisconnect);
      disconnectHandlerRef.current = handleDisconnect;
    } catch (e) {
      if (deviceRef.current !== null) {
        try {
          await disconnectVialDevice(deviceRef.current);
        } catch {
          // クリーンアップ時のエラーは無視する
        }
        deviceRef.current = null;
      }
      setStatus("error");
      setError(e instanceof Error ? e.message : CONNECT_ERROR_MESSAGE);
    }
  }, [onLoadLayout, onLoadKeymap]);

  const disconnect = useCallback(async () => {
    if (deviceRef.current !== null) {
      if (disconnectHandlerRef.current !== null) {
        deviceRef.current.hid.removeEventListener(
          "disconnect",
          disconnectHandlerRef.current,
        );
        disconnectHandlerRef.current = null;
      }
      try {
        await disconnectVialDevice(deviceRef.current);
      } catch {
        // 切断時のエラーは無視する
      }
      deviceRef.current = null;
    }
    setStatus("disconnected");
    setDeviceName(null);
    setError(null);
  }, []);

  // アンマウント時にデバイス切断とイベントリスナーをクリーンアップ
  useEffect(() => {
    return () => {
      if (deviceRef.current !== null) {
        if (disconnectHandlerRef.current !== null) {
          deviceRef.current.hid.removeEventListener(
            "disconnect",
            disconnectHandlerRef.current,
          );
        }
        void disconnectVialDevice(deviceRef.current);
      }
    };
  }, []);

  return {
    status,
    error,
    deviceName,
    connect,
    disconnect,
    isSupported,
  };
}
