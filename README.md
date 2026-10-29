# xyr-ytdl

Website pencarian lagu YouTube, pemutar audio, dan pengunduh audio WebM berbasis Node.js ESM, `@distube/ytdl-core`, dan Vercel Functions.

## Fitur

- UI dark navy + tosca, mobile-first.
- Hasil pencarian dalam dua kolom pada desktop dan mobile.
- Pencarian judul/artis atau URL video YouTube.
- Preview audio dengan mini-player, progress, dan volume.
- Unduh audio WebM langsung dari server function.
- Tidak memerlukan API key atau file `.env`.

## Kebutuhan

Paket `@distube/ytdl-core` versi 5 membutuhkan Node.js versi yang didukung paket. Gunakan Node.js 24.15.0+ atau versi runtime yang memenuhi persyaratan di dokumentasi paket.

## Jalankan lokal

```bash
npm install
npx vercel dev
```

Buka alamat lokal yang ditampilkan oleh Vercel CLI.

## Deploy ke Vercel

1. Upload project ke repository Git.
2. Import repository di dashboard Vercel.
3. Pilih framework preset `Other`.
4. Pastikan runtime Node.js memenuhi persyaratan dependency.
5. Deploy.

## Endpoint

- `GET /api/search?q=naff%20terendap%20laraku`
- `GET /api/search?q=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DVIDEO_ID`
- `GET /api/stream?id=VIDEO_ID&mode=play`
- `GET /api/stream?id=VIDEO_ID&mode=download`

## Catatan format

Audio disajikan dalam format WebM dari stream audio YouTube. Project ini tidak mengubah audio menjadi MP3 karena konversi MP3 membutuhkan encoder seperti FFmpeg yang tidak disertakan dalam implementasi ini. Jangan mengganti ekstensi file ke `.mp3` tanpa konversi yang benar.

## Catatan operasional

YouTube dapat mengubah sistem streaming atau membatasi permintaan, sehingga pencarian atau pemutaran sesekali bisa gagal. Hindari menjalankan download massal, tambahkan rate limiting sebelum membuka layanan publik berskala besar, dan pastikan penggunaan konten mematuhi hak cipta serta ketentuan layanan yang berlaku.
