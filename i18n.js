let cachedMessages = {};

// ブラウザロケールから対応する言語コードを取得
function getDefaultLang() {
  const uiLang = chrome.i18n.getUILanguage();
  return uiLang.startsWith("ja") ? "ja" : "en";
}

// _locales から messages.json を読み込みキャッシュ
async function initI18n() {
  if (Object.keys(cachedMessages).length > 0) return;
  const langs = ["en", "ja"];
  await Promise.all(
    langs.map(async (lang) => {
      const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
      const res = await fetch(url);
      cachedMessages[lang] = await res.json();
    })
  );
}

// 翻訳取得（API は既存と同じ: t(lang, key, vars)）
function t(lang, key, vars = {}) {
  const defaultLang = getDefaultLang();
  const msgs = cachedMessages[lang] || cachedMessages[defaultLang];
  const entry = msgs?.[key] || cachedMessages.en?.[key];
  if (!entry) return key;

  let msg = entry.message;
  if (entry.placeholders) {
    for (const [name] of Object.entries(entry.placeholders)) {
      if (name in vars) {
        msg = msg.replaceAll(`$${name}$`, vars[name]);
      }
    }
  }
  return msg;
}

// 言語設定の読み込み（デフォルトをブラウザロケールに改善）
async function loadLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get("lang", (result) => {
      resolve(result.lang || getDefaultLang());
    });
  });
}

// 言語設定の保存
async function saveLanguage(lang) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ lang }, resolve);
  });
}
