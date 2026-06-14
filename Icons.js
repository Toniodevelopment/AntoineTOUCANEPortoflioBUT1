export class Icons {
    constructor({ id, title, iconUrl, linkedWindow, extraClass = '' }) {
        this.id = id;
        this.title = title;
        this.iconUrl = iconUrl;
        this.linkedWindow = linkedWindow;
        this.extraClass = extraClass;
        this.el = null;
    }

    mount(desktop) {
        const ico = document.createElement('div');
        ico.className = `icon-wrapper ${this.extraClass}`.trim();
        ico.id = this.id;
        ico.innerHTML = `
            <button class="shortcut" aria-label="Ouvrir ${this.title}" title="Double-clic pour ouvrir">
                <span class="icon-img" aria-hidden="true">
                    <img src="${this.iconUrl}" alt="${this.title}">
                </span>
                <span class="icon-label">${this.title}</span>
            </button>`;

        desktop.appendChild(ico);
        this.el = ico;
        return this;
    }
}
