import { LitElement, html } from "lit";

class AppHeader extends LitElement {
  static properties = { view: { state: true } };
  constructor() {
    super();
    this.view = localStorage.getItem("ascent-dashboard-view") === "timeline" ? "timeline" : "cards";
  }
  createRenderRoot() { return this; }
  openCounterForm() { this.dispatchEvent(new CustomEvent("add-counter", { bubbles: true, composed: true })); }
  changeView(view) {
    this.view = view;
    localStorage.setItem("ascent-dashboard-view", view);
    this.dispatchEvent(new CustomEvent("dashboard-view-change", { detail: { view }, bubbles: true, composed: true }));
  }
  render() { return html`<header class="site-header"><h1><a href="/"><img class="header-logo" src="/logo.svg" alt="">Ascent</a></h1><div class="header-actions"><nav class="view-switcher" aria-label="Dashboard view"><button class=${this.view === "cards" ? "active" : ""} aria-label="Cards view" title="Cards view" aria-pressed=${this.view === "cards"} @click=${() => this.changeView("cards")}><span class="material-symbols-outlined">grid_view</span></button><button class=${this.view === "timeline" ? "active" : ""} aria-label="Timeline view" title="Timeline view" aria-pressed=${this.view === "timeline"} @click=${() => this.changeView("timeline")}><span class="material-symbols-outlined">view_timeline</span></button></nav><button class="header-add" aria-label="Add counter" title="Add counter" @click=${this.openCounterForm}><span class="material-symbols-outlined">add</span></button></div></header>`; }
}
customElements.define("app-header", AppHeader);
