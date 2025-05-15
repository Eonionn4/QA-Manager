document.addEventListener("DOMContentLoaded", function () {
  // ✅ Firebase config (Compat Version)
  const firebaseConfig = {
    apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
    authDomain: "reliability-program.firebaseapp.com",
    projectId: "reliability-program",
    storageBucket: "reliability-program.appspot.com",
    messagingSenderId: "954792974445",
    appId: "1:954792974445:web:7b39d5a876300167d68764",
    measurementId: "G-BES706G2PR"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const usersRef = db.collection("users");
  const keywordsRef = db.collection("customer_keywords");

  let deleteClickCount = 0;
  let loginClickCount = 0;
  let editingKeywordId = null;

  const savedName = localStorage.getItem("savedLoginName");
  const savedID = localStorage.getItem("savedLoginID");
  const rememberChecked = localStorage.getItem("rememberLoginChecked") === "true";
  if (savedName) document.getElementById("loginName").value = savedName;
  if (savedID) document.getElementById("loginID").value = savedID;
  document.getElementById("rememberLogin").checked = rememberChecked;

  function isEnglishOnly(pw) {
    return /^[A-Za-z0-9]+$/.test(pw);
  }
  function hasUpper(pw) {
    return /[A-Z]/.test(pw);
  }

  document.querySelectorAll("input[type='password']:not(#adminPasswordInput)").forEach(input => {
    input.addEventListener("keyup", e => {
      if (e.getModifierState("CapsLock")) {
        alert("⚠️ Caps Lock is ON.");
      }
    });
    input.addEventListener("keypress", e => {
      if (/[A-Z]/.test(e.key)) {
        e.preventDefault();
        alert("❌ Capital letters are not allowed.");
      }
    });
  });

  document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = document.getElementById("loginID").value.trim();
    const pw = document.getElementById("loginPW").value;
    const q = await usersRef.where("id", "==", id).where("pw", "==", pw).get();

    if (!q.empty) {
      const user = q.docs[0].data();
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("loginID", user.id);
      localStorage.setItem("loginName", user.name);
      localStorage.setItem("loginCustomer", document.getElementById("loginCustomer").value.trim());
      document.getElementById("loginStatus").textContent = "✅ Login successful!";
      setTimeout(() => window.location.href = "sheet0_qasystem.html", 1000);
    } else {
      loginClickCount++;
      if (loginClickCount >= 10) {
        loginClickCount = 0;
        document.getElementById("adminPwModal").style.display = "flex";
      } else {
        document.getElementById("loginStatus").textContent = "❌ Invalid ID or password";
      }
    }

    const remember = document.getElementById("rememberLogin").checked;
    const nameInput = document.getElementById("loginName").value.trim();
    localStorage.setItem("rememberLoginChecked", remember ? "true" : "false");
    if (remember) {
      localStorage.setItem("savedLoginName", nameInput);
      localStorage.setItem("savedLoginID", id);
    } else {
      localStorage.removeItem("savedLoginName");
      localStorage.removeItem("savedLoginID");
    }
  });

  document.getElementById("newIDBtn").addEventListener("click", () => {
    document.getElementById("newIdModal").style.display = "flex";
    document.getElementById("createStatus").textContent = "";
  });

  window.closeModal = function () {
    document.getElementById("newIdModal").style.display = "none";
    document.getElementById("newName").value =
      document.getElementById("newID").value =
      document.getElementById("newPW").value =
      document.getElementById("confirmPW").value = "";
  };

  window.createNewID = async function () {
    const name = document.getElementById("newName").value.trim();
    const id = document.getElementById("newID").value.trim();
    const pw = document.getElementById("newPW").value;
    const confirm = document.getElementById("confirmPW").value;
    const status = document.getElementById("createStatus");

    if (!name || !id || !pw || !confirm) {
      status.textContent = "❗ All fields are required.";
      return;
    }
    if (pw !== confirm) {
      status.textContent = "❗ Passwords do not match.";
      return;
    }
    if (!isEnglishOnly(pw)) {
      status.textContent = "❌ Password must contain only English letters and numbers.";
      return;
    }
    if (hasUpper(pw)) {
      status.textContent = "❌ Capital letters are not allowed.";
      return;
    }

    const existing = await usersRef.where("id", "==", id).get();
    if (!existing.empty) {
      status.textContent = "❗ ID already exists.";
      return;
    }

    await usersRef.add({ name, id, pw });
    status.textContent = "✅ Created successfully!";
    setTimeout(() => closeModal(), 1000);
  };

  document.getElementById("changePWBtn").addEventListener("click", () => {
    document.getElementById("changePWModal").style.display = "flex";
    document.getElementById("pwStatus").textContent = "";
  });

  window.closePWModal = function () {
    document.getElementById("changePWModal").style.display = "none";
  };

  window.changePassword = async function () {
    const name = document.getElementById("changeName").value.trim();
    const id = document.getElementById("changeID").value.trim();
    const newPw = document.getElementById("newPW1").value;
    const confirm = document.getElementById("newPW2").value;
    const status = document.getElementById("pwStatus");

    if (!name || !id || !newPw || !confirm) {
      status.textContent = "❗ All fields are required.";
      return;
    }
    if (newPw !== confirm) {
      status.textContent = "❗ Passwords do not match.";
      return;
    }
    if (!isEnglishOnly(newPw)) {
      status.textContent = "❌ Password must contain only English letters and numbers.";
      return;
    }
    if (hasUpper(newPw)) {
      status.textContent = "❌ Capital letters are not allowed.";
      return;
    }

    const q = await usersRef.where("id", "==", id).where("name", "==", name).get();
    if (q.empty) {
      status.textContent = "❌ No matching user found.";
      return;
    }

    await q.docs[0].ref.update({ pw: newPw });
    status.textContent = "✅ Password changed!";
    setTimeout(() => closePWModal(), 1000);
  };

  window.openDeleteModal = function () {
    deleteClickCount++;
    document.getElementById("deleteModal").style.display = "flex";
    document.getElementById("deleteStatus").textContent = "";

    if (deleteClickCount >= 10) {
      deleteClickCount = 0;
      document.getElementById("adminPwModal").style.display = "flex";
    }
  };

  window.closeDeleteModal = function () {
    document.getElementById("deleteModal").style.display = "none";
    document.getElementById("deleteName").value =
      document.getElementById("deleteID").value =
      document.getElementById("deletePW").value = "";
  };

  window.deleteAccount = async function () {
    const name = document.getElementById("deleteName").value.trim();
    const id = document.getElementById("deleteID").value.trim();
    const pw = document.getElementById("deletePW").value;
    const status = document.getElementById("deleteStatus");

    if (!name || !id || !pw) {
      status.textContent = "❗ All fields are required.";
      return;
    }
    if (hasUpper(pw)) {
      status.textContent = "❌ Capital letters are not allowed.";
      return;
    }

    const q = await usersRef.where("id", "==", id).where("name", "==", name).where("pw", "==", pw).get();
    if (q.empty) {
      status.textContent = "❌ No matching user found.";
      return;
    }

    await q.docs[0].ref.delete();
    alert("✅ ID deleted successfully.");
    closeDeleteModal();
  };

  window.checkAdminPassword = async function () {
    const pw = document.getElementById("adminPasswordInput").value.trim();
    if (pw !== "0416") {
      document.getElementById("adminPwStatus").textContent = "❌ Wrong password.";
      return;
    }

    document.getElementById("adminPwModal").style.display = "none";
    await loadUserList();
    await loadKeywordMappings();
  };

  async function loadUserList() {
    const snapshot = await usersRef.get();
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = "";
    document.getElementById("adminUserPanel").style.display = "block";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const tr = document.createElement("tr");

      const nameInput = document.createElement("input");
      nameInput.value = data.name;
      const pwInput = document.createElement("input");
      pwInput.value = data.pw;

      const nameCell = document.createElement("td");
      nameCell.appendChild(nameInput);
      const idCell = document.createElement("td");
      idCell.textContent = data.id;
      const pwCell = document.createElement("td");
      pwCell.appendChild(pwInput);

      const actionCell = document.createElement("td");
      const saveBtn = document.createElement("button");
      saveBtn.textContent = "✅";
      saveBtn.onclick = async () => {
        await docSnap.ref.update({
          name: nameInput.value,
          pw: pwInput.value
        });
        alert("✅ Saved");
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "❌";
      delBtn.onclick = async () => {
        if (confirm("Delete this user?")) {
          await docSnap.ref.delete();
          loadUserList();
        }
      };

      actionCell.appendChild(saveBtn);
      actionCell.appendChild(delBtn);
      tr.appendChild(nameCell);
      tr.appendChild(idCell);
      tr.appendChild(pwCell);
      tr.appendChild(actionCell);
      tbody.appendChild(tr);
    });
  }

  async function loadKeywordMappings() {
    const snapshot = await keywordsRef.get();
    const tbody = document.querySelector("#keywordTable tbody");
    tbody.innerHTML = "";

    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.customer}</td>
        <td>${data.keywords.join(", ")}</td>
        <td>
          <button onclick="editKeywordMapping('${doc.id}', '${data.customer}', '${data.keywords.join(",")}')">✏️</button>
          <button onclick="deleteKeywordMapping('${doc.id}')" style="color:red;">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.saveKeywordMapping = async function () {
    const customer = document.getElementById("mainCustomer").value.trim().toLowerCase();
    const keywords = document.getElementById("relatedKeywords").value
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);
  
    if (!customer || keywords.length === 0) {
      alert("❗ Please enter both customer and keywords.");
      return;
    }
  
    let existingDoc = null;
    const snapshot = await keywordsRef.where("customer", "==", customer).get();
    if (!snapshot.empty) {
      existingDoc = snapshot.docs[0];
    }
  
    if (existingDoc && !editingKeywordId) {
      // Merge with existing
      const existingKeywords = existingDoc.data().keywords || [];
      const merged = Array.from(new Set([...existingKeywords, ...keywords]));
      await existingDoc.ref.update({ keywords: merged });
      alert("✅ Keywords merged and updated.");
    } else if (editingKeywordId) {
      await keywordsRef.doc(editingKeywordId).update({ customer, keywords });
      alert("✅ Mapping updated.");
    } else {
      await keywordsRef.add({ customer, keywords });
      alert("✅ Mapping saved.");
    }
  
    // Reset
    document.getElementById("mainCustomer").value = "";
    document.getElementById("relatedKeywords").value = "";
    editingKeywordId = null;
  
    await loadKeywordMappings();
  
    // ✅ Refresh localStorage map
    const allSnap = await keywordsRef.get();
    const keywordMap = {};
    allSnap.forEach(doc => {
      const data = doc.data();
      if (!keywordMap[data.customer]) {
        keywordMap[data.customer] = [];
      }
      keywordMap[data.customer] = Array.from(new Set([
        ...(keywordMap[data.customer] || []),
        ...(data.keywords || [])
      ]));
    });
    localStorage.setItem("customerKeywordMap", JSON.stringify(keywordMap));
  };  

  window.editKeywordMapping = function (id, customer, keywords) {
    document.getElementById("mainCustomer").value = customer;
    document.getElementById("relatedKeywords").value = keywords;
    editingKeywordId = id;
  };

  window.deleteKeywordMapping = async function (id) {
    if (!id) return alert("❗ Use delete button from row.");
    if (confirm("❌ Delete this keyword mapping?")) {
      await keywordsRef.doc(id).delete();
      loadKeywordMappings();
    }
  };

  // ✅ Prevent form submit from reloading page
  document.getElementById("keywordForm")?.addEventListener("submit", function (e) {
    e.preventDefault();
    saveKeywordMapping();
  });
});
