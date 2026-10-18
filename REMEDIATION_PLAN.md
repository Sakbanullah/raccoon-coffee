# Rencana Perbaikan Keamanan (Strix Findings)

Sumber: `backend/SECURITY.md` (bukan `D:\racoon\SECURITY.md` — file ada di folder `backend/`).

Status terakhir diperbarui: **19 Oktober 2026**.

Legenda status:

- **IMPLEMENTED — MANUALLY VERIFIED**: kode ada dan perilakunya sudah diperiksa manual.
- **NOT IMPLEMENTED**: belum ada perubahan kode.

| Task | Status |
| --- | --- |
| 1.1 Multer + limits | IMPLEMENTED — MANUALLY VERIFIED |
| 2.1 Reaper file orphan | NOT IMPLEMENTED |
| 2.2 Sanitasi metadata foto | IMPLEMENTED — MANUALLY VERIFIED |
| 2.3 Filter publikasi | IMPLEMENTED — MANUALLY VERIFIED |
| 2.4 Login timing | IMPLEMENTED — MANUALLY VERIFIED |
| 3.1 Revokasi logout | NOT IMPLEMENTED |
| 3.2 `.gitignore` artefak Strix | IMPLEMENTED — MANUALLY VERIFIED (git check-ignore) |

Lima task sudah diimplementasikan dan diverifikasi manual: 1.1, 2.2, 2.3, 2.4, dan 3.2. Task 2.1 dan 3.1 belum dikerjakan.

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

- [ ] **Task 2.1: Reaper File Orphan (Disk Exhaustion)** (NOT IMPLEMENTED)
  - Status: `backend/src/uploads/staging-reaper.service.ts` belum ada; `UploadsModule` belum mendaftarkan provider reaper.
  - File: buat `backend/src/uploads/staging-reaper.service.ts`; daftarkan di `backend/src/uploads/uploads.module.ts` (`providers`).
  - Aksi:
    - **Tanpa** `@nestjs/schedule`. Pakai `OnModuleInit` + `setInterval(tick, 60 * 60 * 1000)` dan `OnModuleDestroy` untuk `clearInterval`; panggil `.unref()` pada timer supaya tidak menahan proses saat shutdown/test.
    - `tick()`: `readdir(UPLOAD_DIR)`, filter `/\.upload$/`, `stat`, `unlink` jika `Date.now() - mtimeMs > 60 * 60 * 1000`. Best-effort: `ENOENT` diabaikan, error lain di-`logger.warn`.
    - Ekstrak `sweepStaleStagingFiles(now?: number)` supaya bisa dipanggil langsung dari test tanpa menunggu interval.
    - Log jumlah file yang dihapus per sweep (satu baris).
  - Test yang direncanakan (belum dijalankan): buat file `wall-1-1.upload` dengan `mtime` 2 jam lalu + satu file `.jpg` valid → jalankan `sweepStaleStagingFiles()` → `.upload` hilang, `.jpg` utuh.
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

- [ ] **Task 3.1: Perbaiki Revokasi Token di Logout** (NOT IMPLEMENTED)
  - Status: `AuthService.revokeByToken` masih hanya memverifikasi signature dan `adminId`; klaim `ver` belum dibandingkan dengan `Admin.tokenVersion`.
  - File: `backend/src/auth/auth.service.ts` (`revokeByToken`, baris 66–76).
  - Aksi:
    - Setelah `verifyAsync`, baca `Admin` by `adminId` (`select: { tokenVersion: true }`).
    - Jika admin tidak ada, atau `payload.ver !== admin.tokenVersion`, **return** tanpa menaikkan `tokenVersion`.
    - Jika cocok, panggil `revokeSessions(adminId)` seperti sekarang.
    - Tipe payload: `{ adminId?: string; ver?: number }`; `ver` wajib integer, samakan dengan aturan `JwtAuthGuard`.
  - Test yang direncanakan (belum dijalankan): token dengan `ver` lama → `POST /api/auth/logout` tidak menaikkan `tokenVersion` (tetap 5). Token dengan `ver` aktif → naik ke 6.

- [x] **Task 3.2: Lengkapi `.gitignore` (bukan "hilang")** (IMPLEMENTED — MANUALLY VERIFIED)
  - File: `.gitignore` di root (sudah ada).
  - Aksi (sesuai implementasi aktual): `.env`, `.env.*`, `backend/uploads/`, `/uploads/`, `dist/`, `node_modules/` sudah ter-ignore dan tidak diduplikasi. Pola yang ditambahkan:
    - `/backend/.dyn/`
    - `/backend/strix_runs/`
    - `/backend/uploads-strix/`
    - `/backend/*_strix.py` — mencakup `poc_*_strix.py`, `verify_*_strix.py`, dan `si_probe_strix.py`.
  - Verifikasi: `git check-ignore -v` mencocokkan semua artefak ke pola di atas; `git status` tidak lagi menampilkannya. PASS.

---

## CATATAN OPEN ITEMS (Butuh keputusan User)

- [x] Cek frontend `dangerouslySetInnerHTML` — **sudah dicek**: tidak ada di source (`frontend/app`, `frontend/components`). `frontend/admin.html` adalah build artifact, bukan source. Rendering pakai `{photo.caption}` / `{photo.visitorName}` → React escape. Severity final: **Low**, bukan High.
- [ ] `backend/uploads-strix/`, `backend/strix_runs/`, `backend/*_strix.py` — hapus atau simpan sebagai bukti audit? Rencana ini hanya meng-ignore, tidak menghapus.
- [x] Apakah route admin produk baru memakai `GET /api/products/admin` (rekomendasi, konsisten dengan `branches/all`) atau mempertahankan `?public=true` dengan guard kondisional? **Diputuskan dan diimplementasikan:** route terpisah `GET /api/products/admin` dengan `JwtAuthGuard`.
- [ ] `SECURITY.md` sebaiknya dipindah ke root atau tetap di `backend/`? Rencana ini mengasumsikan tetap di `backend/`. Isi `backend/SECURITY.md` belum diperbarui dan masih menggambarkan kondisi sebelum perbaikan.

---

## URUTAN EKSEKUSI TERSISA

1. Task 2.1 (reaper) — menutup disk exhaustion.
2. Task 3.1 (revokasi logout).
3. Update `backend/SECURITY.md` setelah semua verifikasi selesai.

Verifikasi akhir tiap fase: `cd backend && npm run typecheck`, `npm run build`, `npm run test:e2e`.
