# Photobooth Majlis Apresiasi Cemerlang Tahun 6 SK Likas 2026

App photobooth yang tetamu buka melalui link. Tiada login. Jalan di iPhone, Android dan Windows,
boleh dipasang macam app, dan masih boleh ambil gambar walaupun tiada internet.
Setiap gambar dihantar automatik ke folder Google Drive anda.

Ada 3 bahagian yang perlu anda buat sendiri. Ikut satu per satu, ambil masa lebih kurang 20 minit.

---

## Isi kandungan folder

| Fail / folder | Guna untuk |
|---|---|
| `index.html`, `styles.css`, `app.js` | App itu sendiri (tak perlu usik) |
| `config.js` | **Satu-satunya fail yang anda ubah** (tampal link Apps Script) |
| `frames/` | 4 bingkai: Ungu & Biru, Potret & Landskap |
| `icons/` | Logo dan ikon app |
| `manifest.json`, `sw.js` | Supaya boleh dipasang dan jalan tanpa internet |
| `apps-script/Code.gs` | Kod untuk Google Drive (disalin ke Apps Script, BUKAN diupload ke GitHub pun tak apa) |

---

## Bahagian 1: Semak folder Google Drive

1. Buka folder Drive tempat gambar akan disimpan.
2. Pastikan folder itu **milik akaun Google anda sendiri** (atau anda ada akses Editor).
3. Tengok link folder. Bahagian selepas `/folders/` ialah ID folder. Contoh:
   `https://drive.google.com/drive/folders/`**`1NuQ5KEvUMUCXn42x_d9I_iO5IcoRbjvL`**
4. ID itu sudah ada dalam `Code.gs`. Kalau anda guna folder lain, tukar ID dalam baris `FOLDER_ID`.

> **Penting:** Folder ini **tak perlu** dibuka "Anyone with the link". Script upload sebagai akaun anda,
> jadi folder boleh kekal peribadi. Gambar ini gambar murid, lebih selamat kalau hanya guru/admin
> yang boleh buka. Kalau nak kongsi dengan ibu bapa, kongsi kemudian secara terpilih.

---

## Bahagian 2: Sediakan Google Apps Script (penerima gambar)

1. Buka **https://script.google.com** dan log masuk dengan akaun Google yang memiliki folder tadi.
2. Tekan **New project** (Projek baharu).
3. Padam semua kod yang ada dalam editor.
4. Buka fail `apps-script/Code.gs`, salin **semua** isinya, dan tampal ke dalam editor.
5. Tekan ikon **Save** (disket). Namakan projek, contoh `Photobooth SK Likas`.
6. Di bahagian atas, pilih fungsi **testSetup**, kemudian tekan **Run**.
   - Google akan minta kebenaran. Tekan **Review permissions** → pilih akaun anda.
   - Kalau keluar "Google hasn't verified this app", tekan **Advanced** → **Go to Photobooth SK Likas (unsafe)** → **Allow**.
     (Ini normal sebab script ini anda buat sendiri.)
   - Kalau berjaya, log di bawah tunjuk `Folder dijumpai: <nama folder>`.
7. Tekan butang biru **Deploy** → **New deployment**.
8. Tekan ikon gear sebelah "Select type" → pilih **Web app**.
9. Isi:
   - **Description:** `Photobooth`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
10. Tekan **Deploy**. Salin **Web app URL** (panjang, berakhir dengan `/exec`).
11. Buka fail `config.js` dan tampal link tadi di antara tanda petik:
    ```js
    UPLOAD_URL: "https://script.google.com/macros/s/AKfycb.../exec",
    ```
12. Simpan `config.js`.

**Semak:** buka link `/exec` dalam pelayar. Kalau keluar `Photobooth SK Likas: OK`, script dah hidup.

> Kalau anda ubah `Code.gs` kemudian, pergi **Deploy → Manage deployments → ikon pensel → Version: New version → Deploy**.
> Cara ini kekalkan link `/exec` yang sama. Jangan buat "New deployment" lagi, nanti link bertukar.

---

## Bahagian 3: Letak app di GitHub Pages (hosting percuma)

1. Log masuk **https://github.com** (daftar akaun kalau belum ada).
2. Tekan **+** (atas kanan) → **New repository**.
   - Nama: contoh `photobooth-sklikas`
   - Pilih **Public**
   - Tekan **Create repository**.
3. Dalam repo baru, tekan link **uploading an existing file**.
4. Buka folder `photobooth` dalam komputer, pilih **semua fail dan folder di dalamnya**
   (`index.html`, `app.js`, `config.js`, `frames`, `icons`, dan lain-lain), kemudian seret ke halaman GitHub.
   Pastikan `index.html` berada di tingkat paling atas, bukan dalam folder lain.
5. Tekan **Commit changes**.
6. Pergi **Settings** → **Pages** (menu kiri).
7. Bawah **Branch**, pilih `main` dan `/ (root)` → **Save**.
8. Tunggu 1-2 minit, refresh. Link app akan muncul, contohnya:
   `https://namaanda.github.io/photobooth-sklikas/`

Itulah link yang anda kongsi kepada tetamu (boleh jadikan QR code).

**Uji:** buka link, ambil satu gambar, kemudian semak folder Drive. Gambar sepatutnya muncul dalam beberapa saat.

---

## Pasang app di telefon / komputer

**iPhone / iPad (mesti guna Safari):**
1. Buka link app dalam **Safari**.
2. Tekan butang **Kongsi** (petak dengan anak panah ke atas) di bawah skrin.
3. Pilih **Add to Home Screen** → **Add**.

**Android (Chrome):**
1. Buka link app dalam Chrome.
2. Tekan butang **Pasang app** di skrin utama app. Kalau tiada, tekan menu **⋮** → **Install app** / **Add to Home screen**.

**Windows (Chrome atau Edge):**
1. Buka link app.
2. Tekan butang **Pasang app**, atau ikon pasang (skrin kecil dengan anak panah) di hujung kanan bar alamat.

Selepas dibuka sekali dengan internet, app boleh dibuka walaupun tiada internet.

---

## Cara app berfungsi (ringkas)

- **Skrin utama:** pilih warna (Ungu/Biru, app ingat pilihan) dan bingkai (Potret/Landskap).
- **Skrin kamera:** kiraan 3 saat, kilat putih, tukar kamera depan/belakang, butang **Galeri** untuk pilih
  gambar sedia ada, dan slider zum. Slider bermula pada "penuhkan tingkap". Tarik ke kiri untuk nampak
  seluruh gambar (tepi kosong diisi salinan kabur). Kamera depan dipaparkan macam cermin, dan gambar
  disimpan sama persis macam yang nampak di skrin.
- **Skrin hasil:** **Muat Turun** (Android/Windows) atau **Simpan ke Foto** (iPhone, buka menu Kongsi → Save Image),
  dan **Ambil Semula**.
- **Upload Drive:** automatik. Status di bawah gambar:
  - *Menyimpan ke Google Drive...*
  - *Tersimpan ke Google Drive.*
  - *Menunggu internet...* → gambar disimpan dalam telefon dan dihantar sendiri bila internet kembali
    (bila app dibuka semula atau sambungan pulih).
- **Nama fail:** `SKLikas2026_<warna>_<potret|landskap>_<tarikh>_<masa>.jpg`
  contoh `SKLikas2026_ungu_potret_20261126_143015.jpg`.

---

## Kalau nak ubah sesuatu selepas upload ke GitHub

1. Edit fail dalam GitHub (buka fail → ikon pensel → **Commit changes**).
2. Kalau anda ubah fail selain `config.js`, buka `sw.js` dan tukar `skl-pb-v1` kepada `skl-pb-v2` (naikkan nombor).
3. Pada telefon, tutup dan buka app **dua kali** untuk dapat versi baru.

---

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| Kamera tak keluar | Benarkan kamera. iPhone: Settings → Safari → Camera → Allow. Android: tekan ikon mangga di bar alamat → Permissions → Camera. |
| Status "Upload ke Drive belum disetup" | `UPLOAD_URL` dalam `config.js` masih kosong atau salah. |
| Status "Upload ditolak oleh server" | `UPLOAD_KEY` dalam `config.js` dan `Code.gs` tak sama, atau `FOLDER_ID` salah. |
| Gambar tak masuk Drive tapi status "Menunggu" | Tiada internet. Gambar selamat dalam telefon, akan dihantar bila online. |
| iPhone: Muat turun masuk app Files | Guna butang **Simpan ke Foto** → **Save Image**. |
| App masih versi lama | Naikkan nombor versi dalam `sw.js`, kemudian buka app dua kali. |

---

## Nota privasi (PDPA)

- App tidak minta nama, telefon atau maklumat lain. Hanya gambar.
- Notis ringkas di skrin utama memberitahu tetamu gambar disimpan dalam Drive sekolah.
- Folder Drive tidak perlu dibuka kepada umum.
- `UPLOAD_KEY` hanya menghalang spam rambang. Ia boleh dilihat dalam kod app, jadi jangan anggap ia kata laluan.
  Script juga hanya terima fail JPEG sah (saiz maksimum 12 MB, format nama tetap) dan ada had kadar.
- Cadangan: tetapkan tempoh simpan (contoh padam atau arkib folder 6 bulan selepas majlis), dan
  pastikan ibu bapa dimaklumkan ada sesi photobooth semasa majlis.
