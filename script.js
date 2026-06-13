import { RetroWindow } from "./RetroWindow.js";
import { Icons } from "./Icons.js";

// --- HORLOGE ---
function clock() {
    document.getElementById('retro-clock').textContent =
        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
clock();
setInterval(clock, 1000);

RetroWindow.zCounter = 100;

// --- CONFIGURATION DES FENETRES ---
const WINDOW_CONFIGS = [
    { id: 'win-cv', title: 'A:\\PROFIL_DE_JEAN.EXE', contentUrl: 'windows/cv.html' },
    { id: 'win-projets', title: 'C:\\PROJETS\\', contentUrl: 'windows/projets.html' },
    { id: 'win-contact', title: 'A:\\CONTACT.EXE', contentUrl: 'windows/contact.html' },
    { id: 'win-liens', title: 'C:\\MES_LIENS\\', contentUrl: 'windows/liens.html', extraClass: 'links-window' }
];

const ICON_CONFIGS = [
    { id: 'ico-cv', title: 'Mon CV', iconUrl: './assets/icons/xml.png', linkedWindow: 'win-cv' },
    { id: 'ico-projets', title: 'Mes projets', iconUrl: './assets/icons/directory_closed.png', linkedWindow: 'win-projets' },
    { id: 'ico-contact', title: 'Me contacter', iconUrl: './assets/icons/outlook.png', linkedWindow: 'win-contact' },
    { id: 'ico-liens', title: 'Mes liens', iconUrl: './assets/icons/internet_explorer.png', linkedWindow: 'win-liens' }
];

// --- CONFIGURATION DES ICÔNES ---
const desktop = document.getElementById('desktop');
const taskbarItems = document.getElementById('taskbar-items');

ICON_CONFIGS.forEach(config => {
    new Icons(config).mount(desktop, taskbarItems);
});

// --- GESTION DES FENETRES ---

// --- INITIALISATION ---
const windows = new Map();

WINDOW_CONFIGS.forEach(config => {
    const win = new RetroWindow(config).mount(desktop, taskbarItems);
    windows.set(config.id, win);
});

// --- ACTIONS DECLARATIVES (data-attributes) ---
document.addEventListener('click', e => {
    const scrollTarget = e.target.closest('[data-scroll-to]');
    if (scrollTarget) {
        const el = document.getElementById(scrollTarget.dataset.scrollTo);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
        const win = windows.get(actionEl.dataset.window);
        if (!win) return;

        switch (actionEl.dataset.action) {
            case 'minimize': win.toggleMinimize(); break;
            case 'maximize': win.toggleMaximize(); break;
            case 'close': win.close(); break;
            case 'restore': win.restore(); break;
        }
        return;
    }

    const disabledLink = e.target.closest('a[aria-disabled="true"]');
    if (disabledLink) {
        e.preventDefault();
    }
});
