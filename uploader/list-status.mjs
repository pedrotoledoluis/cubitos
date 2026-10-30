// Usage: node uploader/list-status.mjs <videoId>...
import fs from 'node:fs'; import { google } from 'googleapis';
const R = new URL('../secrets/', import.meta.url);
const { installed } = JSON.parse(fs.readFileSync(new URL('client_secret.json', R), 'utf8'));
const auth = new google.auth.OAuth2(installed.client_id, installed.client_secret);
auth.setCredentials(JSON.parse(fs.readFileSync(new URL('token.json', R), 'utf8')));
const { data } = await google.youtube({ version: 'v3', auth }).videos.list({ part: ['status'], id: process.argv.slice(2) });
for (const v of data.items) console.log(v.id, JSON.stringify(v.status));
