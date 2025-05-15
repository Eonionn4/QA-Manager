import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
  authDomain: "reliability-program.firebaseapp.com",
  projectId: "reliability-program",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadAllNPIToTable() {
  const snapshot = await getDocs(collection(db, "npi_masterlist"));
  const tbody = document.getElementById("jmpRawTableBody");
  tbody.innerHTML = "";

  snapshot.forEach(doc => {
    const d = doc.data();
    const basic = {
      customer: d.customer || "",
      packageName: d.packageName || "",
      nickname: d.nickname || "",
      pkgSize: d.pkgSize || "",
      leadNumber: d.leadNumber || "",
      packageType: d.packageType || "",
      substrateVendor: d.substrateVendor || "",
      emcType: d.emcType || ""
    };

    (d.history || []).forEach(h => {
      const tcard = {
        stage: h.stage || "",
        aiNo: h.aiNo || "",
        requestDate: h.requestDate || "",
        bumpAssy: h.bumpAssy || "",
        operInDate: h.operInDate || "",
        operOutDate: h.operOutDate || "",
        faResult: h.faResult || "",
        remark: h.remark || "",
        changeToNext: h.changeToNext || ""
      };

      (h.lotInfo || []).forEach(lot => {
        const baseRow = `
          <td>${basic.customer}</td>
          <td>${basic.packageName}</td>
          <td>${basic.nickname}</td>
          <td>${basic.pkgSize}</td>
          <td>${basic.leadNumber}</td>
          <td>${basic.packageType}</td>
          <td>${basic.substrateVendor}</td>
          <td>${basic.emcType}</td>
          <td>${tcard.stage}</td>
          <td>${tcard.aiNo}</td>
          <td>${tcard.requestDate}</td>
          <td>${tcard.bumpAssy}</td>
          <td>${tcard.operInDate}</td>
          <td>${tcard.operOutDate}</td>
          <td>${tcard.faResult}</td>
          <td>${tcard.remark}</td>
          <td>${tcard.changeToNext}</td>
          <td>${lot.wafer || ""}</td>
          <td>${lot.device || ""}</td>
          <td>${lot.run || ""}</td>
          <td>${lot.lot || ""}</td>
          <td>${lot.inQty || ""}</td>
          <td>${lot.outQty || ""}</td>
        `;

        (lot.rejEntries || []).forEach(r => {
          const tr = document.createElement("tr");
          tr.innerHTML = baseRow + `
            <td>${r.qty || ""}</td>
            <td>${r.mode || ""}</td>
          `;
          tbody.appendChild(tr);
        });

        // If no rejEntries, still insert row
        if (!Array.isArray(lot.rejEntries) || lot.rejEntries.length === 0) {
          const tr = document.createElement("tr");
          tr.innerHTML = baseRow + `<td></td><td></td>`;
          tbody.appendChild(tr);
        }
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", loadAllNPIToTable);
