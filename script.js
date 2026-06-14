import { RetroWindow } from "./RetroWindow.js";
import { Icons } from "./Icons.js";

// --- HORLOGE ---
function updateClock() {
    const now = new Date();
    document.getElementById('retro-clock').textContent =
        now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 1000);

// Clic sur l'horloge → afficher la date
const clockEl = document.getElementById('retro-clock');
let showingDate = false;
clockEl.addEventListener('click', () => {
    if (showingDate) {
        showingDate = false;
        updateClock();
    } else {
        showingDate = true;
        const now = new Date();
        clockEl.textContent = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        setTimeout(() => { showingDate = false; updateClock(); }, 3000);
    }
});

// --- CONFIGURATION ---
const WINDOW_CONFIGS = [
    { id: 'win-cv',           title: 'A:\\PROFIL.EXE',       contentUrl: 'windows/cv.html',            iconUrl: './assets/icons/xml.png',              extraClass: 'cv-window'       },
    { id: 'win-projets',      title: 'C:\\PROJETS\\',        contentUrl: 'windows/projets.html',       iconUrl: './assets/icons/directory_closed.png', extraClass: 'explorer-window' },
    { id: 'win-contact',      title: 'A:\\CONTACT.EXE',      contentUrl: 'windows/contact.html',       iconUrl: './assets/icons/outlook.png'                                         },
    { id: 'win-liens',        title: 'C:\\MES_LIENS\\',      contentUrl: 'windows/liens.html',         iconUrl: './assets/icons/internet_explorer.png', extraClass: 'links-window'   },
    { id: 'win-proj-photo',   title: 'C:\\PORTFOLIO.EXE',   contentUrl: 'windows/projet-photo.html',  iconUrl: './assets/icons/xml.png'                                             },
    { id: 'win-proj-abalone', title: 'C:\\ABALONE.EXE',     contentUrl: 'windows/projet-abalone.html',iconUrl: './assets/icons/xml.png'                                             },
    { id: 'win-proj-tower',   title: 'C:\\TOWER.EXE',       contentUrl: 'windows/projet-tower.html',  iconUrl: './assets/icons/xml.png'                                             }
];

const ICON_CONFIGS = [
    { id: 'ico-cv',      title: 'Mon CV',        iconUrl: './assets/icons/xml.png',              linkedWindow: 'win-cv'      },
    { id: 'ico-projets', title: 'Mes projets',   iconUrl: './assets/icons/directory_closed.png', linkedWindow: 'win-projets' },
    { id: 'ico-contact', title: 'Me contacter',  iconUrl: './assets/icons/outlook.png',          linkedWindow: 'win-contact' },
    { id: 'ico-liens',   title: 'Mes liens',     iconUrl: './assets/icons/internet_explorer.png',linkedWindow: 'win-liens'   }
];

const desktop      = document.getElementById('desktop');
const taskbarItems = document.getElementById('taskbar-items');
const windows      = new Map();

// --- CRÉATION DES FENÊTRES ---
WINDOW_CONFIGS.forEach(config => {
    windows.set(config.id, new RetroWindow(config));
});

// Exposé globalement pour que les contenus injectés (projets.html) puissent ouvrir des fenêtres
window.openWindow = (id) => {
    const win = windows.get(id);
    if (win) win.mount(desktop, taskbarItems);
};

// --- CRÉATION DES ICÔNES ---
ICON_CONFIGS.forEach(config => {
    const icon = new Icons(config);
    icon.mount(desktop);

    const btn = icon.el.querySelector('.shortcut');

    // Simple clic : sélectionner l'icône
    btn.addEventListener('click', () => {
        document.querySelectorAll('.shortcut').forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
    });

    // Double-clic : ouvrir/restaurer la fenêtre
    let lastClick = 0;
    btn.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastClick < 400) {
            const win = windows.get(config.linkedWindow);
            if (win) win.mount(desktop, taskbarItems);
            btn.classList.remove('selected');
        }
        lastClick = now;
    });
});

// Clic ailleurs → désélectionner les icônes
desktop.addEventListener('click', e => {
    if (!e.target.closest('.shortcut') && !e.target.closest('.window')) {
        document.querySelectorAll('.shortcut').forEach(s => s.classList.remove('selected'));
    }
});

// --- DÉLÉGATION D'ACTIONS (minimize / maximize / close / restore) ---
document.addEventListener('click', e => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
        const win = windows.get(actionEl.dataset.window);
        if (!win) return;
        switch (actionEl.dataset.action) {
            case 'minimize': win.toggleMinimize(); break;
            case 'maximize': win.toggleMaximize(); break;
            case 'close':    win.close();          break;
            case 'restore':  win.restore();        break;
        }
        return;
    }

    const disabledLink = e.target.closest('a[aria-disabled="true"]');
    if (disabledLink) e.preventDefault();
});

// --- MENU DÉMARRER ---
const startBtn  = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');

startBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isHidden = startMenu.hidden;
    startMenu.hidden = !isHidden;
    startBtn.classList.toggle('active', !isHidden ? false : true);
});

document.getElementById('start-menu-list').addEventListener('click', e => {
    const li = e.target.closest('[data-open]');
    if (!li) return;
    const win = windows.get(li.dataset.open);
    if (win) win.mount(desktop, taskbarItems);
    startMenu.hidden = true;
    startBtn.classList.remove('active');
});

document.addEventListener('click', e => {
    if (!startMenu.hidden && !e.target.closest('#start-menu') && !e.target.closest('#start-btn')) {
        startMenu.hidden = true;
        startBtn.classList.remove('active');
    }
});

// --- ÉCRAN DE DÉMARRAGE ---
const bootScreen = document.getElementById('boot-screen');
const bootBar    = document.getElementById('boot-bar');

let progress = 0;
const bootInterval = setInterval(() => {
    progress += Math.random() * 25 + 15;
    bootBar.style.width = Math.min(progress, 100) + '%';
    if (progress >= 100) {
        clearInterval(bootInterval);
        setTimeout(() => {
            bootScreen.classList.add('boot-done');
            setTimeout(() => {
                bootScreen.remove();
                windows.get('win-cv').mount(desktop, taskbarItems);
            }, 400);
        }, 200);
    }
}, 60);
