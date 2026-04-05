import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { MergedVimCommand } from "../../types/vim";
import { CommandReference } from "./CommandReference";

const defaultProps = {
  customKeymap: {},
  onHighlightKeys: vi.fn(),
};

describe("CommandReference スナップショット", () => {
  test("mergedCommands なしでレンダリングした結果のスナップショット", () => {
    const { container } = render(<CommandReference {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test("mergedCommands ありでレンダリングした結果のスナップショット", () => {
    const mergedCommands: MergedVimCommand[] = [
      {
        key: "h",
        name: "Left",
        description: "Move cursor left",
        category: "motion",
        source: "hardcoded",
        modes: ["n"],
      },
      {
        key: "j",
        name: "Down",
        description: "Move cursor down",
        category: "motion",
        source: "nvim-default",
        modes: ["n"],
      },
    ];
    const { container } = render(
      <CommandReference
        {...defaultProps}
        mergedCommands={mergedCommands}
        activeVimMode="n"
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("CommandReference モードフィルタリング", () => {
  describe("activeVimMode='v' のとき", () => {
    test("modes:['x'] のコマンドが表示される", () => {
      const mergedCommands: MergedVimCommand[] = [
        {
          key: "test-x",
          name: "Visual-exclusive command name",
          description: "Visual-exclusive command desc",
          category: "misc",
          source: "hardcoded",
          modes: ["x"],
        },
      ];

      render(
        <CommandReference
          {...defaultProps}
          mergedCommands={mergedCommands}
          activeVimMode="v"
        />,
      );

      expect(
        screen.getByText("Visual-exclusive command name"),
      ).toBeInTheDocument();
    });

    test("modes:['v', 'x', 's'] のコマンドが1回だけ表示される（冗長表示なし）", () => {
      const mergedCommands: MergedVimCommand[] = [
        {
          key: "test-v",
          name: "Visual+Select command name",
          description: "Visual+Select command desc",
          category: "misc",
          source: "hardcoded",
          modes: ["v", "x", "s"],
        },
      ];

      render(
        <CommandReference
          {...defaultProps}
          mergedCommands={mergedCommands}
          activeVimMode="v"
        />,
      );

      expect(screen.getAllByText("Visual+Select command name")).toHaveLength(1);
    });

    test("modes:['n'] のコマンドが表示されない", () => {
      const mergedCommands: MergedVimCommand[] = [
        {
          key: "test-n",
          name: "Normal mode command name",
          description: "Normal mode command desc",
          category: "misc",
          source: "hardcoded",
          modes: ["n"],
        },
      ];

      render(
        <CommandReference
          {...defaultProps}
          mergedCommands={mergedCommands}
          activeVimMode="v"
        />,
      );

      expect(
        screen.queryByText("Normal mode command name"),
      ).not.toBeInTheDocument();
    });
  });

  describe("activeVimMode='s' のとき", () => {
    test("modes:['v'] のコマンドが表示される", () => {
      const mergedCommands: MergedVimCommand[] = [
        {
          key: "test-v-in-s",
          name: "Visual+Select command in Select mode name",
          description: "Visual+Select command in Select mode desc",
          category: "misc",
          source: "hardcoded",
          modes: ["v"],
        },
      ];

      render(
        <CommandReference
          {...defaultProps}
          mergedCommands={mergedCommands}
          activeVimMode="s"
        />,
      );

      expect(
        screen.getByText("Visual+Select command in Select mode name"),
      ).toBeInTheDocument();
    });
  });
});

describe("CommandReference toggleCategory", () => {
  const motionCommand: MergedVimCommand = {
    key: "h",
    name: "Left",
    description: "Move cursor left",
    category: "motion",
    source: "hardcoded",
    modes: ["n"],
  };
  const editCommand: MergedVimCommand = {
    key: "u",
    name: "undo",
    description: "元に戻す",
    category: "edit",
    source: "hardcoded",
    modes: ["n"],
  };

  test("motion カテゴリボタンをクリックすると motion コマンドが非表示になる", async () => {
    const user = userEvent.setup();
    render(
      <CommandReference
        {...defaultProps}
        mergedCommands={[motionCommand, editCommand]}
        activeVimMode="n"
      />,
    );

    expect(screen.getByText("Left")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "移動" }));

    expect(screen.queryByText("Left")).not.toBeInTheDocument();
  });

  test("非表示にした motion カテゴリボタンを再クリックすると motion コマンドが再表示される", async () => {
    const user = userEvent.setup();
    render(
      <CommandReference
        {...defaultProps}
        mergedCommands={[motionCommand, editCommand]}
        activeVimMode="n"
      />,
    );

    await user.click(screen.getByRole("button", { name: "移動" }));
    expect(screen.queryByText("Left")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "移動" }));
    expect(screen.getByText("Left")).toBeInTheDocument();
  });

  test("カテゴリが1つだけ選択されている状態でそのボタンをクリックしても解除されない", async () => {
    const user = userEvent.setup();
    render(
      <CommandReference
        {...defaultProps}
        mergedCommands={[motionCommand]}
        activeVimMode="n"
      />,
    );

    // edit カテゴリをすべて除外して motion だけ残す（他カテゴリを全部 OFF にする）
    // まず edit 以外を全部クリックして motion だけ残す
    const allCategoryButtons = [
      "編集",
      "検索",
      "挿入",
      "ビジュアル",
      "オペレータ",
      "テキストオブジェクト",
      "その他",
    ];
    for (const label of allCategoryButtons) {
      await user.click(screen.getByRole("button", { name: label }));
    }

    // この時点で motion のみ選択された状態
    expect(screen.getByText("Left")).toBeInTheDocument();

    // 最後の1つ（移動）をクリックしても解除されないことを確認
    await user.click(screen.getByRole("button", { name: "移動" }));
    expect(screen.getByText("Left")).toBeInTheDocument();
  });
});

describe("CommandReference toggleSource", () => {
  const hardcodedCommand: MergedVimCommand = {
    key: "h",
    name: "Hardcoded command name",
    description: "Hardcoded command desc",
    category: "motion",
    source: "hardcoded",
    modes: ["n"],
  };
  const nvimDefaultCommand: MergedVimCommand = {
    key: "j",
    name: "Nvim default command name",
    description: "Nvim default command desc",
    category: "motion",
    source: "nvim-default",
    modes: ["n"],
  };

  test("ソースボタンは mergedCommands が渡されたときのみ表示される", () => {
    render(
      <CommandReference
        {...defaultProps}
        mergedCommands={[hardcodedCommand]}
        activeVimMode="n"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Vim 標準" }),
    ).toBeInTheDocument();
  });

  test("ソースボタンは mergedCommands がない場合は表示されない", () => {
    render(<CommandReference {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: "Vim 標準" }),
    ).not.toBeInTheDocument();
  });

  test("Vim 標準ボタンをクリックすると hardcoded コマンドが非表示になる", async () => {
    const user = userEvent.setup();
    render(
      <CommandReference
        {...defaultProps}
        mergedCommands={[hardcodedCommand, nvimDefaultCommand]}
        activeVimMode="n"
      />,
    );

    expect(screen.getByText("Hardcoded command name")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vim 標準" }));

    expect(
      screen.queryByText("Hardcoded command name"),
    ).not.toBeInTheDocument();
  });

  test("非表示にした Vim 標準ボタンを再クリックすると hardcoded コマンドが再表示される", async () => {
    const user = userEvent.setup();
    render(
      <CommandReference
        {...defaultProps}
        mergedCommands={[hardcodedCommand, nvimDefaultCommand]}
        activeVimMode="n"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Vim 標準" }));
    expect(
      screen.queryByText("Hardcoded command name"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vim 標準" }));
    expect(screen.getByText("Hardcoded command name")).toBeInTheDocument();
  });

  test("ソースが1つだけ選択されている状態でそのボタンをクリックしても解除されない", async () => {
    const user = userEvent.setup();
    render(
      <CommandReference
        {...defaultProps}
        mergedCommands={[hardcodedCommand]}
        activeVimMode="n"
      />,
    );

    // nvim-default / plugin / user を OFF にして hardcoded だけ残す
    const otherSourceButtons = ["Neovim", "プラグイン", "ユーザー設定"];
    for (const label of otherSourceButtons) {
      await user.click(screen.getByRole("button", { name: label }));
    }

    // この時点で hardcoded のみ選択された状態
    expect(screen.getByText("Hardcoded command name")).toBeInTheDocument();

    // 最後の1つ（Vim 標準）をクリックしても解除されないことを確認
    await user.click(screen.getByRole("button", { name: "Vim 標準" }));
    expect(screen.getByText("Hardcoded command name")).toBeInTheDocument();
  });
});
