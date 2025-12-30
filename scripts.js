import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://XXXX.supabase.co";
const SUPABASE_ANON_KEY = "PUBLIC_ANON_KEY_KAMU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let profile = null;
let stock = [];
let history = [];

const $ = (id) => document.getElementById(id);

// ================= UI =================
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

// ================= AUTH =================
$("goRegister").onclick = e => { e.preventDefault(); showAuth("register"); };
$("goLogin").onclick = e => { e.preventDefault(); showAuth("login"); };

$("loginForm").onsubmit = async (e) => {
  e.preventDefault();

  const email = `${$("loginEmployeeId").value}@local.app`; // mapping empid → email
  const password = $("loginPassword").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  await afterLogin();
};

$("registerForm").onsubmit = async (e) => {
  e.preventDefault();

  const name = $("regName").value;
  const position = $("regPosition").value;
  const password = $("regPassword").value;

  const fakeEmail = crypto.randomUUID() + "@local.app";

  const { error } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
    options: {
      data: { name, position }
    }
  });

  if (error) return alert(error.message);

  alert("Akun berhasil dibuat. Silakan login.");
  showAuth("login");
};

// ================= SESSION =================
async function afterLogin() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;

  const { data: prof } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .single();

  profile = prof;

  showSection("dashboardSection");
  switchTab("dashboard");

  if (profile.role !== "admin") {
    $("navEmployees").style.display = "none";
  }

  await loadAll();
}

$("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  profile = null;
  showAuth("login");
  showSection("authSection");
};

// ================= DATA =================
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

function updateDashboard() {
  $("totalItems").textContent = stock.length;
  $("totalQty").textContent = stock.reduce((a, b) => a + b.quantity, 0);

  if (stock.length) {
    const last = stock.reduce((a, b) =>
      new Date(b.updated_at) > new Date(a.updated_at) ? b : a
    );
    $("lastUpdate").textContent = new Date(last.updated_at).toLocaleString("id-ID");
    $("lastUpdateBy").textContent = last.updated_by || "-";
  }
}

function renderStock() {
  $("stockTable").innerHTML = "";
  $("removeItemName").innerHTML = "<option value=''>Pilih Barang</option>";

  stock.forEach((s, i) => {
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

// ================= STOCK ACTION =================
$("addForm").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("itemName").value;
  const qty = Number($("quantity").value);

  const { error } = await supabase.rpc("stock_in", {
    p_name: name,
    p_qty: qty
  });

  if (error) return alert(error.message);
  e.target.reset();
  loadAll();
};

$("removeForm").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("removeItemName").value;
  const qty = Number($("removeQuantity").value);

  const { error } = await supabase.rpc("stock_out", {
    p_name: name,
    p_qty: qty
  });

  if (error) return alert(error.message);
  e.target.reset();
  loadAll();
};

async function deleteItem(name) {
  if (!confirm("Hapus item ini?")) return;

  const { error } = await supabase.rpc("stock_delete", { p_name: name });
  if (error) return alert(error.message);

  loadAll();
}
window.deleteItem = deleteItem;

// ================= INIT =================
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await afterLogin();
  } else {
    showAuth("login");
    showSection("authSection");
  }
})();
