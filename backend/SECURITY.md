# Security Audit Report — Raccoon Coffee

*Terakhir di-scan: 17 Oktober 2026 menggunakan Strix AI.*

## Ringkasan Eksekutif

Strix melakukan *white-box* dan *dynamic assessment* pada backend NestJS. Hasilnya: **6 High, 5 Medium, 2 Low, 18 Informational**.

Arsitektur otentikasi, CSRF, dan validasi upload secara umum sudah kuat. Namun, ada celah kritis pada endpoint upload anonim, kebocoran data draft, dan dependency yang usang.

Risiko yang paling mendesak bersifat **availability**: endpoint publik `/api/photos/upload` berjalan di atas `multer` 2.0.2 yang memiliki enam advisory *denial of service* severity High — satu request multipart yang dirancang khusus dapat menghentikan proses Node.js. Selain itu, upload yang dibatalkan meninggalkan file permanen di disk (tereproduksi: 26 MB dalam 7 detik, setara ±36 GB/hari), dan endpoint tersebut tidak memiliki batas jumlah field, panjang nama field, maupun kedalaman nesting.

## ✅ Mitigasi Berhasil (Ruled Out)

Strix memvalidasi bahwa aplikasi kita kebal terhadap:

- SQL Injection & Prisma Operator Injection
- Mass Assignment
- Path Traversal / Arbitrary File Deletion
- Upload Polyglot Bypass
- JWT Forgery
- CSRF
- SSTI / RCE
- Kebocoran Secret `.env` (terbukti tidak di-load oleh aplikasi).

Catatan pendukung singkat:

- **SQLi / Prisma injection** — satu-satunya raw query adalah `SELECT 1` konstan di health check; seluruh akses data melalui Prisma Client bertipe. 14 bentuk injeksi operator (`name[contains]`, `status[$ne]`, `page[gt]`, dll.) di semua endpoint publik mengembalikan 400 dari `class-validator`.
- **Mass assignment** — semua route tulis memakai DTO berdekorasi dan global `ValidationPipe` menolak field tak dikenal (terbukti 400).
- **Path traversal / arbitrary delete** — allowlist nama file berjangkar (`/^<prefix>-\d+-\d+\.(jpg|png|gif)$/i`) tidak menerima `/`, `..`, `\`, NUL, atau newline; 11 payload traversal mengembalikan 400/404.
- **Upload polyglot** — HTML menyamar sebagai PNG/JPEG, SVG, dan polyglot GIF/HTML semuanya ditolak tanpa menyisakan file.
- **JWT forgery** — `alg:none`, signature dengan secret salah, manipulasi klaim `ver`, token kedaluwarsa, dan `nbf` di masa depan semuanya 401.
- **CSRF** — cabang `/auth/` pada guard adalah *dead code* (prefix global sudah menempel di route), dan kedua cookie memakai `SameSite=Strict` sehingga request lintas-origin tidak membawa cookie.
- **`.env`** — nilai `JWT_SECRET` di working tree memang bernilai tinggi entropi, tetapi tidak pernah dimuat: path `dotenv` mengarah ke `src/.env` atau `dist/.env`, bukan `backend/.env`, dan pemuatan dilewati saat `NODE_ENV=production`.

## 🚨 Temuan Kritis & Rencana Perbaikan (Backlog)

### 1. [HIGH] DoS via Upload Foto (Multer 2.0.2)

- **Deskripsi:** Endpoint publik `/api/photos/upload` menggunakan `multer` usang. Penyerang bisa mematikan server dengan 1 request.
- **Aksi:** Upgrade `multer` ke `2.3.0` dan set limit (fields, parts) di interceptor.
- **Detail:** Enam advisory High (CVE-2026-77078, -82333, -5079, -3520, -3304, -2359) dan satu Medium (CVE-2026-5038) berlaku pada versi terpasang, dijangkau melalui `@nestjs/platform-express@10.4.22`. Throttle 5 request/60 detik membatasi laju, tetapi tidak relevan terhadap satu request yang mematikan proses. Untuk CVE-2026-5079, mitigasi mensyaratkan `limits.fieldNestingDepth` di-set secara eksplisit — upgrade versi saja tidak cukup.

### 2. [MEDIUM] Disk Penuh karena File Sampah (Orphaned Files)

- **Deskripsi:** Upload yang dibatalkan meninggalkan file `*.upload` di disk (bisa mencapai 36 GB/hari).
- **Aksi:** Buat *cron job* (reaper) untuk menghapus file `*.upload` yang berumur > 60 menit.
- **Detail:** Kedua jalur pembersihan (`ContentValidationInterceptor` catch block dan `catchError`) hanya berjalan setelah multer mengisi `request.file`, yang tidak pernah terjadi saat koneksi diputus di tengah body. Nama staging tidak memiliki ekstensi kanonik dan tidak punya baris database, sehingga `ImageCleanupService` tidak dapat menjangkaunya. Reaper berbasis umur aman karena file staging hanya hidup selama satu request. Restart proses di tengah upload juga meninggalkan file, sehingga upgrade dependency saja tidak menutup celah ini.

### 3. [MEDIUM] Stored XSS via Metadata Foto

- **Deskripsi:** Input `visitorName` dan `caption` tidak disanitasi.
- **Aksi:** Tambahkan validasi regex (hanya huruf/angka) di DTO.
- **Catatan:** Perlu cek frontend, jika React menggunakan `{caption}` (bukan `dangerouslySetInnerHTML`), risiko turun.
- **Detail:** Field tersebut hanya divalidasi tipe dan panjang, disimpan verbatim, lalu dikembalikan tanpa perubahan oleh `GET /api/photos/pending`, `/approved`, dan wall publik `GET /api/photos`. Payload seperti `<img src=x onerror=...>` terbukti tersimpan dan terbaca kembali. Jika frontend merender sebagai HTML, eskalasinya serius: cookie `raccoon_csrf` sengaja tidak `HttpOnly` (kebutuhan skema double-submit), sehingga skrip di origin admin dapat membacanya dan memakainya bersama cookie sesi untuk mengendalikan seluruh CMS.

### 4. [MEDIUM] Kebocoran Data Draft (Unpublished Content)

- **Deskripsi:** Endpoint detail (`findOne`) untuk Product, Story, Event, dan Branch tidak memfilter status publikasi.
- **Aksi:** Tambahkan `WHERE status = PUBLISHED` (atau `ACTIVE`/`isVisible`) di service `findOne`.
- **Detail:**
  - `GET /api/products` hanya menerapkan filter `ACTIVE` + `isVisible` bila pemanggil mengirim `?public=true`. Tanpa parameter itu, request anonim menerima seluruh 103 baris, termasuk produk nonaktif dan tersembunyi beserta harganya. `GET /api/products/{id}` tidak memiliki predikat publikasi sama sekali.
  - `GET /api/stories/{id}`, `/events/{id}`, dan `/branches/{id}` tidak memiliki guard maupun predikat status, sementara endpoint list-nya sudah mengunci `PUBLISHED` / `isActive`.

### 5. [MEDIUM] Login Timing Attack

- **Deskripsi:** Waktu respons login berbeda antara email yang ada dan tidak ada (64x).
- **Aksi:** Lakukan *dummy hash comparison* saat email tidak ditemukan.
- **Detail:** `if (!admin) throw` berjalan sebelum `bcrypt.compare`, sehingga email admin yang valid memakan ±110 ms sedangkan email tak dikenal ±1,7 ms dengan body respons identik. Selisih ini memungkinkan enumerasi alamat admin secara andal, yang merupakan prasyarat *credential stuffing* tertarget. Perbaikan (satu perbandingan dengan hash dummy pada kedua jalur) terverifikasi menurunkan selisih ke ±0,4 ms.

### 6. [LOW] Revokasi Sesi Token Usang

- **Deskripsi:** Logout tidak mengecek versi token.
- **Aksi:** Tambahkan pengecekan `tokenVersion` di endpoint logout.
- **Detail:** `POST /api/auth/logout` hanya memverifikasi signature dan `adminId`, tanpa membandingkan klaim `ver` dengan `Admin.tokenVersion` — berbeda dengan guard autentikasi. Token yang sudah dicabut tetap dapat menaikkan `tokenVersion`, sehingga penyerang dengan satu token yang pernah ditangkap dapat terus mengeluarkan admin dari semua sesi selama masa berlaku token (24 jam). Terbukti langsung: token usang mengembalikan 401 pada `/api/auth/me` tetapi 201 pada logout, dengan `tokenVersion` naik dari 5 ke 6.

### 7. [INFO] Dependency Usang Lainnya (Tidak Terjangkau)

- **Deskripsi:** 20 advisory tambahan ditemukan pada dependency produksi dan toolchain, tanpa jalur eksekusi yang terbukti.
- **Aksi:** Jadwalkan upgrade rutin; prioritaskan setelah item 1.
- **Detail:** `@nestjs/core` (injeksi output SSE — tidak ada route SSE), `body-parser` (bypass size limit — tidak ada konfigurasi limit kustom), `file-type` (loop parser — validator bawaan tidak dipakai), `qs` (tiga cacat di sisi `stringify` — aplikasi hanya memakai `parse`), serta delapan paket build toolchain yang tidak ada di runtime `node dist/main`.

## 🛡️ Rekomendasi Jangka Panjang

- Sentralisasi *visibility filter* (jangan per-route).
- Hapus *caller-controlled flag* (`?public=true`), jadikan default aman.
- Tambahkan `.gitignore` untuk `.env`, folder upload, dan build artifacts.
- Terapkan rate limit pada route upload admin (`POST /api/products/upload-image`, `POST /api/site-images`) yang saat ini tanpa throttle.
- Beri DTO konkret pada `GET /api/site-images` (saat ini memakai intersection type sehingga `ValidationPipe` dilewati dan input malformed menghasilkan 500 tanpa autentikasi).
- Tambahkan throttle login per-akun, bukan hanya per-IP.
- Perbaiki path `dotenv` di `src/auth/constants.ts` dan deklarasikan `dotenv` sebagai dependency eksplisit agar `npm ci --omit=dev` tidak gagal saat start.
- Perluas test suite: saat ini belum ada cakupan CSRF, dan test revokasi hanya menguji sisi guard — itulah sebabnya celah token usang lolos dari hardening sebelumnya.

## 📋 Cakupan & Batasan Pengujian

**Cakupan:** 60 file TypeScript (~3.700 baris), skema Prisma dan migrasi, seluruh 9 controller (`auth`, `admin`, `branches`, `events`, `products`, `product-categories`, `site-images`, `stories`, `photos`), serta dependency graph produksi pada `package-lock.json`.

**Metode:** pemetaan route dan trust boundary, SAST (Semgrep 461 rules, AST call-site inventory, dua pemindai secret), analisis dependency dengan penelusuran *reachability* per-advisory, dan pengujian dinamis terhadap instance lokal dengan database MySQL nyata.

**Batasan:**

- Frontend (React/Next.js) tidak termasuk dalam repositori yang di-review. Temuan stored XSS bergantung pada cara frontend merender metadata foto dan **wajib diverifikasi** sebelum severity final ditetapkan: jika `dangerouslySetInnerHTML` dipakai, naik ke High; jika teks di-escape, turun ke Low.
- Verifikasi advisory eksternal tidak tersedia; CVE, versi perbaikan, dan skor dasar dibaca dari database vulnerability lokal.
- End-to-end suite repositori tidak dapat dijalankan; perbaikan diverifikasi melalui pembuktian langsung dan `tsc --noEmit`.
- Topologi deployment (jumlah hop reverse proxy, terminasi TLS, flag `Secure` pada cookie) disimpulkan dari template deployment, bukan diamati pada host produksi.

**Item terbuka:** (1) konfirmasi sink rendering frontend untuk metadata foto; (2) status version control working tree — direktori ini tidak memiliki `.git`, sehingga belum dapat dipastikan apakah `.env` dan 12 gambar upload nyata di `uploads/` pernah ter-commit.