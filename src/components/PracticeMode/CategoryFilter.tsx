import { categoryColors, categoryLabels } from "../../data/vim-commands";
import {
  VIM_PRACTICE_CATEGORIES,
  type VimCommandCategory,
} from "../../types/vim";
import { cx } from "../../utils/cx";
import styles from "./CategoryFilter.module.css";

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
      {VIM_PRACTICE_CATEGORIES.map((cat) => {
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
