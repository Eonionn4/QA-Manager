const firebaseConfig = {
  apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
  authDomain: "reliability-program.firebaseapp.com",
  projectId: "reliability-program"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const tCardEntries = [];

document.getElementById("addTCardButton").addEventListener("click", () => {
  const lotNumber = document.getElementById("lotNumber").value.trim();
  const substrateVendor = document.getElementById("substrateVendor").value.trim();
  const emcType = document.getElementById("emcType").value.trim();
  const sampleSize = document.getElementById("sampleSize").value.trim();
  const failMode = document.getElementById("failMode").value.trim();
  const failRate = document.getElementById("failRate").value.trim();

  if (!lotNumber) {
    alert("⚠️ Please enter Lot Number.");
    return;
  }

  const tCard = {
    lotNumber,
    substrateVendor,
    emcType,
    sampleSize,
    failMode,
    failRate,
    extendedInfo: tCardEntries[window._editingTCardIndex]?.extendedInfo || []
  };

  if (typeof window._editingTCardIndex === "number") {
    tCardEntries[window._editingTCardIndex] = tCard;
    window._editingTCardIndex = null;
  } else {
    tCardEntries.push(tCard);
  }

  updateTCardList();
  resetTCardForm();
});

function resetTCardForm() {
  document.getElementById("lotNumber").value = "";
  document.getElementById("substrateVendor").value = "";
  document.getElementById("emcType").value = "";
  document.getElementById("sampleSize").value = "";
  document.getElementById("failMode").value = "";
  document.getElementById("failRate").value = "";

  const btn = document.getElementById("addTCardButton");
  btn.textContent = "➕ Add T-Card";
  btn.classList.remove("editing");

  const cancelBtn = document.getElementById("cancelEditTCardButton");
  if (cancelBtn) cancelBtn.remove();
}

function cancelTCardEdit() {
  window._editingTCardIndex = null;
  resetTCardForm();
}

async function loadFAForEdit(id) {
  try {
    const doc = await db.collection("faManager").doc(id).get();
    const data = doc.data();
    if (!data) return;

    document.getElementById("faNumber").value = data.faNumber || "";
    document.getElementById("customer").value = data.customer || "";
    document.getElementById("packageName").value = data.packageName || "";
    document.getElementById("nickname").value = data.nickname || "";
    document.getElementById("packageType").value = data.packageType || "";
    document.getElementById("pkgSize").value = data.pkgSize || "";
    document.getElementById("leadNumber").value = data.leadNumber || "";
    document.getElementById("runNumber").value = data.runNumber || "";
    document.getElementById("productStage").value = data.productStage || "";
    document.getElementById("returnSite").value = data.returnSite || "";
    document.getElementById("faRequestDate").value = data.faRequestDate || "";
    tCardEntries.splice(0, tCardEntries.length, ...(data.tCards || []));
    updateTCardList();
    window._currentEditFAId = id;
  } catch (err) {
    console.error("❌ Failed to load FA entry", err);
  }
}

document.getElementById("reviseBtn").addEventListener("click", async () => {
  const faNumber = document.getElementById("faNumber").value.trim();
  if (!faNumber) {
    alert("⚠️ FA Number is required.");
    return;
  }

  const faData = {
    faNumber,
    customer: document.getElementById("customer").value.trim(),
    packageName: document.getElementById("packageName").value.trim(),
    nickname: document.getElementById("nickname").value.trim(),
    packageType: document.getElementById("packageType").value.trim(),
    pkgSize: document.getElementById("pkgSize").value.trim(),
    leadNumber: document.getElementById("leadNumber").value.trim(),
    runNumber: document.getElementById("runNumber").value.trim(),
    productStage: document.getElementById("productStage").value,
    returnSite: document.getElementById("returnSite").value.trim(),
    faRequestDate: document.getElementById("faRequestDate").value,
    tCards: tCardEntries,
    updatedAt: new Date()
  };

  try {
    // ✅ Save open Lot Areas
    const openExtended = [];
    tCardEntries.forEach((_, i) => {
      const ext = document.getElementById(`extended_${i}`);
      if (ext && ext.style.display === "block") openExtended.push(i);
    });
    localStorage.setItem("openExtendedAreas", JSON.stringify(openExtended));

    const query = await db.collection("faManager").where("faNumber", "==", faNumber).get();

    if (!query.empty) {
      const docId = query.docs[0].id;
      await db.collection("faManager").doc(docId).set(faData);
      alert("✅ FA revised.");
    } else {
      await db.collection("faManager").add(faData);
      alert("✅ New FA entry saved.");
    }

    location.href = "sheet11_falist.html";
  } catch (err) {
    console.error("❌ Revise failed", err);
    alert("❌ Failed to save FA.");
  }
});

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    docId: params.get('docId'),
    lotNo: params.get('lotNo')
  };
}

function editTCard(index) {
  const t = tCardEntries[index];

  // Fill the input fields
  document.getElementById("lotNumber").value = t.lotNumber;
  document.getElementById("substrateVendor").value = t.substrateVendor;
  document.getElementById("emcType").value = t.emcType;
  document.getElementById("sampleSize").value = t.sampleSize;
  document.getElementById("failMode").value = t.failMode;
  document.getElementById("failRate").value = t.failRate;

  // Temporarily store the edit index
  window._editingTCardIndex = index;

  // Change the Add button to Save Edit
  const btn = document.getElementById("addTCardButton");
  btn.textContent = "💾 Save Edit";
  btn.classList.add("editing");

  // Add cancel edit button if not exists
  if (!document.getElementById("cancelEditTCardButton")) {
    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cancelEditTCardButton";
    cancelBtn.textContent = "↩️ Cancel";
    cancelBtn.type = "button";
    cancelBtn.className = "secondary-btn";
    cancelBtn.style.marginLeft = "10px";
    cancelBtn.onclick = cancelTCardEdit;
    btn.parentNode.appendChild(cancelBtn);
  }
}

function updateTCardList() {
  const list = document.getElementById("tcardList");

  // ✅ Load saved open states from localStorage
  let openExtendedArr = [];
  try {
    openExtendedArr = JSON.parse(localStorage.getItem("openExtendedAreas") || "[]");
  } catch (e) {}

  const openExtended = {};
  openExtendedArr.forEach(i => openExtended[i] = true);

  list.innerHTML = "";

  tCardEntries.forEach((entry, index) => {
    if (!entry.extendedInfo) entry.extendedInfo = [];

    const div = document.createElement("div");
    div.className = "tcard-entry";
    div.setAttribute("data-lot", (entry.lotNumber || "").toLowerCase()); // ✅ Added

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="flex-grow: 1; font-size: 15px; line-height: 1.6; color: #333;">
          <strong style="color: #0074d9;">Lot ${index + 1}</strong><br>
          <span><b>Lot#:</b> ${entry.lotNumber}</span> |
          <span><b>Vendor:</b> ${entry.substrateVendor}</span> |
          <span><b>EMC:</b> ${entry.emcType}</span> |
          <span><b>Qty:</b> ${entry.sampleSize}</span> |
          <span><b>Fail Mode:</b> ${entry.failMode}</span> |
          <span><b>Fail Rate:</b> ${entry.failRate}</span>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button onclick="editTCard(${index})" class="edit-button table-button">✏️ Edit</button>
          <button onclick="deleteTCard(${index})" class="delete-button table-button">❌ Delete</button>
          <button onclick="toggleExtended(${index})" class="secondary-btn">➕ Detail</button>
          <button onclick="goToSheet15FromFA('${entry.lotNumber}', '${entry.substrateVendor}', '${entry.emcType}')" class="table-button" title="Go to Sheet15">🔗</button>
        </div>
      </div>

      <div id="extended_${index}" style="display:none; margin-top: 15px;">
        <div class="form-grid" style="grid-template-columns: repeat(5, 1fr); gap: 15px;">
          <div class="form-group">
            <label>FA Progress</label>
            <input type="text" id="progress_${index}" />
          </div>
          <div class="form-group">
            <label>Detail</label>
            <input type="text" id="detail_${index}" />
          </div>
          <div class="form-group">
            <label>In Date</label>
            <input type="date" id="inDate_${index}" />
          </div>
          <div class="form-group">
            <label>Out Date</label>
            <input type="date" id="outDate_${index}" />
          </div>
          <div class="form-group">
            <label>Result</label>
            <input type="text" id="result_${index}" />
          </div>
        </div>
        <div style="text-align:right; margin-top: 10px;">
          <button onclick="addProgressEntry(${index})" class="secondary-btn">➕ Add Entry</button>
        </div>
        <div id="progressList_${index}" style="margin-top:10px;"></div>
      </div>
    `;

    list.appendChild(div);
    renderProgressList(index);

    // ✅ Reopen the extended area if it was open before
    if (openExtended[index]) {
      const extDiv = document.getElementById(`extended_${index}`);
      if (extDiv) extDiv.style.display = "block";
    }
  });

  // ✅ Highlight matching lot if redirected from Sheet15
  const { lotNo } = getQueryParams?.() || {};
  if (lotNo) {
    setTimeout(() => {
      const target = list.querySelector(`.tcard-entry[data-lot="${lotNo.toLowerCase()}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.style.border = "3px solid red";
        target.style.backgroundColor = "#fff3cd";
      }
    }, 500);
  }
}

function deleteTCard(index) {
  tCardEntries.splice(index, 1);
  updateTCardList();
}

function goToSheet15FromFA(lot, vendor, emc) {
  localStorage.setItem("highlightLot", lot || "");
  localStorage.setItem("highlightSubstrate", vendor || "");
  localStorage.setItem("highlightEMC", emc || "");
  localStorage.setItem("highlightSource", "FA");
  window.location.href = "sheet15_devicesy.html";
}

function toggleExtended(index) {
  const ext = document.getElementById(`extended_${index}`);
  const isNowOpen = ext.style.display === "none";
  ext.style.display = isNowOpen ? "block" : "none";

  // Update localStorage to persist open state
  let openExtended = [];
  try {
    openExtended = JSON.parse(localStorage.getItem("openExtendedAreas") || "[]");
  } catch (e) {}

  // Add or remove index from the open list
  if (isNowOpen && !openExtended.includes(index)) {
    openExtended.push(index);
  } else if (!isNowOpen) {
    openExtended = openExtended.filter(i => i !== index);
  }

  localStorage.setItem("openExtendedAreas", JSON.stringify(openExtended));
}

function addProgressEntry(index) {
  const progress = document.getElementById(`progress_${index}`).value.trim();
  const detail = document.getElementById(`detail_${index}`).value.trim();
  const inDate = document.getElementById(`inDate_${index}`).value;
  const outDate = document.getElementById(`outDate_${index}`).value;
  const result = document.getElementById(`result_${index}`).value.trim();

  if (!progress || !detail) {
    alert("⚠️ Fill in FA Progress and Detail.");
    return;
  }

  const info = { progress, detail, inDate, outDate, result };
  tCardEntries[index].extendedInfo.push(info);
  renderProgressList(index);

  document.getElementById(`progress_${index}`).value = "";
  document.getElementById(`detail_${index}`).value = "";
  document.getElementById(`inDate_${index}`).value = "";
  document.getElementById(`outDate_${index}`).value = "";
  document.getElementById(`result_${index}`).value = "";
}

function renderProgressList(index) {
  const container = document.getElementById(`progressList_${index}`);
  const list = tCardEntries[index].extendedInfo || [];

  container.innerHTML = list.map((p, i) => `
    <div style="
      display: grid;
      grid-template-columns: 1.2fr 2fr 1fr 1fr 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      margin-bottom: 10px;
      background: #f5f9ff;
      border-left: 5px solid #0074d9;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      font-size: 14px;
    ">
      <div><b>${p.progress}</b></div>
      <div>${p.detail}</div>
      <div>${p.inDate || '-'}</div>
      <div>${p.outDate || '-'}</div>
      <div>${p.result || '-'}</div>
      <div style="text-align: right;">
        <button onclick="editProgressEntry(${index}, ${i})" class="edit-button table-button">✏️ Edit</button>
        <button onclick="deleteProgressEntry(${index}, ${i})" class="delete-button table-button">❌ Delete</button>
      </div>
    </div>
  `).join("");

  // Show Revise button if editing
  if (typeof window._editingProgressIndex === "number" && window._editingTCardIndex === index) {
    const reviseBtn = document.createElement("button");
    reviseBtn.textContent = "🔁 Revise Entry";
    reviseBtn.className = "secondary-btn";
    reviseBtn.onclick = () => reviseProgressEntry(index);
    container.appendChild(reviseBtn);
  }
}

function editProgressEntry(tCardIndex, progressIndex) {
  const entry = tCardEntries[tCardIndex].extendedInfo[progressIndex];

  document.getElementById(`progress_${tCardIndex}`).value = entry.progress;
  document.getElementById(`detail_${tCardIndex}`).value = entry.detail;
  document.getElementById(`inDate_${tCardIndex}`).value = entry.inDate || "";
  document.getElementById(`outDate_${tCardIndex}`).value = entry.outDate || "";
  document.getElementById(`result_${tCardIndex}`).value = entry.result;

  window._editingProgressIndex = progressIndex;
  window._editingTCardIndex = tCardIndex;

  renderProgressList(tCardIndex); // Show revise button
}

function reviseProgressEntry(tCardIndex) {
  const progress = document.getElementById(`progress_${tCardIndex}`).value.trim();
  const detail = document.getElementById(`detail_${tCardIndex}`).value.trim();
  const inDate = document.getElementById(`inDate_${tCardIndex}`).value;
  const outDate = document.getElementById(`outDate_${tCardIndex}`).value;
  const result = document.getElementById(`result_${tCardIndex}`).value.trim();

  if (!progress || !detail) {
    alert("⚠️ Fill in FA Progress and Detail.");
    return;
  }

  const updated = { progress, detail, inDate, outDate, result };
  tCardEntries[tCardIndex].extendedInfo[window._editingProgressIndex] = updated;

  // Reset edit state
  window._editingProgressIndex = null;
  window._editingTCardIndex = null;

  document.getElementById(`progress_${tCardIndex}`).value = "";
  document.getElementById(`detail_${tCardIndex}`).value = "";
  document.getElementById(`inDate_${tCardIndex}`).value = "";
  document.getElementById(`outDate_${tCardIndex}`).value = "";
  document.getElementById(`result_${tCardIndex}`).value = "";

  renderProgressList(tCardIndex);
}

function deleteProgressEntry(tCardIndex, progressIndex) {
  tCardEntries[tCardIndex].extendedInfo.splice(progressIndex, 1);
  renderProgressList(tCardIndex);
}

document.addEventListener("DOMContentLoaded", async () => {
  const faForm = document.getElementById("faForm");
  const editIdFromStorage = localStorage.getItem("editFAId");
  const { docId, lotNo } = getQueryParams();
  const editId = editIdFromStorage || docId;

  if (editId) {
    try {
      const doc = await db.collection("faManager").doc(editId).get();
      if (doc.exists) {
        const data = doc.data();

        document.getElementById("faNumber").value = data.faNumber || "";
        document.getElementById("customer").value = data.customer || "";
        document.getElementById("packageName").value = data.packageName || "";
        document.getElementById("nickname").value = data.nickname || "";
        document.getElementById("packageType").value = data.packageType || "";
        document.getElementById("pkgSize").value = data.pkgSize || "";
        document.getElementById("leadNumber").value = data.leadNumber || "";
        document.getElementById("runNumber").value = data.runNumber || "";
        document.getElementById("productStage").value = data.productStage || "";
        document.getElementById("returnSite").value = data.returnSite || "";
        document.getElementById("faRequestDate").value = data.faRequestDate || "";

        tCardEntries.length = 0;
        (data.tCards || []).forEach(t => tCardEntries.push(t));
        updateTCardList();

        // ✅ Scroll and highlight the matching lot after T-Cards are rendered
        if (lotNo) {
          setTimeout(() => {
            const target = document.querySelector(`.tcard-entry[data-lot="${lotNo.toLowerCase()}"]`);
            if (target) {
              console.log("✅ Highlighting Lot:", lotNo);
              target.scrollIntoView({ behavior: "smooth", block: "center" });
              target.style.border = "3px solid red";
              target.style.backgroundColor = "#fff3cd";
            } else {
              console.warn("❌ Lot not found:", lotNo);
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error("❌ Failed to load FA entry:", err);
    }
    localStorage.removeItem("editFAId");
  }

  // 💾 Form submit handler (already existed)
  faForm.addEventListener("submit", async e => {
    e.preventDefault();

    const faNumber = document.getElementById("faNumber").value.trim();
    if (!faNumber) {
      alert("⚠️ FA Number is required.");
      return;
    }

    // ✅ Save open extended areas
    const openExtended = [];
    tCardEntries.forEach((_, i) => {
      const ext = document.getElementById(`extended_${i}`);
      if (ext && ext.style.display === "block") openExtended.push(i);
    });
    localStorage.setItem("openExtendedAreas", JSON.stringify(openExtended));

    const faData = {
      faNumber,
      customer: document.getElementById("customer").value.trim(),
      packageName: document.getElementById("packageName").value.trim(),
      nickname: document.getElementById("nickname").value.trim(),
      packageType: document.getElementById("packageType").value.trim(),
      pkgSize: document.getElementById("pkgSize").value.trim(),
      leadNumber: document.getElementById("leadNumber").value.trim(),
      runNumber: document.getElementById("runNumber").value.trim(),
      productStage: document.getElementById("productStage").value,
      returnSite: document.getElementById("returnSite").value.trim(),
      faRequestDate: document.getElementById("faRequestDate").value,
      tCards: tCardEntries,
      updatedAt: new Date()
    };

    try {
      const snapshot = await db.collection("faManager").where("faNumber", "==", faNumber).get();
      if (!snapshot.empty) {
        const id = snapshot.docs[0].id;
        await db.collection("faManager").doc(id).set(faData);
        alert("✅ FA Entry revised.");
      } else {
        await db.collection("faManager").add(faData);
        alert("✅ New FA Entry saved.");
      }

      location.href = "sheet11_falist.html";
    } catch (err) {
      console.error("❌ Failed to save FA Entry:", err);
      alert("❌ Save failed. Please check console.");
    }
  });
});

function openDeviceSySearch() {
  document.getElementById("deviceSearchModal").style.display = "block";
  loadDeviceSyTable();
}

function closeDeviceSySearch() {
  document.getElementById("deviceSearchModal").style.display = "none";
}

function loadDeviceSyTable() {
  const tbody = document.getElementById("deviceSearchResults");
  tbody.innerHTML = "<tr><td colspan='12'>Loading...</td></tr>";

  Promise.all([
    db.collection("npi_masterlist").get(),
    db.collection("schedules").get(),
    db.collection("faManager").get()
  ]).then(([npiSnap, scheduleSnap, faSnap]) => {
    const all = [
      ...flattenNPI(npiSnap.docs),
      ...flattenSchedule(scheduleSnap.docs),
      ...flattenFA(faSnap.docs)
    ];
    renderDeviceSyResults(all);
  });
}

function flattenNPI(docs) {
  const result = [];
  docs.forEach(doc => {
    const d = doc.data();
    const base = {
      customer: d.customer || "-",
      packageName: d.packageName || "-",
      nickname: d.nickname || "-",
      pkgSize: d.pkgSize || "-",
      leadNumber: d.leadNumber || "-",
      packageType: d.packageType || "-",
      substrateVendor: d.substrateVendor || "-",
      emcType: d.emcType || "-",
      source: "NPI"
    };
    const history = d.history || [];
    history.forEach(h => {
      (h.lotInfo || []).forEach(l => {
        result.push({ ...base, lotNo: l.lot || "-", deviceNo: l.device || "-" });
      });
    });
  });
  return result;
}

function flattenSchedule(docs) {
  const result = [];
  docs.forEach(doc => {
    const d = doc.data();
    const base = {
      customer: d.customer || "-",
      packageName: d.packageName || "-",
      nickname: d.nickname || "-",
      pkgSize: d.pkgSize || "-",
      leadNumber: d.leadNumber || "-",
      packageType: d.packageType || "-",
      source: "Schedule"
    };
    (d.tcardList || []).forEach(t => {
      result.push({
        ...base,
        substrateVendor: t.substrateVendor || "-",
        emcType: t.emcType || "-",
        lotNo: t.lotNumber || "-",
        deviceNo: "-"
      });
    });
  });
  return result;
}

function flattenFA(docs) {
  const result = [];
  docs.forEach(doc => {
    const d = doc.data();
    const base = {
      customer: d.customer || "-",
      packageName: d.packageName || "-",
      nickname: d.nickname || "-",
      pkgSize: d.pkgSize || "-",
      leadNumber: d.leadNumber || "-",
      packageType: d.packageType || "-",
      source: "FA"
    };
    (d.tCards || []).forEach(t => {
      result.push({
        ...base,
        substrateVendor: t.substrateVendor || "-",
        emcType: t.emcType || "-",
        lotNo: t.lotNumber || "-",
        deviceNo: "-"
      });
    });
  });
  return result;
}

function renderDeviceSyResults(dataList) {
  const tbody = document.getElementById("deviceSearchResults");
  tbody.innerHTML = "";

  dataList.forEach((item, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.customer}</td>
      <td>${item.packageName}</td>
      <td>${item.nickname}</td>
      <td>${item.pkgSize}</td>
      <td>${item.leadNumber}</td>
      <td>${item.packageType}</td>
      <td>${item.substrateVendor}</td>
      <td>${item.emcType}</td>
      <td>${item.lotNo}</td>
      <td>${item.deviceNo}</td>
      <td>${item.source}</td>
      <td><button onclick='fillFAForm(${JSON.stringify(JSON.stringify(item))})'>✅</button></td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("deviceSearchInput").addEventListener("input", e => {
    const keyword = e.target.value.toLowerCase();
    const filtered = dataList.filter(item =>
      item.deviceNo.toLowerCase().includes(keyword) ||
      item.lotNo.toLowerCase().includes(keyword) ||
      item.packageName.toLowerCase().includes(keyword) ||
      item.nickname.toLowerCase().includes(keyword)
    );
    renderDeviceSyResults(filtered);
  });
}

function fillFAForm(jsonString) {
  const item = JSON.parse(jsonString);
  document.getElementById("customer").value = item.customer;
  document.getElementById("packageName").value = item.packageName;
  document.getElementById("nickname").value = item.nickname;
  document.getElementById("pkgSize").value = item.pkgSize;
  document.getElementById("leadNumber").value = item.leadNumber;
  document.getElementById("packageType").value = item.packageType;
  document.getElementById("substrateVendor").value = item.substrateVendor;
  document.getElementById("emcType").value = item.emcType;
  closeDeviceSySearch();
}
