import { state } from "./state.js";
let loadingInstance = null;
let loadingCount = 0;
let loadingWanted = false;
let loadingHooked = false;

export const $ = (id) => document.getElementById(id);

export function showSection(id) {
  document
    .querySelectorAll(".section")
    .forEach((s) => (s.style.display = "none"));
  $(id).style.display = "block";
}

export function showAuth(mode) {
  $("loginCard").style.display = mode === "login" ? "block" : "none";
  $("registerCard").style.display = mode === "register" ? "block" : "none";
}

function setActiveTab(tab) {
  $("tabBtnDashboard")?.classList.remove("active");
  $("tabBtnStock")?.classList.remove("active");
  $("navEmployees")?.classList.remove("active");

  if (tab === "dashboard") $("tabBtnDashboard")?.classList.add("active");
  if (tab === "stock") $("tabBtnStock")?.classList.add("active");
  if (tab === "employees") $("navEmployees")?.classList.add("active");
}

export async function switchTab(tab, onEmployeesOpen) {
  const isAdmin = state.profile?.role === "admin";
  if (!isAdmin && tab === "stock") tab = "dashboard";

  $("tabDashboard").style.display = "none";
  $("tabStock").style.display = "none";
  $("tabEmployees").style.display = "none";

  if (tab === "dashboard") $("tabDashboard").style.display = "block";
  if (tab === "stock") $("tabStock").style.display = "block";
  if (tab === "employees") {
    $("tabEmployees").style.display = "block";
    if (typeof onEmployeesOpen === "function") onEmployeesOpen();
  }

  setActiveTab(tab);
}

export function genEmpId() {
  return "EMP" + Math.floor(100000 + Math.random() * 900000);
}

export function escapeJs(str) {
  return String(str)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"');
}

/* ===== Loading ===== */
export function setLoading(show, text = "Memuat...") {
  const modalEl = document.getElementById("loadingModal");
  if (!modalEl) return;

  if (!loadingInstance) {
    loadingInstance = new bootstrap.Modal(modalEl, {
      backdrop: "static",
      keyboard: false,
    });
  }

  // Pasang hook sekali: kalau modal selesai "shown" tapi loading sudah tidak dibutuhkan, langsung hide.
  if (!loadingHooked) {
    loadingHooked = true;

    modalEl.addEventListener("shown.bs.modal", () => {
      if (!loadingWanted) {
        // kalau race terjadi, kita paksa tutup setelah modal benar2 muncul
        loadingInstance.hide();
      }
    });
  }

  const label = document.getElementById("loadingText");
  if (label && show) label.textContent = text;

  if (show) {
    loadingCount++;
  } else {
    loadingCount = Math.max(loadingCount - 1, 0);
  }

  loadingWanted = loadingCount > 0;

  if (loadingWanted) {
    loadingInstance.show();
  } else {
    // kalau belum sempat shown, hook di atas bakal nutupin begitu modal "shown"
    loadingInstance.hide();
  }
}

/* ===== Toast ===== */
function humanTime() {
  return "baru saja";
}

export function toast(type, message, title) {
  // type: "success" | "error" | "info"
  const t = $("appToast");
  if (!t) return;

  $("toastTitle").textContent =
    title ||
    (type === "success" ? "Berhasil" : type === "error" ? "Gagal" : "Info");
  $("toastBody").textContent = message || "-";
  $("toastTime").textContent = humanTime();

  // header accent (simple)
  const header = t.querySelector(".toast-header");
  if (header) {
    header.style.borderLeft = "6px solid";
    header.style.borderLeftColor =
      type === "success"
        ? "rgba(34,197,94,0.8)"
        : type === "error"
        ? "rgba(239,68,68,0.85)"
        : "rgba(255,122,24,0.85)";
  }

  const inst = bootstrap.Toast.getOrCreateInstance(t, { delay: 2600 });
  inst.show();
}

/* ===== Filters (Search) ===== */
export function setStockFilter(q) {
  state.filters.stockQuery = (q || "").toLowerCase().trim();
}
export function setEmpFilter(q, status) {
  state.filters.empQuery = (q || "").toLowerCase().trim();
  state.filters.empStatus = status || "all";
}
export function setStockSort(v) {
  state.filters.stockSort = v || "name_asc";
  state.filters.stockPage = 1;
}

export function setStockPageSize(n) {
  state.filters.stockPageSize = Number(n) || 25;
  state.filters.stockPage = 1;
}

export function setStockPage(p) {
  state.filters.stockPage = Math.max(1, Number(p) || 1);
}
