import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ModeSelector } from "./ModeSelector";

const defaultProps = {
  activeMode: "n" as const,
  onModeChange: vi.fn(),
};

describe("ModeSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("レンダリング", () => {
    test("全8モード分のボタンがレンダリングされる", () => {
      render(<ModeSelector {...defaultProps} />);

      expect(screen.getAllByRole("tab")).toHaveLength(8);
    });

    test("各ボタンに正しい title 属性（ラベル）がある", () => {
      render(<ModeSelector {...defaultProps} />);

      expect(screen.getByTitle("Normal")).toBeInTheDocument();
      expect(screen.getByTitle("Visual")).toBeInTheDocument();
      expect(screen.getByTitle("Visual Block")).toBeInTheDocument();
      expect(screen.getByTitle("Op-pending")).toBeInTheDocument();
      expect(screen.getByTitle("Insert")).toBeInTheDocument();
      expect(screen.getByTitle("Command-line")).toBeInTheDocument();
      expect(screen.getByTitle("Select")).toBeInTheDocument();
      expect(screen.getByTitle("Terminal")).toBeInTheDocument();
    });
  });

  describe("アクティブモード", () => {
    test("activeMode='n' のとき Normal ボタンに tabActive クラスが付く", () => {
      render(<ModeSelector {...defaultProps} activeMode="n" />);

      expect(screen.getByTitle("Normal").className).toContain("tabActive");
    });

    test("activeMode='c' のとき Command-line ボタンに tabActive クラスが付く", () => {
      render(<ModeSelector {...defaultProps} activeMode="c" />);

      expect(screen.getByTitle("Command-line").className).toContain(
        "tabActive",
      );
    });

    test("activeMode='s' のとき Select ボタンに tabActive クラスが付く", () => {
      render(<ModeSelector {...defaultProps} activeMode="s" />);

      expect(screen.getByTitle("Select").className).toContain("tabActive");
    });

    test("activeMode='x' のとき Visual Block ボタンに tabActive クラスが付く", () => {
      render(<ModeSelector {...defaultProps} activeMode="x" />);

      expect(screen.getByTitle("Visual Block").className).toContain(
        "tabActive",
      );
    });

    test("activeMode='t' のとき Terminal ボタンに tabActive クラスが付く", () => {
      render(<ModeSelector {...defaultProps} activeMode="t" />);

      expect(screen.getByTitle("Terminal").className).toContain("tabActive");
    });

    test("アクティブでないボタンに tabActive クラスが付かない", () => {
      render(<ModeSelector {...defaultProps} activeMode="n" />);

      expect(screen.getByTitle("Visual").className).not.toContain("tabActive");
      expect(screen.getByTitle("Insert").className).not.toContain("tabActive");
    });
  });

  describe("クリック操作", () => {
    test("Normal ボタンクリックで onModeChange が 'n' で呼ばれる", async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

      await user.click(screen.getByTitle("Normal"));

      expect(onModeChange).toHaveBeenCalledWith("n");
    });

    test("Visual ボタンクリックで onModeChange が 'v' で呼ばれる", async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

      await user.click(screen.getByTitle("Visual"));

      expect(onModeChange).toHaveBeenCalledWith("v");
    });

    test("Visual Block ボタンクリックで onModeChange が 'x' で呼ばれる", async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

      await user.click(screen.getByTitle("Visual Block"));

      expect(onModeChange).toHaveBeenCalledWith("x");
    });

    test("Command-line ボタンクリックで onModeChange が 'c' で呼ばれる", async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

      await user.click(screen.getByTitle("Command-line"));

      expect(onModeChange).toHaveBeenCalledWith("c");
    });

    test("Select ボタンクリックで onModeChange が 's' で呼ばれる", async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

      await user.click(screen.getByTitle("Select"));

      expect(onModeChange).toHaveBeenCalledWith("s");
    });

    test("Terminal ボタンクリックで onModeChange が 't' で呼ばれる", async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

      await user.click(screen.getByTitle("Terminal"));

      expect(onModeChange).toHaveBeenCalledWith("t");
    });

    test("onModeChange は一度だけ呼ばれる", async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();
      render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

      await user.click(screen.getByTitle("Insert"));

      expect(onModeChange).toHaveBeenCalledOnce();
    });
  });

  describe("アクセシビリティ", () => {
    test("tabs コンテナに role='tablist' が付与されている", () => {
      render(<ModeSelector {...defaultProps} />);

      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    test("アクティブモードのタブに aria-selected='true' が付与されている", () => {
      render(<ModeSelector {...defaultProps} activeMode="n" />);

      expect(screen.getByTitle("Normal")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    test("非アクティブなタブに aria-selected='false' が付与されている", () => {
      render(<ModeSelector {...defaultProps} activeMode="n" />);

      expect(screen.getByTitle("Visual")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByTitle("Visual Block")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByTitle("Op-pending")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByTitle("Insert")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByTitle("Command-line")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByTitle("Select")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByTitle("Terminal")).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    test("各タブに id='tab-vim-{mode}' が付与されている", () => {
      render(<ModeSelector {...defaultProps} />);

      expect(screen.getByTitle("Normal")).toHaveAttribute("id", "tab-vim-n");
      expect(screen.getByTitle("Visual")).toHaveAttribute("id", "tab-vim-v");
      expect(screen.getByTitle("Visual Block")).toHaveAttribute(
        "id",
        "tab-vim-x",
      );
      expect(screen.getByTitle("Op-pending")).toHaveAttribute(
        "id",
        "tab-vim-o",
      );
      expect(screen.getByTitle("Insert")).toHaveAttribute("id", "tab-vim-i");
      expect(screen.getByTitle("Command-line")).toHaveAttribute(
        "id",
        "tab-vim-c",
      );
      expect(screen.getByTitle("Select")).toHaveAttribute("id", "tab-vim-s");
      expect(screen.getByTitle("Terminal")).toHaveAttribute("id", "tab-vim-t");
    });
  });

  describe("スナップショット", () => {
    test("activeMode='n' のデフォルト状態", () => {
      const { container } = render(<ModeSelector {...defaultProps} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
