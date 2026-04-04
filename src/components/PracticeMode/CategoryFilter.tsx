import { categoryColors, categoryLabels } from "../../data/vim-commands";
import {
  DEFAULT_NVIM_MAP_CATEGORY,
  type VimCommandCategory,
} from "../../types/vim";
import { cx } from "../../utils/cx";
import styles from "./CategoryFilter.module.css";

const allCategories: VimCommandCategory[] = [
  "motion",
  "edit",
  "search",
  "insert",
  "visual",
  "operator",
  DEFAULT_NVIM_MAP_CATEGORY,
];

interface CategoryFilterProps {
  selectedCategories: Set<VimCommandCategory>;
  onToggle: (cat: VimCommandCategory) => void;
}

export function CategoryFilter({
  selectedCategories,
  onToggle,
}: CategoryFilterProps) {
  return (
    <div className={styles.container}>
      {allCategories.map((cat) => {
        const isSelected = selectedCategories.has(cat);
        const color = categoryColors[cat];
        return (
          <button
            type="button"
            key={cat}
            className={cx(styles.button, isSelected && styles.selected)}
            style={{
              borderColor: color,
              backgroundColor: isSelected ? `${color}33` : "transparent",
              color: isSelected ? color : "#6c7086",
            }}
            onClick={() => onToggle(cat)}
          >
            {categoryLabels[cat]}
          </button>
        );
      })}
    </div>
  );
}
