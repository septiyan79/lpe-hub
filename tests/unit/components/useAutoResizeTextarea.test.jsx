// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

describe("useAutoResizeTextarea Hook", () => {
  it("mengembalikan object ref yang valid", () => {
    const { result } = renderHook(() => useAutoResizeTextarea("halo"));

    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty("current");
    expect(result.current.current).toBeNull();
  });

  it("aman dan tidak melempar error saat ref.current bernilai null", () => {
    expect(() => {
      const { rerender } = renderHook(
        ({ val, visible }) => useAutoResizeTextarea(val, visible),
        { initialProps: { val: "text 1", visible: true } }
      );
      rerender({ val: "text 2", visible: true });
    }).not.toThrow();
  });

  it("mengatur style.height sesuai scrollHeight saat ref terpasang", () => {
    const mockElement = {
      style: { height: "0px" },
      scrollHeight: 140,
    };

    const { result, rerender } = renderHook(
      ({ val, visible }) => useAutoResizeTextarea(val, visible),
      { initialProps: { val: "awal", visible: true } }
    );

    // Pasang mock element ke ref
    result.current.current = mockElement;

    // Trigger update
    rerender({ val: "perubahan nilai baru", visible: true });

    expect(mockElement.style.height).toBe("140px");
  });

  it("tidak mengubah height ketika isVisible bernilai false", () => {
    const mockElement = {
      style: { height: "50px" },
      scrollHeight: 200,
    };

    const { result, rerender } = renderHook(
      ({ val, visible }) => useAutoResizeTextarea(val, visible),
      { initialProps: { val: "baris 1", visible: true } }
    );

    result.current.current = mockElement;

    // Rerender dengan isVisible = false
    rerender({ val: "baris 2 panjang", visible: false });

    // style.height harus tetap 50px, tidak tersentuh
    expect(mockElement.style.height).toBe("50px");
  });

  it("bekerja dengan elemen textarea nyata di DOM", () => {
    let mockScrollHeight = 95;

    function Harness({ text, visible }) {
      const textareaRef = useAutoResizeTextarea(text, visible);
      return <textarea ref={textareaRef} data-testid="auto-ta" defaultValue={text} />;
    }

    const { getByTestId, rerender } = render(<Harness text="hello" visible={true} />);
    const textarea = getByTestId("auto-ta");

    // Di jsdom, scrollHeight default adalah 0, kita define getter scrollHeight mock
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () => mockScrollHeight,
    });

    // Ubah props dan rerender
    mockScrollHeight = 180;
    rerender(<Harness text="hello world\nbaris baru" visible={true} />);

    expect(textarea.style.height).toBe("180px");
  });
});