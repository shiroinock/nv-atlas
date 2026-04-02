import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { LayerSelector } from "./LayerSelector";

const defaultProps = {
  layerCount: 3,
  activeLayer: 0,
  onLayerChange: vi.fn(),
};

describe("LayerSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("レンダリング", () => {
    test("layerCount=3 のとき 3 つのタブがレンダリングされる", () => {
      render(<LayerSelector {...defaultProps} />);

      expect(screen.getAllByRole("tab")).toHaveLength(3);
    });

    test("各タブに正しい title 属性がある", () => {
      render(<LayerSelector {...defaultProps} />);

      expect(screen.getByTitle("Layer 0")).toBeInTheDocument();
      expect(screen.getByTitle("Layer 1")).toBeInTheDocument();
      expect(screen.getByTitle("Layer 2")).toBeInTheDocument();
    });

    test("layerCount=0 のときタブがレンダリングされない", () => {
      render(<LayerSelector {...defaultProps} layerCount={0} />);

      expect(screen.queryAllByRole("tab")).toHaveLength(0);
    });

    test("layerCount=1 のとき 1 つのタブだけレンダリングされる", () => {
      render(<LayerSelector {...defaultProps} layerCount={1} />);

      expect(screen.getAllByRole("tab")).toHaveLength(1);
    });
  });

  describe("アクティブレイヤー", () => {
    test("activeLayer=0 のとき Layer 0 に tabActive クラスが付く", () => {
      render(<LayerSelector {...defaultProps} activeLayer={0} />);

      expect(screen.getByTitle("Layer 0").className).toContain("tabActive");
    });

    test("activeLayer=2 のとき Layer 2 に tabActive クラスが付く", () => {
      render(<LayerSelector {...defaultProps} activeLayer={2} />);

      expect(screen.getByTitle("Layer 2").className).toContain("tabActive");
    });

    test("アクティブでないタブに tabActive クラスが付かない", () => {
      render(<LayerSelector {...defaultProps} activeLayer={0} />);

      expect(screen.getByTitle("Layer 1").className).not.toContain("tabActive");
      expect(screen.getByTitle("Layer 2").className).not.toContain("tabActive");
    });
  });

  describe("クリック操作", () => {
    test("Layer 0 クリックで onLayerChange(0) が呼ばれる", async () => {
      const onLayerChange = vi.fn();
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} onLayerChange={onLayerChange} />);

      await user.click(screen.getByTitle("Layer 0"));

      expect(onLayerChange).toHaveBeenCalledWith(0);
    });

    test("Layer 1 クリックで onLayerChange(1) が呼ばれる", async () => {
      const onLayerChange = vi.fn();
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} onLayerChange={onLayerChange} />);

      await user.click(screen.getByTitle("Layer 1"));

      expect(onLayerChange).toHaveBeenCalledWith(1);
    });

    test("Layer 2 クリックで onLayerChange(2) が呼ばれる", async () => {
      const onLayerChange = vi.fn();
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} onLayerChange={onLayerChange} />);

      await user.click(screen.getByTitle("Layer 2"));

      expect(onLayerChange).toHaveBeenCalledWith(2);
    });

    test("onLayerChange は一度だけ呼ばれる", async () => {
      const onLayerChange = vi.fn();
      const user = userEvent.setup();
      render(<LayerSelector {...defaultProps} onLayerChange={onLayerChange} />);

      await user.click(screen.getByTitle("Layer 1"));

      expect(onLayerChange).toHaveBeenCalledOnce();
    });
  });

  describe("アクセシビリティ", () => {
    test("tabs コンテナに role='tablist' が付与されている", () => {
      render(<LayerSelector {...defaultProps} />);

      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    test("アクティブレイヤーのタブに aria-selected='true' が付与されている", () => {
      render(<LayerSelector {...defaultProps} activeLayer={0} />);

      expect(screen.getByTitle("Layer 0")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    test("非アクティブなタブに aria-selected='false' が付与されている", () => {
      render(<LayerSelector {...defaultProps} activeLayer={0} />);

      expect(screen.getByTitle("Layer 1")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByTitle("Layer 2")).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    test("tablist が aria-labelledby で可視ラベルを参照している", () => {
      render(<LayerSelector {...defaultProps} />);

      expect(
        screen.getByRole("tablist", { name: "Layer" }),
      ).toBeInTheDocument();
    });

    test("各タブに id='tab-layer-{n}' が付与されている", () => {
      render(<LayerSelector {...defaultProps} />);

      expect(screen.getByTitle("Layer 0")).toHaveAttribute("id", "tab-layer-0");
      expect(screen.getByTitle("Layer 1")).toHaveAttribute("id", "tab-layer-1");
      expect(screen.getByTitle("Layer 2")).toHaveAttribute("id", "tab-layer-2");
    });
  });

  describe("スナップショット", () => {
    test("layerCount=3, activeLayer=0 のデフォルト状態", () => {
      const { container } = render(<LayerSelector {...defaultProps} />);

      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
