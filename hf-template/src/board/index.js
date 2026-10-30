// Board entry point: drawBoard(ctx, W, H, board, u, d) is a pure function of its inputs.
// board: null (idle) | "sceneName" | { scene: "sceneName", ...params }. See scenes.js for the library.
import { background } from './chalk.js';
import { SCENES } from './scenes.js';

export { SCENES };

export function normalizeBoard(board) {
  if (!board) return null;
  return typeof board === 'string' ? { scene: board } : board;
}

export function drawBoard(ctx, W, H, board, u = 0, d = 4, style = 'chalk') {
  const b = normalizeBoard(board);
  ctx.save();
  background(ctx, W, H, style);
  const fn = b ? SCENES[b.scene] : null;
  if (b && !fn) throw new Error(`Unknown board scene "${b.scene}". Known: ${Object.keys(SCENES).join(', ')}`);
  (fn ?? SCENES.idle)(ctx, W, H, u, d, b ?? {});
  if (fn && u < 0.25) { // retro-TV fade in at the start of a scene
    ctx.fillStyle = `rgba(16,18,24,${1 - u / 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
