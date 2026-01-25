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
    it("should have 3 primary menu items", () => {
      expect(PRIMARY_MENU_ITEMS.length).toBe(3);
    });

    it("should have Projetos as first item", () => {
      const item = PRIMARY_MENU_ITEMS[0];
      expect(item.label).toBe("Projetos");
      expect(item.path).toBe("/");
    });

    it("should have Anotações with path /notes", () => {
      const item = PRIMARY_MENU_ITEMS[1];
      expect(item.label).toBe("Anotações");
      expect(item.path).toBe("/notes");
    });

    it("should have Dashboard with path /dashboard", () => {
      const item = PRIMARY_MENU_ITEMS[2];
      expect(item.label).toBe("Dashboard");
      expect(item.path).toBe("/dashboard");
    });
  });

  describe("SECONDARY_MENU_ITEMS", () => {
    it("should have 5 secondary menu items", () => {
      expect(SECONDARY_MENU_ITEMS.length).toBe(5);
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
    it("should return true for Projetos when on /", () => {
      const item = PRIMARY_MENU_ITEMS[0]; // Projetos
      expect(isMenuItemActive(item, "/")).toBe(true);
    });

    it("should return true for Anotações when on /notes", () => {
      const item = PRIMARY_MENU_ITEMS[1]; // Anotações
      expect(isMenuItemActive(item, "/notes")).toBe(true);
    });

    it("should return false for Anotações when on different path", () => {
      const item = PRIMARY_MENU_ITEMS[1]; // Anotações
      expect(isMenuItemActive(item, "/dashboard")).toBe(false);
    });

    it("should return true for Dashboard when on /dashboard", () => {
      const item = PRIMARY_MENU_ITEMS[2]; // Dashboard
      expect(isMenuItemActive(item, "/dashboard")).toBe(true);
    });
  });

  describe("useMenuItems hook", () => {
    const mockOnCategorySelect = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return primaryItems and secondaryItems", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      expect(result.current.primaryItems).toHaveLength(3);
      expect(result.current.secondaryItems).toHaveLength(5);
    });

    it("should return primaryLinks and secondaryLinks", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      expect(result.current.primaryLinks).toHaveLength(3);
      expect(result.current.secondaryLinks).toHaveLength(5);
    });

    it("should mark Projetos as active when on /", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      const projetosItem = result.current.primaryItems[0];
      expect(projetosItem.active).toBe(true);
    });

    it("should mark Anotações as active when on /notes", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/notes"])}
      );

      const anotacoesItem = result.current.primaryItems[1];
      expect(anotacoesItem.active).toBe(true);
    });

    it("should mark Dashboard as active when on /dashboard", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/dashboard"])}
      );

      const dashboardItem = result.current.primaryItems[2];
      expect(dashboardItem.active).toBe(true);
    });

    it("should provide handleNavigation function", () => {
      const { result } = renderHook(
        () =>
          useMenuItems({
            onCategorySelect: mockOnCategorySelect,
          }),
        { wrapper: createWrapper(["/"])}
      );

      expect(typeof result.current.handleNavigation).toBe("function");
    });
  });
});
