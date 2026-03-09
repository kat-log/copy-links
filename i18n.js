const translations = {
  en: {
    heading: "Copy links",
    copyAllTabs: "Copy all tab URLs",
    copySelectedTabs: "Copy selected tab URLs",
    copyQiita: "Copy Qiita links",
    fallbackInstruction: "Copy the links below manually:",
    settingsTooltip: "Settings",
    languageLabel: "Language",

    collectingAll: "Collecting URLs from all tabs...",
    noTabsFound: "No tabs found.",
    foundTabsCopying: "Found {count} tab(s). Copying...",
    copiedTabs: "Copied {count} tab URL(s) to clipboard.",
    copyFailed:
      "Could not copy automatically ({reason}). Please copy manually below.",
    collectingSelected: "Collecting URLs from selected tabs...",
    noSelectedTabs: "No selected tabs found.",
    foundSelectedCopying: "Found {count} selected tab(s). Copying...",
    copiedSelected: "Copied {count} selected tab URL(s) to clipboard.",
    collectingDomain: "Collecting {domain} links...",
    noResponse: "No response from background",
    errorPrefix: "Error: {error}",
    noLinksFound:
      "No {domain} links found inside table elements on this page.",
    copiedLinks: "Copied {count} {domain} link(s) to clipboard.",
  },
  ja: {
    heading: "リンクをコピー",
    copyAllTabs: "全タブのURLをコピー",
    copySelectedTabs: "選択中のタブのURLをコピー",
    copyQiita: "Qiitaリンクをコピー",
    fallbackInstruction: "以下のリンクを手動でコピーしてください：",
    settingsTooltip: "設定",
    languageLabel: "言語",

    collectingAll: "全タブのURLを取得中...",
    noTabsFound: "タブが見つかりません。",
    foundTabsCopying: "{count}件のタブを検出。コピー中...",
    copiedTabs: "{count}件のタブURLをクリップボードにコピーしました。",
    copyFailed:
      "自動コピーに失敗しました（{reason}）。以下から手動でコピーしてください。",
    collectingSelected: "選択中のタブのURLを取得中...",
    noSelectedTabs: "選択されたタブが見つかりません。",
    foundSelectedCopying: "{count}件の選択タブを検出。コピー中...",
    copiedSelected:
      "{count}件の選択タブURLをクリップボードにコピーしました。",
    collectingDomain: "{domain}のリンクを取得中...",
    noResponse: "バックグラウンドから応答がありません",
    errorPrefix: "エラー: {error}",
    noLinksFound:
      "このページのテーブル内に{domain}のリンクは見つかりませんでした。",
    copiedLinks: "{count}件の{domain}リンクをクリップボードにコピーしました。",
  },
};

const DEFAULT_LANG = "ja";

function t(lang, key, vars = {}) {
  const dict = translations[lang] || translations[DEFAULT_LANG];
  let str = dict[key] || translations[DEFAULT_LANG][key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

async function loadLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get("lang", (result) => {
      resolve(result.lang || DEFAULT_LANG);
    });
  });
}

async function saveLanguage(lang) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ lang }, resolve);
  });
}
