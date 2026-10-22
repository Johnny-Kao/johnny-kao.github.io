(() => {
const {
  applyQueryState,
  escapeHtml,
  filterRoutes,
  formatDistance,
  formatNumber,
  loadSiteData,
  readQueryState,
  sortRoutes,
  uniqueSorted,
} = window.FlightArchiveShared;

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DEFAULT_STATE = {
  year: [],
  month: [],
  q: "",
  airline: [],
  country: [],
  airport: "all",
  visitedOnly: false,
};

const state = readQueryState(DEFAULT_STATE);

const elements = {
  yearMenuButton: document.getElementById("stats-year-menu-button"),
  monthMenuButton: document.getElementById("stats-month-menu-button"),
  yearOptions: document.getElementById("stats-year-options"),
  monthOptions: document.getElementById("stats-month-options"),
  yearSummary: document.getElementById("stats-year-summary"),
  monthSummary: document.getElementById("stats-month-summary"),
  airlineMenuButton: document.getElementById("stats-airline-menu-button"),
  countryMenuButton: document.getElementById("stats-country-menu-button"),
  airlineOptions: document.getElementById("stats-airline-options"),
  countryOptions: document.getElementById("stats-country-options"),
  airlineSummary: document.getElementById("stats-airline-summary"),
  countrySummary: document.getElementById("stats-country-summary"),
  keywordInput: document.getElementById("stats-keyword-input"),
  reset: document.getElementById("stats-reset-filters"),
  resultCount: document.getElementById("stats-result-count"),
  summary: document.getElementById("stats-summary"),
  yearTotalCount: document.getElementById("year-total-count"),
  airlineTotalCount: document.getElementById("airline-total-count"),
  countryTotalCount: document.getElementById("country-total-count"),
  yearChart: document.getElementById("year-chart"),
  airlineChart: document.getElementById("airline-chart"),
  countryChart: document.getElementById("country-chart"),
};

let siteData;

boot().catch((error) => {
  console.error(error);
  renderNoDataState();
});

function renderNoDataState() {
  const dash = "—";
  const summaryCards = ["Flights", "Distance", "Airports", "Countries"];
  if (elements.summary) {
    elements.summary.innerHTML = summaryCards
      .map(
        (label) => `
          <article class="panel stat-card">
            <span>${label}</span>
            <strong class="no-data-dash">${dash}</strong>
          </article>`,
      )
      .join("");
  }
  const noDataHtml = `
    <div class="empty-state empty-state-nodata">
      <span class="empty-state-icon">✦</span>
      <p class="empty-state-title">No data available</p>
      <p class="empty-state-body">The flight archive hasn't been loaded yet.</p>
    </div>`;
  if (elements.yearChart) elements.yearChart.innerHTML = noDataHtml;
  if (elements.airlineChart) elements.airlineChart.innerHTML = noDataHtml;
  if (elements.countryChart) elements.countryChart.innerHTML = noDataHtml;
  if (elements.yearTotalCount) elements.yearTotalCount.textContent = dash;
  if (elements.airlineTotalCount) elements.airlineTotalCount.textContent = dash;
  if (elements.countryTotalCount) elements.countryTotalCount.textContent = dash;
}

async function boot() {
  siteData = await loadSiteData();
  initializeDefaultSelections();
  initControls();
  render();
}

function initializeDefaultSelections() {
  if (!state.year.length || state.year.includes("all")) {
    state.year = [...siteData.years].sort((a, b) => b - a).map(String);
  }
  if (!state.month.length || state.month.includes("all")) {
    state.month = Array.from({ length: 12 }, (_, index) => String(index + 1));
  }
  if (!state.airline.length || state.airline.includes("all")) {
    state.airline = uniqueSorted(siteData.routes.map((route) => route.airline));
  }
  if (!state.country.length || state.country.includes("all")) {
    state.country = uniqueSorted(siteData.routes.map((route) => route.destinationCountry));
  }
}

function initControls() {
  syncControls();
  initMultiSelectMenus();

  const bind = (element, key) => {
    const handler = () => {
      state[key] = element.value;
      render();
    };
    element.addEventListener("input", handler);
    element.addEventListener("change", handler);
  };

  elements.reset.addEventListener("click", () => {
    Object.assign(state, {
      year: [...siteData.years].sort((a, b) => b - a).map(String),
      month: Array.from({ length: 12 }, (_, index) => String(index + 1)),
      q: "",
      airline: uniqueSorted(siteData.routes.map((route) => route.airline)),
      country: uniqueSorted(siteData.routes.map((route) => route.destinationCountry)),
    });
    syncControls();
    render();
  });
}

function syncControls() {
  updateMultiSelectSummary();
}

function initMultiSelectMenus() {
  elements.yearMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(elements.yearOptions);
  });

  elements.monthMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(elements.monthOptions);
  });
  elements.airlineMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(elements.airlineOptions);
  });

  [elements.yearOptions, elements.monthOptions, elements.airlineOptions].forEach((panel) => {
    panel.addEventListener("click", (event) => event.stopPropagation());
  });

  document.addEventListener("click", closeMenus);
}

let _menuTimer = null;
const MENU_TIMEOUT_MS = 4000;

function startMenuTimer() {
  clearTimeout(_menuTimer);
  _menuTimer = setTimeout(closeMenus, MENU_TIMEOUT_MS);
}

function resetMenuTimer() {
  if (document.querySelector(".multi-select-panel.is-open")) {
    startMenuTimer();
  }
}

function toggleMenu(panel) {
  const shouldOpen = !panel.classList.contains("is-open");
  closeMenus();
  if (shouldOpen) {
    panel.classList.add("is-open");
    startMenuTimer();
    panel.addEventListener("mousemove", resetMenuTimer);
    panel.addEventListener("change", resetMenuTimer);
  }
}

function closeMenus() {
  clearTimeout(_menuTimer);
  _menuTimer = null;
  elements.yearOptions.classList.remove("is-open");
  elements.monthOptions.classList.remove("is-open");
  elements.airlineOptions.classList.remove("is-open");
}

function renderMultiSelectOptions() {
  renderCheckboxList(
    elements.yearOptions,
    [...siteData.years]
      .sort((a, b) => b - a)
      .map((year) => ({ value: String(year), label: String(year) })),
    state.year,
    (value) => toggleArrayValue("year", value, true),
  );

  renderCheckboxList(
    elements.monthOptions,
    MONTH_NAMES.slice(1).map((label, index) => ({
      value: String(index + 1),
      label,
    })),
    state.month,
    (value) => toggleArrayValue("month", value, false),
  );

  renderCheckboxList(
    elements.airlineOptions,
    uniqueSorted(siteData.routes.map((route) => route.airline)).map((airline) => ({
      value: airline,
      label: airline,
    })),
    state.airline,
    (value) => toggleArrayValue("airline", value, false),
  );


  updateMultiSelectSummary();
}

function renderCheckboxList(container, options, selectedValues, onToggle) {
  if (!container) return;
  container.innerHTML = `
    <div class="multi-select-actions">
      <button class="multi-select-clear" data-action="clear" type="button">Clear</button>
      <button class="multi-select-clear" data-action="all" type="button">All</button>
    </div>
    <div class="multi-select-options compact-select-options">
      ${options
        .map(
          (option) => `
            <label class="check-option compact-check-option">
              <input type="checkbox" value="${option.value}" ${
                selectedValues.includes(option.value) ? "checked" : ""
              } />
              <span>${escapeHtml(option.label)}</span>
            </label>`,
        )
        .join("")}
    </div>
  `;

  container.querySelector('[data-action="clear"]').addEventListener("click", () => {
    if (container === elements.yearOptions) {
      state.year = [];
    } else if (container === elements.monthOptions) {
      state.month = [];
    } else if (container === elements.airlineOptions) {
      state.airline = [];
    } else {
      state.country = [];
    }
    render();
  });

  container.querySelector('[data-action="all"]').addEventListener("click", () => {
    if (container === elements.yearOptions) {
      state.year = [...siteData.years].sort((a, b) => b - a).map(String);
    } else if (container === elements.monthOptions) {
      state.month = Array.from({ length: 12 }, (_, index) => String(index + 1));
    } else if (container === elements.airlineOptions) {
      state.airline = uniqueSorted(siteData.routes.map((route) => route.airline));
    } else {
      state.country = uniqueSorted(siteData.routes.map((route) => route.destinationCountry));
    }
    render();
  });

  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => onToggle(input.value));
  });
}

function toggleArrayValue(key, value, descending = false) {
  const next = new Set(state[key]);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  state[key] = [...next].sort((a, b) => {
    if (key === "year" || key === "month") {
      return descending ? Number(b) - Number(a) : Number(a) - Number(b);
    }
    return String(a).localeCompare(String(b), "en");
  });
  render();
}

function updateMultiSelectSummary() {
  // Years: show range if consecutive, count otherwise
  const allYearCount = siteData.years.length;
  const selectedYears = [...state.year].sort();
  if (!selectedYears.length) {
    elements.yearSummary.textContent = "No years";
  } else if (selectedYears.length === allYearCount) {
    elements.yearSummary.textContent = "All years";
  } else if (selectedYears.length === 1) {
    elements.yearSummary.textContent = selectedYears[0];
  } else {
    const isConsecutive = selectedYears.every(
      (y, i) => i === 0 || Number(y) === Number(selectedYears[i - 1]) + 1,
    );
    elements.yearSummary.textContent = isConsecutive
      ? `${selectedYears[0]} – ${selectedYears[selectedYears.length - 1]}`
      : `${selectedYears.length} years`;
  }

  // Months: show short name or count
  const selectedMonths = state.month;
  if (!selectedMonths.length) {
    elements.monthSummary.textContent = "No months";
  } else if (selectedMonths.length === 12) {
    elements.monthSummary.textContent = "All months";
  } else if (selectedMonths.length === 1) {
    elements.monthSummary.textContent = MONTH_NAMES[Number(selectedMonths[0])].slice(0, 3);
  } else {
    const sorted = [...selectedMonths].sort((a, b) => Number(a) - Number(b));
    const isConsecutive = sorted.every(
      (m, i) => i === 0 || Number(m) === Number(sorted[i - 1]) + 1,
    );
    elements.monthSummary.textContent = isConsecutive
      ? `${MONTH_NAMES[Number(sorted[0])].slice(0, 3)} – ${MONTH_NAMES[Number(sorted[sorted.length - 1])].slice(0, 3)}`
      : `${selectedMonths.length} months`;
  }

  // Airlines: show name or count
  const allAirlineCount = uniqueSorted(siteData.routes.map((r) => r.airline)).length;
  if (!state.airline.length) {
    elements.airlineSummary.textContent = "No airlines";
  } else if (state.airline.length === allAirlineCount) {
    elements.airlineSummary.textContent = "All airlines";
  } else if (state.airline.length === 1) {
    elements.airlineSummary.textContent = state.airline[0];
  } else {
    elements.airlineSummary.textContent = `${state.airline.length} airlines`;
  }
}

function render() {
  applyQueryState(state);
  renderMultiSelectOptions();

  const filtered = sortRoutes(filterRoutes(siteData.routes, state), "date-asc");
  if (elements.resultCount) elements.resultCount.textContent = `${filtered.length} flights`;

  const totalDistance = filtered.reduce((sum, route) => sum + (route.distanceKm || 0), 0);
  const visitedCountries = [...new Set(filtered.filter((route) => route.visited).map((route) => route.destinationCountry))];
  const airports = new Set(filtered.flatMap((route) => [route.fromCode, route.toCode]));

  const summaryCards = [
    { label: "Flights", value: formatNumber(filtered.length) },
    { label: "Distance", value: formatDistance(totalDistance) },
    { label: "Airports", value: formatNumber(airports.size) },
    { label: "Countries", value: formatNumber(visitedCountries.length) },
  ];

  elements.summary.innerHTML = summaryCards
    .map(
      (card) => `<article class="panel stat-card"><span>${card.label}</span><strong>${card.value}</strong></article>`,
    )
    .join("");

  if (elements.yearTotalCount) {
    elements.yearTotalCount.textContent = `${filtered.length} flights`;
  }

  const airlineItems = topN(filtered, (route) => route.airline, 10);
  const countryItems = buildVisitedCountrySummary(filtered);

  if (elements.airlineTotalCount) {
    const totalAirlines = uniqueSorted(siteData.routes.map((r) => r.airline)).length;
    elements.airlineTotalCount.textContent = airlineItems.length < totalAirlines
      ? `Top ${airlineItems.length}`
      : `${airlineItems.length} airline${airlineItems.length !== 1 ? "s" : ""}`;
  }
  if (elements.countryTotalCount) {
    elements.countryTotalCount.textContent = `${countryItems.length} countr${countryItems.length !== 1 ? "ies" : "y"}`;
  }

  renderYearBarChart(elements.yearChart, filtered);
  renderAirlineCards(elements.airlineChart, airlineItems, "flights");
  renderVisitedCountryCards(elements.countryChart, countryItems);

}

function topN(items, keyFn, limit = 10, explicitOrder = null) {
  const counts = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  let entries = [...counts.entries()].map(([key, count]) => ({ key, count }));
  if (explicitOrder) {
    entries.sort((a, b) => explicitOrder.indexOf(a.key) - explicitOrder.indexOf(b.key));
  } else {
    entries.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "en"));
  }
  return entries.slice(0, limit);
}

function renderBarChart(container, items, suffix, options = {}) {
  if (!items.length) {
    container.innerHTML = '<div class="empty-state">No flights in this period.</div>';
    return;
  }
  const max = Math.max(...items.map((item) => item.count), 1);
  container.innerHTML = items
    .map(
      (item) => `
        <div class="chart-row chart-row-ranking">
          <div class="chart-meta">
            <strong class="chart-rank-label ${options.country ? "has-flag" : ""}">
              ${options.country ? `<span class="country-flag">${countryFlagEmoji(item.key)}</span>` : ""}
              <span>${escapeHtml(item.key)}</span>
            </strong>
            <span class="chart-rank-value">${item.count} ${suffix}</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${(item.count / max) * 100}%"></div>
          </div>
        </div>`,
    )
    .join("");
}

function renderYearBarChart(container, routes) {
  if (!container) return;
  const yearMap = routes.reduce((map, route) => {
    const key = String(route.year);
    if (!map.has(key)) map.set(key, { count: 0, months: new Map() });
    const entry = map.get(key);
    entry.count += 1;
    if (route.month) {
      const m = Number(route.month);
      entry.months.set(m, (entry.months.get(m) || 0) + 1);
    }
    return map;
  }, new Map());

  const items = [...yearMap.entries()]
    .map(([key, data]) => ({ key, count: data.count, months: data.months }))
    .sort((a, b) => Number(b.key) - Number(a.key));

  renderYearHorizontalChart(container, items);
}

function heatLevel(count, max) {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
}

function renderYearHorizontalChart(container, items) {
  if (!items.length) {
    container.innerHTML = '<div class="empty-state">No flights in this period.</div>';
    return;
  }
  const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const globalMax = Math.max(...items.flatMap((item) => [...item.months.values()]), 1);

  container.innerHTML = `
    <div class="year-hbar-chart">
      <div class="year-hbar-header">
        <div></div>
        <div class="year-hbar-month-labels">
          ${MONTH_NAMES.slice(1).map((m) => `<span>${m}</span>`).join("")}
        </div>
        <div></div>
      </div>
      ${items
        .map(
          (item) => `
            <div class="year-hbar-row">
              <span class="year-hbar-label">${escapeHtml(item.key)}</span>
              <div class="year-hbar-month-section">
                ${allMonths
                  .map((m) => {
                    const count = item.months.get(m) || 0;
                    const level = heatLevel(count, globalMax);
                    return `<span class="month-pip ${level > 0 ? `heat-${level}` : ""}" title="${MONTH_NAMES[m]}: ${count} flight${count !== 1 ? "s" : ""}">${count > 0 ? count : ""}</span>`;
                  })
                  .join("")}
              </div>
              <span class="year-hbar-total">${item.count}</span>
            </div>`,
        )
        .join("")}
    </div>
  `;

  const chart = container.querySelector(".year-hbar-chart");
  const monthLabelSpans = [...chart.querySelectorAll(".year-hbar-month-labels span")];

  const colHighlight = document.createElement("div");
  colHighlight.className = "col-highlight";
  chart.appendChild(colHighlight);

  chart.querySelectorAll(".month-pip").forEach((pip) => {
    const section = pip.closest(".year-hbar-month-section");
    const colIndex = [...section.children].indexOf(pip);

    pip.addEventListener("mouseenter", () => {
      const chartRect = chart.getBoundingClientRect();
      const pipRect = pip.getBoundingClientRect();
      const firstRow = chart.querySelector(".year-hbar-row");
      const topOffset = firstRow ? firstRow.getBoundingClientRect().top - chartRect.top - 5 : 0;
      colHighlight.style.left = `${pipRect.left - chartRect.left - 3}px`;
      colHighlight.style.width = `${pipRect.width + 6}px`;
      colHighlight.style.top = `${topOffset}px`;
      colHighlight.style.display = "block";
      monthLabelSpans[colIndex]?.classList.add("is-col-hover");
    });

    pip.addEventListener("mouseleave", () => {
      colHighlight.style.display = "none";
      monthLabelSpans[colIndex]?.classList.remove("is-col-hover");
    });
  });
}

function renderAirlineCards(container, items, suffix) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div class="empty-state">No flights in this period.</div>';
    return;
  }

  container.innerHTML = `
    <div class="airline-ranking-list">
      ${items
        .map(
          (item, index) => `
            <article class="airline-ranking-row ${index < 3 ? "is-featured" : ""}">
              <div class="airline-ranking-head">
                <div class="airline-ranking-label-wrap">
                  <span class="airline-ranking-rank">#${index + 1}</span>
                  <strong class="airline-ranking-label">${escapeHtml(item.key)}</strong>
                </div>
                <div class="airline-ranking-track">
                  <i class="airline-ranking-fill" style="width:${(item.count / (items[0]?.count || 1)) * 100}%"></i>
                </div>
                <span class="airline-ranking-value">${item.count}</span>
              </div>
            </article>`,
        )
        .join("")}
    </div>
  `;
}

function renderVisitedCountryCards(container, items) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div class="empty-state">No destinations match the current filters.</div>';
    return;
  }

  container.innerHTML = `
    <div class="country-explorer">
      <div class="country-preview-panel" id="country-preview-panel">
        <div class="country-preview-empty">
          <span class="country-preview-empty-icon">✦</span>
          <p>Select a country</p>
        </div>
      </div>
      <div class="country-card-grid">
        ${items
          .map(
            (item, index) => `
              <button class="visited-country-card country-card-btn" type="button" data-index="${index}">
                <div class="visited-country-card-top">
                  <span class="country-flag stamp-flag">${countryFlagEmoji(item.key)}</span>
                  <span class="visited-country-name">${escapeHtml(item.key)}</span>
                  <span class="visited-country-rank">#${index + 1}</span>
                </div>
                <div class="visited-country-primary">
                  <strong>${item.arrivals}</strong>
                  <span>Arrivals</span>
                </div>
                <div class="country-timeline">
                  <div class="country-timeline-track">
                    <span class="country-tl-dot-start"></span>
                    <span class="country-tl-line"></span>
                    <span class="country-tl-dot-end"></span>
                  </div>
                  <div class="country-timeline-labels">
                    <span>${item.firstYear}</span>
                    <span>${item.latestYear}</span>
                  </div>
                </div>
              </button>`,
          )
          .join("")}
      </div>
    </div>
  `;

  const previewPanel = container.querySelector("#country-preview-panel");
  const cards = [...container.querySelectorAll(".country-card-btn")];

  function selectCountry(item, cardEl) {
    cards.forEach((c) => c.classList.remove("is-active"));
    cardEl.classList.add("is-active");

    // Year distribution strip
    let yearStripHtml = "";
    const minYear = item.firstYear !== "-" ? Number(item.firstYear) : null;
    const maxYear = item.latestYear !== "-" ? Number(item.latestYear) : null;
    if (minYear && maxYear) {
      const maxCount = Math.max(...item.yearCounts.values(), 1);
      const pips = [];
      for (let y = minYear; y <= maxYear; y++) {
        const count = item.yearCounts.get(y) || 0;
        const level = count === 0 ? 0 : Math.min(3, Math.ceil((count / maxCount) * 3));
        pips.push(`<div class="country-year-pip country-year-pip-${level}">${count > 0 ? count : ""}</div>`);
      }
      yearStripHtml = `
        <div class="country-preview-section">
          <p class="country-preview-section-label">Year Distribution</p>
          <div class="country-year-strip">${pips.join("")}</div>
          <div class="country-year-strip-ends">
            <span>${minYear}</span>
            <span>${maxYear}</span>
          </div>
        </div>`;
    }

    // Airport breakdown — only show airports physically in this country
    const airportRows = item.airports.filter((ap) => ap.country === item.homeCountryEn);
    const barMax = airportRows[0]?.count || 1;
    const airportHtml = airportRows.length ? `
      <div class="country-preview-section">
        <p class="country-preview-section-label">Airports</p>
        <div class="country-airport-list">
          ${airportRows.map(({ code, city, count }) => `
            <div class="country-airport-row">
              <span class="country-airport-code">${escapeHtml(code)}</span>
              <span class="country-airport-city">${escapeHtml(city)}</span>
              <div class="country-airport-bar-wrap">
                <div class="country-airport-bar" style="width:${Math.round((count / barMax) * 100)}%"></div>
              </div>
              <span class="country-airport-count">${count}</span>
            </div>`).join("")}
        </div>
      </div>` : "";

    const nextHtml = `
      <div class="country-preview-banner">
        <span class="country-preview-banner-flag">${countryFlagEmoji(item.key)}</span>
        <div class="country-preview-banner-text">
          <h3 class="country-preview-name">${escapeHtml(item.key)}</h3>
          <span class="country-preview-arrivals">${item.arrivals} arrival${item.arrivals !== 1 ? "s" : ""} · ${item.yearsVisited} year${item.yearsVisited !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div class="country-preview-info">
        ${yearStripHtml}
        ${airportHtml}
      </div>
    `;
    previewPanel.style.opacity = "0";
    clearTimeout(previewPanel._fadeTimer);
    previewPanel._fadeTimer = setTimeout(() => {
      previewPanel.innerHTML = nextHtml;
      previewPanel.style.opacity = "";
    }, 150);
  }

  cards.forEach((card, i) => {
    card.addEventListener("click", () => selectCountry(items[i], cards[i]));
  });

  if (cards.length > 0) selectCountry(items[0], cards[0]);
}

const DESTINATION_COUNTRY_EN = {
  "中國": "China",
  "台灣": "Taiwan",
  "日本": "Japan",
  "香港": "Hong Kong",
  "泰國": "Thailand",
  "菲律賓": "Philippines",
  "印度": "India",
  "奧地利": "Austria",
  "新加坡": "Singapore",
  "印尼": "Indonesia",
  "捷克": "Czechia",
  "波蘭": "Poland",
  "突尼西亞": "Tunisia",
  "義大利": "Italy",
  "西班牙": "Spain",
  "馬來西亞": "Malaysia",
  "法國": "France",
  "英國": "United Kingdom of Great Britain and Northern Ireland",
  "芬蘭": "Finland",
  "土耳其": "Türkiye",
  "卡達": "Qatar",
};

function buildVisitedCountrySummary(routes) {
  const map = new Map();
  routes.forEach((route) => {
    if (!route.destinationCountry) return;
    if (!map.has(route.destinationCountry)) {
      map.set(route.destinationCountry, {
        key: route.destinationCountry,
        arrivals: 0,
        visitedCount: 0,
        years: new Set(),
        yearCounts: new Map(),
        airportCounts: new Map(),
      });
    }
    const current = map.get(route.destinationCountry);
    current.arrivals += 1;
    current.yearCounts.set(route.year, (current.yearCounts.get(route.year) || 0) + 1);
    const airportCity = route.toAirport?.city || route.toCode;
    const airportCountry = route.toAirport?.country || "";
    const ap = current.airportCounts.get(route.toCode) || { city: airportCity, country: airportCountry, count: 0 };
    ap.count += 1;
    current.airportCounts.set(route.toCode, ap);
    if (route.visited) {
      current.visitedCount += 1;
      current.years.add(route.year);
    }
  });

  return [...map.values()]
    .filter((item) => item.visitedCount > 0)
    .map((item) => {
      const years = [...item.years].sort((a, b) => a - b);
      return {
        key: item.key,
        arrivals: item.arrivals,
        visitedCount: item.visitedCount,
        yearsVisited: years.length,
        firstYear: years[0] || "-",
        latestYear: years[years.length - 1] || "-",
        yearCounts: item.yearCounts,
        homeCountryEn: DESTINATION_COUNTRY_EN[item.key] || item.key,
        airports: [...item.airportCounts.entries()]
          .map(([code, { city, country, count }]) => ({ code, city, country, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.arrivals - a.arrivals || b.yearsVisited - a.yearsVisited || a.key.localeCompare(b.key, "en"));
}


function countryFlagEmoji(country) {
  const flags = {
    "日本": "🇯🇵",
    "中國": "🇨🇳",
    "中国": "🇨🇳",
    "台灣": "🇹🇼",
    "台湾": "🇹🇼",
    "香港": "🇭🇰",
    "法國": "🇫🇷",
    "法国": "🇫🇷",
    "韓國": "🇰🇷",
    "韩国": "🇰🇷",
    "印度": "🇮🇳",
    "菲律賓": "🇵🇭",
    "菲律宾": "🇵🇭",
    "義大利": "🇮🇹",
    "意大利": "🇮🇹",
    "突尼西亞": "🇹🇳",
    "突尼斯": "🇹🇳",
    "泰國": "🇹🇭",
    "泰国": "🇹🇭",
    "德國": "🇩🇪",
    "德国": "🇩🇪",
    "奧地利": "🇦🇹",
    "奥地利": "🇦🇹",
    "波蘭": "🇵🇱",
    "波兰": "🇵🇱",
    "卡達": "🇶🇦",
    "卡塔尔": "🇶🇦",
    "新加坡": "🇸🇬",
    "印尼": "🇮🇩",
    "印度尼西亞": "🇮🇩",
    "印度尼西亚": "🇮🇩",
    "越南": "🇻🇳",
    "馬來西亞": "🇲🇾",
    "马来西亚": "🇲🇾",
    "英國": "🇬🇧",
    "英国": "🇬🇧",
    "阿聯酋": "🇦🇪",
    "阿联酋": "🇦🇪",
    "西班牙": "🇪🇸",
    "比利時": "🇧🇪",
    "比利时": "🇧🇪",
    "捷克": "🇨🇿",
    "捷克共和國": "🇨🇿",
    "捷克共和国": "🇨🇿",
    "荷蘭": "🇳🇱",
    "荷兰": "🇳🇱",
    "瑞士": "🇨🇭",
    "葡萄牙": "🇵🇹",
    "加拿大": "🇨🇦",
    "美國": "🇺🇸",
    "美国": "🇺🇸",
    "澳洲": "🇦🇺",
    "澳大利亞": "🇦🇺",
  };
  return flags[country] || "✦";
}
})();
