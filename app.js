const STORAGE_KEY = "catch-report:catches:v1";
const LOCAL_CHANGE_EVENT = "catchreport:local-change";
const MAP_PADDING = 30;
const LAKE_MARGARET = {
  id: "lake-margaret",
  name: "Lake Margaret",
  waterType: "Freshwater lake",
  lat: 47.7664892,
  lng: -121.9012317,
  zoom: 15,
};

const freshwaterFish = [
  "Rainbow trout",
  "Cutthroat trout",
  "Kokanee",
  "Largemouth bass",
  "Smallmouth bass",
  "Yellow perch",
  "Bluegill",
  "Other",
];

const pugetSoundFish = [
  "Chinook salmon",
  "Coho salmon",
  "Pink salmon",
  "Chum salmon",
  "Sea-run cutthroat trout",
  "Lingcod",
  "Flounder / flatfish",
  "Kelp greenling",
  "Cabezon",
  "Pacific halibut",
  "Other",
];

const freshwaterLures = [
  "Spinner",
  "Spoon",
  "Jig",
  "Crankbait",
  "Soft plastic",
  "Worm",
  "PowerBait",
  "Fly",
  "Other",
];

const saltwaterLures = [
  "Trolling spoon",
  "Flasher and hoochie",
  "Buzz bomb",
  "Jig",
  "Plug",
  "Herring / bait",
  "Swimbait",
  "Fly",
  "Other",
];

const waterAreas = [
  {
    ...LAKE_MARGARET,
    span: {
      lat: 0.0032,
      lng: 0.0036,
    },
    fish: freshwaterFish,
    lures: freshwaterLures,
  },
  {
    id: "puget-sound",
    name: "Puget Sound",
    waterType: "Saltwater",
    lat: 47.6413,
    lng: -122.4307,
    zoom: 10,
    span: {
      lat: 0.23,
      lng: 0.22,
    },
    fish: pugetSoundFish,
    lures: saltwaterLures,
  },
  {
    id: "other-lake",
    name: "Other lake",
    waterType: "Freshwater lake",
    lat: 47.7511,
    lng: -121.9837,
    zoom: 11,
    span: {
      lat: 0.02,
      lng: 0.02,
    },
    fish: freshwaterFish,
    lures: freshwaterLures,
  },
  {
    id: "custom-water",
    name: "Custom water",
    waterType: "Custom",
    lat: LAKE_MARGARET.lat,
    lng: LAKE_MARGARET.lng,
    zoom: 12,
    span: {
      lat: 0.02,
      lng: 0.02,
    },
    fish: [...freshwaterFish.slice(0, -1), ...pugetSoundFish.slice(0, -1), "Other"],
    lures: [...freshwaterLures.slice(0, -1), ...saltwaterLures.slice(0, -1), "Other"],
  },
];

const state = {
  catches: loadCatches(),
  map: null,
  mapPlot: null,
  mapBounds: null,
  selectedLatLng: null,
  activeAreaId: LAKE_MARGARET.id,
  shouldFitMap: false,
  suppressSyncEvent: false,
  filters: {
    area: "All",
    fish: "All",
    lure: "All",
  },
};

const els = {
  form: document.querySelector("#catch-form"),
  waterArea: document.querySelector("#water-area"),
  fish: document.querySelector("#fish"),
  fishOther: document.querySelector("#fish-other"),
  lure: document.querySelector("#lure"),
  lureOther: document.querySelector("#lure-other"),
  caughtAt: document.querySelector("#caught-at"),
  locationName: document.querySelector("#location-name"),
  lat: document.querySelector("#lat"),
  lng: document.querySelector("#lng"),
  notes: document.querySelector("#notes"),
  locateBtn: document.querySelector("#locate-btn"),
  useAreaBtn: document.querySelector("#area-btn"),
  resetBtn: document.querySelector("#reset-btn"),
  totalCount: document.querySelector("#total-count"),
  bestTime: document.querySelector("#best-time"),
  topFish: document.querySelector("#top-fish"),
  topSpot: document.querySelector("#top-spot"),
  catchList: document.querySelector("#catch-list"),
  areaFilter: document.querySelector("#area-filter"),
  fishFilter: document.querySelector("#fish-filter"),
  lureFilter: document.querySelector("#lure-filter"),
  fitMapBtn: document.querySelector("#fit-map-btn"),
  mapEl: document.querySelector("#map"),
  mapPlot: document.querySelector("#map-plot"),
  filterSummary: document.querySelector("#filter-summary"),
  positionButtons: document.querySelectorAll("[data-position]"),
  timeBars: document.querySelector("#time-bars"),
  lureRanking: document.querySelector("#lure-ranking"),
  privacyNote: document.querySelector("#privacy-note"),
  syncStatus: document.querySelector("#sync-status"),
  signInBtn: document.querySelector("#sign-in-btn"),
  signOutBtn: document.querySelector("#sign-out-btn"),
  installHint: document.querySelector("#install-hint"),
};

function init() {
  populateAreaSelect();
  applyAreaPreset(LAKE_MARGARET.id, { moveMap: false });
  els.caughtAt.value = toDateTimeInputValue(new Date());
  initMap();
  bindEvents();
  render();
  registerServiceWorker();
  lucide.createIcons();
}

function populateSelect(select, values) {
  select.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function bindEvents() {
  els.waterArea.addEventListener("change", (event) => applyAreaPreset(event.target.value, { moveMap: true }));
  els.fish.addEventListener("change", () => toggleOtherField(els.fish, els.fishOther));
  els.lure.addEventListener("change", () => toggleOtherField(els.lure, els.lureOther));
  els.locateBtn.addEventListener("click", useCurrentLocation);
  els.useAreaBtn.addEventListener("click", () => {
    applyQuickPosition("center", { moveMap: true });
  });
  els.positionButtons.forEach((button) => {
    button.addEventListener("click", () => applyQuickPosition(button.dataset.position, { moveMap: true }));
  });
  els.form.addEventListener("submit", saveCatch);
  els.resetBtn.addEventListener("click", resetForm);
  els.fishFilter.addEventListener("change", (event) => {
    state.filters.fish = event.target.value;
    render();
  });
  els.areaFilter.addEventListener("change", (event) => {
    state.filters.area = event.target.value;
    const area = waterAreas.find((item) => item.name === state.filters.area);
    if (area) state.mapBounds = boundsAroundArea(area);
    render();
  });
  els.lureFilter.addEventListener("change", (event) => {
    state.filters.lure = event.target.value;
    render();
  });
  els.fitMapBtn.addEventListener("click", () => {
    state.shouldFitMap = true;
    render();
  });
}

function initMap() {
  state.map = true;
  state.mapPlot = els.mapPlot;
  state.mapBounds = boundsAroundArea(LAKE_MARGARET);

  els.mapEl.addEventListener("click", (event) => {
    const rect = els.mapEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const coords = screenToLatLng(x, y, state.mapBounds, rect.width, rect.height);
    setSelectedLocation(coords.lat, coords.lng, "Dropped pin");
    renderMap(getFilteredCatches());
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => renderMap(getFilteredCatches())).observe(els.mapEl);
  } else {
    window.addEventListener("resize", () => renderMap(getFilteredCatches()));
  }
}

function populateAreaSelect() {
  els.waterArea.innerHTML = waterAreas
    .map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`)
    .join("");
}

function applyAreaPreset(areaId, options = {}) {
  const area = waterAreas.find((item) => item.id === areaId) || waterAreas[0];
  state.activeAreaId = area.id;
  els.waterArea.value = area.id;
  populateSelect(els.fish, area.fish);
  populateSelect(els.lure, area.lures);
  toggleOtherField(els.fish, els.fishOther);
  toggleOtherField(els.lure, els.lureOther);
  setSelectedLocation(area.lat, area.lng, area.name);
  if (options.moveMap && state.map) {
    state.mapBounds = boundsAroundArea(area);
    renderMap(getFilteredCatches());
  }
}

function getActiveArea() {
  return waterAreas.find((area) => area.id === state.activeAreaId) || waterAreas[0];
}

function getCatchAreaName(entry) {
  return entry.areaName || waterAreas.find((area) => area.id === entry.areaId)?.name || LAKE_MARGARET.name;
}

function applyQuickPosition(position, options = {}) {
  const area = getActiveArea();
  const coords = getPositionCoordinates(area, position);
  const label = position === "center" ? area.name : `${capitalize(position)} ${area.waterType === "Saltwater" ? "area" : "shore"}`;
  setSelectedLocation(coords.lat, coords.lng, label);
  if (options.moveMap && state.map) {
    state.mapBounds = boundsAroundPoint(coords, area);
    renderMap(getFilteredCatches());
  }
}

function getPositionCoordinates(area, position) {
  const span = area.span || { lat: 0.02, lng: 0.02 };
  const offsets = {
    north: { lat: span.lat, lng: 0 },
    south: { lat: -span.lat, lng: 0 },
    east: { lat: 0, lng: span.lng },
    west: { lat: 0, lng: -span.lng },
    center: { lat: 0, lng: 0 },
  };
  const offset = offsets[position] || offsets.center;
  return {
    lat: area.lat + offset.lat,
    lng: area.lng + offset.lng,
  };
}

function toggleOtherField(select, input) {
  input.hidden = select.value !== "Other";
  input.required = select.value === "Other";
  if (!input.hidden) input.focus();
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showPrivacy("Location is not available in this browser.");
    return;
  }

  showPrivacy("Asking this device for GPS. Your location stays in this browser.");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      setSelectedLocation(latitude, longitude, "Current location");
      state.mapBounds = boundsAroundPoint({ lat: latitude, lng: longitude }, getActiveArea());
      renderMap(getFilteredCatches());
      showPrivacy("GPS location filled in.");
    },
    () => {
      showPrivacy("GPS was blocked or unavailable. Tap the map or use Lake Margaret.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

function saveCatch(event) {
  event.preventDefault();
  const area = getActiveArea();
  const fish = getSelectValue(els.fish, els.fishOther);
  const lure = getSelectValue(els.lure, els.lureOther);
  const lat = Number.parseFloat(els.lat.value);
  const lng = Number.parseFloat(els.lng.value);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    showPrivacy("Choose a location before saving.");
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    areaId: area.id,
    areaName: area.name,
    waterType: area.waterType,
    fish,
    lure,
    caughtAt: new Date(els.caughtAt.value).toISOString(),
    locationName: els.locationName.value.trim() || "Unnamed spot",
    lat,
    lng,
    notes: els.notes.value.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.catches.unshift(entry);
  persist();
  resetForm({ preserveArea: true });
  render();
  showPrivacy("Catch saved locally.");
}

function getSelectValue(select, otherInput) {
  return select.value === "Other" ? otherInput.value.trim() || "Other" : select.value;
}

function setSelectedLocation(lat, lng, name = "") {
  state.selectedLatLng = { lat, lng };
  els.lat.value = lat.toFixed(6);
  els.lng.value = lng.toFixed(6);
  if (name) els.locationName.value = name;
  if (state.map) renderMap(getFilteredCatches());
}

function resetForm(options = {}) {
  const nextAreaId = options.preserveArea ? state.activeAreaId : LAKE_MARGARET.id;
  els.form.reset();
  els.caughtAt.value = toDateTimeInputValue(new Date());
  applyAreaPreset(nextAreaId, { moveMap: false });
}

function render() {
  const catches = getFilteredCatches();
  renderFilterOptions();
  renderFilterSummary(catches);
  renderStats(catches);
  renderMap(catches);
  renderList(catches);
  renderTimeBars(catches);
  renderLureRanking(catches);
  els.installHint.hidden = window.matchMedia("(display-mode: standalone)").matches;
  lucide.createIcons();
}

function getFilteredCatches() {
  return state.catches.filter((entry) => {
    const areaMatch = state.filters.area === "All" || getCatchAreaName(entry) === state.filters.area;
    const fishMatch = state.filters.fish === "All" || entry.fish === state.filters.fish;
    const lureMatch = state.filters.lure === "All" || entry.lure === state.filters.lure;
    return areaMatch && fishMatch && lureMatch;
  });
}

function renderFilterOptions() {
  const areaValues = ["All", ...uniqueValues(state.catches.map(getCatchAreaName))];
  const fishValues = ["All", ...uniqueValues(state.catches.map((entry) => entry.fish))];
  const lureValues = ["All", ...uniqueValues(state.catches.map((entry) => entry.lure))];
  syncOptions(els.areaFilter, areaValues, state.filters.area, "All waters");
  syncOptions(els.fishFilter, fishValues, state.filters.fish, "All fish");
  syncOptions(els.lureFilter, lureValues, state.filters.lure, "All lures");
}

function syncOptions(select, values, selected, allLabel = "All") {
  const markup = values
    .map((value) => {
      const label = value === "All" ? allLabel : value;
      return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    })
    .join("");
  if (select.innerHTML !== markup) select.innerHTML = markup;
  select.value = values.includes(selected) ? selected : "All";
}

function renderFilterSummary(catches) {
  const activeFilters = [
    state.filters.area !== "All" ? state.filters.area : "",
    state.filters.fish !== "All" ? state.filters.fish : "",
    state.filters.lure !== "All" ? state.filters.lure : "",
  ].filter(Boolean);
  els.filterSummary.textContent =
    activeFilters.length > 0
      ? `Showing ${catches.length} matching ${catches.length === 1 ? "catch" : "catches"}`
      : `Showing all ${catches.length || ""} ${catches.length === 1 ? "catch" : "catches"}`.replace("  ", " ");
}

function renderStats(catches) {
  els.totalCount.textContent = catches.length.toString();
  els.bestTime.textContent = labelBestTime(catches);
  els.topFish.textContent = topValue(catches, "fish") || "No data";
  els.topSpot.textContent = labelTopSpot(catches);
}

function renderMap(catches) {
  const plot = state.mapPlot;
  if (!plot) return;

  const width = 1000;
  const height = 520;

  if (state.shouldFitMap && catches.length > 0) {
    state.mapBounds = boundsForCatches(catches);
    state.shouldFitMap = false;
  }

  const bounds = state.mapBounds || boundsAroundArea(getActiveArea());
  state.mapBounds = bounds;

  const groups = groupNearby(catches);
  const hotspotMarkup = groups.map((group) => {
    const point = latLngToScreen(group.lat, group.lng, bounds, width, height);
    const radius = Math.min(58, 18 + group.items.length * 8);
    const opacity = Math.min(0.35, 0.12 + group.items.length * 0.04);
    return `<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="rgba(241,118,58,${opacity})" stroke="rgba(241,118,58,0.75)" stroke-width="2" />`;
  }).join("");

  const catchMarkup = catches.map((entry) => {
    const point = latLngToScreen(entry.lat, entry.lng, bounds, width, height);
    return `<circle cx="${point.x}" cy="${point.y}" r="9" fill="#f7c66b" stroke="#0f3d38" stroke-width="4" />`;
  }).join("");

  let selectedMarkup = "";
  if (state.selectedLatLng) {
    const point = latLngToScreen(state.selectedLatLng.lat, state.selectedLatLng.lng, bounds, width, height);
    selectedMarkup = `
      <circle cx="${point.x}" cy="${point.y}" r="18" fill="none" stroke="#fffdf7" stroke-width="8" />
      <circle cx="${point.x}" cy="${point.y}" r="16" fill="none" stroke="#28666a" stroke-width="4" />
      <line x1="${point.x - 24}" y1="${point.y}" x2="${point.x + 24}" y2="${point.y}" stroke="#28666a" stroke-width="4" />
      <line x1="${point.x}" y1="${point.y - 24}" x2="${point.x}" y2="${point.y + 24}" stroke="#28666a" stroke-width="4" />
    `;
  }

  plot.innerHTML = `
    ${mapBaseMarkup(width, height, bounds)}
    ${hotspotMarkup}
    ${catchMarkup}
    ${selectedMarkup}
  `;
}

function mapBaseMarkup(width, height, bounds) {
  const grid = [1, 2, 3]
    .map((i) => {
      const x = MAP_PADDING + ((width - MAP_PADDING * 2) / 4) * i;
      const y = MAP_PADDING + ((height - MAP_PADDING * 2) / 4) * i;
      return `
        <line x1="${x}" y1="${MAP_PADDING}" x2="${x}" y2="${height - MAP_PADDING}" />
        <line x1="${MAP_PADDING}" y1="${y}" x2="${width - MAP_PADDING}" y2="${y}" />
      `;
    })
    .join("");

  return `
    <defs>
      <linearGradient id="plot-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#c9dcd4" />
        <stop offset="52%" stop-color="#dbe7dd" />
        <stop offset="100%" stop-color="#b9d2d5" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#plot-bg)" />
    <ellipse cx="${width * 0.22}" cy="${height * 0.2}" rx="${width * 0.36}" ry="${height * 0.18}" fill="rgba(255,253,247,0.42)" transform="rotate(-14 ${width * 0.22} ${height * 0.2})" />
    <ellipse cx="${width * 0.78}" cy="${height * 0.78}" rx="${width * 0.42}" ry="${height * 0.2}" fill="rgba(255,253,247,0.42)" transform="rotate(-11 ${width * 0.78} ${height * 0.78})" />
    <g stroke="rgba(15,61,56,0.16)" stroke-width="2">${grid}</g>
    <g fill="rgba(15,61,56,0.72)" font-family="system-ui, sans-serif" font-size="18" font-weight="800">
      <text x="${width / 2}" y="28" text-anchor="middle">N</text>
      <text x="${width / 2}" y="${height - 14}" text-anchor="middle">S</text>
      <text x="20" y="${height / 2 + 6}">W</text>
      <text x="${width - 28}" y="${height / 2 + 6}">E</text>
    </g>
    <text x="${MAP_PADDING}" y="${height - MAP_PADDING + 18}" fill="rgba(15,61,56,0.72)" font-family="system-ui, sans-serif" font-size="18" font-weight="750">${escapeHtml(bounds.label || "Selected water")} catch plot</text>
  `;
}

function renderList(catches) {
  if (catches.length === 0) {
    els.catchList.innerHTML = `<li class="empty">No catches yet. Log one from the form above.</li>`;
    return;
  }

  els.catchList.innerHTML = catches
    .slice(0, 24)
    .map(
      (entry) => `
        <li class="catch-card">
          <div>
            <strong>${escapeHtml(entry.fish)}</strong>
            <span>${escapeHtml(entry.lure)} at ${escapeHtml(entry.locationName)}</span>
          </div>
          <span class="area-chip">${escapeHtml(getCatchAreaName(entry))}</span>
          <time>${formatDateTime(entry.caughtAt)}</time>
          ${entry.notes ? `<p>${escapeHtml(entry.notes)}</p>` : ""}
          <button class="ghost danger" type="button" data-delete="${entry.id}" aria-label="Delete catch">
            <i data-lucide="trash-2"></i>
          </button>
        </li>
      `,
    )
    .join("");

  els.catchList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      state.catches = state.catches.filter((entry) => entry.id !== button.dataset.delete);
      persist();
      render();
    });
  });
}

function renderTimeBars(catches) {
  const buckets = [
    { label: "Morning", range: "5a-11a", count: 0 },
    { label: "Midday", range: "11a-3p", count: 0 },
    { label: "Evening", range: "3p-9p", count: 0 },
    { label: "Night", range: "9p-5a", count: 0 },
  ];

  catches.forEach((entry) => {
    const hour = new Date(entry.caughtAt).getHours();
    if (hour >= 5 && hour < 11) buckets[0].count += 1;
    else if (hour >= 11 && hour < 15) buckets[1].count += 1;
    else if (hour >= 15 && hour < 21) buckets[2].count += 1;
    else buckets[3].count += 1;
  });

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  els.timeBars.innerHTML = buckets
    .map(
      (bucket) => `
        <div class="bar-row">
          <span>${bucket.label}<small>${bucket.range}</small></span>
          <div class="bar-track"><div style="width:${(bucket.count / max) * 100}%"></div></div>
          <strong>${bucket.count}</strong>
        </div>
      `,
    )
    .join("");
}

function renderLureRanking(catches) {
  const rankings = Object.entries(countBy(catches, "lure"))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (rankings.length === 0) {
    els.lureRanking.innerHTML = `<li class="empty compact">No lure data yet.</li>`;
    return;
  }

  els.lureRanking.innerHTML = rankings
    .map(([lure, count]) => `<li><span>${escapeHtml(lure)}</span><strong>${count}</strong></li>`)
    .join("");
}

function groupNearby(catches) {
  const groups = [];
  catches.forEach((entry) => {
    const existing = groups.find((group) => distanceMeters(group, entry) < 95);
    if (existing) {
      existing.items.push(entry);
      existing.lat = average(existing.items.map((item) => item.lat));
      existing.lng = average(existing.items.map((item) => item.lng));
    } else {
      groups.push({ lat: entry.lat, lng: entry.lng, items: [entry] });
    }
  });
  return groups.sort((a, b) => b.items.length - a.items.length);
}

function boundsAroundArea(area) {
  const span = area.span || { lat: 0.02, lng: 0.02 };
  return padBounds(
    {
      north: area.lat + span.lat * 1.25,
      south: area.lat - span.lat * 1.25,
      east: area.lng + span.lng * 1.25,
      west: area.lng - span.lng * 1.25,
      label: area.name,
    },
    0,
  );
}

function boundsAroundPoint(point, area) {
  const span = area.span || { lat: 0.02, lng: 0.02 };
  return padBounds(
    {
      north: point.lat + span.lat * 0.7,
      south: point.lat - span.lat * 0.7,
      east: point.lng + span.lng * 0.7,
      west: point.lng - span.lng * 0.7,
      label: area.name,
    },
    0,
  );
}

function boundsForCatches(catches) {
  const lats = catches.map((entry) => entry.lat);
  const lngs = catches.map((entry) => entry.lng);
  const label = state.filters.area !== "All" ? state.filters.area : "Filtered";
  return padBounds(
    {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
      label,
    },
    0.18,
  );
}

function padBounds(bounds, ratio) {
  const latSpan = Math.max(0.001, bounds.north - bounds.south);
  const lngSpan = Math.max(0.001, bounds.east - bounds.west);
  return {
    ...bounds,
    north: bounds.north + latSpan * ratio,
    south: bounds.south - latSpan * ratio,
    east: bounds.east + lngSpan * ratio,
    west: bounds.west - lngSpan * ratio,
  };
}

function latLngToScreen(lat, lng, bounds, width, height) {
  const usableWidth = Math.max(1, width - MAP_PADDING * 2);
  const usableHeight = Math.max(1, height - MAP_PADDING * 2);
  const xRatio = (lng - bounds.west) / Math.max(0.000001, bounds.east - bounds.west);
  const yRatio = (bounds.north - lat) / Math.max(0.000001, bounds.north - bounds.south);
  return {
    x: MAP_PADDING + clamp(xRatio, 0, 1) * usableWidth,
    y: MAP_PADDING + clamp(yRatio, 0, 1) * usableHeight,
  };
}

function screenToLatLng(x, y, bounds, width, height) {
  const usableWidth = Math.max(1, width - MAP_PADDING * 2);
  const usableHeight = Math.max(1, height - MAP_PADDING * 2);
  const xRatio = clamp((x - MAP_PADDING) / usableWidth, 0, 1);
  const yRatio = clamp((y - MAP_PADDING) / usableHeight, 0, 1);
  return {
    lat: bounds.north - yRatio * (bounds.north - bounds.south),
    lng: bounds.west + xRatio * (bounds.east - bounds.west),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function labelBestTime(catches) {
  if (catches.length === 0) return "No data";
  const counts = { Morning: 0, Midday: 0, Evening: 0, Night: 0 };
  catches.forEach((entry) => {
    const hour = new Date(entry.caughtAt).getHours();
    if (hour >= 5 && hour < 11) counts.Morning += 1;
    else if (hour >= 11 && hour < 15) counts.Midday += 1;
    else if (hour >= 15 && hour < 21) counts.Evening += 1;
    else counts.Night += 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function labelTopSpot(catches) {
  if (catches.length === 0) return "No data";
  const topGroup = groupNearby(catches)[0];
  return `${topGroup.items[0].locationName} (${topGroup.items.length})`;
}

function topValue(catches, key) {
  const entries = Object.entries(countBy(catches, key)).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "";
}

function countBy(catches, key) {
  return catches.reduce((acc, entry) => {
    acc[entry[key]] = (acc[entry[key]] || 0) + 1;
    return acc;
  }, {});
}

function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueValues(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateTimeInputValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.catches));
  if (!state.suppressSyncEvent) {
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT, { detail: { catches: cloneCatches(state.catches) } }));
  }
}

function loadCatches() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(normalizeCatch);
  } catch {
    return [];
  }
}

function mergeCloudCatches(cloudCatches) {
  const mergedById = new Map();
  [...state.catches, ...cloudCatches].filter(isValidCatch).forEach((entry) => {
    const existing = mergedById.get(entry.id);
    if (!existing || getModifiedTime(entry) >= getModifiedTime(existing)) {
      mergedById.set(entry.id, normalizeCatch(entry));
    }
  });

  state.suppressSyncEvent = true;
  state.catches = [...mergedById.values()].sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt));
  persist();
  state.suppressSyncEvent = false;
  render();
}

function normalizeCatch(entry) {
  return {
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  };
}

function getModifiedTime(entry) {
  return new Date(entry.updatedAt || entry.createdAt || entry.caughtAt || 0).getTime();
}

function cloneCatches(catches) {
  return catches.map((entry) => ({ ...entry }));
}

function isValidCatch(entry) {
  return (
    entry &&
    typeof entry.id === "string" &&
    typeof entry.fish === "string" &&
    typeof entry.lure === "string" &&
    typeof entry.caughtAt === "string" &&
    Number.isFinite(entry.lat) &&
    Number.isFinite(entry.lng)
  );
}

function showPrivacy(message) {
  els.privacyNote.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then((registration) => registration.update()).catch(() => {});
  }
}

window.CatchReportApp = {
  getCatches: () => cloneCatches(state.catches),
  mergeCloudCatches,
  setSyncStatus(message) {
    els.syncStatus.textContent = message;
  },
  setAuthControls({ configured, signedIn, signIn, signOut }) {
    els.signInBtn.hidden = !configured || signedIn;
    els.signOutBtn.hidden = !configured || !signedIn;
    els.signInBtn.onclick = signIn;
    els.signOutBtn.onclick = signOut;
  },
};

init();
