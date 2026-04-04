import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_NVIM_MAP_CATEGORY } from "../types/vim";
import { usePractice } from "./usePractice";

describe("usePractice — selectedCategories の初期値", () => {
  it("初期状態で selectedCategories はすべての標準カテゴリを含む", () => {
    const { result } = renderHook(() => usePractice({}));

    const categories = result.current.selectedCategories;
    expect(categories.has("motion")).toBe(true);
    expect(categories.has("edit")).toBe(true);
    expect(categories.has("search")).toBe(true);
    expect(categories.has("insert")).toBe(true);
    expect(categories.has("visual")).toBe(true);
    expect(categories.has("operator")).toBe(true);
    expect(categories.has(DEFAULT_NVIM_MAP_CATEGORY)).toBe(true);
  });
});

describe("usePractice — toggleCategory で DEFAULT_NVIM_MAP_CATEGORY を操作", () => {
  describe("カテゴリの削除", () => {
    it("toggleCategory(DEFAULT_NVIM_MAP_CATEGORY) で misc を除外できる", () => {
      const { result } = renderHook(() => usePractice({}));

      act(() => {
        result.current.toggleCategory(DEFAULT_NVIM_MAP_CATEGORY);
      });

      expect(
        result.current.selectedCategories.has(DEFAULT_NVIM_MAP_CATEGORY),
      ).toBe(false);
    });

    it("最後の1カテゴリは削除できない（size が 1 を維持する）", () => {
      const { result } = renderHook(() => usePractice({}));

      const allCategories = [...result.current.selectedCategories];
      act(() => {
        for (const cat of allCategories) {
          result.current.toggleCategory(cat);
        }
      });

      expect(result.current.selectedCategories.size).toBe(1);
    });
  });

  describe("カテゴリの追加", () => {
    it("除外した DEFAULT_NVIM_MAP_CATEGORY を再度 toggleCategory で追加できる", () => {
      const { result } = renderHook(() => usePractice({}));

      act(() => {
        result.current.toggleCategory(DEFAULT_NVIM_MAP_CATEGORY);
      });

      expect(
        result.current.selectedCategories.has(DEFAULT_NVIM_MAP_CATEGORY),
      ).toBe(false);

      act(() => {
        result.current.toggleCategory(DEFAULT_NVIM_MAP_CATEGORY);
      });

      expect(
        result.current.selectedCategories.has(DEFAULT_NVIM_MAP_CATEGORY),
      ).toBe(true);
    });
  });
});
