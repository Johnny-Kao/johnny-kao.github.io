(() => {
const {
  applyQueryState,
  escapeHtml,
  filterRoutes,
  formatDate,
  formatDistance,
  formatNumber,
  groupJourneys,
  loadSiteData,
  paletteFor,
  readQueryState,
  routeLabel,
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
  showLabels: false,
  color: "year",
  projection: "normal",
  sort: "date-asc",
};

const state = readQueryState(DEFAULT_STATE);

const elements = {
  heroStats: document.getElementById("hero-stats"),
  resultCount: document.getElementById("result-count"),
  journeyCount: document.getElementById("journey-count"),
  projectionToggle: document.getElementById("projection-toggle"),
  labelsToggle: document.getElementById("labels-toggle"),
  resetFilters: document.getElementById("reset-filters"),
  legendRow: document.getElementById("legend-row"),
  journeyGrid: document.getElementById("journey-grid"),
  monthChipsRow: document.getElementById("month-chips"),
};

let siteData;
let selectedRouteId = null;
let _userClickedJourney = false;
let map;
let popup;
let lastRouteSignature = "";
let aircraftMarker;
let aircraftElement;
let animationFrameId = null;

boot().catch((error) => {
  console.error(error);
  renderNoDataState();
});

function renderNoDataState() {
  const dash = "—";
  const placeholders = ["Flights", "Distance", "Airports", "Countries"];
  if (elements.heroStats) {
    elements.heroStats.innerHTML = placeholders
      .map(
        (label) => `
          <article class="stat-pill stat-pill-caption stat-pill-minimal">
            <div class="stat-pill-value"><strong class="no-data-dash">${dash}</strong></div>
            <span class="stat-label">${label}</span>
          </article>`,
      )
      .join("");
  }
  if (elements.resultCount) elements.resultCount.textContent = dash;
  if (elements.journeyCount) elements.journeyCount.textContent = dash;
  if (elements.journeyGrid) {
    elements.journeyGrid.innerHTML = `
      <div class="empty-state empty-state-nodata">
        <span class="empty-state-icon">✦</span>
        <p class="empty-state-title">No archive data</p>
        <p class="empty-state-body">The flight archive hasn't been loaded yet.</p>
      </div>`;
  }
}

async function boot() {
  siteData = await loadSiteData();
  initializeDefaultSelections();
  initControls();
  initMap();
  render();
}

function initializeDefaultSelections() {
  if (!state.year.length || state.year.includes("all")) {
    state.year = [...siteData.years].sort((a, b) => b - a).map((year) => String(year));
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
  state.visitedOnly = false;
}

function initControls() {
  syncControls();

  elements.labelsToggle?.addEventListener("click", () => {
    state.showLabels = !state.showLabels;
    elements.labelsToggle.classList.toggle("is-active", state.showLabels);
    // Update tooltip to reflect current state
    elements.labelsToggle.dataset.tooltip = state.showLabels ? "Hide airport labels" : "Airport labels";
    render();
  });

  elements.projectionToggle?.addEventListener("click", () => {
    state.projection = state.projection === "global" ? "normal" : "global";
    elements.projectionToggle.classList.toggle("is-active", state.projection === "global");
    elements.projectionToggle.dataset.tooltip = state.projection === "global" ? "Switch to flat map" : "Switch to globe view";
    render();
  });

  initMultiSelectMenus();

  elements.resetFilters.addEventListener("click", () => {
    Object.assign(state, {
      year: [...siteData.years].sort((a, b) => b - a).map((year) => String(year)),
      month: Array.from({ length: 12 }, (_, index) => String(index + 1)),
      q: "",
      airline: uniqueSorted(siteData.routes.map((route) => route.airline)),
      country: uniqueSorted(siteData.routes.map((route) => route.destinationCountry)),
      airport: "all",
      showLabels: false,
      color: "year",
      projection: "normal",
      sort: "date-asc",
    });
    syncControls();
    render();
  });
}

function syncControls() {
  elements.labelsToggle?.classList.toggle("is-active", state.showLabels);
  elements.projectionToggle?.classList.toggle("is-active", state.projection === "global");
}

function renderMonthChips() {
  if (!elements.monthChipsRow) return;
  const allMonthsArr = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const allSelected = state.month.length === 12;
  elements.monthChipsRow.innerHTML = allMonthsArr
    .map((m) => {
      const active = state.month.includes(m);
      return `<button class="month-chip ${active ? "" : "is-inactive"}" data-month="${m}" type="button">${MONTH_NAMES[Number(m)]}</button>`;
    })
    .join("");
  elements.monthChipsRow.querySelectorAll(".month-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const month = chip.dataset.month;
      const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1));
      if (state.month.length === 12) {
        state.month = [month];
      } else if (state.month.includes(month)) {
        const next = state.month.filter((m) => m !== month);
        state.month = next.length ? next : allMonths;
      } else {
        state.month = [...state.month, month].sort((a, b) => Number(a) - Number(b));
      }
      render();
    });
  });
}

function initMultiSelectMenus() {}
function toggleMenu() {}
function closeMenus() {}

function renderMultiSelectOptions() { return; renderCheckboxList(
    elements.airlineOptions,
    uniqueSorted(siteData.routes.map((route) => route.airline)).map((airline) => ({
      value: airline,
      label: airline,
    })),
    state.airline,
    (value) => toggleArrayValue("airline", value, false),
  );

  renderCheckboxList(
    elements.countryOptions,
    uniqueSorted(siteData.routes.map((route) => route.destinationCountry)).map((country) => ({
      value: country,
      label: country,
    })),
    state.country,
    (value) => toggleArrayValue("country", value, false),
  );

  updateMultiSelectSummary();
}

function renderCheckboxList(container, options, selectedValues, onToggle) {
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
      state.year = [...siteData.years].sort((a, b) => b - a).map((year) => String(year));
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
    input.addEventListener("change", () => {
      onToggle(input.value);
    });
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

function updateMultiSelectSummary() {}

function summarizeSelection(values, allLabel, fullCount = 0, emptyLabel = allLabel) {
  if (!values.length) return emptyLabel;
  if (fullCount && values.length === fullCount) return allLabel;
  if (values.length === 1) return values[0];
  return `${values[0]} +${values.length - 1}`;
}

function initMap() {
  map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [112, 26],
    zoom: 1.3,
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 16,
    maxWidth: "420px",
    className: "flight-popup",
  });

  aircraftElement = document.createElement("div");
  aircraftElement.className = "aircraft-marker";
  aircraftElement.innerHTML =
    '<div class="aircraft-marker-core"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"></path></svg></div>';
  aircraftMarker = new maplibregl.Marker({
    element: aircraftElement,
    anchor: "center",
    rotationAlignment: "map",
    pitchAlignment: "map",
  });

  map.on("load", () => {
    applyProjection(false);
    map.addSource("routes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addSource("airports", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.addLayer({
      id: "route-lines",
      type: "line",
      source: "routes",
      paint: {
        "line-color": ["get", "color"],
        "line-width": [
          "case",
          ["boolean", ["get", "selected"], false],
          4.2,
          2.2,
        ],
        "line-opacity": [
          "case",
          ["boolean", ["get", "selected"], false],
          0.98,
          0.74,
        ],
      },
    });

    map.addLayer({
      id: "airport-circles",
      type: "circle",
      source: "airports",
      paint: {
        "circle-radius": 4.8,
        "circle-color": "#f7f4ef",
        "circle-stroke-color": "#9c8260",
        "circle-stroke-width": 1.35,
        "circle-opacity": 0.95,
      },
    });

    map.addLayer({
      id: "airport-labels",
      type: "symbol",
      source: "airports",
      layout: {
        "text-field": ["get", "code"],
        "text-offset": [0, 1.05],
        "text-size": 11,
        "text-font": ["Open Sans Semibold"],
        visibility: "none",
      },
      paint: {
        "text-color": "#f7f4ef",
        "text-halo-color": "rgba(27,42,59,0.95)",
        "text-halo-width": 1.1,
      },
    });

    map.on("mouseenter", "route-lines", (event) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      if (!feature) return;
      const props = feature.properties;
      popup
        .setLngLat(event.lngLat)
        .setHTML(buildRouteTooltipHtml(props))
        .addTo(map);
    });

    map.on("mouseleave", "route-lines", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("click", "route-lines", (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      selectedRouteId = Number(feature.properties.routeId);
      render();
    });

    render();
    window.requestAnimationFrame(render);
  });
}

function render() {
  if (!siteData) return;
  applyQueryState(state);

  const filteredRoutes = sortRoutes(filterRoutes(siteData.routes, state), state.sort);
  const activeRoute =
    filteredRoutes.find((route) => route.id === selectedRouteId) || filteredRoutes[0] || null;
  selectedRouteId = activeRoute?.id ?? null;

  renderMultiSelectOptions();
  renderHeroStats(siteData.routes);
  renderMap(filteredRoutes, activeRoute);
  renderLegend(filteredRoutes);
  renderJourneys(filteredRoutes, siteData.routes);

  // Collect all legs of the active journey for the animation
  const activeLegs = activeRoute
    ? (activeRoute.journeyId
        ? filteredRoutes
            .filter((r) => r.journeyId === activeRoute.journeyId)
            .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
        : [activeRoute])
    : null;
  syncAircraftAnimation(activeLegs);
}

function renderHeroStats(routes) {
  const visitedCountries = new Set(
    routes.filter((route) => route.visited).map((route) => route.destinationCountry),
  );
  const distance = routes.reduce((sum, route) => sum + (route.distanceKm || 0), 0);
  const airports = new Set(routes.flatMap((route) => [route.fromCode, route.toCode]));
  const distanceLabel = formatDistance(distance);
  const [distanceNumber] = distanceLabel.split(" ");
  const cards = [
    { label: "Flights", value: formatNumber(routes.length) },
    { label: "Distance", value: distanceLabel, valueHtml: escapeHtml(distanceNumber) },
    { label: "Airports", value: formatNumber(airports.size) },
    { label: "Countries", value: formatNumber(visitedCountries.size) },
  ];
  elements.heroStats.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-pill stat-pill-caption stat-pill-minimal">
          <div class="stat-pill-value">
            <strong>${card.valueHtml || escapeHtml(card.value)}</strong>
          </div>
          <span class="stat-label">${escapeHtml(card.label)}</span>
        </article>`,
    )
    .join("");
}

function renderMap(routes, activeRoute) {
  elements.resultCount.textContent = `${routes.length} flights`;
  if (!map) return;

  const routesSource = map.getSource("routes");
  const airportsSource = map.getSource("airports");
  if (!routesSource || !airportsSource || !map.getLayer("airport-labels")) return;

  const colorMap = resolveColorMap(routes);

  // Group individual legs into journeys
  const journeyGroups = new Map();
  routes.forEach((route) => {
    const key = route.journeyId || `__solo_${route.id}`;
    if (!journeyGroups.has(key)) journeyGroups.set(key, []);
    journeyGroups.get(key).push(route);
  });

  const routeFeatures = [];
  journeyGroups.forEach((legs) => {
    legs.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const first = legs[0];
    const last = legs[legs.length - 1];
    const isMultiStop = legs.length > 1;
    const isSelected = legs.some((leg) => leg.id === activeRoute?.id);
    const totalKm = legs.reduce((sum, l) => sum + (l.distanceKm || 0), 0);
    const routeChain = [first.fromCode, ...legs.map((l) => l.toCode)].join(" → ");

    // Concatenate arc segments into one continuous path
    let coordinates = [];
    legs.forEach((leg, i) => {
      const arc = createArc(leg.fromAirport, leg.toAirport);
      coordinates = i === 0 ? arc : [...coordinates, ...arc.slice(1)];
    });

    routeFeatures.push({
      type: "Feature",
      properties: {
        routeId: first.id,
        journeyId: first.journeyId || null,
        isMultiStop,
        legCount: legs.length,
        routeChain,
        label: isMultiStop ? routeChain : routeLabel(first),
        dateLabel: first.dateLabel,
        endDateLabel: isMultiStop ? last.dateLabel : "",
        airline: isMultiStop ? `${legs.length} legs` : first.airline,
        flightNumber: isMultiStop ? "" : (first.flightNumber || ""),
        fromCode: first.fromCode,
        toCode: last.toCode,
        fromCity: first.fromAirport?.city || "",
        toCity: last.toAirport?.city || "",
        departureTime: first.scheduledDeparture || "",
        arrivalTime: isMultiStop ? "" : (last.scheduledArrival || ""),
        distanceKm: totalKm,
        durationLabel: isMultiStop ? "" : formatFlightDuration(first.scheduledDeparture, last.scheduledArrival),
        estimatedDurationLabel: estimateFlightDuration(totalKm),
        note: legs.find((l) => l.note)?.note || "",
        color: colorMap(first),
        selected: isSelected,
      },
      geometry: { type: "LineString", coordinates },
    });
  });

  const airportMap = new Map();
  routes.forEach((route) => {
    [route.fromAirport, route.toAirport].forEach((airport) => {
      if (!airport) return;
      airportMap.set(airport.code, airport);
    });
  });

  const airportFeatures = [...airportMap.values()].map((airport) => ({
    type: "Feature",
    properties: { code: airport.code, city: airport.city },
    geometry: {
      type: "Point",
      coordinates: [airport.longitude, airport.latitude],
    },
  }));

  routesSource.setData({
    type: "FeatureCollection",
    features: routeFeatures,
  });
  airportsSource.setData({
    type: "FeatureCollection",
    features: airportFeatures,
  });
  map.setLayoutProperty("airport-labels", "visibility", state.showLabels ? "visible" : "none");
  applyProjection();

  if (!routes.length) {
    lastRouteSignature = "";
    return;
  }

  const signature = routes.map((route) => route.id).join(",");
  if (signature === lastRouteSignature) return;

  const bounds = new maplibregl.LngLatBounds();
  routes.forEach((route) => {
    bounds.extend([route.fromAirport.longitude, route.fromAirport.latitude]);
    bounds.extend([route.toAirport.longitude, route.toAirport.latitude]);
  });

  map.fitBounds(bounds, {
    padding: { top: 70, right: 70, bottom: 70, left: 70 },
    duration: 900,
    maxZoom: 4.8,
  });
  lastRouteSignature = signature;
}

function applyProjection(withTransition = true) {
  if (!map?.setProjection) return;
  const target = state.projection === "global" ? "globe" : "mercator";
  const current = map.getProjection?.()?.type;
  if (current !== target) {
    map.setProjection({ type: target });
  }
  if (!withTransition) return;
  if (state.projection === "global") {
    map.easeTo({ zoom: Math.min(map.getZoom(), 1.45), duration: 900 });
  }
}

function renderLegend(routes) {
  if (state.color === "year") {
    const yearPalette = paletteFor(siteData.years.map(String));
    const allYears = [...siteData.years].sort((a, b) => b - a);
    const hasFilter = state.year.length > 0;
    const isFiltered = hasFilter && state.year.length < allYears.length;
    elements.legendRow.innerHTML =
      `<span class="legend-filter-hint">${isFiltered ? "Filtered ↓" : "Year ↓"}</span>` +
      allYears
        .map((year) => {
          const color = yearPalette.get(String(year));
          const active = !hasFilter || state.year.includes(String(year));
          return `<span class="legend-item${active ? "" : " is-inactive"}" data-year="${year}"><i style="background:${color}"></i>${year}</span>`;
        })
        .join("");
    elements.legendRow.querySelectorAll(".legend-item[data-year]").forEach((item) => {
      item.addEventListener("click", () => {
        const year = item.dataset.year;
        const allYearsArr = [...siteData.years].sort((a, b) => b - a).map(String);
        if (state.year.length === allYearsArr.length) {
          state.year = [year];
        } else if (state.year.includes(year)) {
          const next = state.year.filter((y) => y !== year);
          state.year = next.length ? next : allYearsArr;
        } else {
          state.year = [...state.year, year].sort((a, b) => Number(b) - Number(a));
        }
        render();
      });
    });
    return;
  }

  const mapForLegend = new Map();
  const resolver = resolveColorMap(routes);
  [...routes]
    .sort((a, b) => b.year - a.year || b.id - a.id)
    .forEach((route) => {
      const key = legendKey(route);
      if (!mapForLegend.has(key)) {
        mapForLegend.set(key, resolver(route));
      }
    });
  elements.legendRow.innerHTML = [...mapForLegend.entries()]
    .map(
      ([label, color]) =>
        `<span class="legend-item"><i style="background:${color}"></i>${escapeHtml(label)}</span>`,
    )
    .join("");
}

function formatDateRangeNoYear(startDate, endDate) {
  if (!startDate) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const parse = (s) => new Date(s + "T00:00:00");
  const fmt   = (d) => `${months[d.getMonth()]} ${d.getDate()}`;
  const d1 = parse(startDate);
  const d2 = endDate ? parse(endDate) : null;
  let label = fmt(d1);
  if (d2 && d2.getTime() !== d1.getTime()) {
    label += ` – ${fmt(d2)}`;
    const days = Math.round((d2 - d1) / 86400000);
    if (days > 0) label += ` · ${days} day${days === 1 ? "" : "s"}`;
  }
  return label;
}

function renderJourneys(routes, allRoutes = routes) {
  if (!elements.journeyGrid || !elements.journeyCount) return;
  const matchedJourneyIds = new Set(routes.map((route) => route.journeyId).filter(Boolean));
  const journeySource = matchedJourneyIds.size
    ? allRoutes.filter((route) => matchedJourneyIds.has(route.journeyId))
    : routes;
  const journeys = groupJourneys(journeySource);
  elements.journeyCount.textContent = `${journeys.length} journeys`;
  if (!journeys.length) {
    elements.journeyGrid.innerHTML =
      '<div class="empty-state">No journeys in this period.</div>';
    return;
  }

  const yearPalette = paletteFor(siteData.years.map(String));

  // Scale bar: relative to the longest journey in the full set
  const allJourneysForScale = groupJourneys(siteData.routes);
  const maxKm = Math.max(...allJourneysForScale.map((j) => j.totalDistanceKm || 0), 1);

  elements.journeyGrid.innerHTML = journeys
    .map((journey) => {
      const firstRoute = journey.routes[0];
      const lastRoute  = journey.routes[journey.routes.length - 1];
      const note       = journey.headline || "";
      const year       = firstRoute?.date?.slice(0, 4) || "";
      const yearColor  = yearPalette.get(year) || "var(--gold)";

      // Date header: "Jul 13 – Aug 24 · 42 days" (year omitted — shown in badge)
      const dateLabel = formatDateRangeNoYear(firstRoute?.date, lastRoute?.date);

      // Title
      const startCity = compactPlaceName(firstRoute?.fromAirport?.city) || firstRoute?.fromCode || "";
      const endCity   = compactPlaceName(lastRoute?.toAirport?.city)  || lastRoute?.toCode   || "";
      const isRoundtrip = startCity && endCity && startCity === endCity;
      const pathLabel = isRoundtrip ? `Roundtrip from ${startCity}` : `${startCity} → ${endCity}`;

      // IATA flow — all stops, no truncation, wraps naturally
      const iataPoints = [firstRoute.fromCode, ...journey.routes.map((r) => r.toCode)].filter(Boolean);
      const uniqueIata = iataPoints.filter((c, i) => i === 0 || c !== iataPoints[i - 1]);
      const iataHTML = uniqueIata
        .map((code, i) => {
          const arrow = i < uniqueIata.length - 1 ? `<span class="ji-arrow">→</span>` : "";
          return `<span class="ji-code">${escapeHtml(code)}</span>${arrow}`;
        })
        .join("");

      // Scale bar
      const pct = Math.min(100, Math.round((journey.totalDistanceKm / maxKm) * 100));

      return `
        <button class="journey-card-compact" type="button" data-journey-id="${journey.id}" style="--year-color:${yearColor}">
          <div class="journey-card-top">
            <span class="journey-year-badge">${escapeHtml(year)}</span>
            <p class="journey-date">${escapeHtml(dateLabel)}</p>
          </div>
          <div class="journey-card-body">
            <p class="journey-path-label">${escapeHtml(pathLabel)}</p>
            <div class="journey-iata-flow">${iataHTML}</div>
            <div class="journey-scale-bar">
              <div class="journey-scale-track">
                <div class="journey-scale-fill" style="width:${pct}%"></div>
              </div>
              <span class="journey-scale-label">${escapeHtml(formatDistance(journey.totalDistanceKm))} · ${journey.routes.length} flights</span>
            </div>
            ${note && note !== "-" ? `<p class="journey-headline">${escapeHtml(note)}</p>` : ""}
          </div>
        </button>`;
    })
    .join("");

  const cards = [...elements.journeyGrid.querySelectorAll(".journey-card-compact")];

  cards.forEach((row, index) => {
    row.addEventListener("click", () => {
      const journeysAgain = groupJourneys(journeySource);
      selectedRouteId = journeysAgain[index]?.routes[0]?.id ?? selectedRouteId;
      _userClickedJourney = true;
      render();
    });
  });

  // Mark the active journey card
  if (selectedRouteId) {
    const activeIndex = journeys.findIndex((j) =>
      j.routes.some((r) => r.id === selectedRouteId),
    );
    if (activeIndex >= 0 && cards[activeIndex]) {
      cards[activeIndex].classList.add("is-active");
      // Only scroll into view when user explicitly clicked a card
      if (_userClickedJourney) {
        cards[activeIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        _userClickedJourney = false;
      }
    }
  }
}

function compactPlaceName(value) {
  if (!value) return "";
  return String(value)
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*（[^）]*）/g, "")
    .trim();
}

function syncAircraftAnimation(legs) {
  if (!map || !aircraftMarker || !map.getSource("routes")) return;
  stopAircraftAnimation();
  if (!legs || !legs.length) return;

  // Build full journey path by concatenating all leg arcs
  let coordinates = [];
  legs.forEach((leg, i) => {
    const arc = createArc(leg.fromAirport, leg.toAirport, 140);
    coordinates = i === 0 ? arc : [...coordinates, ...arc.slice(1)];
  });
  if (coordinates.length < 2) return;

  aircraftMarker.setLngLat(coordinates[0]).addTo(map);

  const totalKm = legs.reduce((sum, l) => sum + (l.distanceKm || 0), 0);
  const duration = Math.max(3800, Math.min(14000, totalKm * 0.95));
  let startTime = null;

  const tick = (timestamp) => {
    if (startTime === null) startTime = timestamp;
    const progress = ((timestamp - startTime) % duration) / duration;
    const position = interpolateCoordinates(coordinates, progress);
    const lookAhead = interpolateCoordinates(coordinates, Math.min(progress + 0.01, 1));
    aircraftMarker.setLngLat(position);
    aircraftMarker.setRotation(calculateMarkerRotation(position, lookAhead));
    animationFrameId = window.requestAnimationFrame(tick);
  };

  animationFrameId = window.requestAnimationFrame(tick);
}

function stopAircraftAnimation() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  aircraftMarker?.remove();
}

function interpolateCoordinates(coords, progress) {
  if (progress <= 0) return coords[0];
  if (progress >= 1) return coords[coords.length - 1];
  const segments = coords.length - 1;
  const exact = progress * segments;
  const index = Math.floor(exact);
  const frac = exact - index;
  const start = coords[index];
  const end = coords[Math.min(index + 1, coords.length - 1)];
  return [
    start[0] + (end[0] - start[0]) * frac,
    start[1] + (end[1] - start[1]) * frac,
  ];
}

function calculateMarkerRotation(from, to) {
  try {
    const fromPoint = map.project(from);
    const toPoint = map.project(to);
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return ((degrees % 360) + 360) % 360;
  } catch {
    return 0;
  }
}

function resolveColorMap(routes) {
  switch (state.color) {
    case "airline": {
      const palette = paletteFor(uniqueSorted(routes.map((route) => route.airline)));
      return (route) => palette.get(route.airline);
    }
    case "country": {
      const palette = paletteFor(uniqueSorted(routes.map((route) => route.destinationCountry)));
      return (route) => palette.get(route.destinationCountry);
    }
    case "visit":
      return (route) => (route.visited ? "#c9a46a" : "#7a3a3a");
    case "year":
    default: {
      const palette = paletteFor(siteData.years.map(String));
      return (route) => palette.get(String(route.year));
    }
  }
}

function legendKey(route) {
  switch (state.color) {
    case "airline":
      return route.airline;
    case "country":
      return route.destinationCountry;
    case "visit":
      return route.visited ? "Visited" : "Transit";
    case "year":
    default:
      return String(route.year);
  }
}

function buildRouteTooltipHtml(props) {
  if (props.isMultiStop) {
    // Journey-level tooltip
    const dateRange = props.endDateLabel && props.endDateLabel !== props.dateLabel
      ? `${escapeHtml(props.dateLabel)} – ${escapeHtml(props.endDateLabel)}`
      : escapeHtml(props.dateLabel);
    return `<article class="map-tooltip-card">
      <div class="map-tooltip-header">
        <div>
          <p class="map-tooltip-kicker">${dateRange} · ${escapeHtml(String(props.legCount))} legs</p>
          <h4>${escapeHtml(props.fromCode)} → ${escapeHtml(props.toCode)}</h4>
        </div>
      </div>
      <p class="map-tooltip-route-line">${escapeHtml(props.routeChain)}</p>
      <div class="map-tooltip-rows">
        ${props.distanceKm
          ? `<div class="map-tooltip-row"><span>Total distance</span><strong>${escapeHtml(formatDistance(props.distanceKm))}</strong></div>`
          : ""}
        ${props.estimatedDurationLabel
          ? `<div class="map-tooltip-row"><span>Est. airtime</span><strong>${escapeHtml(props.estimatedDurationLabel)}</strong></div>`
          : ""}
      </div>
      ${props.note
        ? `<section class="map-tooltip-note"><span class="map-tooltip-label">Notes</span><p>${escapeHtml(props.note)}</p></section>`
        : ""}
    </article>`;
  }

  // Single-leg tooltip (unchanged)
  const routeTitle = `${escapeHtml(props.fromCode)} – ${escapeHtml(props.toCode)}`;
  const meta = [props.dateLabel, props.airline, props.flightNumber].filter(Boolean).map(escapeHtml);
  const schedule = [];
  if (props.departureTime) schedule.push(`Depart ${escapeHtml(formatTime(props.departureTime))}`);
  if (props.arrivalTime) schedule.push(`Arrive ${escapeHtml(formatTime(props.arrivalTime))}`);
  const fromLine = escapeHtml(`${props.fromCity || props.fromCode} (${props.fromCode})`);
  const toLine = escapeHtml(`${props.toCity || props.toCode} (${props.toCode})`);

  return `<article class="map-tooltip-card">
    <div class="map-tooltip-header">
      <div>
        <p class="map-tooltip-kicker">${meta.join(" · ")}</p>
        <h4>${routeTitle}</h4>
      </div>
    </div>
    <p class="map-tooltip-route-line">${fromLine} → ${toLine}</p>
    <div class="map-tooltip-rows">
      ${props.distanceKm
        ? `<div class="map-tooltip-row"><span>Distance</span><strong>${escapeHtml(formatDistance(props.distanceKm))}</strong></div>`
        : ""}
      ${props.durationLabel
        ? `<div class="map-tooltip-row"><span>Scheduled</span><strong>${escapeHtml(props.durationLabel)}</strong></div>`
        : ""}
    </div>
    ${schedule.length ? `<p class="map-tooltip-times">${schedule.join(" · ")}</p>` : ""}
    ${props.note
      ? `<section class="map-tooltip-note"><span class="map-tooltip-label">Notes</span><p>${escapeHtml(props.note)}</p></section>`
      : ""}
  </article>`;
}

function formatTime(value) {
  if (!value) return "";
  const parts = String(value).split(":");
  if (parts.length < 2) return String(value);
  return `${parts[0]}:${parts[1]}`;
}

function formatFlightDuration(departure, arrival) {
  if (!departure || !arrival) return "";
  const start = timeToMinutes(departure);
  const end = timeToMinutes(arrival);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours <= 0 && minutes <= 0) return "";
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function timeToMinutes(value) {
  const parts = String(value || "").split(":").map(Number);
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) return Number.NaN;
  return parts[0] * 60 + parts[1];
}

function estimateFlightDuration(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return "";
  const cruiseSpeedKmPerHour = 820;
  const fixedMinutes = 28;
  const totalMinutes = Math.round((distanceKm / cruiseSpeedKmPerHour) * 60 + fixedMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function createArc(fromAirport, toAirport, points = 72) {
  const start = [toRadians(fromAirport.longitude), toRadians(fromAirport.latitude)];
  const end = [toRadians(toAirport.longitude), toRadians(toAirport.latitude)];
  const delta =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((end[1] - start[1]) / 2) ** 2 +
          Math.cos(start[1]) * Math.cos(end[1]) * Math.sin((end[0] - start[0]) / 2) ** 2,
      ),
    );

  if (!Number.isFinite(delta) || delta === 0) {
    return [
      [fromAirport.longitude, fromAirport.latitude],
      [toAirport.longitude, toAirport.latitude],
    ];
  }

  const coordinates = [];
  for (let i = 0; i <= points; i += 1) {
    const fraction = i / points;
    const a = Math.sin((1 - fraction) * delta) / Math.sin(delta);
    const b = Math.sin(fraction * delta) / Math.sin(delta);
    const x =
      a * Math.cos(start[1]) * Math.cos(start[0]) +
      b * Math.cos(end[1]) * Math.cos(end[0]);
    const y =
      a * Math.cos(start[1]) * Math.sin(start[0]) +
      b * Math.cos(end[1]) * Math.sin(end[0]);
    const z = a * Math.sin(start[1]) + b * Math.sin(end[1]);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    coordinates.push([toDegrees(lon), toDegrees(lat)]);
  }
  return unwrapCoordinates(coordinates);
}

function unwrapCoordinates(coords) {
  const result = [];
  coords.forEach((coord) => {
    if (!result.length) {
      result.push(coord);
      return;
    }
    const prev = result[result.length - 1];
    let lng = coord[0];
    while (lng - prev[0] > 180) lng -= 360;
    while (lng - prev[0] < -180) lng += 360;
    result.push([lng, coord[1]]);
  });
  return result;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}
})();
