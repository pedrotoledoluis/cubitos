// Process hygiene: find and stop leftover processes started by this pipeline (Windows).
// Matches only processes whose command line references this project, or headless browsers launched
// by HyperFrames/puppeteer. Never touches the current process or its ancestors, nor the user's normal
// Chrome/Edge, VS Code, Teams or Claude.
// CLI: node scripts/processes.mjs [--kill]   (lists leftovers; --kill stops them)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = ['node.exe', 'chrome.exe', 'chrome-headless-shell.exe', 'msedge.exe', 'powershell.exe', 'python.exe', 'ffmpeg.exe'];

export function listProcesses() {
  const ps = `Get-CimInstance Win32_Process | Where-Object { @('${NAMES.join("','")}') -contains $_.Name } | ` +
    'Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress';
  const out = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 60000, windowsHide: true }).stdout;
  if (!out || !out.trim()) return [];
  const j = JSON.parse(out);
  return Array.isArray(j) ? j : [j];
}

function ancestors(all) {
  const byPid = new Map(all.map((p) => [p.ProcessId, p]));
  const set = new Set([process.pid]);
  let cur = byPid.get(process.pid);
  let ppid = process.ppid;
  while (ppid && !set.has(ppid)) { set.add(ppid); cur = byPid.get(ppid); ppid = cur?.ParentProcessId; }
  return set;
}

export function findLeftovers({ projectRoot }) {
  const all = listProcesses();
  const keep = ancestors(all);
  const root = path.resolve(projectRoot).toLowerCase();
  const rootFwd = root.replace(/\\/g, '/');
  return all.filter((p) => {
    if (keep.has(p.ProcessId)) return false;
    const cl = (p.CommandLine ?? '').toLowerCase();
    if (cl.includes('make-episode.mjs')) return false; // a running pipeline (possibly a parallel one)
    const ours = cl.includes(root) || cl.includes(rootFwd);
    const headlessHf = cl.includes('--headless') && (cl.includes('hyperframes') || cl.includes('puppeteer'));
    const toolHf = /hyperframes(@[\d.]+)?["']?\s+(render|check|snapshot|tts|preview)/.test(cl) || cl.includes('kokoro') || cl.includes('tts.ps1');
    return ours || headlessHf || toolHf;
  });
}

export function cleanupProcesses({ projectRoot, log = console.log } = {}) {
  const left = findLeftovers({ projectRoot });
  for (const p of left) {
    log(`cleanup: stopping ${p.Name} ${p.ProcessId}: ${(p.CommandLine ?? '').slice(0, 120)}`);
    spawnSync('taskkill', ['/PID', String(p.ProcessId), '/T', '/F'], { windowsHide: true });
  }
  return left;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const left = findLeftovers({ projectRoot });
  for (const p of left) console.log(`${p.ProcessId}\t${p.Name}\t${(p.CommandLine ?? '').slice(0, 160)}`);
  console.log(`${left.length} leftover process(es)`);
  if (process.argv.includes('--kill')) cleanupProcesses({ projectRoot });
}
