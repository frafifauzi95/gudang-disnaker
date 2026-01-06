import { state } from "./state.js";
import { api } from "./api.js";
import { $, setLoading, toast } from "./ui.js";
import {
  renderEmployees,
  renderHistory,
  renderStock,
  updateDashboard,
} from "./render.js";

export async function loadAll() {
  setLoading(true, "Memuat data...");
  try {
    state.stock = await api.loadStock();
    state.history = await api.loadHistory();

    renderStock();
    renderHistory();
    updateDashboard();
  } catch (err) {
    toast("error", err.message || String(err), "Gagal load data");
    throw err;
  } finally {
    setLoading(false);
  }
}

export async function loadEmployees() {
  setLoading(true, "Memuat karyawan...");
  try {
    state.employees = await api.loadEmployeesPublic();
    renderEmployees();
  } catch (err) {
    toast("error", err.message || String(err), "Gagal load karyawan");
    throw err;
  } finally {
    setLoading(false);
  }
}

export function openQuickStockModal(mode, name, currentQty) {
  state.quickStockMode = mode;
  state.quickStockName = name;

  $("quickStockTitle").textContent =
    mode === "in" ? "Tambah Stok" : "Kurangi Stok";
  $("quickStockItem").textContent = name;
  $("quickStockQtyLabel").textContent =
    mode === "in" ? "Jumlah Tambah" : "Jumlah Kurang";
  $("quickStockSubmitBtn").textContent = mode === "in" ? "Tambah" : "Kurangi";
  $("quickStockHint").textContent =
    mode === "out"
      ? `Stok tersedia: ${currentQty}`
      : `Stok saat ini: ${currentQty}`;

  $("quickStockQty").value = "";
  $("quickStockQty").focus();
  new bootstrap.Modal($("quickStockModal")).show();
}

export async function submitQuickStock(qty) {
  const rpcName = state.quickStockMode === "in" ? "stock_in" : "stock_out";
  setLoading(true, "Menyimpan stok...");
  try {
    await api.rpc(rpcName, { p_name: state.quickStockName, p_qty: qty });
    bootstrap.Modal.getInstance($("quickStockModal"))?.hide();
    toast("success", "Stok berhasil diperbarui.");
    await loadAll();
  } catch (err) {
    toast("error", err.message || String(err), "Gagal update stok");
    throw err;
  } finally {
    setLoading(false);
  }
}

export async function deleteItem(name) {
  if (!confirm("Hapus barang ini?")) return;
  setLoading(true, "Menghapus barang...");
  try {
    await api.rpc("stock_delete", { p_name: name });
    toast("success", "Barang berhasil dihapus.");
    await loadAll();
  } catch (err) {
    toast("error", err.message || String(err), "Gagal hapus barang");
    throw err;
  } finally {
    setLoading(false);
  }
}

export async function openEmployeeDetail(empId) {
  if (state.profile?.role !== "admin") return;

  setLoading(true, "Memuat detail...");
  try {
    state.selectedEmployeeId = empId;

    const data = await api.loadEmployeeAdmin(empId);
    $("dEmpId").textContent = data.employee_id;
    $("dName").value = data.name || "";
    $("dPosition").value = data.position || "";
    $("dRole").value = data.role || "employee";
    $("dActive").checked = !!data.is_active;

    new bootstrap.Modal($("employeeDetailModal")).show();
  } catch (err) {
    toast("error", err.message || String(err), "Gagal load detail");
    throw err;
  } finally {
    setLoading(false);
  }
}

export async function submitEmployeeDetail() {
  if (state.profile?.role !== "admin") return;

  setLoading(true, "Menyimpan perubahan...");
  try {
    await api.rpc("admin_update_profile", {
      p_employee_id: state.selectedEmployeeId,
      p_name: $("dName").value.trim(),
      p_position: $("dPosition").value.trim(),
      p_role: $("dRole").value,
      p_active: $("dActive").checked,
    });

    bootstrap.Modal.getInstance($("employeeDetailModal"))?.hide();
    toast("success", "Data karyawan berhasil disimpan.");
    await loadEmployees();
  } catch (err) {
    toast("error", err.message || String(err), "Gagal simpan karyawan");
    throw err;
  } finally {
    setLoading(false);
  }
}
