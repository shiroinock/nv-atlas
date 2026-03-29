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
    test("全7モード分のボタンがレンダリングされる", () => {
      render(<ModeSelector {...defaultProps} />);

      expect(screen.getAllByRole("button")).toHaveLength(7);
    });

    test("各ボタンに正しい title 属性（ラベル）がある", () => {
      render(<ModeSelector {...defaultProps} />);

      expect(screen.getByTitle("Normal")).toBeInTheDocument();
      expect(screen.getByTitle("Visual")).toBeInTheDocument();
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

  describe("スナップショット", () => {
    test("activeMode='n' のデフォルト状態", () => {
      const { container } = render(<ModeSelector {...defaultProps} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
