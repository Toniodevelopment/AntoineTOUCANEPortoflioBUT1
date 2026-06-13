import { RetroWindow } from "./RetroWindow.js";
export class Icons {
/**
     * @param {Object} options
     * @param {string} options.id - identifiant unique de la fenêtre (ex: "win-cv")
     * @param {string} options.title - texte affiché dans la barre de titre
     * @param {string} options.iconUrl - chemin de l'image de l'icône
     * @param {RetroWindow} options.linkedWindow - fenêtre liée à l'icône
     * @param {string} [options.extraClass] - classe(s) CSS additionnelle(s) pour .window
     */
    constructor({ id, title, iconUrl, linkedWindow, extraClass = '' }) {
        this.id = id;
        this.title = title;
        this.iconUrl = iconUrl;
        this.linkedWindow = linkedWindow;
        this.extraClass = extraClass;
    }

    mount(desktop, taskbarItems) {
        // --- Fenêtre ---
        const ico = document.createElement('div');
        ico.className = `icon ${this.extraClass}`.trim();
        ico.id = this.id;
        console.log(this.iconUrl);
        ico.innerHTML = `
            <button class="shortcut" data-scroll-to="win-cv">
                <span class="icon" aria-hidden="true">
                    <img src="${this.iconUrl}" alt="${this.title}">
                </span>
                <span>${this.title}</span>
            </button>`;

        desktop.appendChild(ico);
        this.el = ico;

        return this;
    }
}
              