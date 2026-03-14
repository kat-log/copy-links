document.addEventListener("DOMContentLoaded", async () => {
  await initI18n();
  let currentLang = await loadLanguage();
  applyTranslations();

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(currentLang, el.getAttribute("data-i18n"));
    });
    document.title = t(currentLang, "optionsTitle");
  }

  const buttonList = document.getElementById("buttonList");
  const resetDefaultsBtn = document.getElementById("resetDefaults");
  const addForm = document.getElementById("addForm");
  const formError = document.getElementById("formError");
  const inputName = document.getElementById("inputName");
  const inputNameEn = document.getElementById("inputNameEn");
  const inputHostname = document.getElementById("inputHostname");
  const inputRegex = document.getElementById("inputRegex");
  const formHeading = document.getElementById("formHeading");
  const exportImportArea = document.getElementById("exportImportArea");
  const exportImportStatus = document.getElementById("exportImportStatus");
  let editingIndex = null;

  function setExportImportStatus(text, type) {
    exportImportStatus.textContent = text;
    exportImportStatus.classList.remove("success", "error");
    if (type) exportImportStatus.classList.add(type);
  }

  function clearForm() {
    inputName.value = "";
    inputNameEn.value = "";
    inputHostname.value = "";
    inputRegex.value = "";
    formError.textContent = "";
    editingIndex = null;
    formHeading.setAttribute("data-i18n", "addNewButton");
    formHeading.textContent = t(currentLang, "addNewButton");
  }

  // Check if current buttons match the default configuration
  function isDefaultState(buttons) {
    if (buttons.length !== DEFAULT_CUSTOM_BUTTONS.length) return false;
    return DEFAULT_CUSTOM_BUTTONS.every((def, i) => {
      const btn = buttons[i];
      return (
        btn.name === def.name &&
        btn.hostname === def.hostname &&
        btn.pathnameRegex === def.pathnameRegex
      );
    });
  }

  // Render the list of custom buttons
  async function renderButtonList() {
    const buttons = await loadCustomButtons();
    buttonList.innerHTML = "";

    // Update reset button state
    resetDefaultsBtn.disabled = isDefaultState(buttons);

    if (buttons.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.setAttribute("data-i18n", "noCustomButtons");
      empty.textContent = t(currentLang, "noCustomButtons");
      buttonList.appendChild(empty);
      return;
    }

    buttons.forEach((config, index) => {
      const row = document.createElement("div");
      row.className = "button-row";
      row.innerHTML =
        '<div class="button-info">' +
        "<strong>" +
        escapeHtml(getButtonDisplayName(config, currentLang)) +
        "</strong>" +
        '<span class="button-detail">' +
        escapeHtml(config.hostname) +
        (config.pathnameRegex
          ? " &mdash; <code>" + escapeHtml(config.pathnameRegex) + "</code>"
          : "") +
        "</span>" +
        "</div>" +
        '<div class="button-actions">' +
        '<button class="btn-icon btn-edit" data-index="' +
        index +
        '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
        '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' +
        "</svg>" +
        "</button>" +
        '<button class="btn-icon btn-delete" data-index="' +
        index +
        '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="3 6 5 6 21 6"></polyline>' +
        '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
        "</svg>" +
        "</button>" +
        "</div>";
      buttonList.appendChild(row);
    });

    // Attach edit handlers
    buttonList.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.index, 10);
        const buttons = await loadCustomButtons();
        const config = buttons[idx];

        inputName.value = config.name;
        inputNameEn.value = config.nameEn || "";
        inputHostname.value = config.hostname;
        inputRegex.value = config.pathnameRegex || "";
        formError.textContent = "";

        editingIndex = idx;
        formHeading.setAttribute("data-i18n", "editButton");
        formHeading.textContent = t(currentLang, "editButton");

        addForm.style.display = "block";
        inputName.focus();
      });
    });

    // Attach delete handlers
    buttonList.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.dataset.index, 10);
        const buttons = await loadCustomButtons();
        buttons.splice(idx, 1);
        await saveCustomButtons(buttons);
        clearForm();
        addForm.style.display = "none";
        renderButtonList();
      });
    });
  }

  // Show add form
  document.getElementById("addButton").addEventListener("click", () => {
    clearForm();
    addForm.style.display = "block";
    inputName.focus();
  });

  // Cancel
  document.getElementById("cancelButton").addEventListener("click", () => {
    addForm.style.display = "none";
    clearForm();
  });

  // Save button (handles both add and edit)
  document.getElementById("saveButton").addEventListener("click", async () => {
    const name = inputName.value.trim();
    const nameEn = inputNameEn.value.trim();
    const hostname = normalizeHostname(inputHostname.value);
    const pathnameRegex = inputRegex.value.trim();

    const buttons = await loadCustomButtons();

    if (editingIndex !== null) {
      const config = { id: buttons[editingIndex].id, name, hostname, pathnameRegex };
      if (nameEn) config.nameEn = nameEn;
      const validation = validateButtonConfig(config);
      if (!validation.valid) {
        formError.textContent = t(currentLang, validation.error);
        return;
      }
      buttons[editingIndex] = config;
    } else {
      const config = { id: generateButtonId(), name, hostname, pathnameRegex };
      if (nameEn) config.nameEn = nameEn;
      const validation = validateButtonConfig(config);
      if (!validation.valid) {
        formError.textContent = t(currentLang, validation.error);
        return;
      }
      buttons.push(config);
    }

    await saveCustomButtons(buttons);
    clearForm();
    addForm.style.display = "none";
    renderButtonList();
  });

  // Reset to defaults
  document
    .getElementById("resetDefaults")
    .addEventListener("click", async () => {
      if (confirm(t(currentLang, "confirmReset"))) {
        await saveCustomButtons(DEFAULT_CUSTOM_BUTTONS);
        renderButtonList();
        setExportImportStatus(t(currentLang, "resetDone"), "success");
      }
    });

  // Export
  document.getElementById("exportBtn").addEventListener("click", async () => {
    const buttons = await loadCustomButtons();
    const json = JSON.stringify(buttons, null, 2);
    exportImportArea.value = json;
    try {
      await navigator.clipboard.writeText(json);
      setExportImportStatus(t(currentLang, "exportedToClipboard"), "success");
    } catch (e) {
      setExportImportStatus(t(currentLang, "exportedToTextarea"), "success");
    }
  });

  // Import
  document.getElementById("importBtn").addEventListener("click", async () => {
    const text = exportImportArea.value.trim();
    if (!text) {
      setExportImportStatus(t(currentLang, "importEmpty"), "error");
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Not an array");

      for (const btn of parsed) {
        if (btn.hostname) btn.hostname = normalizeHostname(btn.hostname);
        const v = validateButtonConfig(btn);
        if (!v.valid) {
          throw new Error(
            (btn.name || "?") + ": " + t(currentLang, v.error)
          );
        }
        if (!btn.id) btn.id = generateButtonId();
      }

      await saveCustomButtons(parsed);
      renderButtonList();
      setExportImportStatus(
        t(currentLang, "importSuccess", { count: parsed.length }),
        "success"
      );
    } catch (e) {
      setExportImportStatus(
        t(currentLang, "importError", { error: e.message }),
        "error"
      );
    }
  });

  renderButtonList();
});
