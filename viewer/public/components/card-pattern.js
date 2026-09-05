// Counter IDs make the decoration stable across edits, check-ins and reloads.
const patterns = new Map();

export function cardPattern(id) {
  if (patterns.has(id)) return patterns.get(id);
  let seed = 2166136261;
  for (const character of id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const columns = 24, rows = 28, tile = 16;
  const phase = random() * Math.PI * 2;
  const slope = (random() > 0.5 ? 1 : -1) * 0.55;
  const boundary = Array.from({ length: columns }, (_, x) =>
    Math.round(rows / 2 + (x - columns / 2) * slope + Math.sin(x * 0.3 + phase) * 3 + (random() - 0.5) * 4));
  const filled = (x, y) => x >= 0 && x < columns && y >= 0 && y < rows && y >= boundary[x];
  const shapes = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      if (filled(x, y)) {
        shapes.push(`<rect x="${x * tile}" y="${y * tile}" width="16" height="16" fill="#262d29"/>`);
      } else {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx || dy) neighbors += Number(filled(x + dx, y + dy));
          }
        }
        if (neighbors) shapes.push(`<text x="${x * tile + 8}" y="${y * tile + 11}" fill="#46534a">${neighbors}</text>`);
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="448" viewBox="0 0 384 448"><g shape-rendering="crispEdges" font-family="monospace" font-size="8" text-anchor="middle">${shapes.join("")}</g></svg>`;
  const value = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  patterns.set(id, value);
  return value;
}
