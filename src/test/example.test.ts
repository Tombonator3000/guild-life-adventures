import { describe, it, expect } from "vitest";

describe("test setup", () => {
  it("vitest environment is configured correctly", () => {
    expect(window).toBeDefined();
    expect(window.matchMedia).toBeDefined();
  });
});
