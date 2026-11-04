/**
 * Muat naik PDF SDS ke Google Drive untuk aplikasi Sistem SDS Estate.
 *
 * Cara pasang (sekali sahaja):
 * 1. Di Google Drive, buat folder (cth: "SDS Estate"). Buka folder itu dan salin
 *    ID daripada URL: https://drive.google.com/drive/folders/<ID_FOLDER>
 * 2. Pergi ke https://script.google.com -> New project. Padam kod asal dan tampal
 *    keseluruhan fail ini. Tampal ID folder pada FOLDER_ID di bawah.
 * 3. Deploy -> New deployment -> jenis "Web app":
 *      Execute as:      Me
 *      Who has access:  Anyone
 *    Klik Deploy, benarkan akses (Authorize), dan salin URL Web app.
 * 4. Tampal URL itu pada DRIVE_UPLOAD_URL dalam index.html.
 *
 * Keselamatan: skrip hanya menerima fail jika token log masuk Firebase milik
 * akaun admin (iaitu orang yang memasukkan PIN yang betul dalam aplikasi).
 */

const FOLDER_ID = '1twXpnXstQnIngitdKVDp0YpNYvqNSGTp'; // Folder "SDS Estate" dalam Google Drive

// Sama seperti dalam index.html (kunci API web Firebase ini bukan rahsia)
const FIREBASE_API_KEY = 'AIzaSyBJkWUTX5n9aCy0s23Gk9LpBLSkKI86-H0';
const ADMIN_EMAIL = 'admin@sds-estate.local';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (!isAdmin_(body.idToken)) {
      return json_({ ok: false, error: 'Tidak dibenarkan. Sila sahkan PIN admin semula.' });
    }
    if (!body.data || !body.name) {
      return json_({ ok: false, error: 'Tiada fail diterima.' });
    }

    const name = String(body.name).replace(/[^a-zA-Z0-9._ -]+/g, '_');
    const blob = Utilities.newBlob(Utilities.base64Decode(body.data), 'application/pdf', name);
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return json_({ ok: true, id: file.getId(), url: 'https://drive.google.com/open?id=' + file.getId() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Sahkan token log masuk Firebase melalui Identity Toolkit
function isAdmin_(idToken) {
  if (!idToken) return false;
  const res = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    }
  );
  if (res.getResponseCode() !== 200) return false;
  const users = JSON.parse(res.getContentText()).users || [];
  return users.length > 0 && users[0].email === ADMIN_EMAIL;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
