# Testing Hub — LPE Hub

Panduan strategi pengujian untuk proyek **LPE Hub**. Pengujian dibagi menjadi dua layer utama:

---

## 📂 Struktur Pengujian

```
tests/
├── unit/       # Unit testing komponen, helper, dan API route handlers (Vitest)
└── e2e/        # End-to-End testing antarmuka pengguna & rute browser (Playwright)
```

---

## 🧭 Panduan Lengkap

| Jenis Pengujian | Framework | Dokumentasi Lengkap |
|-----------------|-----------|---------------------|
| **Unit Testing** | [Vitest](https://vitest.dev/) | 📖 [Buka Panduan Unit Testing](unit/README.md) |
| **End-to-End (E2E) Testing** | [Playwright](https://playwright.dev/) | 🎭 [Buka Panduan E2E Testing](e2e/README.md) |

---

## ⚡ Quick Start

```bash
# Menjalankan seluruh Unit Tests (Vitest)
npm test

# Menjalankan seluruh E2E Tests (Playwright)
npm run test:e2e

# Menjalankan E2E dengan UI interaktif
npm run test:e2e:ui
```

