(() => {
/* VAL-2 Contacts v2 — debug minimal */

const MODULE_ID   = "val2-contacts";
const SETTING_KEY = "playerAssignments";

const CONTACTS = {
  "aleister-black": {
    title: "ALEISTER BLACK",
    sub:   "Kontakt · Merek",
    file:  "dossier-aleister-black.html"
  },
  "tusk": {
    title: "TUSK",
    sub:   "Kontakt · VAL-2 Unterstadt",
    file:  "dossier-tusk.html"
  },
  "humba": {
    title: "HUMBA",
    sub:   "Kontakt · VAL-2 Canberra",
    file:  "dossier-humba.html"
  },
  "cipher": {
    title: "CIPHER",
    sub:   "Kontakt · Ghost Protocol",
    file:  "dossier-cipher.html"
  }
};

function getAssignments() {
  try { return game.settings.get(MODULE_ID, SETTING_KEY) ?? {}; } catch { return {}; }
}
async function saveAssignments(data) {
  await game.settings.set(MODULE_ID, SETTING_KEY, data);
}
function getMyContacts() {
  return (getAssignments()[game.user.id] ?? []).filter(id => CONTACTS[id]);
}

class Val2DossierApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes:   ["val2-contact-app"],
      resizable: true,
      width:     780,
      height:    860
    });
  }
  constructor(contactId, options = {}) {
    const c = CONTACTS[contactId];
    super(foundry.utils.mergeObject(options, {
      id:    `val2-contact-${contactId}`,
      title: c.title
    }));
    this._url = `modules/${MODULE_ID}/contacts/${c.file}`;
  }
  async _renderInner() {
    return $(`<div style="height:100%"><iframe
      src="${this._url}"
      style="width:100%;height:100%;border:none;display:block;background:#05080a"
      sandbox="allow-scripts allow-same-origin">
    </iframe></div>`);
  }
}

const _openApps = new Map();

function openContact(contactId) {
  if (!game.user.isGM && !getMyContacts().includes(contactId)) {
    ui.notifications.warn("Zugriff verweigert."); return;
  }
  const c = CONTACTS[contactId];
  if (!c) { ui.notifications.warn(`Unbekannt: ${contactId}`); return; }
  const existing = _openApps.get(contactId);
  if (existing?.rendered) { existing.bringToTop(); return; }
  const app = new Val2DossierApp(contactId);
  _openApps.set(contactId, app);
  app.render(true);
}

function openContactManager() {
  if (!game.user.isGM) { ui.notifications.warn("Nur GMs."); return; }
  const assignments = getAssignments();
  const players = game.users.filter(u => !u.isGM);
  let content = `<div style="font-family:monospace;padding:8px">`;
  for (const p of players) {
    content += `<b>${p.name}</b><br>`;
    for (const [id, c] of Object.entries(CONTACTS)) {
      const checked = (assignments[p.id] ?? []).includes(id) ? "checked" : "";
      content += `<label style="display:block;margin:4px 0"><input type="checkbox" data-player="${p.id}" data-contact="${id}" ${checked}> ${c.title}</label>`;
    }
    content += `<hr>`;
  }
  content += `</div>`;
  new Dialog({
    title: "Kontakt-Manager",
    content,
    buttons: {
      save: {
        label: "Speichern",
        callback: async (html) => {
          const result = {};
          html.find("input:checked").each((_, el) => {
            const pid = el.dataset.player, cid = el.dataset.contact;
            if (!result[pid]) result[pid] = [];
            result[pid].push(cid);
          });
          await saveAssignments(result);
          ui.notifications.info("Gespeichert.");
        }
      }
    },
    default: "save"
  }).render(true);
}

function openContactList() {
  const ids = getMyContacts();
  if (!ids.length) { ui.notifications.info("Keine Kontakte freigegeben."); return; }
  const buttons = {};
  for (const id of ids) {
    buttons[id] = { label: CONTACTS[id].title, callback: () => openContact(id) };
  }
  new Dialog({ title: "Kontakte", content: "<p>Kontakt öffnen:</p>", buttons }).render(true);
}

// Settings: init-Hook
Hooks.once("init", () => {
  console.log(`[${MODULE_ID}] init`);
  try {
    game.settings.register(MODULE_ID, SETTING_KEY, {
      scope: "world", config: false, type: Object, default: {}
    });
  } catch(e) { console.log(`[${MODULE_ID}] setting already registered`); }
});

// API: ready-Hook
Hooks.once("ready", () => {
  game.modules.get(MODULE_ID).api = { openContact, openContactList, openContactManager };
  console.log(`[${MODULE_ID}] ready — api:`, game.modules.get(MODULE_ID).api);
});

})();
