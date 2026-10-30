// Uploads one episode folder (videos/NNN-slug) to YouTube with its thumbnail.
// Usage:
//   node uploader/upload.mjs videos/003-baile-1518                 -> private upload
//   node uploader/upload.mjs videos/003-baile-1518 --publish-at 2026-11-03T18:00:00-05:00
//   node uploader/upload.mjs --auth                                -> only (re)authorize
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = path.join(ROOT, 'secrets', 'client_secret.json');
const TOKEN = path.join(ROOT, 'secrets', 'token.json');
const LOG = path.join(ROOT, 'uploader', 'uploaded.json');
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube'];

function parseArgs(argv) {
  const args = { dir: null, publishAt: null, authOnly: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--publish-at') args.publishAt = argv[++i];
    else if (argv[i] === '--auth') args.authOnly = true;
    else if (argv[i] === '--force') args.force = true;
    else args.dir = argv[i];
  }
  return args;
}

// Loopback OAuth flow for a Desktop client: opens the browser, waits for the redirect.
async function authorize() {
  const { installed } = JSON.parse(fs.readFileSync(SECRET, 'utf8'));
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const client = new google.auth.OAuth2(installed.client_id, installed.client_secret, redirectUri);
  client.on('tokens', (t) => {
    const prev = fs.existsSync(TOKEN) ? JSON.parse(fs.readFileSync(TOKEN, 'utf8')) : {};
    fs.writeFileSync(TOKEN, JSON.stringify({ ...prev, ...t }, null, 2));
  });

  if (fs.existsSync(TOKEN)) {
    server.close();
    client.setCredentials(JSON.parse(fs.readFileSync(TOKEN, 'utf8')));
    return client;
  }

  const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
  console.log('Opening browser to authorize. If it does not open, visit:\n' + url);
  exec(`start "" "${url}"`);

  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { server.close(); reject(new Error('Authorization timed out (5 min)')); }, 5 * 60 * 1000);
    server.on('request', (req, res) => {
      const params = new URL(req.url, redirectUri).searchParams;
      res.end(params.get('code') ? 'Autorizado. Ya podés cerrar esta pestaña.' : 'Error: ' + params.get('error'));
      clearTimeout(timer);
      server.close();
      params.get('code') ? resolve(params.get('code')) : reject(new Error(params.get('error')));
    });
  });
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  fs.writeFileSync(TOKEN, JSON.stringify(tokens, null, 2));
  return client;
}

function loadMetadata(dir) {
  const id = path.basename(dir);
  const metaPath = path.join(dir, 'metadata.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    return { id, ...meta, files: { video: `${id}.mp4`, thumbnail: `${id}-thumbnail.png`, ...meta.files } };
  }
  // Fallback for folders without metadata.json: title is the first line of the description.
  const description = fs.readFileSync(path.join(dir, `${id}-description.txt`), 'utf8');
  return {
    id,
    title: description.split('\n')[0].trim(),
    description,
    tags: ['historia', 'curiosidades', 'humor', 'historia en cubitos', 'Shorts'],
    categoryId: '27',
    defaultLanguage: 'es',
    defaultAudioLanguage: 'es',
    files: { video: `${id}.mp4`, thumbnail: `${id}-thumbnail.png` },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const auth = await authorize();
  if (args.authOnly) { console.log('Authorized. Token saved in secrets/token.json'); return; }
  if (!args.dir) throw new Error('Missing episode folder, e.g. videos/003-baile-1518');

  const dir = path.resolve(ROOT, args.dir);
  const meta = loadMetadata(dir);
  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : {};
  if (log[meta.id] && !args.force) {
    console.log(`Already uploaded: https://youtu.be/${log[meta.id].videoId} (use --force to upload again)`);
    return;
  }

  const youtube = google.youtube({ version: 'v3', auth });
  const status = { privacyStatus: 'private', selfDeclaredMadeForKids: false, containsSyntheticMedia: false };
  if (args.publishAt) status.publishAt = new Date(args.publishAt).toISOString();

  console.log(`Uploading ${meta.id}...`);
  const videoPath = path.join(dir, meta.files.video);
  const size = fs.statSync(videoPath).size;
  const res = await youtube.videos.insert(
    {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: meta.title.slice(0, 100),
          description: meta.description,
          tags: meta.tags,
          categoryId: meta.categoryId,
          defaultLanguage: meta.defaultLanguage,
          defaultAudioLanguage: meta.defaultAudioLanguage,
        },
        status,
      },
      media: { body: fs.createReadStream(videoPath) },
    },
    { onUploadProgress: (e) => process.stdout.write(`\r${Math.round((e.bytesRead / size) * 100)}%`) },
  );
  const videoId = res.data.id;
  console.log(`\nUploaded: https://youtu.be/${videoId}`);

  const thumbPath = path.join(dir, meta.files.thumbnail);
  try {
    await youtube.thumbnails.set({ videoId, media: { mimeType: 'image/png', body: fs.createReadStream(thumbPath) } });
    console.log('Thumbnail set.');
  } catch (err) {
    console.warn('Thumbnail failed (is the channel phone-verified at youtube.com/verify?):', err.message);
  }

  log[meta.id] = { videoId, uploadedAt: new Date().toISOString(), publishAt: status.publishAt ?? null };
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
}

main().catch((err) => { console.error(err.message); process.exit(1); });
