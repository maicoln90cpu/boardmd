import { describe, it, expect } from "vitest";
import {
  COLUMN_COLORS,
  getColumnTopBarClass,
  getColumnBackgroundClass,
  getColumnColorClass,
  getColumnStyles,
  ColumnColorValue,
} from "@/lib/columnStyles";

describe("columnStyles", () => {
  describe("COLUMN_COLORS", () => {
    it("should have 9 color options including default", () => {
      expect(COLUMN_COLORS.length).toBe(9);
    });

    it("should have a default/null color option", () => {
      const defaultColor = COLUMN_COLORS.find((c) => c.value === null);
      expect(defaultColor).toBeDefined();
      expect(defaultColor?.name).toBe("Padrão");
    });

    it("should have all expected color values", () => {
      const colorValues = COLUMN_COLORS.map((c) => c.value);
      expect(colorValues).toContain(null);
      expect(colorValues).toContain("blue");
      expect(colorValues).toContain("green");
      expect(colorValues).toContain("yellow");
      expect(colorValues).toContain("orange");
      expect(colorValues).toContain("red");
      expect(colorValues).toContain("purple");
      expect(colorValues).toContain("pink");
      expect(colorValues).toContain("cyan");
    });

    it("each color should have preview and bar classes", () => {
      COLUMN_COLORS.forEach((color) => {
        expect(color.preview).toBeDefined();
        expect(color.bar).toBeDefined();
        expect(color.preview.startsWith("bg-")).toBe(true);
        expect(color.bar.startsWith("bg-")).toBe(true);
      });
    });
  });

  describe("getColumnTopBarClass", () => {
    it("should return bg-muted for null color", () => {
      expect(getColumnTopBarClass(null)).toBe("bg-muted");
    });

    it("should return bg-muted for undefined color", () => {
      expect(getColumnTopBarClass(undefined)).toBe("bg-muted");
    });

    it("should return correct class for blue", () => {
      expect(getColumnTopBarClass("blue")).toBe("bg-blue-500");
    });

    it("should return correct class for green", () => {
      expect(getColumnTopBarClass("green")).toBe("bg-emerald-500");
    });

    it("should return correct class for yellow", () => {
      expect(getColumnTopBarClass("yellow")).toBe("bg-amber-400");
    });

    it("should return correct class for orange", () => {
      expect(getColumnTopBarClass("orange")).toBe("bg-orange-500");
    });

    it("should return correct class for red", () => {
      expect(getColumnTopBarClass("red")).toBe("bg-red-500");
    });

    it("should return correct class for purple", () => {
      expect(getColumnTopBarClass("purple")).toBe("bg-violet-500");
    });

    it("should return correct class for pink", () => {
      expect(getColumnTopBarClass("pink")).toBe("bg-pink-500");
    });

    it("should return correct class for cyan", () => {
      expect(getColumnTopBarClass("cyan")).toBe("bg-cyan-500");
    });

    it("should return bg-muted for unknown color", () => {
      expect(getColumnTopBarClass("unknown")).toBe("bg-muted");
    });
  });

  describe("getColumnBackgroundClass", () => {
    it("should return bg-card for null color", () => {
      expect(getColumnBackgroundClass(null)).toBe("bg-card");
    });

    it("should return bg-card for undefined color", () => {
      expect(getColumnBackgroundClass(undefined)).toBe("bg-card");
    });

    it("should return correct class for blue", () => {
      expect(getColumnBackgroundClass("blue")).toBe("bg-blue-50 dark:bg-blue-950/20");
    });

    it("should return correct class for green", () => {
      expect(getColumnBackgroundClass("green")).toBe("bg-emerald-50 dark:bg-emerald-950/20");
    });

    it("should return bg-card for unknown color", () => {
      expect(getColumnBackgroundClass("unknown")).toBe("bg-card");
    });
  });

  describe("getColumnColorClass (deprecated)", () => {
    it("should always return bg-card", () => {
      expect(getColumnColorClass(null)).toBe("bg-card");
      expect(getColumnColorClass("blue")).toBe("bg-card");
      expect(getColumnColorClass("red")).toBe("bg-card");
    });
  });

  describe("getColumnStyles", () => {
    it("should return both topBar and background classes", () => {
      const styles = getColumnStyles("blue");
      expect(styles).toHaveProperty("topBar");
      expect(styles).toHaveProperty("background");
      expect(styles.topBar).toBe("bg-blue-500");
      expect(styles.background).toBe("bg-blue-50 dark:bg-blue-950/20");
    });

    it("should return default classes for null color", () => {
      const styles = getColumnStyles(null);
      expect(styles.topBar).toBe("bg-muted");
      expect(styles.background).toBe("bg-card");
    });

    it("should return default classes for undefined color", () => {
      const styles = getColumnStyles(undefined);
      expect(styles.topBar).toBe("bg-muted");
      expect(styles.background).toBe("bg-card");
    });
  });
});
