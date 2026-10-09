
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
  initializeFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

// Long polling may help when network proxies interrupt Firestore requests.
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

const form = document.getElementById("registrationForm");
const institution = document.getElementById("institution");
const status = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const successBox = document.getElementById("successBox");
const regNumber = document.getElementById("regNumber");

let institutions = {
  universities: [],
  polytechnics: []
};

let isSubmitting = false;

// Load the institution list.
fetch("./institutions.json")
  .then(response => {
    if (!response.ok) {
      throw new Error(`Institution list failed: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    institutions = data;
  })
  .catch(error => {
    console.error("Institution list error:", error);
    status.textContent =
      "Could not load institutions. Refresh the page and try again.";
  });

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Update institutions when the type changes.
document
  .querySelectorAll('input[name="institutionType"]')
  .forEach(radio => {
    radio.addEventListener("change", () => {
      const list =
        radio.value === "University"
          ? institutions.universities
          : institutions.polytechnics;

      institution.disabled = false;

      institution.innerHTML =
        '<option value="">Select your institution</option>' +
        list.map(name =>
          `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
        ).join("");
    });
  });

function createRegistrationNumber() {
  return `4REAL-${new Date().getFullYear()}-${Date.now()
    .toString().slice(-7)}`;
}

function showFirebaseError(error) {
  console.error("Firebase registration error:", error);

  const code = error?.code || "unknown";

  if (code.includes("permission-denied")) {
    return "Permission denied by Firebase. Check your Firestore rules.";
  }

  if (
    code.includes("unavailable") ||
    code.includes("deadline-exceeded")
  ) {
    return "Firebase is not responding. Check your internet connection.";
  }

  if (code.includes("unauthenticated")) {
    return "Firebase requires authentication. Check your Firestore rules.";
  }

  return `Registration failed (${code}). Open F12 > Console for details.`;
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (isSubmitting) return;

  isSubmitting = true;
  submitBtn.disabled = true;
  form.classList.add("loading");
  status.textContent = "Submitting registration...";

  const selectedType =
    document.querySelector(
      'input[name="institutionType"]:checked'
    )?.value || "";

  const applicant = {
    firstName: document.getElementById("firstName").value.trim(),
    surname: document.getElementById("surname").value.trim(),
    email: document.getElementById("email").value.trim().toLowerCase(),
    phone: document.getElementById("phone").value.trim(),
    institutionType: selectedType,
    institution: institution.value,
    department: document.getElementById("department").value.trim(),
    program: document.getElementById("program").value,
    previousStack: document.getElementById("stack").value,
    reason: document.getElementById("reason").value.trim(),
    registrationNumber: createRegistrationNumber(),
    status: "registered",
    createdAt: serverTimestamp()
  };

  let timeoutId;

  try {
    const writePromise = addDoc(
      collection(db, "registrations"),
      applicant
    );

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("REGISTRATION_TIMEOUT"));
      }, 20000);
    });

    await Promise.race([writePromise, timeoutPromise]);

    regNumber.textContent = applicant.registrationNumber;
    status.textContent = "";
    form.style.display = "none";
    successBox.classList.add("show");

  } catch (error) {
    if (error.message === "REGISTRATION_TIMEOUT") {
      console.error("Firestore write timed out.");

      status.textContent =
        "Firebase has not confirmed your registration. " +
        "Check Firestore Data before trying again to avoid duplicates.";
    } else {
      status.textContent = showFirebaseError(error);
    }

    submitBtn.disabled = false;
    form.classList.remove("loading");
    isSubmitting = false;

  } finally {
    clearTimeout(timeoutId);
  }
});