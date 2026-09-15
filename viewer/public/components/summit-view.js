import { LitElement, html, svg } from "lit";

// Milestones occupy equal sections of trail; days interpolate within each section.
export function altitude(days, milestones) {
  const stops = [0, ...milestones.map((camp) => camp.days)];
  const index = stops.findIndex((stop) => stop > days);
  if (index < 0) return stops.length - 1;
  return index - 1 + (Math.max(0, days) - stops[index - 1]) / (stops[index] - stops[index - 1]);
}

class SummitView extends LitElement {
  static properties = { counters: { attribute: false }, milestones: { attribute: false } };
  constructor() { super(); this.counters = []; this.milestones = []; }
  createRenderRoot() { return this; }
  open(counter) { this.dispatchEvent(new CustomEvent("summit-open", { detail: counter, bubbles: true })); }
  mountain(counter) {
    const camps = this.milestones;
    const current = Math.max(0, counter.value);
    const best = Math.max(current, ...(counter.periods || []).map((period) => period.days));
    let seed = 0;
    for (const char of counter.id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
    const mountainCenter = 150 + (seed % 3 - 1) * 6;
    const peakY = 52, rockStep = 12;
    const mountainHalfWidth = (y) => 10 + Math.floor((y - peakY) / rockStep) * 5;
    const points = Array.from({ length: camps.length + 1 }, (_, i) => {
      const y = 324 - i * 34;
      // Keep camps inside the stepped silhouette, with room for the markers.
      const reach = i === camps.length ? 0 : Math.max(0, mountainHalfWidth(y - 4) - 12) * 0.75;
      return { x: mountainCenter + (i % 2 ? 1 : -1) * reach, y };
    });
    const position = (days) => {
      const height = altitude(days, camps);
      const lower = Math.floor(height), upper = Math.min(lower + 1, camps.length);
      return { x: points[lower].x + (points[upper].x - points[lower].x) * (height - lower), y: 324 - height * 34 };
    };
    const climber = position(current), flag = position(best);
    const height = altitude(current, camps);
    // At a camp, face the next climb; at the summit, retain the final approach.
    const segment = Math.min(Math.floor(height), points.length - 2);
    const facing = points[segment + 1].x >= points[segment].x ? 1 : -1;
    const trail = points.map((point) => `${point.x},${point.y}`).join(" ");
    const reached = [...points.slice(0, Math.floor(height) + 1), climber].map((point) => `${point.x},${point.y}`).join(" ");
    const next = camps.find((camp) => camp.days > current);
    const rock = Array.from({ length: 23 }, (_, row) => {
      const y = peakY + row * rockStep;
      const half = mountainHalfWidth(y);
      return svg`<rect x=${mountainCenter - half} y=${y} width=${half * 2} height=${rockStep} fill=${row % 4 === 0 ? "#292929" : "#222222"}/>`;
    });
    return html`<button class="summit" @click=${() => this.open(counter)} aria-label=${`${counter.name}: ${current} days. Best ${best} days. Open history.`}>
      <div class="summit-name"><h3>${counter.name}</h3><span>${counter.kind === "streak" ? "Check in" : "Reset"}</span></div>
      <svg class="summit-mountain" viewBox="0 0 320 360" aria-hidden="true">
        <g shape-rendering="crispEdges">${rock}</g>
        <polyline class="summit-line" points=${trail} fill="none" stroke="#505050" stroke-dasharray="3 5"/>
        <polyline class="summit-line" points=${reached} fill="none" stroke="#00d230"/>
        ${camps.map((camp, i) => svg`<g><path class="summit-line" d=${`M ${points[i + 1].x + 9} ${points[i + 1].y} H 254`} stroke="#303030" stroke-dasharray="3 5"/><rect x=${points[i + 1].x - 4} y=${points[i + 1].y - 4} width="8" height="8" fill=${current >= camp.days ? "#00d230" : "#505050"}/><text x="264" y=${points[i + 1].y + 4} fill=${current >= camp.days ? "#00d230" : "#999999"} font-size="10" font-family="monospace">${camp.days}d</text></g>`)}
        ${best > 0 ? svg`<g transform=${`translate(${flag.x} ${flag.y})`}><text class="material-symbols-outlined summit-map-icon" x="-4" y="3" fill="#a0a0a0">flag</text></g>` : ""}
        <g class="summit-climber" style=${`transform:translate(${climber.x}px,${climber.y}px)`}><g transform=${`scale(${facing} 1)`}><text class="material-symbols-outlined summit-map-icon" x="-12" y="2" fill="#00d230">hiking</text></g></g>
      </svg>
      <div class="summit-caption"><strong>${current} <span>${current === 1 ? "day" : "days"}</span></strong><span>${next ? `${next.days - current} to ${next.label}` : "Summit reached · keep climbing"}</span><small>${best ? `Personal best · ${best} days` : "Your trail starts here"}</small></div>
    </button>`;
  }
  render() {
    return html`<section class="summits-overview" aria-labelledby="summits-title"><div class="summits-heading"><h2 id="summits-title">Summits</h2><div class="summits-key"><span><i class="material-symbols-outlined" aria-hidden="true">hiking</i>Current climb</span><span><i class="material-symbols-outlined" aria-hidden="true">flag</i>Personal best</span></div></div>${this.counters.length ? html`<div class="summits-grid">${this.counters.map((counter) => this.mountain(counter))}</div>` : html`<div class="empty-state"><h2>Your first ascent awaits.</h2><p>Add a counter to begin your climb.</p></div>`}</section>`;
  }
}
customElements.define("summit-view", SummitView);
