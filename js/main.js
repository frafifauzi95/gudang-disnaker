import { state } from "./state.js";
import { api, supabase } from "./api.js";
import {
  $,
  showAuth,
  showSection,
  switchTab,
  genEmpId,
  toast,
  setLoading,
  setStockFilter,
  setStockSort,
  setStockPageSize,
  setStockPage,
  setEmpFilter,
} from "./ui.js";
import {
  loadAll,
  loadEmployees,
  openEmployeeDetail,
  openQuickStockModal,
  submitEmployeeDetail,
  submitQuickStock,
  deleteItem,
} from "./actions.js";
import { renderStock, renderEmployees } from "./render.js";

// expose
window.switchTab = (t) => switchTab(t, loadEmployees);
window.openEmployeeDetail = openEmployeeDetail;
window.openQuickStockModal = openQuickStockModal;
window.deleteItem = deleteItem;

async function afterLogin() {
  setLoading(true, "Menyiapkan akun...");
  try {
    state.currentUser = await api.getUser();
    state.profile = await api.getProfileByUserId(state.currentUser.id);
    fillProfileUI();

    const isAdmin = state.profile.role === "admin";

    $("tabBtnDashboard")?.classList.remove("d-none");
    $("navEmployees")?.classList.remove("d-none");

    if (isAdmin) $("tabBtnStock")?.classList.remove("d-none");
    else $("tabBtnStock")?.classList.add("d-none");

    showSection("dashboardSection");
    await switchTab("dashboard", loadEmployees);
    await loadAll();
  } catch (err) {
    toast("error", err.message || String(err), "Gagal login");
    throw err;
  } finally {
    setLoading(false);
  }
}
function fillProfileUI() {
  const name = state.profile?.name || "User";
  const pos = state.profile?.position || "-";
  const role = state.profile?.role || "employee";
  const empId = state.profile?.employee_id || "-";

  const initial = name.trim().slice(0, 1).toUpperCase();

  document.getElementById("profileName").textContent = name;
  document.getElementById("profileMeta").textContent = `${pos} • ${role}`;
  document.getElementById("profileAvatar").textContent = initial;

  document.getElementById("profileName2").textContent = name;
  document.getElementById("profileMeta2").textContent = `${pos} • ${role}`;
  document.getElementById("profileEmpId").textContent = empId;
}
function bindStockControls() {
  const search = $("stockSearch");
  const size = $("stockPageSize");
  const prev = $("stockPrevBtn");
  const next = $("stockNextBtn");

  // search stok
  if (search) {
    search.addEventListener("input", (e) => {
      setStockFilter(e.target.value);
      renderStock();
    });
  }

  // page size
  if (size) {
    size.addEventListener("change", (e) => {
      setStockPageSize(e.target.value);
      renderStock();
    });
  }

  // prev/next page
  if (prev) {
    prev.addEventListener("click", () => {
      setStockPage(state.filters.stockPage - 1);
      renderStock();
    });
  }

  if (next) {
    next.addEventListener("click", () => {
      setStockPage(state.filters.stockPage + 1);
      renderStock();
    });
  }

  // sortable header click
  document.querySelectorAll("th.th-sort[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      const current = state.filters.stockSort || "name_asc";

      let next;
      if (!current.startsWith(key)) next = `${key}_asc`;
      else next = current.endsWith("_asc") ? `${key}_desc` : `${key}_asc`;

      setStockSort(next);
      renderStock();
    });
  });
}

function bindSearchFilters() {
  // stok search
  //   const stockSearch = $("stockSearch");
  //   if (stockSearch) {
  //     stockSearch.addEventListener("input", (e) => {
  //       setStockFilter(e.target.value);
  //       renderStock();
  //     });
  //   }

  // employee search + status
  const empSearch = $("empSearch");
  const empStatus = $("empStatusFilter");
  const applyEmpFilter = () => {
    setEmpFilter(empSearch?.value || "", empStatus?.value || "all");
    renderEmployees();
  };

  if (empSearch) empSearch.addEventListener("input", applyEmpFilter);
  if (empStatus) empStatus.addEventListener("change", applyEmpFilter);
}

function bindEvents() {
  bindSearchFilters();
  bindStockControls();

  $("goRegister").onclick = (e) => {
    e.preventDefault();
    showAuth("register");
  };
  $("goLogin").onclick = (e) => {
    e.preventDefault();
    showAuth("login");
  };

  $("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    state.currentUser = null;
    state.profile = null;
    showSection("authSection");
    showAuth("login");
    toast("info", "Kamu sudah logout.");
  };

  $("registerForm").onsubmit = async (e) => {
    e.preventDefault();

    const name = $("regName").value.trim();
    const position = $("regPosition").value.trim();
    const password = $("regPassword").value;

    const employee_id = genEmpId();
    const email = `${employee_id}@local.app`;

    setLoading(true, "Membuat akun...");
    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, position, employee_id } },
      });
      if (signUpErr) throw signUpErr;

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) throw signInErr;

      await afterLogin();

      $("modalEmpId").textContent = state.profile.employee_id;
      $("modalName").textContent = state.profile.name;
      $("modalRole").textContent = state.profile.role;

      new bootstrap.Modal($("accountModal")).show();
      toast("success", "Akun berhasil dibuat & login.");
    } catch (err) {
      toast("error", err.message || String(err), "Register gagal");
    } finally {
      setLoading(false);
    }
  };

  $("loginForm").onsubmit = async (e) => {
    e.preventDefault();

    const empid = $("loginEmployeeId").value.trim();
    const password = $("loginPassword").value;
    const email = `${empid}@local.app`;

    setLoading(true, "Login...");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      await afterLogin();
      toast("success", "Login berhasil.");
    } catch (err) {
      toast("error", err.message || String(err), "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  $("quickStockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const qty = Number($("quickStockQty").value);
    if (!Number.isFinite(qty) || qty <= 0)
      return toast("error", "Jumlah tidak valid");

    try {
      await submitQuickStock(qty);
    } catch {}
  });

  $("addForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("itemName").value;
    const qty = Number($("quantity").value);

    setLoading(true, "Menambah stok...");
    try {
      await api.rpc("stock_in", { p_name: name, p_qty: qty });
      e.target.reset();
      toast("success", "Stok berhasil ditambahkan.");
      await loadAll();
    } catch (err) {
      toast("error", err.message || String(err), "Gagal tambah stok");
    } finally {
      setLoading(false);
    }
  };

  $("removeForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("removeItemName").value;
    const qty = Number($("removeQuantity").value);

    setLoading(true, "Mengurangi stok...");
    try {
      await api.rpc("stock_out", { p_name: name, p_qty: qty });
      e.target.reset();
      toast("success", "Stok berhasil dikurangi.");
      await loadAll();
    } catch (err) {
      toast("error", err.message || String(err), "Gagal kurangi stok");
    } finally {
      setLoading(false);
    }
  };

  $("employeeDetailForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await submitEmployeeDetail();
    } catch {}
  });
}

(async function boot() {
  bindEvents();

  const session = await api.getSession();
  if (session) {
    await afterLogin();
  } else {
    showAuth("login");
    showSection("authSection");
  }
})();

document.getElementById("copyEmpIdBtn")?.addEventListener("click", async () => {
  const empId = state.profile?.employee_id || "";
  if (!empId) return toast("error", "Employee ID tidak ditemukan");

  try {
    await navigator.clipboard.writeText(empId);
    toast("success", "Employee ID disalin");
  } catch {
    // fallback
    const temp = document.createElement("input");
    temp.value = empId;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    toast("success", "Employee ID disalin");
  }
});
