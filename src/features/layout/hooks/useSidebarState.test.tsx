import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSidebarState } from "./useSidebarState";

describe("useSidebarState", () => {
  it("defaults to false when localStorage is empty", () => {
    localStorage.removeItem("sidebarCollapsed");
    const { result } = renderHook(() => useSidebarState());
    expect(result.current.isCollapsed).toBe(false);
  });

  it("always returns false when collapse feature flag is disabled", () => {
    localStorage.setItem("sidebarCollapsed", "true");
    const { result } = renderHook(() => useSidebarState());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isCollapsed).toBe(false);
  });

  it("handles storage events gracefully when collapse feature flag is disabled", () => {
    const { result } = renderHook(() => useSidebarState());

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "sidebarCollapsed",
          newValue: "true",
        })
      );
    });

    expect(result.current.isCollapsed).toBe(false);
  });

});
