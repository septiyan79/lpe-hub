import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/uploads/[...slug]/route";
import { readFile } from "fs/promises";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

describe("GET /api/uploads/[...slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper untuk membuat mock request
  const mockRequest = () => new Request("http://localhost");

  it("mengembalikan status 404 jika slug tidak ada", async () => {
    const params = Promise.resolve({}); // Params berupa promise di Next.js 15+
    
    const response = await GET(mockRequest(), { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Not found");
  });

  it("mengembalikan status 403 jika terdeteksi path traversal (..)", async () => {
    const params = Promise.resolve({ slug: ["..", "secret.txt"] });
    
    const response = await GET(mockRequest(), { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("mengembalikan status 404 jika file tidak ditemukan di sistem", async () => {
    vi.mocked(readFile).mockRejectedValue(new Error("ENOENT: no such file or directory"));
    
    const params = Promise.resolve({ slug: ["dokumen-hilang.pdf"] });
    
    const response = await GET(mockRequest(), { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("File not found");
  });

  it("mengembalikan file PDF yang sukses dibaca beserta header yang benar", async () => {
    // Simulasi buffer file PDF
    const mockFileContent = Buffer.from("isi-file-pdf-palsu");
    vi.mocked(readFile).mockResolvedValue(mockFileContent);
    
    const params = Promise.resolve({ slug: ["paspor", "fulan.pdf"] });
    
    const response = await GET(mockRequest(), { params });
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=86400");
    
    const textContent = await response.text();
    expect(textContent).toBe("isi-file-pdf-palsu");
    
    // Pastikan readFile dipanggil dengan argument yang berisi path yang benar
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(vi.mocked(readFile).mock.calls[0][0]).toContain("fulan.pdf");
  });

  it("mengembalikan tipe default (application/octet-stream) untuk file dengan ekstensi tak dikenal", async () => {
    const mockFileContent = Buffer.from("file-aneh");
    vi.mocked(readFile).mockResolvedValue(mockFileContent);
    
    const params = Promise.resolve({ slug: ["data.xyz"] }); 
    
    const response = await GET(mockRequest(), { params });
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
  });
});