class CustomSelect extends HTMLElement {
  constructor() {
    super();
    this._open = false;
    this._items = [];
    this._value = "";
    this._onDocumentClick = this._onDocumentClick.bind(this);
  }

  connectedCallback() {
    document.addEventListener("click", this._onDocumentClick);
    this._render();
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._onDocumentClick);
  }

  get items() { return this._items; }
  set items(value) { this._items = value || []; this._render(); }
  get value() { return this._value; }
  set value(value) { this._value = value; this._render(); }

  _onDocumentClick(event) {
    if (this._open && !this.contains(event.target)) {
      this._open = false;
      this._render();
    }
  }

  _render() {
    if (!this.isConnected) return;
    this.replaceChildren();
    const selected = this._items.find((item) => item.value === this._value);
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("aria-expanded", String(this._open));
    trigger.innerHTML = `<span>${selected?.label || ""}</span><span class="material-symbols-outlined custom-select-chevron">expand_more</span>`;
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      this._open = !this._open;
      this._render();
    });
    this.append(trigger);

    if (!this._open) return;
    const options = document.createElement("div");
    options.className = "custom-select-options";
    for (const item of this._items) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = `custom-select-option${item.value === this._value ? " selected" : ""}`;
      option.textContent = item.label;
      option.addEventListener("click", () => {
        this._value = item.value;
        this._open = false;
        this._render();
        this.dispatchEvent(new Event("change", { bubbles: true }));
      });
      options.append(option);
    }
    this.append(options);
  }
}

customElements.define("custom-select", CustomSelect);
