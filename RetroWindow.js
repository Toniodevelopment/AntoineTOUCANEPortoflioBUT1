export class RetroWindow {
    static zCounter = 100;
    static cascadeIndex = 1;
    static activeWindow = null;

    constructor({ id, title, contentUrl, iconUrl = '', extraClass = '' }) {
        this.id = id;
        this.title = title;
        this.contentUrl = contentUrl;
        this.iconUrl = iconUrl;
        this.extraClass = extraClass;

        this.el = null;
        this.bodyEl = null;
        this.taskItem = null;
        this.mounted = false;
        this._maximized = false;
        this._savedStyle = {};

        this._drag   = { active: false, offsetX: 0, offsetY: 0 };
        this._resize = { active: false, dir: '' };
    }

    mount(desktop, taskbarItems) {
        if (this.mounted) {
            this.restore();
            return this;
        }

        const cascade = RetroWindow.cascadeIndex * 28;
        RetroWindow.cascadeIndex = (RetroWindow.cascadeIndex + 1) % 8;

        const rawTop  = 20 + cascade;
        const rawLeft = 20 + cascade;

        const win = document.createElement('div');
        win.className = `window ${this.extraClass}`.trim();
        win.id = this.id;
        win.style.top  = rawTop  + 'px';
        win.style.left = rawLeft + 'px';

        const iconHtml = this.iconUrl
            ? `<img class="title-icon" src="${this.iconUrl}" alt="" aria-hidden="true">`
            : '';

        win.innerHTML = `
            <div class="title-bar" data-drag-handle>
                <div class="title-bar-text">
                    ${iconHtml}
                    ${this.title}
                </div>
                <div class="title-bar-controls">
                    <button aria-label="Réduire"  data-action="minimize" data-window="${this.id}">_</button>
                    <button aria-label="Agrandir" data-action="maximize" data-window="${this.id}">🗖</button>
                    <button aria-label="Fermer"   data-action="close"    data-window="${this.id}">✕</button>
                </div>
            </div>
            <div class="window-body" id="body-${this.id}">
                <p class="loading-text">Chargement…</p>
            </div>
        `;

        desktop.appendChild(win);

        // Clamp position so the window never spawns outside the desktop area (12px margin on all sides)
        const MARGIN = 12;
        const dW = desktop.clientWidth;
        const dH = desktop.clientHeight;
        const wW = win.offsetWidth  || 580;
        const wH = win.offsetHeight || 120;
        win.style.left = Math.min(rawLeft, Math.max(MARGIN, dW - wW - MARGIN)) + 'px';
        win.style.top  = Math.min(rawTop,  Math.max(MARGIN, dH - wH - MARGIN)) + 'px';

        this.el = win;
        this.bodyEl = win.querySelector('.window-body');
        this.mounted = true;

        win.addEventListener('mousedown', () => this.bringToFront(), true);
        win.addEventListener('touchstart', () => this.bringToFront(), { passive: true, capture: true });

        const item = document.createElement('button');
        item.className = 'taskbar-item';
        item.dataset.window = this.id;
        item.dataset.action = 'restore';
        item.innerHTML = this.iconUrl
            ? `<img src="${this.iconUrl}" alt="" aria-hidden="true" class="taskbar-item-icon"><span>${this.title}</span>`
            : `<span>${this.title}</span>`;
        taskbarItems.appendChild(item);
        this.taskItem = item;

        this._initDrag();
        this._initResize();
        this._loadContent();
        this.bringToFront();

        win.classList.add('window-opening');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => win.classList.remove('window-opening'));
        });

        return this;
    }

    async _loadContent() {
        try {
            const res = await fetch(this.contentUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.bodyEl.innerHTML = await res.text();
            // innerHTML ne déclenche pas les <script> — on les réinjecte manuellement
            this.bodyEl.querySelectorAll('script').forEach(old => {
                const s = document.createElement('script');
                [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
                s.textContent = old.textContent;
                old.replaceWith(s);
            });
            this._onContentLoaded();
        } catch (err) {
            this.bodyEl.innerHTML = `<p class="loading-text">Impossible de charger le contenu (${this.contentUrl}).</p>`;
            console.error(`RetroWindow [${this.id}] :`, err);
        }
    }

    _onContentLoaded() {
        const form = this.bodyEl.querySelector('#contact-form');
        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                const status = form.querySelector('#form-status');
                if (status) {
                    status.textContent = '✔ Message envoyé ! (simulation)';
                    status.style.color = '#006400';
                    setTimeout(() => { status.textContent = ''; }, 4000);
                }
                form.reset();
            });
        }

        const counter = this.bodyEl.querySelector('#visit-counter');
        if (counter) {
            const visits = (parseInt(localStorage.getItem('visits') || '42', 10) + 1);
            localStorage.setItem('visits', visits);
            counter.textContent = String(visits).padStart(6, '0');
        }
    }

    bringToFront() {
        RetroWindow.zCounter += 1;
        this.el.style.zIndex = RetroWindow.zCounter;

        if (RetroWindow.activeWindow && RetroWindow.activeWindow !== this) {
            RetroWindow.activeWindow.el.classList.remove('win-active');
        }
        this.el.classList.add('win-active');
        RetroWindow.activeWindow = this;
    }

    close() {
        if (!this.mounted) return;
        this.el.classList.add('window-closing');
        setTimeout(() => {
            this.el.remove();
            if (this.taskItem) this.taskItem.remove();
            this.el = null;
            this.bodyEl = null;
            this.taskItem = null;
            this.mounted = false;
            this._maximized = false;
            if (RetroWindow.activeWindow === this) RetroWindow.activeWindow = null;
        }, 150);
    }

    restore() {
        if (!this.mounted) return;
        this.el.classList.remove('closed');
        if (this.taskItem) this.taskItem.classList.remove('closed', 'minimized');
        if (this.bodyEl.classList.contains('collapsed')) {
            this.bodyEl.classList.remove('collapsed');
        }
        this.bringToFront();
    }

    toggleMinimize() {
        if (!this.mounted) return;
        const collapsed = this.bodyEl.classList.toggle('collapsed');
        if (this.taskItem) this.taskItem.classList.toggle('minimized', collapsed);
    }

    toggleMaximize() {
        if (!this.mounted) return;

        if (this._maximized) {
            this.el.style.position  = this._savedStyle.position  || '';
            this.el.style.top       = this._savedStyle.top       || '';
            this.el.style.left      = this._savedStyle.left      || '';
            this.el.style.width     = this._savedStyle.width     || '';
            this.el.style.height    = this._savedStyle.height    || '';
            this.el.style.maxWidth  = this._savedStyle.maxWidth  || '';
            this.el.style.maxHeight = this._savedStyle.maxHeight || '';
            this.bodyEl.style.maxHeight = '';
            this.bodyEl.style.height    = '';
            this.el.classList.remove('win-maximized');
            this._maximized = false;
        } else {
            this._savedStyle = {
                position:  this.el.style.position,
                top:       this.el.style.top,
                left:      this.el.style.left,
                width:     this.el.style.width,
                height:    this.el.style.height,
                maxWidth:  this.el.style.maxWidth,
                maxHeight: this.el.style.maxHeight,
            };
            this.el.style.position  = 'fixed';
            this.el.style.top       = '0';
            this.el.style.left      = '0';
            this.el.style.width     = '100vw';
            this.el.style.maxWidth  = '100vw';
            this.el.style.height    = 'calc(100vh - 40px)';
            this.el.style.maxHeight = 'calc(100vh - 40px)';
            this.bodyEl.style.maxHeight = 'calc(100vh - 40px - 26px)';
            this.bodyEl.style.height    = 'calc(100vh - 40px - 26px)';
            this.el.classList.add('win-maximized');
            this._maximized = true;
        }

        if (this.bodyEl.classList.contains('collapsed')) {
            this.bodyEl.classList.remove('collapsed');
            if (this.taskItem) this.taskItem.classList.remove('minimized');
        }

        this.bringToFront();
    }

    // =================== DRAG ===================
    _initDrag() {
        const handle = this.el.querySelector('[data-drag-handle]');
        const state  = this._drag;

        const startDrag = (clientX, clientY) => {
            if (this._maximized || this._resize.active) return;
            const rect = this.el.getBoundingClientRect();
            this.el.style.position = 'fixed';
            this.el.style.left = rect.left + 'px';
            this.el.style.top  = rect.top  + 'px';
            state.offsetX = clientX - rect.left;
            state.offsetY = clientY - rect.top;
            state.active  = true;
            this.bringToFront();
        };

        const moveDrag = (clientX, clientY) => {
            if (!state.active) return;
            let x = clientX - state.offsetX;
            let y = clientY - state.offsetY;
            x = Math.max(0, Math.min(x, window.innerWidth  - 60));
            y = Math.max(0, Math.min(y, window.innerHeight - 40));
            this.el.style.left = x + 'px';
            this.el.style.top  = y + 'px';
        };

        const endDrag = () => { state.active = false; };

        handle.addEventListener('mousedown', e => {
            if (e.target.closest('.title-bar-controls')) return;
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
        document.addEventListener('mouseup',   endDrag);

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

    // =================== RESIZE ===================
    _initResize() {
        const el   = this.el;
        const BORDER = 6;   // px de détection sur le bord
        const MIN_W  = 220;
        const MIN_H  = 80;

        const rs = this._resize;

        let startX, startY, startW, startH, startL, startT;

        const CURSOR_MAP = {
            n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
            ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize',
        };

        // Détecte le bord sous le curseur
        const getEdge = (clientX, clientY) => {
            if (this._maximized || this._drag.active) return '';
            const r = el.getBoundingClientRect();
            const nearL = clientX >= r.left   && clientX <= r.left   + BORDER;
            const nearR = clientX >= r.right  - BORDER && clientX <= r.right  + 2;
            const nearT = clientY >= r.top    && clientY <= r.top    + BORDER;
            const nearB = clientY >= r.bottom - BORDER && clientY <= r.bottom + 2;
            if (nearT && nearL) return 'nw';
            if (nearT && nearR) return 'ne';
            if (nearB && nearL) return 'sw';
            if (nearB && nearR) return 'se';
            if (nearT) return 'n';
            if (nearB) return 's';
            if (nearL) return 'w';
            if (nearR) return 'e';
            return '';
        };

        // Mise à jour curseur sur le survol des bords
        el.addEventListener('mousemove', e => {
            if (rs.active) return;
            const edge = getEdge(e.clientX, e.clientY);
            el.style.cursor = edge ? CURSOR_MAP[edge] : '';
        });

        el.addEventListener('mouseleave', () => {
            if (!rs.active) el.style.cursor = '';
        });

        // Démarrage du resize
        el.addEventListener('mousedown', e => {
            if (this._maximized) return;
            const edge = getEdge(e.clientX, e.clientY);
            if (!edge) return;

            e.preventDefault();
            e.stopPropagation();

            rs.active = true;
            rs.dir    = edge;

            const rect = el.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startW = rect.width;
            startH = rect.height;
            startL = rect.left;
            startT = rect.top;

            // Passe en position fixe pour pouvoir modifier librement
            el.style.position  = 'fixed';
            el.style.left      = startL + 'px';
            el.style.top       = startT + 'px';
            el.style.width     = startW + 'px';
            el.style.height    = startH + 'px';
            el.style.maxWidth  = 'none';
            el.style.maxHeight = 'none';

            // Désactive la sélection de texte pendant le resize
            document.body.style.cursor     = CURSOR_MAP[edge];
            document.body.style.userSelect = 'none';

            this.bringToFront();
        }, true);

        // Déplacement pendant le resize
        document.addEventListener('mousemove', e => {
            if (!rs.active) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const dir = rs.dir;

            let newW = startW, newH = startH, newL = startL, newT = startT;

            if (dir.includes('e')) { newW = Math.max(MIN_W, startW + dx); }
            if (dir.includes('s')) { newH = Math.max(MIN_H, startH + dy); }
            if (dir.includes('w')) {
                newW = Math.max(MIN_W, startW - dx);
                newL = startL + startW - newW;
            }
            if (dir.includes('n')) {
                newH = Math.max(MIN_H, startH - dy);
                newT = startT + startH - newH;
            }

            el.style.width  = newW + 'px';
            el.style.height = newH + 'px';
            el.style.left   = newL + 'px';
            el.style.top    = newT + 'px';

            // Ajuste le corps de la fenêtre
            if (this.bodyEl) {
                const titleH = el.querySelector('.title-bar')?.offsetHeight || 26;
                const bodyH  = Math.max(0, newH - titleH);
                this.bodyEl.style.height    = bodyH + 'px';
                this.bodyEl.style.maxHeight = bodyH + 'px';
                this.bodyEl.style.overflowY = 'auto';
            }
        });

        // Fin du resize
        document.addEventListener('mouseup', () => {
            if (!rs.active) return;
            rs.active = false;
            rs.dir    = '';
            document.body.style.cursor     = '';
            document.body.style.userSelect = '';
            el.style.cursor = '';
        });
    }
}
