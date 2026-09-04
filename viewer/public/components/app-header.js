import { LitElement, html } from "lit";

class AppHeader extends LitElement {
  createRenderRoot() { return this; }
  render() { return html`<header class="site-header"><h1><a href="/"><img class="header-logo" src="/logo.svg" alt="">Ascent</a></h1></header>`; }
}
customElements.define("app-header", AppHeader);
