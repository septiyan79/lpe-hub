// @vitest-environment jsdom
// tests/unit/components/SessionProviderWrapper.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

// Mock next-auth/react SessionProvider
vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }) => (
    <div data-testid="mock-session-provider">{children}</div>
  ),
}));

describe("SessionProviderWrapper Component (components/SessionProviderWrapper.jsx)", () => {
  it("harus merender children dengan benar di dalam SessionProvider", () => {
    render(
      <SessionProviderWrapper>
        <p data-testid="child-content">Konten Aplikasi</p>
      </SessionProviderWrapper>
    );

    const provider = screen.getByTestId("mock-session-provider");
    const child = screen.getByTestId("child-content");

    expect(provider).toBeInTheDocument();
    expect(child).toBeInTheDocument();
    expect(provider).toContainElement(child);
  });

  it("harus merender multiple children tanpa error", () => {
    render(
      <SessionProviderWrapper>
        <h1>Judul</h1>
        <p>Paragraf Pertama</p>
        <button>Aksi</button>
      </SessionProviderWrapper>
    );

    expect(screen.getByRole("heading", { name: "Judul" })).toBeInTheDocument();
    expect(screen.getByText("Paragraf Pertama")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aksi" })).toBeInTheDocument();
  });
});