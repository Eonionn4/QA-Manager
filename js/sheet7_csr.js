import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc,
  updateDoc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
  authDomain: "reliability-program.firebaseapp.com",
  projectId: "reliability-program",
  storageBucket: "reliability-program.appspot.com",
  messagingSenderId: "954792974445",
  appId: "1:954792974445:web:7b39d5a876300167d68764",
  measurementId: "G-BES706G2PR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const fields = [
  "SITE", "SYSTEM", "CUSTNAME", "SPECTYPE", "SPECTITLE",
  "SPECNUM", "SPECREV", "RECEIVED", "REQBY", "STATUS", "SUBMITTED", "CLOSED"
];

// ✅ Show revision modal
function renderViewModal(current, historyList, docId, remarks = {}) {
  const modal = document.getElementById("viewModal");
  const historyArea = document.getElementById("historyTableBody");

  const fullHistory = [...(historyList || []), { ...current }];
  fullHistory.reverse();

  let table = `<table class="history-table"><thead><tr><th>Revision</th>${fields.map(f => `<th>${f}</th>`).join('')}</tr></thead><tbody>`;

  fullHistory.forEach((rev, idx) => {
    const specrev = rev.SPECREV || `rev${idx}`;
    const label = idx === 0
      ? "Current Revision"
      : idx === fullHistory.length - 1
        ? "Initial Revision"
        : `Revision ${fullHistory.length - 1 - idx}`;

    const remarkVal = remarks[specrev] || "";

    table += `
      <tr>
        <td>${label}</td>
        ${fields.map(f => `<td>${rev[f] || ""}</td>`).join("")}
      </tr>
      <tr>
        <td colspan="${fields.length + 1}">
          <label><b>Remark for ${label} (SPECREV: ${specrev}):</b></label><br/>
          <textarea id="remark_${specrev}" rows="4" style="width: 100%;">${remarkVal}</textarea>
          <div style="text-align: right; margin-top: 5px;">
            <button class="saveRemarkBtn" data-srevid="${specrev}" data-docid="${docId}">💾 Save Remark</button>
          </div>
        </td>
      </tr>
    `;
  });

  table += "</tbody></table>";
  historyArea.innerHTML = table;

  document.querySelectorAll(".saveRemarkBtn").forEach(btn => {
    btn.onclick = async () => {
      const specrev = btn.dataset.srevid;
      const docId = btn.dataset.docid;
      const remarkText = document.getElementById(`remark_${specrev}`).value.trim();

      const docRef = doc(db, "csr_masterlist", docId);
      const snap = await getDoc(docRef);
      const data = snap.data();
      const updatedRemarks = { ...(data.remarks || {}) };
      updatedRemarks[specrev] = remarkText;

      await updateDoc(docRef, { remarks: updatedRemarks });
      alert(`✅ Remark saved for SPECREV: ${specrev}`);
    };
  });

  modal.style.display = "block";
}

// ✅ Load updated date from Firestore
async function loadUpdatedDate() {
  const metaRef = doc(db, "csr_meta", "latestUpdate");
  const snap = await getDoc(metaRef);
  if (snap.exists()) {
    const dateStr = snap.data().updatedDate;
    document.getElementById("updatedNotice").style.display = "block";
    document.getElementById("updatedDateText").textContent = dateStr;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#csrTable tbody");
  const modal = document.getElementById("viewModal");
  const closeBtn = document.getElementById("closeModalBtn");
  const fileInput = document.getElementById("excelFileInput");
  const deleteAllButton = document.getElementById("deleteAllButton");
  const exportButton = document.getElementById("exportCSRListButton");

  closeBtn.onclick = () => modal.style.display = "none";

  // ✅ Delete all entries
  deleteAllButton.onclick = async () => {
    if (!confirm("Delete ALL CSR entries?")) return;
    const snapshot = await getDocs(collection(db, "csr_masterlist"));
    await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, "csr_masterlist", d.id))));
    loadTable();
  };

  // ✅ Export to Excel
  exportButton.onclick = async () => {
    const snapshot = await getDocs(collection(db, "csr_masterlist"));
    const rows = [];

    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      rows.push({
        "SITE": d.SITE || "",
        "SYSTEM#": d.SYSTEM || "",
        "CUSTNAME": d.CUSTNAME || "",
        "SPECTYPE": d.SPECTYPE || "",
        "SPECTITLE": d.SPECTITLE || "",
        "SPEC#": d.SPECNUM || "",
        "SPECREV": d.SPECREV || "",
        "RECEIVED IN": d.RECEIVED || "",
        "REQ BY": d.REQBY || "",
        "STATUS": d.STATUS || "",
        "SUBMITTED IN": d.SUBMITTED || "",
        "CLOSED IN": d.CLOSED || ""
      });
    });

    if (rows.length === 0) {
      alert("No CSR records to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CSR List");

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `CSR_List_${today}.xlsx`);
  };

  // ✅ Load table data
  async function loadTable() {
    tableBody.innerHTML = "";
    const snapshot = await getDocs(collection(db, "csr_masterlist"));
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.SITE || ''}</td>
        <td>${d.SYSTEM || ''}</td>
        <td>${d.CUSTNAME || ''}</td>
        <td>${d.SPECTYPE || ''}</td>
        <td>${d.SPECTITLE || ''}</td>
        <td>${d.SPECNUM || ''}</td>
        <td>${d.SPECREV || ''}</td>
        <td>${d.RECEIVED || ''}</td>
        <td>${d.REQBY || ''}</td>
        <td>${d.STATUS || ''}</td>
        <td>${d.SUBMITTED || ''}</td>
        <td>${d.CLOSED || ''}</td>
        <td>
          <button class="view-btn" data-id="${docSnap.id}">View</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const snap = await getDoc(doc(db, "csr_masterlist", id));
        renderViewModal(snap.data(), snap.data().revisedHistory || [], id, snap.data().remarks || {});
      };
    });
  }

  // ✅ Import Excel logic
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const snapshot = await getDocs(collection(db, "csr_masterlist"));
      const all = {};
      snapshot.forEach(d => {
        all[d.data().SPECNUM] = { id: d.id, ...d.data() };
      });

      for (let row of rows) {
        const spec = row["SPEC#"];
        if (!spec) continue;

        const incoming = {
          SITE: row["SITE"] || "",
          SYSTEM: row["SYSTEM#"] || "",
          CUSTNAME: row["CUSTNAME"] || "",
          SPECTYPE: row["SPECTYPE"] || "",
          SPECTITLE: row["SPECTITLE"] || "",
          SPECNUM: spec,
          SPECREV: row["SPECREV"] || "",
          RECEIVED: row["RECEIVED IN"] || "",
          REQBY: row["REQ BY"] || "",
          STATUS: row["STATUS"] || "",
          SUBMITTED: row["SUBMITTED IN"] || "",
          CLOSED: row["CLOSED IN"] || ""
        };

        const existing = all[spec];
        if (!existing) {
          await addDoc(collection(db, "csr_masterlist"), incoming);
        } else {
          const isSame = fields.every(f => (incoming[f] || "") === (existing[f] || ""));
          if (!isSame) {
            const history = existing.revisedHistory || [];
            history.push(Object.fromEntries(fields.map(f => [f, existing[f] || ""])));
            await updateDoc(doc(db, "csr_masterlist", existing.id), {
              ...incoming,
              revisedHistory: history,
              remarks: existing.remarks || {},
              UPDATED: new Date().toISOString().split("T")[0]
            });
          }
        }
      }

      const todayStr = new Date().toISOString().split("T")[0];
      await setDoc(doc(db, "csr_meta", "latestUpdate"), { updatedDate: todayStr });

      document.getElementById("updatedNotice").style.display = "block";
      document.getElementById("updatedDateText").textContent = todayStr;

      loadTable(); // ✅ Refresh after import
    };
    reader.readAsArrayBuffer(file);
  };

  loadTable();
  loadUpdatedDate();
});
