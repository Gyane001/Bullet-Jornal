"use strict";

const STORAGE_KEYS = {
  events: "planner-eventos",
  themes: "planner-temas",
  currentTheme: "planner-tema-atual",
  settings: "planner-personalizacoes"
};

const LIMITS = {
  min: "2026-01-01",
  max: "2030-12-31"
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

const COLOR_SETTINGS = [
  ["page-bg", "Fundo geral"],
  ["calendar-bg", "Fundo do calendário"],
  ["cell-bg", "Fundo das células"],
  ["header-bg", "Cabeçalho"],
  ["weekday-bg", "Dias da semana"],
  ["number-color", "Números dos dias"],
  ["weekend-color", "Finais de semana"],
  ["today-bg", "Dia atual"],
  ["selected-bg", "Dia selecionado"],
  ["border-color", "Bordas"],
  ["primary-text", "Texto principal"],
  ["secondary-text", "Texto secundário"],
  ["button-bg", "Botões"],
  ["button-text", "Texto dos botões"],
  ["icon-color", "Ícones"],
  ["accent-color", "Cor de destaque"]
];

const DEFAULT_THEME = {
  name: "Padrão",
  settings: {
    colors: {
      "page-bg": "#F5F1EC",
      "calendar-bg": "#FFFDFA",
      "cell-bg": "#FFFDFA",
      "header-bg": "#FFFDFA",
      "weekday-bg": "#F2ECE5",
      "number-color": "#413B36",
      "weekend-color": "#AA766E",
      "today-bg": "#EAD5CF",
      "selected-bg": "#D9C3BD",
      "border-color": "#DED3C8",
      "primary-text": "#3E3833",
      "secondary-text": "#91857B",
      "button-bg": "#5E4B45",
      "button-text": "#FFFFFF",
      "icon-color": "#6D5750",
      "accent-color": "#A98279"
    },
    dimensions: {
      radius: 18,
      border: 1,
      gap: 8,
      font: 15
    }
  }
};

let events = loadData(STORAGE_KEYS.events, []);
let themes = loadData(STORAGE_KEYS.themes, []);
let activeThemeName = localStorage.getItem(STORAGE_KEYS.currentTheme) || "Padrão";

let viewDate = new Date();
let selectedDate = new Date();
let editingEventId = null;

const $ = selector => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
  viewDate = clampDate(viewDate);
  selectedDate = clampDate(selectedDate);

  const savedSettings = loadData(STORAGE_KEYS.settings, null);
  if (savedSettings) {
    applySettings(savedSettings, false);
  } else {
    applyTheme(DEFAULT_THEME, false);
  }

  bindEvents();
  renderCalendar();
  renderEventPanel();
  renderCustomizationControls();
  renderThemes();
}

function bindEvents() {
  $("#menuButton").addEventListener("click", toggleMenu);
  $("#closeMenuButton").addEventListener("click", closeMenu);
  $("#menuOverlay").addEventListener("click", closeMenu);

  $("#previousMonthButton").addEventListener("click", () => changeMonth(-1));
  $("#nextMonthButton").addEventListener("click", () => changeMonth(1));
  $("#todayButton").addEventListener("click", goToToday);

  $("#headerAddButton").addEventListener("click", () => openEventModal());
  $("#panelAddButton").addEventListener("click", () => openEventModal());
  $("#wideAddButton").addEventListener("click", () => openEventModal());

  $("#eventForm").addEventListener("submit", saveEventFromForm);
  $("#deleteEventButton").addEventListener("click", deleteEditingEvent);

  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeModal(backdrop.id);
    });
  });

  document.querySelectorAll("[data-menu-action]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.menuAction;

      if (action === "customize" || action === "themes") {
        openModal("customizeModalBackdrop");
      } else if (action === "events") {
        document.querySelector(".events-panel").scrollIntoView({ behavior: "smooth" });
      } else if (action === "calendar") {
        document.querySelector(".calendar-panel").scrollIntoView({ behavior: "smooth" });
      } else {
        alert("Esta área está preparada para futuras configurações.");
      }

      closeMenu();
    });
  });

  bindColorPair("eventColorPicker", "eventColorHex", "eventColorError");
  bindColorPair("eventTextColorPicker", "eventTextColorHex", "eventTextColorError");

  $("#saveThemeButton").addEventListener("click", saveTheme);
  $("#restoreDefaultButton").addEventListener("click", restoreDefaultTheme);

  $("#radiusRange").addEventListener("input", updateDimension);
  $("#borderRange").addEventListener("input", updateDimension);
  $("#gapRange").addEventListener("input", updateDimension);
  $("#fontRange").addEventListener("input", updateDimension);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
      document.querySelectorAll(".modal-backdrop.open").forEach(modal => closeModal(modal.id));
    }
  });
}

function renderCalendar() {
  const grid = $("#calendarGrid");
  grid.innerHTML = "";

  $("#currentMonthLabel").textContent =
    `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  const firstDay = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1
  );

  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  for (let week = 0; week < 6; week++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + week * 7);

    const weekElement = document.createElement("div");
    weekElement.className = "calendar-week";

    const daysRow = document.createElement("div");
    daysRow.className = "days-row";

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayIndex);

      const dateString = formatDate(date);

      /*
       * Utilizamos uma div em vez de button para permitir
       * que os botões das tags fiquem dentro da célula.
       */
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.dataset.date = dateString;
      cell.tabIndex = 0;
      cell.setAttribute("role", "button");

      if (date.getMonth() !== viewDate.getMonth()) {
        cell.classList.add("other-month");
      }

      if (date.getDay() === 0 || date.getDay() === 6) {
        cell.classList.add("weekend");
      }

      if (isSameDate(date, new Date())) {
        cell.classList.add("today");
      }

      if (isSameDate(date, selectedDate)) {
        cell.classList.add("selected");
      }

      const number = document.createElement("span");
      number.className = "day-number";
      number.textContent = date.getDate();

      const eventLayer = document.createElement("div");
      eventLayer.className = "event-layer";

      const dayEvents = events
        .filter(event => dateIsBetween(date, event.start, event.end))
        .sort((a, b) => a.start.localeCompare(b.start));

      const visibleEvents = dayEvents.slice(0, 3);
      const remainingEvents = dayEvents.length - visibleEvents.length;

      visibleEvents.forEach(event => {
        const tag = document.createElement("button");
        tag.type = "button";
        tag.className = "event-bar";
        tag.style.setProperty("--event-color", event.color);
        tag.style.setProperty("--event-text-color", event.textColor);
        tag.title = `${event.icon} ${event.name}`;

        tag.innerHTML = `
          <span class="bar-icon">${escapeHTML(event.icon)}</span>
          <span class="bar-name">${escapeHTML(event.name)}</span>
        `;

        tag.addEventListener("click", clickEventHandler(event.id));
        eventLayer.appendChild(tag);
      });

      
      if (remainingEvents > 0) {
        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.className = "more-events-button";
        moreButton.title = `Visualizar mais ${remainingEvents} tarefa(s)`;
        moreButton.textContent = "＋";


        moreButton.addEventListener("click", event => {
          event.stopPropagation();
        });
        eventLayer.appendChild(moreButton);
      }

      cell.appendChild(number);
      cell.appendChild(eventLayer);

      cell.addEventListener("click", () => selectDate(date));

      cell.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectDate(date);
        }
      });

      daysRow.appendChild(cell);
    }


    weekElement.appendChild(daysRow);
    grid.appendChild(weekElement);
  }
}
function getEventsForWeek(weekStart) {
  const weekEnd = addDays(weekStart, 6);

  return events
    .filter(event => rangesOverlap(
      parseDate(event.start),
      parseDate(event.end),
      weekStart,
      weekEnd
    ))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function selectDate(date) {
  selectedDate = clampDate(date);
  viewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  renderCalendar();
  renderEventPanel();
}

function changeMonth(amount) {
  const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + amount, 1);

  if (next.getFullYear() < 2026 || next.getFullYear() > 2030) return;

  viewDate = next;

  const selectedDay = Math.min(
    selectedDate.getDate(),
    daysInMonth(viewDate.getFullYear(), viewDate.getMonth())
  );

  selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDay);
  renderCalendar();
  renderEventPanel();
}

function goToToday() {
  const today = clampDate(new Date());
  viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDate = today;
  renderCalendar();
  renderEventPanel();
}

function renderEventPanel() {
  const dateText = selectedDate.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long"
  });

  $("#selectedDateTitle").textContent =
    dateText.charAt(0).toUpperCase() + dateText.slice(1);

  $("#selectedWeekday").textContent = WEEKDAYS[selectedDate.getDay()];

  const dayEvents = events
    .filter(event => dateIsBetween(selectedDate, event.start, event.end))
    .sort((a, b) => a.start.localeCompare(b.start));

  $("#eventCount").textContent = `${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"
    }`;

  const list = $("#eventList");
  list.innerHTML = "";

  if (!dayEvents.length) {
    list.innerHTML = `<div class="empty-state">Nenhum evento para este dia.</div>`;
    return;
  }

  dayEvents.forEach(event => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "event-card";
    card.style.setProperty("--event-color", event.color);
    card.style.setProperty("--event-text-color", event.textColor);

    card.innerHTML = `
      <span class="event-icon">${escapeHTML(event.icon)}</span>
      <span>
        <strong>${escapeHTML(event.name)}</strong>
        <small>${formatDateBR(event.start)} → ${formatDateBR(event.end)}</small>
      </span>
      <span class="event-card-menu">⋯</span>
    `;

    card.addEventListener("click", clickEventHandler(event.id));
    list.appendChild(card);
  });
}

function openEventModal(eventId = null) {
  editingEventId = eventId;
  const event = eventId ? events.find(item => item.id === eventId) : null;

  $("#eventModalTitle").textContent = event ? "Editar evento" : "Novo evento";
  $("#deleteEventButton").classList.toggle("hidden", !event);

  $("#eventId").value = event?.id || "";
  $("#eventName").value = event?.name || "";
  $("#eventIcon").value = event?.icon || "✦";
  $("#eventStart").value = event?.start || formatDate(selectedDate);
  $("#eventEnd").value = event?.end || formatDate(selectedDate);

  setColorPair(
    "eventColorPicker",
    "eventColorHex",
    event?.color || "#A855F7"
  );

  setColorPair(
    "eventTextColorPicker",
    "eventTextColorHex",
    event?.textColor || "#FFFFFF"
  );

  clearColorErrors();
  openModal("eventModalBackdrop");
  setTimeout(() => $("#eventName").focus(), 50);
}

function saveEventFromForm(event) {
  event.preventDefault();

  const name = $("#eventName").value.trim();
  const start = $("#eventStart").value;
  const end = $("#eventEnd").value;
  const color = normalizeHex($("#eventColorHex").value);
  const textColor = normalizeHex($("#eventTextColorHex").value);

  if (!name || !start || !end) return;

  if (start > end) {
    alert("A data final deve ser igual ou posterior à data inicial.");
    return;
  }

  if (start < LIMITS.min || end > LIMITS.max) {
    alert("Os eventos devem estar entre 2026 e 2030.");
    return;
  }

  if (!isValidHex(color) || !isValidHex(textColor)) {
    showColorErrors(color, textColor);
    return;
  }

  const eventData = {
    id: editingEventId || crypto.randomUUID(),
    name,
    icon: $("#eventIcon").value.trim() || "✦",
    start,
    end,
    color,
    textColor
  };

  if (editingEventId) {
    events = events.map(item => item.id === editingEventId ? eventData : item);
  } else {
    events.push(eventData);
  }

  saveData(STORAGE_KEYS.events, events);
  closeModal("eventModalBackdrop");

  selectedDate = parseDate(start);
  viewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

  renderCalendar();
  renderEventPanel();
}

function deleteEditingEvent() {
  if (!editingEventId) return;

  const event = events.find(item => item.id === editingEventId);
  if (!event) return;

  if (!confirm(`Excluir o evento "${event.name}"?`)) return;

  events = events.filter(item => item.id !== editingEventId);
  saveData(STORAGE_KEYS.events, events);

  closeModal("eventModalBackdrop");
  renderCalendar();
  renderEventPanel();
}

function clickEventHandler(eventId) {
  return mouseEvent => {
    mouseEvent.stopPropagation();
    openEventModal(eventId);
  };
}

function bindColorPair(pickerId, hexId, errorId) {
  const picker = $(`#${pickerId}`);
  const hex = $(`#${hexId}`);

  picker.addEventListener("input", () => {
    hex.value = picker.value.toUpperCase();
    $(`#${errorId}`).textContent = "";
  });

  hex.addEventListener("input", () => {
    const value = normalizeHex(hex.value);

    if (isValidHex(value)) {
      picker.value = value;
      $(`#${errorId}`).textContent = "";
    } else {
      $(`#${errorId}`).textContent = "Informe uma cor HEX válida.";
    }
  });

  hex.addEventListener("blur", () => {
    const value = normalizeHex(hex.value);
    if (isValidHex(value)) hex.value = value;
  });
}

function setColorPair(pickerId, hexId, value) {
  const color = normalizeHex(value);
  $(`#${pickerId}`).value = isValidHex(color) ? color : "#000000";
  $(`#${hexId}`).value = color;
}

function clearColorErrors() {
  $("#eventColorError").textContent = "";
  $("#eventTextColorError").textContent = "";
}

function showColorErrors(color, textColor) {
  $("#eventColorError").textContent = isValidHex(color) ? "" : "Informe uma cor HEX válida.";
  $("#eventTextColorError").textContent = isValidHex(textColor) ? "" : "Informe uma cor HEX válida.";
}

function renderCustomizationControls() {
  const container = $("#colorSettings");
  container.innerHTML = "";

  const current = getCurrentSettings();

  COLOR_SETTINGS.forEach(([key, label]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "custom-color";
    wrapper.innerHTML = `
      <label for="custom-${key}">${label}</label>
      <input type="color" id="picker-${key}" value="${current.colors[key]}">
      <input type="text" id="custom-${key}" value="${current.colors[key]}" maxlength="7">
    `;

    container.appendChild(wrapper);

    const picker = $(`#picker-${key}`);
    const hex = $(`#custom-${key}`);

    picker.addEventListener("input", () => {
      hex.value = picker.value.toUpperCase();
      updateCustomColor(key, picker.value);
    });

    hex.addEventListener("input", () => {
      const value = normalizeHex(hex.value);
      if (isValidHex(value)) {
        picker.value = value;
        updateCustomColor(key, value);
      }
    });
  });

  const dimensions = current.dimensions;
  $("#radiusRange").value = dimensions.radius;
  $("#borderRange").value = dimensions.border;
  $("#gapRange").value = dimensions.gap;
  $("#fontRange").value = dimensions.font;
  updateRangeOutputs(dimensions);
}

function updateCustomColor(key, value) {
  if (!isValidHex(value)) return;

  document.documentElement.style.setProperty(`--${key}`, value.toUpperCase());

  const settings = getCurrentSettings();
  settings.colors[key] = value.toUpperCase();
  saveData(STORAGE_KEYS.settings, settings);
}

function updateDimension() {
  const dimensions = {
    radius: Number($("#radiusRange").value),
    border: Number($("#borderRange").value),
    gap: Number($("#gapRange").value),
    font: Number($("#fontRange").value)
  };

  document.documentElement.style.setProperty("--radius", `${dimensions.radius}px`);
  document.documentElement.style.setProperty("--border-width", `${dimensions.border}px`);
  document.documentElement.style.setProperty("--cell-gap", `${dimensions.gap}px`);
  document.documentElement.style.setProperty("--base-font-size", `${dimensions.font}px`);

  updateRangeOutputs(dimensions);

  const settings = getCurrentSettings();
  settings.dimensions = dimensions;
  saveData(STORAGE_KEYS.settings, settings);
  renderCalendar();
}

function updateRangeOutputs(dimensions) {
  $("#radiusOutput").value = `${dimensions.radius}px`;
  $("#borderOutput").value = `${dimensions.border}px`;
  $("#gapOutput").value = `${dimensions.gap}px`;
  $("#fontOutput").value = `${dimensions.font}px`;
}

function getCurrentSettings() {
  const styles = getComputedStyle(document.documentElement);

  const colors = {};
  COLOR_SETTINGS.forEach(([key]) => {
    colors[key] = styles.getPropertyValue(`--${key}`).trim().toUpperCase();
  });

  return {
    colors,
    dimensions: {
      radius: Number($("#radiusRange")?.value || 18),
      border: Number($("#borderRange")?.value || 1),
      gap: Number($("#gapRange")?.value || 8),
      font: Number($("#fontRange")?.value || 15)
    }
  };
}

function saveTheme() {
  const nameInput = $("#themeName");
  const name = nameInput.value.trim();

  if (!name) {
    alert("Digite um nome para o tema.");
    nameInput.focus();
    return;
  }

  const theme = {
    name,
    settings: getCurrentSettings()
  };

  const existingIndex = themes.findIndex(item => item.name.toLowerCase() === name.toLowerCase());

  if (existingIndex >= 0) {
    themes[existingIndex] = theme;
  } else {
    themes.push(theme);
  }

  saveData(STORAGE_KEYS.themes, themes);
  activeThemeName = name;
  localStorage.setItem(STORAGE_KEYS.currentTheme, name);
  nameInput.value = "";
  renderThemes();
}

function renderThemes() {
  const list = $("#themesList");
  list.innerHTML = "";

  const allThemes = [DEFAULT_THEME, ...themes];

  allThemes.forEach(theme => {
    const row = document.createElement("div");
    row.className = "theme-row";

    const isDefault = theme.name === DEFAULT_THEME.name;

    row.innerHTML = `
      <strong>${escapeHTML(theme.name)}${theme.name === activeThemeName ? " · ativo" : ""}</strong>
      <button type="button" data-theme-apply="${escapeHTML(theme.name)}">Aplicar</button>
      ${!isDefault ? `<button type="button" data-theme-edit="${escapeHTML(theme.name)}">Editar</button>` : ""}
      ${!isDefault ? `<button type="button" class="delete-theme" data-theme-delete="${escapeHTML(theme.name)}">Excluir</button>` : ""}
    `;

    list.appendChild(row);
  });

  list.querySelectorAll("[data-theme-apply]").forEach(button => {
    button.addEventListener("click", () => {
      const theme = findTheme(button.dataset.themeApply);
      if (theme) {
        applyTheme(theme);
        activeThemeName = theme.name;
        localStorage.setItem(STORAGE_KEYS.currentTheme, theme.name);
        renderThemes();
      }
    });
  });

  list.querySelectorAll("[data-theme-edit]").forEach(button => {
    button.addEventListener("click", () => {
      const theme = findTheme(button.dataset.themeEdit);
      if (!theme) return;

      applyTheme(theme);
      $("#themeName").value = theme.name;
      activeThemeName = theme.name;
      localStorage.setItem(STORAGE_KEYS.currentTheme, theme.name);
      renderThemes();
    });
  });

  list.querySelectorAll("[data-theme-delete]").forEach(button => {
    button.addEventListener("click", () => {
      const name = button.dataset.themeDelete;

      if (!confirm(`Excluir o tema "${name}"?`)) return;

      themes = themes.filter(theme => theme.name !== name);
      saveData(STORAGE_KEYS.themes, themes);

      if (activeThemeName === name) {
        applyTheme(DEFAULT_THEME);
        activeThemeName = DEFAULT_THEME.name;
        localStorage.setItem(STORAGE_KEYS.currentTheme, DEFAULT_THEME.name);
      }

      renderThemes();
    });
  });
}

function findTheme(name) {
  if (name === DEFAULT_THEME.name) return DEFAULT_THEME;
  return themes.find(theme => theme.name === name);
}

function applyTheme(theme, persist = true) {
  applySettings(theme.settings, persist);
}

function applySettings(settings, persist = true) {
  const colors = settings.colors || DEFAULT_THEME.settings.colors;
  const dimensions = settings.dimensions || DEFAULT_THEME.settings.dimensions;

  Object.entries(colors).forEach(([key, value]) => {
    if (isValidHex(value)) {
      document.documentElement.style.setProperty(`--${key}`, value);
    }
  });

  document.documentElement.style.setProperty("--radius", `${dimensions.radius}px`);
  document.documentElement.style.setProperty("--border-width", `${dimensions.border}px`);
  document.documentElement.style.setProperty("--cell-gap", `${dimensions.gap}px`);
  document.documentElement.style.setProperty("--base-font-size", `${dimensions.font}px`);

  if (persist) {
    saveData(STORAGE_KEYS.settings, {
      colors: { ...colors },
      dimensions: { ...dimensions }
    });
  }

  if ($("#colorSettings")) {
    renderCustomizationControls();
  }

  renderCalendar();
}

function restoreDefaultTheme() {
  if (!confirm("Restaurar todas as configurações do tema padrão?")) return;

  applyTheme(DEFAULT_THEME);
  activeThemeName = DEFAULT_THEME.name;
  localStorage.setItem(STORAGE_KEYS.currentTheme, DEFAULT_THEME.name);
  $("#themeName").value = "";
  renderThemes();
}

function toggleMenu() {
  $("#sideMenu").classList.toggle("open");
  $("#menuOverlay").classList.toggle("visible");
}

function closeMenu() {
  $("#sideMenu").classList.remove("open");
  $("#menuOverlay").classList.remove("visible");
}

function openModal(id) {
  $(`#${id}`).classList.add("open");
}

function closeModal(id) {
  $(`#${id}`).classList.remove("open");
}

function dateIsBetween(date, start, end) {
  const value = formatDate(date);
  return value >= start && value <= end;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateBR(value) {
  return parseDate(value).toLocaleDateString("pt-BR");
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDate(first, second) {
  return formatDate(first) === formatDate(second);
}

function clampDate(date) {
  const value = formatDate(date);

  if (value < LIMITS.min) return parseDate(LIMITS.min);
  if (value > LIMITS.max) return parseDate(LIMITS.max);

  return date;
}

function normalizeHex(value) {
  let normalized = String(value || "").trim().toUpperCase();

  if (!normalized.startsWith("#") && /^[0-9A-F]{6}$/i.test(normalized)) {
    normalized = `#${normalized}`;
  }

  return normalized;
}

function isValidHex(value) {
  return /^#[0-9A-F]{6}$/i.test(value);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}