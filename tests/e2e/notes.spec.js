import { test, expect } from "@playwright/test";

test.describe("Fitur Activity Notes LPE Hub", () => {
  // Database lokal sementara di memori test runner
  let notes = [];

  test.beforeEach(async ({ page }) => {
    // 1. Data awal: Catatan dengan Progress dan Feedback
    notes = [
      {
        id: "note-1",
        title: "Pembaruan Regulasi TKA 2026",
        desc: "Sosialisasi aturan baru visa dan izin kerja kepada manajemen.",
        done: false,
        progress: [
          {
            id: "prog-1",
            act: "Drafting materi presentasi",
            tglAct: "2026-11-20T00:00:00.000Z",
            status: "Plan",
            feedbacks: [
              {
                id: "fb-1",
                text: "Pastikan menyertakan poin mengenai EPO dan RPTKA terbaru.",
                tglFeedback: "2026-11-21T00:00:00.000Z",
              },
            ],
          },
        ],
      },
    ];

    // 2. Intercept API GET & POST /api/notes
    await page.route("**/api/notes", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(notes),
        });
      } else if (method === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newNote = {
          id: `note-${Date.now()}`,
          title: body.title,
          desc: body.desc,
          done: false,
          progress: [],
        };
        notes.unshift(newNote);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newNote),
        });
      }
    });

    // 3. Intercept API PATCH & DELETE /api/notes/:id
    await page.route(/\/api\/notes\/note-[^/]+$/, async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      const id = url.split("/").pop();

      if (method === "PATCH") {
        const body = JSON.parse(route.request().postData() || "{}");
        notes = notes.map((n) => (n.id === id ? { ...n, ...body } : n));
        const updated = notes.find((n) => n.id === id);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updated),
        });
      } else if (method === "DELETE") {
        notes = notes.filter((n) => n.id !== id);
        await route.fulfill({ status: 204 });
      }
    });

    // 4. Intercept API Progress (/api/notes/:id/progress)
    await page.route(/\/api\/notes\/[^/]+\/progress$/, async (route) => {
      if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newProgress = {
          id: `prog-${Date.now()}`,
          act: body.act,
          tglAct: body.tglAct,
          status: body.status || "Plan",
          feedbacks: [],
        };
        notes[0].progress.push(newProgress);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newProgress),
        });
      }
    });

    // 5. Intercept API Feedback (/api/notes/:id/progress/:progId/feedback)
    await page.route(/\/api\/notes\/[^/]+\/progress\/[^/]+\/feedback$/, async (route) => {
      if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newFeedback = {
          id: `fb-${Date.now()}`,
          text: body.text,
          tglFeedback: body.tglFeedback,
        };
        notes[0].progress[0].feedbacks.push(newFeedback);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newFeedback),
        });
      }
    });

    // 6. Kunjungi halaman Activity Notes (login via storageState)
    await page.goto("/notes");
    await expect(page.getByRole("heading", { name: "Activity Notes" })).toBeVisible();
  });

  test("1. Harus menampilkan daftar catatan awal dan status On Going", async ({ page }) => {
    // Verifikasi judul dan deskripsi catatan
    await expect(page.getByText("Pembaruan Regulasi TKA 2026")).toBeVisible();
    await expect(page.getByText(/Sosialisasi aturan baru visa/)).toBeVisible();

    // Verifikasi badge status awal "On Going"
    await expect(page.getByRole("button", { name: "On Going" })).toBeVisible();
  });

  test("2. Harus bisa menambahkan catatan aktivitas baru", async ({ page }) => {
    const titleInput = page.getByPlaceholder("Start a new list activity...");
    const descInput = page.getByPlaceholder("Description here...");

    // Klik input judul agar input deskripsi terbuka (expand)
    await titleInput.click();
    await titleInput.fill("Persiapan Audit Imigrasi");

    // Isi deskripsi dan submit form
    await descInput.fill("Pengecekan kelengkapan paspor dan KITAS di kantor cabang.");
    await page.locator("form button[type='submit']").first().click();

    // Verifikasi catatan baru muncul di daftar
    await expect(page.getByText("Persiapan Audit Imigrasi")).toBeVisible();
    await expect(page.getByText(/Pengecekan kelengkapan paspor/)).toBeVisible();
  });

  test("3. Harus bisa mengubah status catatan menjadi Done (toggle status)", async ({ page }) => {
    const statusButton = page.getByRole("button", { name: "On Going" });

    // Klik tombol status untuk toggle
    await statusButton.click();

    // Verifikasi tombol status berganti teks menjadi "Done"
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  });

    test("4. Harus bisa membuka panel Progress dan menambah progress baru", async ({ page }) => {
    // Cari kartu catatan pertama dan klik ikon LayoutList di dalam kartu tersebut
    const noteCard = page.locator(".space-y-6 > div").first();
    await noteCard.locator("svg.lucide-layout-list").first().click();

    // Verifikasi progress awal terlihat
    await expect(page.getByText("Drafting materi presentasi")).toBeVisible();

    // Isi form tambah progress baru
    const progressInput = page.getByPlaceholder("Input the progress here ...");
    const dateInput = page.locator("form input[type='date']").last();
    const addProgressButton = page.getByRole("button", { name: "Add" });

    await progressInput.fill("Review bersama divisi Legal");
    await dateInput.fill("2026-11-25");
    await addProgressButton.click();

    // Verifikasi progress baru tampil
    await expect(page.getByText("Review bersama divisi Legal")).toBeVisible();
  });

  test("5. Harus bisa menambahkan Feedback ke dalam item progress", async ({ page }) => {
    // Cari kartu catatan pertama dan klik ikon LayoutList di dalam kartu tersebut
    const noteCard = page.locator(".space-y-6 > div").first();
    await noteCard.locator("svg.lucide-layout-list").first().click();

    // Verifikasi feedback lama terlihat
    await expect(page.getByText(/Pastikan menyertakan poin mengenai EPO/)).toBeVisible();

    // Isi form feedback pada progress
    const feedbackInput = page.getByPlaceholder("input feedback disini...");
    const feedbackForm = feedbackInput.locator("xpath=ancestor::form");
    const feedbackDate = feedbackForm.locator("input[type='date']");
    const saveFeedbackButton = feedbackForm.getByRole("button", { name: "Save" });

    await feedbackInput.fill("Data statistik TKA sudah ditambahkan oleh HRD.");
    await feedbackDate.fill("2026-11-22");
    await saveFeedbackButton.click();

    // Verifikasi feedback baru tampil di layar
    await expect(page.getByText("Data statistik TKA sudah ditambahkan oleh HRD.")).toBeVisible();
  });

  test("6. Harus bisa menghapus catatan aktivitas", async ({ page }) => {
    // Intercept dialog window.confirm dari browser agar otomatis di-Accept (klik OK)
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Klik ikon tempat sampah di kartu catatan
    const deleteButton = page.locator("button svg.lucide-trash").first();
    await deleteButton.click();

    // Verifikasi catatan terhapus dan pesan catatan kosong muncul
    await expect(page.getByText("Pembaruan Regulasi TKA 2026")).not.toBeVisible();
    await expect(page.getByText(/Belum ada catatan/i)).toBeVisible();
  });
});