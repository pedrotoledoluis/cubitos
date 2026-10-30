// Usage: node uploader/set-status.mjs <videoId> now|<ISO publishAt>
import fs from 'node:fs'; import { google } from 'googleapis';
const R = new URL('../secrets/', import.meta.url);
const { installed } = JSON.parse(fs.readFileSync(new URL('client_secret.json', R), 'utf8'));
const auth = new google.auth.OAuth2(installed.client_id, installed.client_secret);
auth.setCredentials(JSON.parse(fs.readFileSync(new URL('token.json', R), 'utf8')));
const yt = google.youtube({ version: 'v3', auth });
const [id, when] = process.argv.slice(2);
const status = when === 'now'
  ? { privacyStatus: 'public', selfDeclaredMadeForKids: false, embeddable: true, publicStatsViewable: true }
  : { privacyStatus: 'private', publishAt: new Date(when).toISOString(), selfDeclaredMadeForKids: false, embeddable: true, publicStatsViewable: true };
await yt.videos.update({ part: ['status'], requestBody: { id, status } });
const { data } = await yt.videos.list({ part: ['status'], id: [id] });
console.log(id, JSON.stringify(data.items[0].status));
