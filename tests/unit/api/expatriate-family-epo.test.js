// tests/unit/api/expatriate-family-epo.test.js
import { describe, it, expect } from "vitest";
import { GET, POST, PATCH, DELETE } from "@/app/api/expatriate/[id]/family/[familyId]/epo/route";

const EXPECTED_MSG = "EPO sekarang dikelola sebagai jenis permit (isEPO: true). Gunakan endpoint /permits.";

describe("Legacy Expatriate Family EPO API Handlers (/api/expatriate/[id]/family/[familyId]/epo)", () => {
  it("GET harus mengembalikan 410 Gone dengan pesan pengalihan", async () => {
    const res = await GET();
    expect(res.status).toBe(410);

    const json = await res.json();
    expect(json.error).toBe(EXPECTED_MSG);
  });

  it("POST harus mengembalikan 410 Gone dengan pesan pengalihan", async () => {
    const res = await POST();
    expect(res.status).toBe(410);

    const json = await res.json();
    expect(json.error).toBe(EXPECTED_MSG);
  });

  it("PATCH harus mengembalikan 410 Gone dengan pesan pengalihan", async () => {
    const res = await PATCH();
    expect(res.status).toBe(410);

    const json = await res.json();
    expect(json.error).toBe(EXPECTED_MSG);
  });

  it("DELETE harus mengembalikan 410 Gone dengan pesan pengalihan", async () => {
    const res = await DELETE();
    expect(res.status).toBe(410);

    const json = await res.json();
    expect(json.error).toBe(EXPECTED_MSG);
  });
});