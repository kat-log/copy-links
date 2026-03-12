const translations = {
  en: {
    heading: "Copy links",
    copyAllTabs: "Copy all tab URLs",
    copySelectedTabs: "Copy selected tab URLs",
    copyQiita: "Copy Qiita links",
    fallbackInstruction: "Copy the links below manually:",
    settingsTooltip: "Settings",
    languageLabel: "Language",
    manageCustomButtons: "Manage custom buttons",

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
    collectingCustom: "Collecting links for {name}...",
    copiedCustomLinks: "Copied {count} link(s) for {name}.",
    noCustomLinksFound: "No matching links found for {name}.",
    noResponse: "No response from background",
    errorPrefix: "Error: {error}",

    // Options page
    optionsTitle: "Custom Button Settings",
    customButtonsHeading: "Custom Buttons",
    addButton: "Add button",
    addNewButton: "Add new button",
    buttonNameLabel: "Display name",
    hostnameLabel: "Hostname",
    pathnameRegexLabel: "Pathname regex (optional)",
    regexHelp:
      "Enter a regular expression to match the URL path portion. If empty, all paths will match.",
    save: "Save",
    cancel: "Cancel",
    noCustomButtons: "No custom buttons configured.",
    actionsHeading: "Actions",
    confirmReset:
      "Reset all custom buttons to defaults? This cannot be undone.",
    resetDefaults: "Reset to defaults",
    exportImportHeading: "Export / Import",
    exportBtn: "Export",
    importBtn: "Import",
    exportedToClipboard: "Exported and copied to clipboard.",
    exportedToTextarea: "Exported to the textarea above.",
    importEmpty: "Please paste a JSON configuration in the textarea above.",
    importSuccess: "Imported {count} button(s) successfully.",
    importError: "Import failed: {error}",
    nameRequired: "Display name is required.",
    hostnameRequired: "Hostname is required.",
    regexRequired: "Pathname regex is required.",
    invalidRegex: "Invalid regular expression.",
    saved: "Saved.",
    resetDone: "Reset to defaults.",
    buttonNameEnLabel: "Display name (English)",
  },
  ja: {
    heading: "リンクをコピー",
    copyAllTabs: "全タブのURLをコピー",
    copySelectedTabs: "選択中のタブのURLをコピー",
    copyQiita: "Qiitaリンクをコピー",
    fallbackInstruction: "以下のリンクを手動でコピーしてください：",
    settingsTooltip: "設定",
    languageLabel: "言語",
    manageCustomButtons: "カスタムボタンの管理",

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
    collectingCustom: "{name} のリンクを取得中...",
    copiedCustomLinks: "{name} のリンクを{count}件コピーしました。",
    noCustomLinksFound: "{name} のリンクが見つかりませんでした。",
    noResponse: "バックグラウンドから応答がありません",
    errorPrefix: "エラー: {error}",

    // Options page
    optionsTitle: "カスタムボタンの設定",
    customButtonsHeading: "カスタムボタン",
    addButton: "ボタンを追加",
    addNewButton: "新しいボタンを追加",
    buttonNameLabel: "表示名",
    hostnameLabel: "ホスト名",
    pathnameRegexLabel: "パス名の正規表現（オプション）",
    regexHelp:
      "URLのパス部分にマッチする正規表現を入力してください。空の場合はすべてのパスにマッチします。",
    save: "保存",
    cancel: "キャンセル",
    noCustomButtons: "カスタムボタンが設定されていません。",
    actionsHeading: "操作",
    confirmReset:
      "すべてのカスタムボタンをデフォルトに戻しますか？この操作は元に戻せません。",
    resetDefaults: "デフォルトに戻す",
    exportImportHeading: "エクスポート / インポート",
    exportBtn: "エクスポート",
    importBtn: "インポート",
    exportedToClipboard: "設定をエクスポートし、クリップボードにコピーしました。",
    exportedToTextarea: "設定を上のテキストエリアにエクスポートしました。",
    importEmpty: "上のテキストエリアにJSON設定を貼り付けてください。",
    importSuccess: "{count}件のボタンをインポートしました。",
    importError: "インポートに失敗しました: {error}",
    nameRequired: "表示名は必須です。",
    hostnameRequired: "ホスト名は必須です。",
    regexRequired: "パス名の正規表現は必須です。",
    invalidRegex: "無効な正規表現です。",
    saved: "保存しました。",
    resetDone: "デフォルトに戻しました。",
    buttonNameEnLabel: "表示名（英語）",
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
