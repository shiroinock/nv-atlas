import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT_NAME } from "./default-layout";
import defaultLayoutJson from "./default-layout.json";

describe("DEFAULT_LAYOUT_NAME", () => {
  it('"ANSI 60%" である', () => {
    expect(DEFAULT_LAYOUT_NAME).toBe("ANSI 60%");
  });

  it("default-layout.json の name フィールドと一致する", () => {
    expect(DEFAULT_LAYOUT_NAME).toBe(defaultLayoutJson.name);
  });
});
