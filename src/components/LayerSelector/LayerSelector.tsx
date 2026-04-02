import { useId } from "react";
import { cx } from "../../utils/cx";
import styles from "./LayerSelector.module.css";

interface Props {
  layerCount: number;
  activeLayer: number;
  onLayerChange: (layer: number) => void;
}

export function LayerSelector({
  layerCount,
  activeLayer,
  onLayerChange,
}: Props) {
  const labelId = useId();
  const layers = Array.from({ length: layerCount }, (_, i) => i);

  return (
    <div className={styles.container}>
      <span id={labelId} className={styles.label}>
        Layer
      </span>
      :
      <div className={styles.tabs} role="tablist" aria-labelledby={labelId}>
        {layers.map((layer) => (
          <button
            type="button"
            key={layer}
            role="tab"
            id={`tab-layer-${layer}`}
            aria-selected={activeLayer === layer}
            className={cx(
              styles.tab,
              activeLayer === layer && styles.tabActive,
            )}
            onClick={() => onLayerChange(layer)}
            title={`Layer ${layer}`}
          >
            <span className={styles.short}>{layer}</span>
            <span className={styles.full}>{`Layer ${layer}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
