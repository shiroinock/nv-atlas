import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { KeyInputSpec, PracticeScore, VimCommand } from "../../types/vim";
import type { ComponentProps } from "react";
import { PracticePrompt } from "./PracticePrompt";

const mockCommand: VimCommand = {
  key: "h",
  name: "←",
  description: "左に移動",
  category: "motion",
};

const mockInputSpec: KeyInputSpec = {
  targetQwertyKey: "h",
  requiresShift: false,
  expectedEventKey: "h",
  hint: "h",
};

const defaultScore: PracticeScore = {
  correct: 0,
  total: 0,
  streak: 0,
};

const defaultProps: ComponentProps<typeof PracticePrompt> = {
  command: mockCommand,
  inputSpec: mockInputSpec,
  score: defaultScore,
  lastResult: null,
  started: true,
  onStart: vi.fn(),
};

describe("PracticePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("未開始状態（started=false）", () => {
    test("「練習を開始」ボタンが表示される", () => {
      render(<PracticePrompt {...defaultProps} started={false} />);

      expect(
        screen.getByRole("button", { name: "練習を開始" }),
      ).toBeInTheDocument();
    });

    test("コマンド詳細が表示されない", () => {
      render(<PracticePrompt {...defaultProps} started={false} />);

      expect(screen.queryByText("左に移動")).not.toBeInTheDocument();
    });

    test("「練習を開始」ボタンをクリックすると onStart が呼ばれる", async () => {
      const onStart = vi.fn();
      const user = userEvent.setup();
      render(
        <PracticePrompt {...defaultProps} started={false} onStart={onStart} />,
      );

      await user.click(screen.getByRole("button", { name: "練習を開始" }));

      expect(onStart).toHaveBeenCalledOnce();
    });
  });

  describe("コマンドなし状態（started=true, command=null）", () => {
    test("「出題可能なコマンドがありません」メッセージが表示される", () => {
      render(
        <PracticePrompt {...defaultProps} command={null} inputSpec={null} />,
      );

      expect(
        screen.getByText("選択したカテゴリに出題可能なコマンドがありません"),
      ).toBeInTheDocument();
    });

    test("「練習を開始」ボタンが表示されない", () => {
      render(
        <PracticePrompt {...defaultProps} command={null} inputSpec={null} />,
      );

      expect(
        screen.queryByRole("button", { name: "練習を開始" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("コマンド表示状態（started=true, command あり）", () => {
    test("コマンド名が表示される", () => {
      render(<PracticePrompt {...defaultProps} />);

      expect(screen.getByText("「←」")).toBeInTheDocument();
    });

    test("コマンドの説明が表示される", () => {
      render(<PracticePrompt {...defaultProps} />);

      expect(screen.getByText("左に移動")).toBeInTheDocument();
    });

    test("カテゴリラベル「移動」が表示される", () => {
      render(<PracticePrompt {...defaultProps} />);

      expect(screen.getByText("移動")).toBeInTheDocument();
    });

    test("「を押してください」の指示が表示される", () => {
      render(<PracticePrompt {...defaultProps} />);

      expect(screen.getByText("を押してください")).toBeInTheDocument();
    });

    test("スコア「正解: 0/0」が表示される", () => {
      render(<PracticePrompt {...defaultProps} />);

      expect(screen.getByText("正解: 0/0")).toBeInTheDocument();
    });
  });

  describe("スコア表示", () => {
    test("total=0 のとき正答率が表示されない", () => {
      render(
        <PracticePrompt
          {...defaultProps}
          score={{ correct: 0, total: 0, streak: 0 }}
        />,
      );

      expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    });

    test("total>0 のとき正答率が表示される", () => {
      render(
        <PracticePrompt
          {...defaultProps}
          score={{ correct: 3, total: 5, streak: 0 }}
        />,
      );

      expect(screen.getByText("(60%)")).toBeInTheDocument();
    });

    test("streak=1 のとき連続正解数が表示されない", () => {
      render(
        <PracticePrompt
          {...defaultProps}
          score={{ correct: 1, total: 1, streak: 1 }}
        />,
      );

      expect(screen.queryByText(/連続正解/)).not.toBeInTheDocument();
    });

    test("streak=2 のとき「2 連続正解」が表示される", () => {
      render(
        <PracticePrompt
          {...defaultProps}
          score={{ correct: 2, total: 2, streak: 2 }}
        />,
      );

      expect(screen.getByText("2 連続正解")).toBeInTheDocument();
    });

    test("streak=5 のとき「5 連続正解」が表示される", () => {
      render(
        <PracticePrompt
          {...defaultProps}
          score={{ correct: 5, total: 5, streak: 5 }}
        />,
      );

      expect(screen.getByText("5 連続正解")).toBeInTheDocument();
    });
  });

  describe("lastResult による className 変化", () => {
    test("lastResult=null のとき correct/incorrect クラスが付かない", () => {
      const { container } = render(
        <PracticePrompt {...defaultProps} lastResult={null} />,
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.className).not.toMatch(/_correct_/);
      expect(panel.className).not.toMatch(/_incorrect_/);
    });

    test("lastResult='correct' のとき correct クラスが付く", () => {
      const { container } = render(
        <PracticePrompt {...defaultProps} lastResult="correct" />,
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.className).toMatch(/_correct_/);
    });

    test("lastResult='incorrect' のとき incorrect クラスが付く", () => {
      const { container } = render(
        <PracticePrompt {...defaultProps} lastResult="incorrect" />,
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.className).toMatch(/_incorrect_/);
    });

    test("lastResult='correct' のとき incorrect クラスが付かない", () => {
      const { container } = render(
        <PracticePrompt {...defaultProps} lastResult="correct" />,
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.className).not.toMatch(/_incorrect_/);
    });

    test("lastResult='incorrect' のとき correct クラスが付かない", () => {
      const { container } = render(
        <PracticePrompt {...defaultProps} lastResult="incorrect" />,
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.className).not.toMatch(/_correct_/);
    });
  });

  describe("ヒント表示", () => {
    test("requiresShift=false かつ layerInfo なし のときヒントが表示されない", () => {
      render(
        <PracticePrompt
          {...defaultProps}
          inputSpec={{
            targetQwertyKey: "h",
            requiresShift: false,
            expectedEventKey: "h",
            hint: "h",
          }}
        />,
      );

      expect(screen.queryByText("h")).not.toBeInTheDocument();
    });

    test("requiresShift=true のときヒントが表示される", () => {
      render(
        <PracticePrompt
          {...defaultProps}
          inputSpec={{
            targetQwertyKey: "h",
            requiresShift: true,
            expectedEventKey: "H",
            hint: "Shift + h",
          }}
        />,
      );

      expect(screen.getByText("Shift + h")).toBeInTheDocument();
    });

    test("layerInfo あり のときヒントが表示される", () => {
      render(
        <PracticePrompt
          {...defaultProps}
          inputSpec={{
            targetQwertyKey: "h",
            requiresShift: false,
            layerInfo: {
              matrixKey: "space",
              layer: 1,
              tapKey: " ",
              label: "space長押し",
            },
            expectedEventKey: "h",
            hint: "space長押し + h",
          }}
        />,
      );

      expect(screen.getByText("space長押し + h")).toBeInTheDocument();
    });

    test("inputSpec=null のときヒントが表示されない", () => {
      render(<PracticePrompt {...defaultProps} inputSpec={null} />);

      expect(screen.queryByText(/長押し/)).not.toBeInTheDocument();
    });
  });

  describe("スナップショット", () => {
    test("コマンドあり・lastResult=null のデフォルト状態", () => {
      const { container } = render(<PracticePrompt {...defaultProps} />);

      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
