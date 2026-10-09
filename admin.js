import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
signOut, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, query, orderBy, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const ADMIN_EMAIL = "alanishina606@gmail.com".toLowerCase();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const loginPanel = $("loginPanel");
const dashboardPanel = $("dashboardPanel");
const loginForm = $("loginForm");
const loginBtn = $("loginBtn");
const loginMessage = $("loginMessage");
const dashboardMessage = $("dashboardMessage");
const signOutBtn = $("signOutBtn");
const adminIdentity = $("adminIdentity");
const registrationsBody = $("registrationsBody");
let allRegistrations = [];
let loading = false;

$("year").textContent = new Date().getFullYear();
let sendingVerification = false;

const verifyEmailBtn = document.createElement("button");
verifyEmailBtn.type = "button";
verifyEmailBtn.textContent = "Resend verification email";
verifyEmailBtn.style.cssText =
  "width:100%;padding:12px;margin-top:10px;cursor:pointer;border-radius:8px;";

loginForm.insertAdjacentElement("afterend", verifyEmailBtn);

function setMessage(el, message = "", success = false) {
  el.textContent = message;
  el.classList.toggle("success", success);
}
function showSignedOut(message = "") {
  loginPanel.hidden = false;
  dashboardPanel.hidden = true;
  signOutBtn.hidden = true;
  adminIdentity.hidden = true;
  setMessage(loginMessage, message);
}
function showSignedIn(user) {
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  signOutBtn.hidden = false;
  adminIdentity.hidden = false;
  adminIdentity.textContent = user.email || ADMIN_EMAIL;
}
function niceDate(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, {year:"numeric", month:"short", day:"numeric"});
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[ch]);
}

function updateStats(rows) {
  $("totalCount").textContent = rows.length;

  const getProgramCount = (programName) => {
    return rows.filter(({ data }) => {
      const program = String(data?.program || "")
        .trim()
        .toUpperCase();

      return program === programName;
    }).length;
  };

  $("siwesCount").textContent = getProgramCount("SIWES");
  $("itCount").textContent = getProgramCount("IT");
  $("diplomaCount").textContent = getProgramCount("DIPLOMA");
}
function filteredRows() {
  const term = $("searchInput").value.trim().toLowerCase();
  const program = $("programFilter").value.toUpperCase();
  const status = $("statusFilter").value.toLowerCase();
  return allRegistrations.filter(({data:d}) => {
    const haystack = [d.firstName,d.surname,d.email,d.phone,d.institution,d.department,d.registrationNumber,d.program,d.status]
      .map(v => String(v ?? "")).join(" ").toLowerCase();
    return (!term || haystack.includes(term)) &&
      (!program || String(d.program || "").toUpperCase() === program) &&
      (!status || String(d.status || "registered").toLowerCase() === status);
  });
}
function renderRows() {
  const rows = filteredRows();
  $("recordCount").textContent = `${rows.length} of ${allRegistrations.length} records`;
  if (!rows.length) {
    registrationsBody.innerHTML = '<tr><td colspan="7" class="empty-cell">No registrations match your search.</td></tr>';
    return;
  }
  registrationsBody.innerHTML = rows.map(({id, data:d}) => {
    const name = `${d.firstName || ""} ${d.surname || ""}`.trim() || "Unnamed applicant";
    const status = String(d.status || "registered").toLowerCase();
    const allowed = ["registered","reviewing","approved","rejected"].includes(status) ? status : "registered";
    return `<tr>
      <td><strong>${escapeHtml(name)}</strong><small>${escapeHtml(d.email || "")}</small></td>
      <td>${escapeHtml(d.institution || "—")}<small>${escapeHtml(d.department || "")}</small></td>
      <td>${escapeHtml(d.program || "—")}<small>${escapeHtml(d.institutionType || "")}</small></td>
      <td>${escapeHtml(d.phone || "—")}</td>
      <td><strong>${escapeHtml(d.registrationNumber || "—")}</strong></td>
      <td><select class="status-select" data-id="${escapeHtml(id)}" aria-label="Update status for ${escapeHtml(name)}">
        ${["registered","reviewing","approved","rejected"].map(s => `<option value="${s}" ${s===allowed?"selected":""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}
      </select></td>
      <td>${escapeHtml(niceDate(d.createdAt))}</td>
    </tr>`;
  }).join("");
}
async function loadRegistrations() {
  if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== ADMIN_EMAIL || !auth.currentUser.emailVerified) {
    showSignedOut("Sign in with the authorised, email-verified administrator account.");
    return;
  }
  if (loading) return;
  loading = true;
  $("refreshBtn").disabled = true;
  setMessage(dashboardMessage, "Loading registrations…");
  registrationsBody.innerHTML = '<tr><td colspan="7" class="empty-cell">Loading records…</td></tr>';
  try {
    const q = query(collection(db, "registrations"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allRegistrations = snap.docs.map(item => ({id:item.id, data:item.data()}));
    updateStats(allRegistrations);
    renderRows();
    setMessage(dashboardMessage, `Loaded ${allRegistrations.length} registration(s).`, true);
  } catch (error) {
    console.error("Could not load registrations:", error);
    allRegistrations = [];
    updateStats([]);
    registrationsBody.innerHTML = '<tr><td colspan="7" class="empty-cell">Could not load records. Check Firestore rules and that this admin email is verified.</td></tr>';
    setMessage(dashboardMessage, `${error.code || "Error"}: ${error.message || "Unable to load registrations."}`);
  } finally {
    loading = false;
    $("refreshBtn").disabled = false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage, "");
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  if (email !== ADMIN_EMAIL) {
    setMessage(loginMessage, "This email is not authorised for administrator access.");
    return;
  }
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (!result.user.emailVerified) {
      await signOut(auth);
      setMessage(loginMessage, "Verify this administrator email first. Open Firebase Authentication → Users and send the verification email, then verify it.");
      return;
    }
    showSignedIn(result.user);
    await loadRegistrations();
  } catch (error) {
    console.error("Admin sign-in failed:", error);
    const messages = {
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/user-not-found": "No Firebase Authentication user was found for this email.",
      "auth/wrong-password": "Email or password is incorrect.",
      "auth/too-many-requests": "Too many attempts. Wait a while and try again."
    };
    setMessage(loginMessage, messages[error.code] || `${error.code || "Error"}: ${error.message || "Could not sign in."}`);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in securely";
  }
});

verifyEmailBtn.addEventListener("click", async () => {
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;

  setMessage(loginMessage, "");

  if (email !== ADMIN_EMAIL) {
    setMessage(loginMessage, "Enter the authorised admin email.");
    return;
  }

  if (!password) {
    setMessage(
      loginMessage,
      "Enter your admin password, then click Resend verification email."
    );
    return;
  }

  verifyEmailBtn.disabled = true;
  verifyEmailBtn.textContent = "Sending email...";
  sendingVerification = true;

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (result.user.emailVerified) {
      setMessage(
        loginMessage,
        "Your email is already verified. You can sign in.",
        true
      );
    } else {
      await sendEmailVerification(result.user);

      setMessage(
        loginMessage,
        "Verification email sent. Check your Gmail Inbox and Spam folder.",
        true
      );
    }
  } catch (error) {
    console.error("Verification email error:", error);

    const messages = {
      "auth/invalid-credential":
        "Your email or password is incorrect.",
      "auth/too-many-requests":
        "Too many attempts. Wait a while before trying again.",
      "auth/too-many-emails":
        "Too many emails have been sent. Try again later.",
      "auth/network-request-failed":
        "Network error. Check your internet connection."
    };

    setMessage(
      loginMessage,
      messages[error.code] ||
      `${error.code || "Error"}: ${error.message || "Could not send verification email."}`
    );
  } finally {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out error:", error);
    }

    sendingVerification = false;
    verifyEmailBtn.disabled = false;
    verifyEmailBtn.textContent = "Resend verification email";
  }
});

signOutBtn.addEventListener("click", async () => {
  await signOut(auth);
  allRegistrations = [];
  updateStats([]);
  showSignedOut("You have signed out.");
});

$("refreshBtn").addEventListener("click", loadRegistrations);
$("searchInput").addEventListener("input", renderRows);
$("programFilter").addEventListener("change", renderRows);
$("statusFilter").addEventListener("change", renderRows);

registrationsBody.addEventListener("change", async (event) => {
  const select = event.target.closest("select.status-select");
  if (!select) return;
  const id = select.dataset.id;
  const newStatus = select.value;
  select.disabled = true;
  setMessage(dashboardMessage, "Updating registration status…");
  try {
    await updateDoc(doc(db, "registrations", id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email
    });
    const row = allRegistrations.find(r => r.id === id);
    if (row) row.data.status = newStatus;
    setMessage(dashboardMessage, "Registration status updated.", true);
  } catch (error) {
    console.error("Status update failed:", error);
    setMessage(dashboardMessage, `${error.code || "Error"}: Could not update status. Check the published Firestore rules.`);
    await loadRegistrations();
  } finally {
    select.disabled = false;
  }
});

$("exportBtn").addEventListener("click", () => {
  const rows = filteredRows();
  const columns = [
    ["First name","firstName"],["Surname","surname"],["Email","email"],["Phone","phone"],
    ["Institution type","institutionType"],["Institution","institution"],["Department","department"],
    ["Programme","program"],["Registration number","registrationNumber"],["Status","status"],["Registered date","createdAt"]
  ];
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.map(c => csvCell(c[0])).join(","), ...rows.map(({data}) =>
    columns.map(([label,key]) => csvCell(key === "createdAt" ? niceDate(data[key]) : data[key])).join(",")
  )].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "4real-registrations.csv";
  link.click();
  URL.revokeObjectURL(url);
});

onAuthStateChanged(auth, async (user) => {
  if (sendingVerification) return;
  if (!user) {
    showSignedOut();
    return;
  }
  if (user.email?.toLowerCase() !== ADMIN_EMAIL || !user.emailVerified) {
    await signOut(auth);
    showSignedOut("This account is not authorised, or its email has not been verified.");
    return;
  }
  showSignedIn(user);
  await loadRegistrations();
});
