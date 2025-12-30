import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vupoipqbvwloxdlyczfk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cG9pcHFidndsb3hkbHljemZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTI3MDgsImV4cCI6MjA4MjY2ODcwOH0.L8PZ84YJr5ZadWqM-CjlUDv8XI6Z25mgcBZczZ5f-CY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== STATE =====
let currentUser = null;
let profile = null;
let stock = [];
let history = [];

// ===== HELPERS =====
const $ = (id) => document.getElementById(id);

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  $(id).style.display = "block";
}

function switchTab(tab) {
  $("tabDashboard").style.display = "none";
  $("tabStock").style.display = "none";
  if (tab === "dashboard") $("tabDashboard").style.display = "block";
  if (tab === "stock") $("tabStock").style.display = "block";
}
window.switchTab = switchTab;

function showAuth(mode) {
  $("loginCard").style.display = mode === "login" ? "block" : "none";
  $("registerCard").style.display = mode === "register" ? "block" : "none";
}

function genEmpId() {
  return "EMP" + Math.floor(100000 + Math.random() * 900000);
}

// ===== AUTH UI SWITCH =====
$("goRegister").onclick = e => { e.preventDefault(); showAuth("register"); };
$("goLogin").onclick = e => { e.preventDefault(); showAuth("login"); };

// ===== REGISTER (AUTO LOGIN + MODAL) =====
$("registerForm").onsubmit = async (e) => {
  e.preventDefault();

  const name = $("regName").value.trim();
  const position = $("regPosition").value.trim();
  const password = $("regPassword").value;

  const employee_id = genEmpId();
  const email = `${employee_id}@local.app`;

  // SIGN UP
  const { error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, position, employee_id }
    }
  });

  if (signUpErr) return alert(signUpErr.message);

  // AUTO LOGIN
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (signInErr) return alert(signInErr.message);

  await afterLogin();

  // SHOW MODAL INFO AKUN
  $("modalEmpId").textContent = profile.employee_id;
  $("modalName").textContent = profile.name;
  $("modalRole").textContent = profile.role;

  new bootstrap.Modal($("accountModal")).show();
};

// ===== LOGIN =====
$("loginForm").onsubmit = async (e) => {
  e.preventDefault();

  const empid = $("loginEmployeeId").value.trim();
  const password = $("loginPassword").value;
  const email = `${empid}@local.app`;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  await afterLogin();
};

// ===== AFTER LOGIN =====
async function afterLogin() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;

  const { data: prof, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .single();

  if (error) return alert("Gagal load profile");

  profile = prof;

  showSection("dashboardSection");
  switchTab("dashboard");

  if (profile.role !== "admin") {
    const navEmp = $("navEmployees");
    if (navEmp) navEmp.style.display = "none";
  }

  await loadAll();
}

// ===== LOGOUT =====
$("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  profile = null;
  showSection("authSection");
  showAuth("login");
};

// ===== LOAD DATA =====
async function loadAll() {
  const { data: s } = await supabase.from("stock").select("*").order("name");
  const { data: h } = await supabase
    .from("history")
    .select("*")
    .order("ts", { ascending: false })
    .limit(200);

  stock = s || [];
  history = h || [];

  renderStock();
  renderHistory();
  updateDashboard();
}

// ===== DASHBOARD =====
function updateDashboard() {
  $("totalItems").textContent = stock.length;
  $("totalQty").textContent = stock.reduce((a, b) => a + b.quantity, 0);

  if (stock.length) {
    const last = stock.reduce((a, b) =>
      new Date(b.updated_at) > new Date(a.updated_at) ? b : a
    );
    $("lastUpdate").textContent = new Date(last.updated_at).toLocaleString("id-ID");
    $("lastUpdateBy").textContent = profile.name;
  }
}

// ===== RENDER =====
function renderStock() {
  $("stockTable").innerHTML = "";
  $("removeItemName").innerHTML = "<option value=''>Pilih Barang</option>";

  stock.forEach(s => {
    $("stockTable").innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>${s.quantity}</td>
        <td>${new Date(s.updated_at).toLocaleString("id-ID")}</td>
        <td>${
          profile.role === "admin"
            ? `<button class="btn btn-danger btn-sm" onclick="deleteItem('${s.name}')">Hapus</button>`
            : "-"
        }</td>
      </tr>
    `;
    $("removeItemName").innerHTML += `<option value="${s.name}">${s.name}</option>`;
  });
}

function renderHistory() {
  $("historyTable").innerHTML = "";
  history.forEach(h => {
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

// ===== STOCK ACTION =====
$("addForm").onsubmit = async (e) => {
  e.preventDefault();

  const name = $("itemName").value;
  const qty = Number($("quantity").value);

  const { error } = await supabase.rpc("stock_in", { p_name: name, p_qty: qty });
  if (error) return alert(error.message);

  e.target.reset();
  loadAll();
};

$("removeForm").onsubmit = async (e) => {
  e.preventDefault();

  const name = $("removeItemName").value;
  const qty = Number($("removeQuantity").value);

  const { error } = await supabase.rpc("stock_out", { p_name: name, p_qty: qty });
  if (error) return alert(error.message);

  e.target.reset();
  loadAll();
};

async function deleteItem(name) {
  if (!confirm("Hapus barang ini?")) return;

  const { error } = await supabase.rpc("stock_delete", { p_name: name });
  if (error) return alert(error.message);

  loadAll();
}
window.deleteItem = deleteItem;

// ===== INIT =====
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await afterLogin();
  } else {
    showAuth("login");
    showSection("authSection");
  }
})();

