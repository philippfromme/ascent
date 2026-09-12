// Share the details calendar's daily states. Leading empty slots keep today
// in the bottom-right corner without cropping or repeating any days.
export function cardPattern(days) {
  const columns = 19, tile = 20, gap = 3;
  const rows = Math.ceil(days.length / columns);
  const offset = rows * columns - days.length;
  const shapes = days.map((day, index) => {
    const slot = offset + index;
    const x = (slot % columns) * tile;
    const y = Math.floor(slot / columns) * tile;
    const fill = day.reset ? (day.latestReset ? "url(#latest-reset)" : "#ff5252") : day.active ? "#00d230" : "#303632";
    return `<rect x="${x}" y="${y}" width="${tile - gap}" height="${tile - gap}" fill="${fill}"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${columns * tile - gap} ${rows * tile - gap}" preserveAspectRatio="none"><defs><linearGradient id="latest-reset"><stop offset="50%" stop-color="#ff5252"/><stop offset="50%" stop-color="#00d230"/></linearGradient></defs>${shapes.join("")}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
