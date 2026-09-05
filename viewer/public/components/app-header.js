import { LitElement, html } from "lit";

class AppHeader extends LitElement {
  createRenderRoot() { return this; }
  openCounterForm() { this.dispatchEvent(new CustomEvent("add-counter", { bubbles: true, composed: true })); }
  render() { return html`<header class="site-header"><h1><a href="/"><img class="header-logo" src="/logo.svg" alt="">Ascent</a></h1><button class="header-add" @click=${this.openCounterForm}><span class="material-symbols-outlined">add</span><span>Add counter</span></button></header>`; }
}
customElements.define("app-header", AppHeader);
