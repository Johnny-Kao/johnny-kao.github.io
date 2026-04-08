(() => {
const MONTH_NAMES = [
  "All",
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

async function loadSiteData() {
  // 1. Already loaded — either by data.js (local dev) or a previous fetch.
  if (window.__FLIGHT_ARCHIVE_DATA__) {
    return window.__FLIGHT_ARCHIVE_DATA__;
  }

  // 2. Try a session token stored after login.
  const token = sessionStorage.getItem("flight_archive_token");
  if (!token) {
    throw new Error("No flight archive data and no active session.");
  }

  const workerUrl = (window.FLIGHT_WORKER_URL || "").replace(/\/$/, "");
  if (!workerUrl) {
    throw new Error(
      "FLIGHT_WORKER_URL is not configured. Set window.FLIGHT_WORKER_URL before the scripts.",
    );
  }

  const response = await fetch(`${workerUrl}/api/data`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    // Token has expired or is invalid — clear it so next load shows login.
    sessionStorage.removeItem("flight_archive_token");
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(`Data fetch failed (${response.status}).`);
  }

  const data = await response.json();
  window.__FLIGHT_ARCHIVE_DATA__ = data;
  return data;
}

function monthName(month) {
  return MONTH_NAMES[month] || "";
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value || 0);
}

function formatDistance(value) {
  return `${formatNumber(Math.round(value || 0))} km`;
}

function buildSelectOptions(select, values, placeholder) {
  select.innerHTML = "";
  const base = document.createElement("option");
  base.value = "all";
  base.textContent = placeholder;
  select.appendChild(base);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function createChipRow(container, items, activeValue, onSelect) {
  container.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip ${String(item.value) === String(activeValue) ? "is-active" : ""}`;
    button.textContent = item.label;
    button.addEventListener("click", () => onSelect(item.value));
    container.appendChild(button);
  });
}

function applyQueryState(state) {
  const query = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (!value.length) return;
      query.set(key, value.join(","));
      return;
    }
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "all" ||
      value === false
    ) {
      return;
    }
    query.set(key, String(value));
  });
  const next = `${window.location.pathname}${query.toString() ? `?${query}` : ""}`;
  window.history.replaceState({}, "", next);
}

function readQueryState(defaults) {
  const query = new URLSearchParams(window.location.search);
  const state = { ...defaults };
  for (const [key, value] of query.entries()) {
    if (!(key in state)) continue;
    if (Array.isArray(defaults[key])) {
      state[key] = value ? value.split(",").filter(Boolean) : [];
      continue;
    }
    if (typeof defaults[key] === "boolean") {
      state[key] = value === "true";
    } else {
      state[key] = value;
    }
  }
  return state;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paletteFor(values) {
  // Muted, earthy tones — designed to complement the navy/ivory/gold palette
  const palette = [
    "#5b7fa6",  // dusty slate blue
    "#b07d45",  // warm bronze
    "#4e8a74",  // sage teal
    "#a05e6a",  // dusty rose
    "#6b6fa0",  // muted indigo
    "#3d8080",  // slate teal
    "#7a6840",  // warm olive
    "#5e7a9e",  // steel blue
    "#7a5e8a",  // dusty plum
    "#6e7a52",  // sage green
    "#8a5e4e",  // warm terracotta
    "#4a7a6e",  // muted jade
  ];
  const map = new Map();
  values.forEach((value, index) => {
    map.set(value, palette[index % palette.length]);
  });
  return map;
}

function groupJourneys(routes) {
  if (routes.length && routes.every((route) => route.journeyId)) {
    const grouped = new Map();
    sortRoutes(routes, "date-asc").forEach((route) => {
      if (!grouped.has(route.journeyId)) grouped.set(route.journeyId, []);
      grouped.get(route.journeyId).push(route);
    });

    return [...grouped.entries()].sort((a, b) => {
      const dateA = a[1][0]?.date || "";
      const dateB = b[1][0]?.date || "";
      return dateA.localeCompare(dateB);
    }).map(([journeyId, journeyRoutes]) => {
      const first = journeyRoutes[0];
      const last = journeyRoutes[journeyRoutes.length - 1];
      const routeLine = [first.fromCode, ...journeyRoutes.map((route) => route.toCode)].join(" → ");
      const countries = [
        ...new Set(
          journeyRoutes
            .filter((route) => route.visited)
            .map((route) => route.destinationCountry)
            .filter(Boolean),
        ),
      ];
      const headlineNote =
        first.journeyTitle ||
        journeyRoutes.find((route) => route.note)?.note ||
        `${first.fromAirport.city} → ${last.toAirport.city}`;

      return {
        id: journeyId,
        routes: journeyRoutes,
        startDate: first.date,
        endDate: last.date,
        label:
          first.date === last.date
            ? formatDate(first.date)
            : `${formatDate(first.date)} - ${formatDate(last.date)}`,
        headline: headlineNote,
        routeSummary: `${first.fromAirport.city} → ${last.toAirport.city}`,
        routeLine,
        countries,
        totalDistanceKm: journeyRoutes.reduce((sum, route) => sum + (route.distanceKm || 0), 0),
      };
    });
  }

  const sorted = [...routes].sort((a, b) => {
    if (a.date === b.date) return a.id - b.id;
    return a.date.localeCompare(b.date);
  });

  const journeys = [];
  let current = [];

    const pushCurrent = () => {
      if (!current.length) return;
      const first = current[0];
      const last = current[current.length - 1];
      const routeLine = [first.fromCode, ...current.map((route) => route.toCode)].join(" → ");
      const countries = [
        ...new Set(
          current
            .filter((route) => route.visited)
          .map((route) => route.destinationCountry)
          .filter(Boolean),
      ),
    ];
    const headlineNote =
      current.find((route) => route.note)?.note ||
      `${first.fromAirport.city} → ${last.toAirport.city}`;
      journeys.push({
        id: `${first.id}-${last.id}`,
        routes: current,
        startDate: first.date,
      endDate: last.date,
        label:
          first.date === last.date
            ? formatDate(first.date)
            : `${formatDate(first.date)} - ${formatDate(last.date)}`,
        headline: headlineNote,
        routeSummary: `${first.fromAirport.city} → ${last.toAirport.city}`,
        routeLine,
        countries,
        totalDistanceKm: current.reduce((sum, route) => sum + (route.distanceKm || 0), 0),
      });
    current = [];
  };

  sorted.forEach((route) => {
    if (!current.length) {
      current.push(route);
      return;
    }
    const previous = current[current.length - 1];
    const gap = dateDiff(previous.date, route.date);
    if (gap > 4) {
      pushCurrent();
    }
    current.push(route);
  });

  pushCurrent();
  return journeys;
}

function dateDiff(a, b) {
  const ms = new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`);
  return Math.round(ms / 86400000);
}

function filterRoutes(routes, state) {
  return routes.filter((route) => {
    const hasDateSelection = Array.isArray(state.date);
    if (hasDateSelection) {
      if (!state.date.length) return false;
      const yearKey = `${route.year}:*`;
      const monthKey = `${route.year}:${route.month}`;
      if (!state.date.includes(yearKey) && !state.date.includes(monthKey)) return false;
    }
    if (!hasDateSelection && Array.isArray(state.year)) {
      if (!state.year.length) return false;
      if (!state.year.includes(String(route.year))) return false;
    }
    if (!hasDateSelection && !Array.isArray(state.year) && state.year !== "all" && String(route.year) !== String(state.year)) {
      return false;
    }
    if (!hasDateSelection && Array.isArray(state.month)) {
      if (!state.month.length) return false;
      if (!state.month.includes(String(route.month))) return false;
    }
    if (!hasDateSelection && !Array.isArray(state.month) && state.month !== "all" && String(route.month) !== String(state.month)) {
      return false;
    }
    if (Array.isArray(state.airline)) {
      if (!state.airline.length) return false;
      if (!state.airline.includes(route.airline)) return false;
    } else if (state.airline !== "all" && route.airline !== state.airline) {
      return false;
    }
    if (Array.isArray(state.country)) {
      if (!state.country.length) return false;
      if (!state.country.includes(route.destinationCountry)) return false;
    } else if (state.country !== "all" && route.destinationCountry !== state.country) {
      return false;
    }
    if (
      state.airport !== "all" &&
      route.fromCode !== state.airport &&
      route.toCode !== state.airport
    ) {
      return false;
    }
    if (state.visitedOnly && !route.visited) return false;
    if (state.q && !route.searchText.includes(state.q.trim().toLowerCase())) return false;
    return true;
  });
}

function sortRoutes(routes, sortMode) {
  const next = [...routes];
  switch (sortMode) {
    case "date-desc":
      return next.sort((a, b) => (a.date === b.date ? b.id - a.id : b.date.localeCompare(a.date)));
    case "distance-desc":
      return next.sort((a, b) => (b.distanceKm || 0) - (a.distanceKm || 0));
    case "date-asc":
    default:
      return next.sort((a, b) => (a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date)));
  }
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "en"),
  );
}

function routeLabel(route) {
  return `${route.fromCode} → ${route.toCode}`;
}

function copyCurrentUrl(button) {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const previous = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = previous;
    }, 1200);
  });
}

function cumulativeDistance(routes) {
  let running = 0;
  return sortRoutes(routes, "date-asc").map((route) => {
    running += route.distanceKm || 0;
    return {
      date: route.date,
      label: formatDate(route.date),
      total: running,
    };
  });
}

window.FlightArchiveShared = {
  applyQueryState,
  buildSelectOptions,
  copyCurrentUrl,
  createChipRow,
  cumulativeDistance,
  dateDiff,
  escapeHtml,
  filterRoutes,
  formatDate,
  formatDistance,
  formatNumber,
  groupJourneys,
  loadSiteData,
  monthName,
  paletteFor,
  readQueryState,
  routeLabel,
  sortRoutes,
  uniqueSorted,
};
})();
