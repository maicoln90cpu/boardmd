import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReactNode } from "react";
import {
  PRIMARY_MENU_ITEMS,
  SECONDARY_MENU_ITEMS,
  isMenuItemActive,
  useMenuItems,
} from "@/hooks/ui/useMenuItems";

// Wrapper para testes com React Router
const createWrapper = (initialEntries: string[] = ["/"]) => {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
};

describe("useMenuItems", () => {
  describe("PRIMARY_MENU_ITEMS", () => {
    it("should have 4 primary menu items", () => {
      expect(PRIMARY_MENU_ITEMS.length).toBe(4);
    });

    it("should have Diário as first item with mode daily", () => {
      const item = PRIMARY_MENU_ITEMS[0];
      expect(item.label).toBe("Diário");
      expect(item.path).toBe("/");
      expect(item.mode).toBe("daily");
    });

    it("should have Projetos as second item with mode all", () => {
      const item = PRIMARY_MENU_ITEMS[1];
      expect(item.label).toBe("Projetos");
      expect(item.path).toBe("/");
      expect(item.mode).toBe("all");
    });

    it("should have Anotações with path /notes", () => {
      const item = PRIMARY_MENU_ITEMS[2];
      expect(item.label).toBe("Anotações");
      expect(item.path).toBe("/notes");
      expect(item.mode).toBeUndefined();
    });

    it("should have Dashboard with path /dashboard", () => {
      const item = PRIMARY_MENU_ITEMS[3];
      expect(item.label).toBe("Dashboard");
      expect(item.path).toBe("/dashboard");
    });
  });

  describe("SECONDARY_MENU_ITEMS", () => {
    it("should have 4 secondary menu items", () => {
      expect(SECONDARY_MENU_ITEMS.length).toBe(4);
    });

    it("should have Pomodoro with path /pomodoro", () => {
      const item = SECONDARY_MENU_ITEMS.find((i) => i.label === "Pomodoro");
      expect(item).toBeDefined();
      expect(item?.path).toBe("/pomodoro");
    });

    it("should have Calendário with path /calendar", () => {
      const item = SECONDARY_MENU_ITEMS.find((i) => i.label === "Calendário");
      expect(item).toBeDefined();
      expect(item?.path).toBe("/calendar");
    });

    it("should have Notificações with path /notifications", () => {
      const item = SECONDARY_MENU_ITEMS.find((i) => i.label === "Notificações");
      expect(item).toBeDefined();
      expect(item?.path).toBe("/notifications");
    });

    it("should have Setup with path /config", () => {
      const item = SECONDARY_MENU_ITEMS.find((i) => i.label === "Setup");
      expect(item).toBeDefined();
      expect(item?.path).toBe("/config");
    });
  });

  describe("isMenuItemActive", () => {
    it("should return true for Diário when on / with daily mode", () => {
      const item = PRIMARY_MENU_ITEMS[0]; // Diário
      expect(isMenuItemActive(item, "/", "daily")).toBe(true);
    });

    it("should return false for Diário when on / with all mode", () => {
      const item = PRIMARY_MENU_ITEMS[0]; // Diário
      expect(isMenuItemActive(item, "/", "all")).toBe(false);
    });

    it("should return true for Projetos when on / with all mode", () => {
      const item = PRIMARY_MENU_ITEMS[1]; // Projetos
      expect(isMenuItemActive(item, "/", "all")).toBe(true);
    });

    it("should return false for Projetos when on / with daily mode", () => {
      const item = PRIMARY_MENU_ITEMS[1]; // Projetos
      expect(isMenuItemActive(item, "/", "daily")).toBe(false);
    });

    it("should return true for Anotações when on /notes", () => {
      const item = PRIMARY_MENU_ITEMS[2]; // Anotações
      expect(isMenuItemActive(item, "/notes", "daily")).toBe(true);
      expect(isMenuItemActive(item, "/notes", "all")).toBe(true);
    });

    it("should return false for Anotações when on different path", () => {
      const item = PRIMARY_MENU_ITEMS[2]; // Anotações
      expect(isMenuItemActive(item, "/dashboard", "daily")).toBe(false);
    });
  });

  describe("useMenuItems hook", () => {
    const mockOnViewChange = vi.fn();
    const mockOnCategorySelect = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return primaryItems and secondaryItems", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            viewMode: "daily",
            onViewChange: mockOnViewChange,
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      expect(result.current.primaryItems).toHaveLength(4);
      expect(result.current.secondaryItems).toHaveLength(4);
    });

    it("should return primaryLinks and secondaryLinks", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            viewMode: "daily",
            onViewChange: mockOnViewChange,
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      expect(result.current.primaryLinks).toHaveLength(4);
      expect(result.current.secondaryLinks).toHaveLength(4);
    });

    it("should mark Diário as active when on / with daily mode", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            viewMode: "daily",
            onViewChange: mockOnViewChange,
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      const diarioItem = result.current.primaryItems[0];
      expect(diarioItem.active).toBe(true);
    });

    it("should mark Projetos as active when on / with all mode", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            viewMode: "all",
            onViewChange: mockOnViewChange,
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      const projetosItem = result.current.primaryItems[1];
      expect(projetosItem.active).toBe(true);
    });

    it("should mark Anotações as active when on /notes", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            viewMode: "daily",
            onViewChange: mockOnViewChange,
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/notes"])}
      );

      const anotacoesItem = result.current.primaryItems[2];
      expect(anotacoesItem.active).toBe(true);
    });

    it("should provide handleNavigation function", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            viewMode: "daily",
            onViewChange: mockOnViewChange,
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      expect(typeof result.current.handleNavigation).toBe("function");
    });
  });
});
