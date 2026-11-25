/**
 * Photobooth SK Likas 2026 — terima gambar JPEG dan simpan ke Google Drive.
 *
 * Deploy sebagai Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 */

// ID folder Google Drive (bahagian selepas /folders/ dalam link folder)
const FOLDER_ID = '1NuQ5KEvUMUCXn42x_d9I_iO5IcoRbjvL';

// MESTI sama dengan UPLOAD_KEY dalam config.js
const UPLOAD_KEY = 'skl26-7f3a9c2e5b81d4';

const MAX_BYTES = 12 * 1024 * 1024;          // had saiz satu gambar: 12 MB
const NAME_RE = /^SKLikas2026_(ungu|biru)_(potret|landskap)_\d{8}_\d{6}\.jpg$/;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const MAX_PER_MINUTE = 120;                  // had kasar untuk elak spam

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return reply_(false, 'no-data');
    if (e.postData.contents.length > MAX_BYTES * 1.4) return reply_(false, 'too-large');

    const body = JSON.parse(e.postData.contents);
    if (body.key !== UPLOAD_KEY) return reply_(false, 'bad-key');
    if (body.mimeType !== 'image/jpeg') return reply_(false, 'jpeg-only');
    if (!NAME_RE.test(String(body.name || ''))) return reply_(false, 'bad-name');
    if (!ID_RE.test(String(body.id || ''))) return reply_(false, 'bad-id');

    // Had kadar ringkas
    const cache = CacheService.getScriptCache();
    const bucket = 'rate_' + Math.floor(Date.now() / 60000);
    const count = Number(cache.get(bucket) || 0);
    if (count >= MAX_PER_MINUTE) return reply_(false, 'rate-limit');
    cache.put(bucket, String(count + 1), 120);

    const bytes = Utilities.base64Decode(String(body.data || ''));
    if (bytes.length < 1000 || bytes.length > MAX_BYTES) return reply_(false, 'bad-size');
    // Semak "magic bytes" JPEG: FF D8 FF
    if ((bytes[0] & 0xff) !== 0xff || (bytes[1] & 0xff) !== 0xd8 || (bytes[2] & 0xff) !== 0xff) {
      return reply_(false, 'not-jpeg');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      // Elak gambar berganda bila telefon cuba upload semula
      const same = folder.getFilesByName(body.name);
      let n = 0;
      while (same.hasNext()) {
        const f = same.next();
        n++;
        if (f.getDescription() === body.id) return reply_(true, 'duplicate');
      }
      // Nama sama tapi gambar lain (2 telefon, saat yang sama) -> tambah _2, _3 ...
      const finalName = n === 0 ? body.name : body.name.replace(/\.jpg$/, '_' + (n + 1) + '.jpg');
      const file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', finalName));
      file.setDescription(body.id);
      return reply_(true, 'saved');
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return reply_(false, 'server-error');
  }
}

// Buka link /exec dalam pelayar untuk semak script hidup
function doGet() {
  return ContentService.createTextOutput('Photobooth SK Likas: OK');
}

// Jalankan fungsi ini SEKALI dari editor untuk beri kebenaran Drive
function testSetup() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('Folder dijumpai: ' + folder.getName());
}

function reply_(ok, msg) {
  return ContentService
    .createTextOutput(JSON.stringify(ok ? { ok: true, status: msg } : { ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
