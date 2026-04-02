import { render, screen } from "@testing-library/react";
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
