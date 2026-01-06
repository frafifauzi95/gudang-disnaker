import { state } from "./state.js";
import { $, escapeJs } from "./ui.js";

export function updateDashboard() {
  $("totalItems").textContent = state.stock.length;
  $("totalQty").textContent = state.stock.reduce(
    (a, b) => a + (b.quantity || 0),
    0
  );

  if (state.stock.length) {
    const last = state.stock.reduce((a, b) =>
      new Date(b.updated_at) > new Date(a.updated_at) ? b : a
    );
    $("lastUpdate").textContent = new Date(last.updated_at).toLocaleString(
      "id-ID"
    );
    $("lastUpdateBy").textContent = state.profile?.name || "-";
  } else {
    $("lastUpdate").textContent = "-";
    $("lastUpdateBy").textContent = "-";
  }
}
function updateSortIcons() {
  document.querySelectorAll("th.th-sort").forEach((th) => {
    th.classList.remove("active");
    const icon = th.querySelector(".sort-icon");
    if (icon) icon.textContent = "";
  });

  const [key, dir] = state.filters.stockSort.split("_");
  const th = document.querySelector(`th.th-sort[data-sort="${key}"]`);
  if (!th) return;

  th.classList.add("active");
  const icon = th.querySelector(".sort-icon");
  if (icon) icon.textContent = dir === "asc" ? "▲" : "▼";
}

export function renderStock() {
  $("stockTable").innerHTML = "";
  $("removeItemName").innerHTML = "<option value=''>Pilih Barang</option>";

  const isAdmin = state.profile?.role === "admin";
  const q = (state.filters.stockQuery || "").toLowerCase().trim();
  const sort = state.filters.stockSort || "name_asc";
  const pageSize = Number(state.filters.stockPageSize || 25);
  const page = Number(state.filters.stockPage || 1);

  // 1) filter
  let list = q
    ? state.stock.filter((s) =>
        String(s.name || "")
          .toLowerCase()
          .includes(q)
      )
    : [...state.stock];

  // 2) sort
  list.sort((a, b) => {
    const an = String(a.name || "");
    const bn = String(b.name || "");
    const aq = Number(a.quantity || 0);
    const bq = Number(b.quantity || 0);
    const au = new Date(a.updated_at || 0).getTime();
    const bu = new Date(b.updated_at || 0).getTime();

    switch (sort) {
      case "name_desc":
        return bn.localeCompare(an);
      case "qty_desc":
        return bq - aq;
      case "qty_asc":
        return aq - bq;
      case "updated_desc":
        return bu - au;
      case "updated_asc":
        return au - bu;
      case "name_asc":
      default:
        return an.localeCompare(bn);
    }
  });

  // 3) paginate
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  state.filters.stockPage = safePage;

  const start = (safePage - 1) * pageSize;
  const paged = list.slice(start, start + pageSize);

  // render rows
  if (!paged.length) {
    $(
      "stockTable"
    ).innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Tidak ada data yang cocok.</td></tr>`;
  } else {
    paged.forEach((s) => {
      const safeName = escapeJs(s.name);
      const qty = Number(s.quantity || 0);

      $("stockTable").innerHTML += `
        <tr>
          <td>${s.name}</td>
          <td>${qty}</td>
          <td>${new Date(s.updated_at).toLocaleString("id-ID")}</td>
          <td class="d-flex gap-2">
            <button class="btn btn-success btn-sm" onclick="openQuickStockModal('in','${safeName}',${qty})">+</button>
            <button class="btn btn-warning btn-sm" onclick="openQuickStockModal('out','${safeName}',${qty})">-</button>
            ${
              isAdmin
                ? `<button class="btn btn-danger btn-sm" onclick="deleteItem('${safeName}')">Hapus</button>`
                : ""
            }
          </td>
        </tr>
      `;
    });
  }

  // dropdown “keluarkan stok” tetap full list biar gampang
  state.stock.forEach((s) => {
    $(
      "removeItemName"
    ).innerHTML += `<option value="${s.name}">${s.name}</option>`;
  });

  // paging UI
  const info = $("stockPageInfo");
  if (info) {
    const from = total ? start + 1 : 0;
    const to = Math.min(start + pageSize, total);
    info.textContent = `Menampilkan ${from}-${to} dari ${total} data • Halaman ${safePage}/${totalPages}`;
  }

  const prev = $("stockPrevBtn");
  const next = $("stockNextBtn");
  if (prev) prev.disabled = safePage <= 1;
  if (next) next.disabled = safePage >= totalPages;
  updateSortIcons();
}

export function renderHistory() {
  $("historyTable").innerHTML = "";
  state.history.forEach((h) => {
    $("historyTable").innerHTML += `
      <tr>
        <td>${new Date(h.ts).toLocaleString("id-ID")}</td>
        <td>${h.action}</td>
        <td>${h.item_name}</td>
        <td>${h.quantity}</td>
        <td>${h.employee_name}</td>
      </tr>
    `;
  });
}

export function renderEmployees() {
  const isAdmin = state.profile?.role === "admin";
  $("empActionHead").style.display = isAdmin ? "" : "none";

  const q = state.filters.empQuery;
  const status = state.filters.empStatus;

  let filtered = state.employees;

  if (q) {
    filtered = filtered.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const pos = String(p.position || "").toLowerCase();
      return name.includes(q) || pos.includes(q);
    });
  }

  if (status === "active") filtered = filtered.filter((p) => !!p.is_active);
  if (status === "inactive") filtered = filtered.filter((p) => !p.is_active);

  const tbody = $("employeeTable");
  tbody.innerHTML = "";

  filtered.forEach((p) => {
    tbody.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.position}</td>
        <td>
          <span class="badge ${p.is_active ? "bg-success" : "bg-secondary"}">
            ${p.is_active ? "Aktif" : "Nonaktif"}
          </span>
        </td>
        ${
          isAdmin
            ? `<td><button class="btn btn-sm btn-outline-secondary" onclick="openEmployeeDetail('${p.employee_id}')">Detail</button></td>`
            : ""
        }
      </tr>
    `;
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr><td colspan="${
        isAdmin ? 4 : 3
      }" class="text-center text-muted py-4">Tidak ada data yang cocok.</td></tr>
    `;
  }
}
