import { useVialDevice } from "../../hooks/useVialDevice";
import styles from "./VialDeviceSection.module.css";

interface VialDeviceSectionProps {
  onLoadLayout: (json: string) => void;
  onLoadKeymap: (json: string) => void;
}

export function VialDeviceSection({
  onLoadLayout,
  onLoadKeymap,
}: VialDeviceSectionProps) {
  const { status, error, deviceName, connect, disconnect, isSupported } =
    useVialDevice({ onLoadLayout, onLoadKeymap });

  if (!isSupported) return null;

  return (
    <div className={styles.vialSection}>
      <span className={styles.label}>Vial デバイス</span>
      {status === "disconnected" && (
        <button
          type="button"
          className={styles.vialButton}
          onClick={() => void connect()}
        >
          Vial デバイスから読み込み
        </button>
      )}
      {status === "connecting" && (
        <button type="button" className={styles.vialButton} disabled>
          接続中...
        </button>
      )}
      {status === "connected" && (
        <div className={styles.vialConnected}>
          <span className={styles.vialDeviceName}>{deviceName}</span>
          <button
            type="button"
            className={styles.disconnectButton}
            onClick={() => void disconnect()}
          >
            切断
          </button>
        </div>
      )}
      {status === "error" && (
        <>
          <span className={styles.vialError}>{error}</span>
          <button
            type="button"
            className={styles.vialButton}
            onClick={() => void connect()}
          >
            再試行
          </button>
        </>
      )}
    </div>
  );
}
