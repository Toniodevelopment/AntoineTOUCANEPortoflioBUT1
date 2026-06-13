// --- CLASSE RetroWindow ---
export class RetroWindow {
    /**
     * @param {Object} options
     * @param {string} options.id - identifiant unique de la fenêtre (ex: "win-cv")
     * @param {string} options.title - texte affiché dans la barre de titre
     * @param {string} options.contentUrl - chemin du fragment HTML à charger
     * @param {string} [options.extraClass] - classe(s) CSS additionnelle(s) pour .window
     */
    constructor({ id, title, contentUrl, extraClass = '' }) {
        this.id = id;
        this.title = title;
        this.contentUrl = contentUrl;
        this.extraClass = extraClass;
        this.zTop = RetroWindow.zCounter;

        this.el = null;
        this.bodyEl = null;
        this.taskItem = null;

        this._drag = {
            active: false,
            offsetX: 0,
            offsetY: 0
        };
    }

    /** Construit le DOM de la fenêtre et l'insère dans le conteneur donné. */
    mount(desktop, taskbarItems) {
        // --- Fenêtre ---
        const win = document.createElement('div');
        win.className = `window ${this.extraClass}`.trim();
        win.id = this.id;

        win.innerHTML = `
            <div class="title-bar" data-drag-handle>
                <div class="title-bar-text">${this.title}</div>
                <div class="title-bar-controls">
                    <button aria-label="Réduire" data-action="minimize" data-window="${this.id}">_</button>
                    <button aria-label="Agrandir" data-action="maximize" data-window="${this.id}">🗖</button>
                    <button aria-label="Fermer" data-action="close" data-window="${this.id}">X</button>
                </div>
            </div>
            <div class="window-body" id="body-${this.id}">
                <p class="loading-text">Chargement…</p>
            </div>
        `;

        desktop.appendChild(win);
        this.el = win;
        this.bodyEl = win.querySelector('.window-body');

        // --- Item de la barre des tâches ---
        const item = document.createElement('button');
        item.className = 'taskbar-item active';
        item.dataset.window = this.id;
        item.dataset.action = 'restore';
        item.textContent = this.title;

        taskbarItems.appendChild(item);
        this.taskItem = item;

        this._initDrag();
        this._loadContent();

        return this;
    }

    /** Charge le contenu HTML externe de la fenêtre. */
    async _loadContent() {
        try {
            const res = await fetch(this.contentUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            this.bodyEl.innerHTML = html;
            this._onContentLoaded();
        } catch (err) {
            this.bodyEl.innerHTML = `<p>Impossible de charger le contenu (${this.contentUrl}).</p>`;
            console.error(`RetroWindow [${this.id}] :`, err);
        }
    }

    /** Hook appelé après l'injection du contenu (pour brancher des comportements spécifiques). */
    _onContentLoaded() {
        const form = this.bodyEl.querySelector('#contact-form');
        if (form) {
            form.addEventListener('submit', e => e.preventDefault());
        }
    }

    /** Met la fenêtre au premier plan. */
    bringToFront() {
        RetroWindow.zCounter += 1;
        this.el.style.zIndex = RetroWindow.zCounter;
    }

    /** Ferme la fenêtre (cachée + item de taskbar caché). */
    close() {
        this.el.classList.add('closed');
        this.taskItem.classList.add('closed');
    }

    /** Restaure (réaffiche, déminimise, remet au premier plan, scroll vers elle). */
    restore() {
        if (this.el.classList.contains('closed')) {
            this.el.classList.remove('closed');
            this.taskItem.classList.remove('closed');
        }

        if (this.bodyEl.classList.contains('collapsed')) {
            this.bodyEl.classList.remove('collapsed');
            this.taskItem.classList.remove('minimized');
        } else if (this.taskItem.classList.contains('minimized')) {
            this.taskItem.classList.remove('minimized');
        }

        this.bringToFront();
        this.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /** Bascule l'état réduit (minimisé). */
    toggleMinimize() {
        const collapsed = this.bodyEl.classList.toggle('collapsed');
        this.taskItem.classList.toggle('minimized', collapsed);
    }

    /** Bascule l'état agrandi / fenêtre flottante détachée. */
    toggleMaximize() {
        this.el.classList.toggle('dragging');

        if (this.bodyEl.classList.contains('collapsed')) {
            this.bodyEl.classList.remove('collapsed');
            this.taskItem.classList.remove('minimized');
        }

        if (this.el.classList.contains('dragging') && !this.el.style.left) {
            const rect = this.el.getBoundingClientRect();
            this.el.style.left = rect.left + 'px';
            this.el.style.top = rect.top + 'px';
        }

        this.bringToFront();
    }

    /** Initialise le déplacement (drag) via la barre de titre. */
    _initDrag() {
        const handle = this.el.querySelector('[data-drag-handle]');
        const state = this._drag;

        const startDrag = (clientX, clientY) => {
            this.el.classList.add('dragging');
            const rect = this.el.getBoundingClientRect();
            this.el.style.left = rect.left + 'px';
            this.el.style.top = rect.top + 'px';
            state.offsetX = clientX - rect.left;
            state.offsetY = clientY - rect.top;
            state.active = true;
            this.bringToFront();
        };

        const moveDrag = (clientX, clientY) => {
            if (!state.active) return;
            let x = clientX - state.offsetX;
            let y = clientY - state.offsetY;
            x = Math.max(0, Math.min(x, window.innerWidth - 60));
            y = Math.max(0, Math.min(y, window.innerHeight - 40));
            this.el.style.left = x + 'px';
            this.el.style.top = y + 'px';
        };

        const endDrag = () => {
            state.active = false;
        };

        handle.addEventListener('mousedown', e => {
            if (e.target.closest('.title-bar-controls')) return;
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
        document.addEventListener('mouseup', endDrag);

        handle.addEventListener('touchstart', e => {
            if (e.target.closest('.title-bar-controls')) return;
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchmove', e => {
            if (!state.active) return;
            const t = e.touches[0];
            moveDrag(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchend', endDrag);
    }
}