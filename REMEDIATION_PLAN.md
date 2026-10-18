# Rencana Perbaikan Keamanan (Strix Findings)

Sumber: `backend/SECURITY.md` (bukan `D:\racoon\SECURITY.md` — file ada di folder `backend/`).

Status terakhir diperbarui: **19 Oktober 2026**.

Legenda status:

- **IMPLEMENTED — MANUALLY VERIFIED**: kode ada dan perilakunya sudah diperiksa manual.
- **IMPLEMENTED — PARTIALLY MANUALLY VERIFIED**: sebagian perilaku sudah diperiksa manual; sisa pemeriksaan belum dijalankan.
- **IMPLEMENTED — NOT MANUALLY VERIFIED**: kode sudah diubah, perilaku belum diuji manual.
- **NOT IMPLEMENTED**: belum ada perubahan kode.

| Task | Status |
| --- | --- |
| 1.1 Multer + limits | IMPLEMENTED — MANUALLY VERIFIED |
| 2.1 Reaper file orphan | IMPLEMENTED — MANUALLY VERIFIED |
| 2.2 Sanitasi metadata foto | IMPLEMENTED — MANUALLY VERIFIED |
| 2.3 Filter publikasi | IMPLEMENTED — MANUALLY VERIFIED |
| 2.4 Login timing | IMPLEMENTED — MANUALLY VERIFIED |
| 3.1 Revokasi logout | IMPLEMENTED — PARTIALLY MANUALLY VERIFIED |
| 3.2 `.gitignore` artefak Strix | IMPLEMENTED — MANUALLY VERIFIED (git check-ignore) |

Enam task sudah diimplementasikan dan diverifikasi manual: 1.1, 2.1, 2.2, 2.3, 2.4, dan 3.2. Task 3.1 sudah diimplementasikan dan sebagian besar perilakunya sudah diverifikasi manual pada 19 Oktober 2026 (backend port 3001): stale logout tidak mengeluarkan sesi aktif, dan logout dengan token aktif mencabut sesi tersebut (`GET /api/auth/me` → `401`). `Admin.tokenVersion = 9` berhasil dibaca setelah pengujian, tetapi nilai sebelum stale logout belum pernah diambil, sehingga klaim "tidak berubah akibat stale logout" **belum terverifikasi langsung**. Status tetap PARTIALLY MANUALLY VERIFIED.

Catatan: pembaruan dokumen ini hanya mencatat status. Tidak ada build, typecheck, atau test suite yang dijalankan dalam sesi pembaruan ini.

Catatan koreksi terhadap draft awal (hasil verifikasi kode aktual):

| Draft | Kenyataan di repo |
| --- | --- |
| `backend/src/photos/photos.module.ts` untuk multer | Tidak ada `MulterModule`. Multer dikonfigurasi sekali di `backend/src/uploads/upload.config.ts` (`imageUploadInterceptor`), dipakai 3 route upload (`photos`, `products`, `site-images`). |
| `backend/src/photos/dto/create-photo.dto.ts` | File sebenarnya: `backend/src/photos/dto/upload-photo.dto.ts`. |
| `@Cron` + `@nestjs/schedule` | `@nestjs/schedule` **tidak terpasang**. Tidak perlu dependency baru (lihat Task 2.1). |
| `.gitignore` "hilang" | `.gitignore` sudah ada dan sudah meng-ignore `.env`, `backend/uploads/`, `dist/`, `node_modules/`. Artefak Strix sudah ditambahkan di Task 3.2. |
| XSS High | Frontend merender `{photo.visitorName}` / `{photo.caption}` sebagai teks (React escape). Tidak ada `dangerouslySetInnerHTML` di source. Severity riil: **Low**, sanitasi jadi defense-in-depth. |

---

## FASE 1: Critical (High)

- [x] **Task 1.1: Upgrade Multer & Set Limits** (IMPLEMENTED — MANUALLY VERIFIED)
  - File: `backend/package.json`, `backend/package-lock.json`, `backend/src/uploads/upload.config.ts` (blok `limits` di `imageUploadInterceptor`).
  - Aksi (sesuai implementasi aktual):
    - Tambah `"overrides": { "multer": "2.4.0" }` di `backend/package.json` (multer masuk lewat `@nestjs/platform-express@10.4.22`, bukan dependency langsung). Lockfile me-resolve `multer@2.4.0`.
    - Perluas `limits` pada `imageUploadInterceptor`: `fileSize: IMAGE_MAX_BYTES`, `files: 1`, `fields: 10`, `fieldNameSize: 100`, `fieldNestingDepth: 2`, `parts: 20`.
    - `@types/multer` tetap `^2.3.0`. Limit ditype sebagai `MulterOptions['limits']` tanpa `as any`; `fieldNestingDepth` diteruskan ke busboy saat runtime.
    - Tambah pemetaan `MulterError` ke `HttpException` di batas upload: `LIMIT_FILE_SIZE` → `413`, kode limit lain → `400`.
  - Alasan memakai 2.4.0, bukan 2.3.0: audit di `backend/SECURITY.md` menyebut 2.3.0 sebagai versi minimum perbaikan. Implementasi memakai 2.4.0, rilis setelahnya, sehingga tetap memenuhi batas minimum tersebut. `fieldNestingDepth` tetap di-set eksplisit karena audit menyatakan upgrade versi saja tidak cukup untuk CVE-2026-5079.
  - Verifikasi manual (HTTP):
    - Multipart dengan field nesting berlebih → `400`.
    - Upload normal (1 field + 1 file) → `201`.
    - Multipart dengan field berlebih → `400`.
    - Upload file 11 MB → `413`.
  - Belum dijalankan: `npm ls multer`, `npm run typecheck`, `npm run build`.

---

## FASE 2: Medium (Data & Availability)

- [x] **Task 2.1: Reaper File Orphan (Disk Exhaustion)** (IMPLEMENTED — MANUALLY VERIFIED)
  - File: `backend/src/uploads/staging-reaper.service.ts` (baru); registrasi provider di `backend/src/uploads/uploads.module.ts`.
  - Aksi (sesuai implementasi aktual):
    - `StagingReaperService` mengimplementasikan `OnModuleInit` dan `OnModuleDestroy`. Saat init: satu sweep langsung, lalu `setInterval(..., 60 * 60 * 1000)`; timer di-`unref()` agar tidak menahan proses saat shutdown/test. Saat destroy: `clearInterval`.
    - `sweepStaleStagingFiles(now = Date.now())` membaca `readdir(UPLOAD_DIR)` (dari `backend/src/uploads/upload.config.ts`), hanya memproses entry berakhiran `.upload`, lalu `stat` dan `unlink` bila entry adalah file dan `now - mtimeMs > 60 * 60 * 1000`.
    - Hanya file staging `.upload` yang disentuh; gambar tersimpan (`.jpg`, `.png`, `.gif`) dan file lain tidak pernah dihapus.
    - Best-effort: `ENOENT` pada direktori/file diabaikan, error lain di-`logger.warn`, dan sweep mengembalikan jumlah file yang dihapus. Satu baris log per sweep.
    - Tanpa dependency baru (`@nestjs/schedule` tidak dipakai).
  - Verifikasi manual (PASS), di direktori sementara terisolasi:
    - File `.upload` berumur lebih dari satu jam → terhapus.
    - File `.upload` baru → tetap ada.
    - File `.jpg` → tetap ada.
  - Alasan tidak pakai `@Cron`: satu timer 1 jam tidak layak menambah dependency runtime.

- [x] **Task 2.2: Sanitasi Input Metadata Foto (Stored XSS)** (IMPLEMENTED — MANUALLY VERIFIED)
  - File: `backend/src/photos/dto/upload-photo.dto.ts`.
  - Aksi (sesuai implementasi aktual):
    - `visitorName` dan `caption`: tambah `@Matches(/^[^<>"']*$/, { message: '...' })` lewat konstanta `NO_MARKUP`.
    - Pola aktual hanya memblokir pembuka tag/quote (`<`, `>`, `"`, `'`). Huruf beraksen, emoji, dan mata uang tetap lolos. Ini berbeda dari regex yang semula direncanakan di dokumen ini.
    - `@MaxLength` yang ada tetap dipertahankan.
  - Skenario uji (sudah dijalankan manual): `POST /api/photos/upload` dengan `visitorName=<img src=x onerror=alert(1)>` → `400`. Nama normal `Budi Santoso`, `O'Brien`, `Café` → `201`.

- [x] **Task 2.3: Filter Publikasi di Endpoint Detail (Draft Leak)** (IMPLEMENTED — MANUALLY VERIFIED)
  - File: `backend/src/products/products.service.ts`, `products.controller.ts`, `stories/*`, `events/*`, `branches/*`.
  - Aksi per service:
    - `findOne` **tidak bisa** pakai `findUnique` dengan predikat non-unik. Ganti ke `findFirst({ where: { productId: id, status: 'ACTIVE', isVisible: true }, select: ... })`. Story/Event: `status: 'PUBLISHED'`. Branch: `isActive: true`. Tetap `404` bila tidak cocok.
    - `update()` / `remove()` memanggil `this.findOne(id)` (products:97,131; stories:84,112; events:88,118; branches:94,117). Tambah `findOneForAdmin(id)` (tanpa predikat publikasi) dan pakai di jalur mutasi, supaya admin masih bisa mengedit produk `INACTIVE`/tersembunyi.
    - `products.findAll`: hapus flag `publicOnly` dari jalur publik — `GET /api/products` **selalu** `status: 'ACTIVE', isVisible: true`. Tambah route admin eksplisit `@Get('admin')` + `@UseGuards(JwtAuthGuard)` yang mengembalikan daftar penuh. **Deklarasikan sebelum `@Get(':id')`** agar tidak tertangkap `:id`.
    - Pola ini sudah dipakai `branches` (`GET /branches` publik, `GET /branches/all` ter-guard) — ikuti pola yang sama.
  - Dampak frontend (ikut diubah, 2 baris):
    - `frontend/app/admin/products/page.tsx:114` dan `frontend/app/admin/menu-display/page.tsx:38`: `/api/products` → `/api/products/admin`.
  - Implementasi aktual: route admin memakai `GET /api/products/admin` dengan `JwtAuthGuard`, dideklarasikan sebelum `@Get(':id')`.
  - Skenario uji (sudah dijalankan manual): anonim `GET /api/products` → tidak ada baris `INACTIVE`/`isVisible=false`. Anonim `GET /api/products/{id-draft}` → `404`. Admin (cookie valid) `GET /api/products/admin` → daftar penuh. `PATCH` produk tersembunyi oleh admin → tetap `200`.

- [x] **Task 2.4: Cegah Login Timing Attack** (IMPLEMENTED — MANUALLY VERIFIED)
  - File: `backend/src/auth/auth.service.ts` (`login`, baris 14–26).
  - Aksi:
    - Tambah konstanta `DUMMY_HASH` (hash bcrypt statis dengan cost sama seperti hash produksi di `Admin.passwordHash`; cek `backend/prisma/seed.ts`).
    - Ganti `if (!admin) throw` menjadi: `const isMatch = await bcrypt.compare(pass, admin?.passwordHash ?? DUMMY_HASH); if (!admin || !isMatch) throw new UnauthorizedException('Invalid credentials');`
    - Jangan membocorkan perbedaan lewat pesan/status — sudah identik.
  - Skenario uji (sudah dijalankan manual): ukur 20 request email valid vs 20 request email tak dikenal → selisih median < 10 ms (target Strix ±0,4 ms).

---

## FASE 3: Low & Hardening

- [x] **Task 3.1: Perbaiki Revokasi Token di Logout** (IMPLEMENTED — PARTIALLY MANUALLY VERIFIED)
  - Root cause: `AuthService.revokeByToken` hanya memverifikasi signature dan `adminId`. Klaim `ver` tidak dibandingkan dengan `Admin.tokenVersion`, sehingga token yang sudah dicabut (mis. hasil tangkapan lama) tetap bisa menaikkan `tokenVersion` berulang kali dan mengeluarkan sesi aktif admin. Guard `JwtAuthGuard` sendiri sudah menolak token usang per request; celahnya hanya di jalur logout.
  - File: `backend/src/auth/auth.service.ts` (`revokeByToken`).
  - Aksi (sesuai implementasi aktual):
    - Payload diverifikasi sebagai `{ adminId?: string; ver?: number }`.
    - `adminId` non-string atau `ver` bukan integer → `return` tanpa perubahan.
    - Baca `Admin` by `adminId` dengan `select: { tokenVersion: true }`. Admin tidak ada atau `payload.ver !== admin.tokenVersion` → `return`.
    - Hanya bila cocok, panggil `revokeSessions(adminId)` (increment `tokenVersion`).
    - Tidak ada perubahan pada `JwtAuthGuard`, `login`, controller, atau dependency.
  - Skenario uji manual (dijalankan 19 Oktober 2026 pada backend port 3001):
    - Login berhasil dan cookie `raccoon_auth_token` diterima. PASS — MANUALLY VERIFIED.
    - `GET /api/auth/me` pada sesi baru → HTTP 200. PASS — MANUALLY VERIFIED.
    - Token fresh membawa klaim `ver = 9`; token stale membawa klaim `ver = 2`.
    - Stale token dengan `ver = 2` dipakai `POST /api/auth/logout` → HTTP 201. PASS — MANUALLY VERIFIED (request diterima).
    - Sesi baru dengan `ver = 9` tetap valid setelah stale logout; `GET /api/auth/me` → HTTP 200. PASS — MANUALLY VERIFIED untuk perilaku no-op yang terlihat dari sisi sesi.
    - Prisma Client berhasil membaca admin dan menunjukkan `Admin.tokenVersion = 9` setelah rangkaian pengujian stale logout (dibaca sebelum logout token aktif). Nilai ini konsisten dengan token fresh `ver = 9`, tetapi **bukan bukti** bahwa nilainya tidak berubah akibat stale logout.
    - Logout dengan token aktif (`ver = 9`) → HTTP 201. PASS — MANUALLY VERIFIED.
    - Setelah logout aktif, `GET /api/auth/me` memakai sesi yang sama → HTTP 401. PASS — MANUALLY VERIFIED (revokasi berlaku).
    - **BELUM diverifikasi:** nilai `Admin.tokenVersion` sebelum stale logout di port 3001 belum diambil, sehingga perbandingan sebelum/sesudah stale logout belum terverifikasi langsung. Jangan mengklaim nilai tidak berubah akibat stale logout.
    - **BELUM diverifikasi:** kenaikan `tokenVersion` tepat +1 akibat logout aktif belum dibaca langsung (tidak ada pembacaan nilai setelah logout aktif). Yang terverifikasi adalah efek revokasinya, yaitu `401`.
  - Status: PARTIALLY MANUALLY VERIFIED. Sisa kriteria: pembacaan langsung `Admin.tokenVersion` sebelum stale logout untuk perbandingan sebelum/sesudah, dan pembacaan nilai setelah logout aktif untuk membuktikan kenaikan +1.
  - **Hasil retest manual sebelumnya (sebelum rebuild): GAGAL, tetapi bukan karena logika source.** Root cause aktual: proses di port 3001 menjalankan `node dist/main` (PID 5320, start 02.44.46) dengan `backend/dist/auth/auth.service.js` hasil build 01.59.34. File dist itu masih berisi logika lama (`if (typeof payload.adminId === 'string')` tanpa cek `ver`). Source `backend/src/auth/auth.service.ts` sudah berisi cek `ver` (mtime 02.31.14), tetapi belum pernah dikompilasi ulang. Restart tidak menolong karena restart hanya menjalankan ulang `dist` yang sama. Status ini sudah tidak berlaku untuk retest terbaru.
  - Bukti token (hanya klaim, bukan isi token): cookie `stale.txt` membawa `ver=2`, cookie `fresh.txt` membawa `ver=6`, `adminId` sama. Dengan dist lama, logout memakai token `ver=2` tetap menaikkan `tokenVersion` 6 → 7 sehingga token fresh (`ver=6`) langsung `401`. Dengan source saat ini, `ver=2 !== 7` sehingga logout tersebut harus menjadi no-op.
  - Tindakan operasional yang diminta: `npm run build` di `backend/` lalu restart proses `node dist/main`. Retest terbaru pada port 3001 sudah menunjukkan perilaku yang diharapkan (stale logout tidak mengeluarkan sesi aktif). Build/restart **tidak dijalankan** dalam sesi pembaruan dokumen ini.
  - Catatan: token dari retest lama sudah tidak valid setelah `tokenVersion` naik. Retest terbaru memakai login baru (`ver=9`).
  - Batasan desain yang tersisa: `tokenVersion` bersifat global per admin. Dua token hidup yang diterbitkan pada versi yang sama tidak bisa dibedakan; logout dengan salah satunya memang mencabut keduanya. Ini bukan penyebab kegagalan retest lama (`ver` 2 vs 6), tetapi relevan bila nanti dibutuhkan revokasi per-sesi/per-perangkat (perlu `sid` per sesi + tabel/kolom sesi).

- [x] **Task 3.2: Lengkapi `.gitignore` (bukan "hilang")** (IMPLEMENTED — MANUALLY VERIFIED)
  - File: `.gitignore` di root (sudah ada).
  - Aksi (sesuai implementasi aktual): `.env`, `.env.*`, `backend/uploads/`, `/uploads/`, `dist/`, `node_modules/` sudah ter-ignore dan tidak diduplikasi. Pola yang ditambahkan:
    - `/backend/.dyn/`
    - `/backend/strix_runs/`
    - `/backend/uploads-strix/`
    - `/backend/*_strix.py` — mencakup `poc_*_strix.py`, `verify_*_strix.py`, dan `si_probe_strix.py`.
  - Verifikasi: `git check-ignore -v` mencocokkan semua artefak ke pola di atas; `git status` tidak lagi menampilkannya. PASS.

---

## CATATAN AUDIT H-1 CSRF (di luar tabel task)

Sumber: `temporary/backend-audit.md` (H-1). Status: **VERIFIED (scope terbatas)** — hanya pemeriksaan yang didukung hasil verifikasi manual 19 Oktober 2026. H-1 belum verified penuh dan belum ditutup.

| Pemeriksaan | Hasil | Status |
| --- | --- | --- |
| Cookie `raccoon_auth_token` setelah login | `HttpOnly=true`, `SameSite=Strict` | PASS — manual |
| Cookie `raccoon_csrf` setelah login | `HttpOnly=false`, `SameSite=Strict` | PASS — manual |
| Properti `csrfToken` pada respons login | ada | Tercatat; baris checklist login lengkap tetap PENDING |
| `PATCH /api/products/:id` dengan sesi valid + token CSRF salah | HTTP 403, `Invalid or missing CSRF token` | PASS — manual |

Tetap PENDING (belum ada bukti tes pada pembaruan ini): typecheck backend, build backend, typecheck frontend, `POST /api/products` tanpa header CSRF, `PATCH /api/products/:id` dengan token benar, `GET /api/products` tanpa header, login lengkap, logout, upload foto publik, dan alur admin UI.

Catatan: pembaruan ini hanya dokumentasi. Tidak ada build, typecheck, test, atau perubahan kode yang dijalankan. Status H-2 dan temuan lain tidak diubah.

---

## CATATAN OPEN ITEMS (Butuh keputusan User)

- [x] Cek frontend `dangerouslySetInnerHTML` — **sudah dicek**: tidak ada di source (`frontend/app`, `frontend/components`). `frontend/admin.html` adalah build artifact, bukan source. Rendering pakai `{photo.caption}` / `{photo.visitorName}` → React escape. Severity final: **Low**, bukan High.
- [ ] `backend/uploads-strix/`, `backend/strix_runs/`, `backend/*_strix.py` — hapus atau simpan sebagai bukti audit? Rencana ini hanya meng-ignore, tidak menghapus.
- [x] Apakah route admin produk baru memakai `GET /api/products/admin` (rekomendasi, konsisten dengan `branches/all`) atau mempertahankan `?public=true` dengan guard kondisional? **Diputuskan dan diimplementasikan:** route terpisah `GET /api/products/admin` dengan `JwtAuthGuard`.
- [ ] `SECURITY.md` sebaiknya dipindah ke root atau tetap di `backend/`? Rencana ini mengasumsikan tetap di `backend/`. Isi `backend/SECURITY.md` belum diperbarui dan masih menggambarkan kondisi sebelum perbaikan.

---

## URUTAN EKSEKUSI TERSISA

1. Sisa verifikasi manual Task 3.1: ambil nilai `Admin.tokenVersion` sebelum stale logout (bandingkan sebelum/sesudah), lalu baca nilai setelah logout aktif untuk membuktikan kenaikan +1. Perilaku stale logout (no-op) dan logout aktif (sesi berikutnya `401`) sudah MANUALLY VERIFIED pada 19 Oktober 2026.
2. Update `backend/SECURITY.md` setelah semua verifikasi selesai.

Verifikasi akhir tiap fase: `cd backend && npm run typecheck`, `npm run build`, `npm run test:e2e`.
