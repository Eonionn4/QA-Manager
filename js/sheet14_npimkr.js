// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
  authDomain: "reliability-program.firebaseapp.com",
  projectId: "reliability-program",
  storageBucket: "reliability-program.appspot.com",
  messagingSenderId: "954792974445",
  appId: "1:954792974445:web:7b39d5a876300167d68764"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const historyEntries = [];
let editingHistoryIndex = null;
let fullDeviceSyList = [];
const lotEditIndexMap = {}; // per-history index

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    docId: params.get('docId'),
    lotNo: params.get('lotNo')
  };
}

const { docId, lotNo } = getQueryParams();
let editId = docId || null;

function collectBasicInfo() {
  return {
    customer: document.getElementById("customer").value.trim(),
    packageName: document.getElementById("packageName").value.trim(),
    nickname: document.getElementById("nickname").value.trim(),
    pkgSize: document.getElementById("pkgSize").value.trim(),
    leadNumber: document.getElementById("leadNumber").value.trim(),
    packageType: document.getElementById("packageType").value.trim(),
    substrateVendor: document.getElementById("substrateVendor").value.trim(),
    emcType: document.getElementById("emcType").value.trim(),
    aiNo: document.getElementById("aiNo").value.trim(),
    faResult: document.getElementById("faResult").value.trim(),  // ✅ Added here
    timestamp: new Date().toISOString()
  };
}

function renderHistoryList() {
  const container = document.getElementById("historyTableBody");
  container.innerHTML = "";

  // ✅ Sort by requestDate (newest first)
  const sortedEntries = [...historyEntries].sort((a, b) => {
    const dateA = new Date(a.requestDate || "1900-01-01");
    const dateB = new Date(b.requestDate || "1900-01-01");
    return dateB - dateA; // Descending order
  });

  sortedEntries.forEach((entry, index) => {
    const block = document.createElement("div");
    block.className = "history-entry-card";
    block.innerHTML = `
      <div class="history-header">📌 Entry</div>
      <div class="history-fields">
        <div><b>Stage:</b> ${entry.stage}</div>
        <div><b>AI No:</b> ${entry.aiNo}</div>
        <div><b>Request Date:</b> ${entry.requestDate}</div>
        <div><b>Bump/Assy:</b> ${entry.bumpAssy}</div>
        <div><b>Oper In:</b> ${entry.operInDate}</div>
        <div><b>Oper Out:</b> ${entry.operOutDate}</div>
        <div><b>FA Result:</b> ${entry.faResult}</div>
        <div><b>Remark:</b> ${entry.remark}</div>
        <div><b>Change:</b> ${entry.changeToNext}</div>
      </div>
      <div style="margin-bottom: 8px;">
        <button class="lot-btn add" onclick="toggleLotInput(${index})">📦 Lot Info</button>
        <button class="lot-btn edit" onclick="editHistory(${index})">✏️ Edit</button>
        <button class="lot-btn delete" onclick="deleteHistory(${index})">❌ Delete</button>
      </div>
      <div id="lot-input-${index}" class="lot-input-area" style="display:none;">
        <input id="wafer-${index}" placeholder="Wafer Info" />
        <input id="device-${index}" placeholder="Device No" />
        <input id="run-${index}" placeholder="Run No" />
        <input id="lot-${index}" placeholder="Lot No" />
        <input type="number" id="inQty-${index}" placeholder="IN Qty" />
        <input type="number" id="outQty-${index}" placeholder="OUT Qty" />
        <div id="rejArea-${index}" class="rej-entry-wrapper">
          <div class="rej-row">
            <input type="number" placeholder="Rej Qty" class="rejQty-${index}" />
            <input type="text" placeholder="Rej Mode" class="rejMode-${index}" />
            <input type="text" placeholder="Rej Process" class="rejProcess-${index}" />
            <button onclick="addRejEntry(${index})" class="lot-btn add">➕</button>
          </div>
          <div id="rejList-${index}" class="rej-list"></div>
        </div>
        <div class="lot-input-actions">
          <button id="addLotBtn-${index}" onclick="addLotInfo(${index})" class="lot-btn add">➕ Add Lot</button>
          <button id="reviseLotBtn-${index}" onclick="reviseLotInfo(${index})" class="lot-btn revise" style="display:none;">🔁 Revise Lot</button>
        </div>
      </div>
      <div id="lot-list-${index}" style="margin-top:10px;"></div>
    `;
    container.appendChild(block);
    renderLotList(index);
  });
}

const { docId: incomingDocId, lotNo: incomingLotNo } = getQueryParams();
if (incomingDocId === editId && incomingLotNo) {
  setTimeout(() => {
    const allLots = document.querySelectorAll(".lot-info-entry-grid");
    allLots.forEach(div => {
      const lot = div.getAttribute("data-lot")?.toLowerCase();
      if (lot === incomingLotNo.toLowerCase()) {
        div.scrollIntoView({ behavior: "smooth", block: "center" });
        div.style.border = "3px solid red";
        div.style.backgroundColor = "#fff3cd";
      }
    });
  }, 500);
}

function renderLotList(index) {
  const list = document.getElementById(`lot-list-${index}`);
  const lots = historyEntries[index].lotInfo || [];

  list.innerHTML = lots.map((lot, i) => `
    <div class="lot-info-entry-grid" data-device="${lot.device}" data-lot="${lot.lot}">
      <div><b>#${i + 1}</b></div>
      <div class="wafer"><b>Wafer:</b> ${lot.wafer || "-"}</div>
      <div class="device-no"><b>Device:</b> ${lot.device || "-"}</div>
      <div class="run"><b>Run:</b> ${lot.run || "-"}</div>
      <div class="lot-no"><b>Lot:</b> ${lot.lot || "-"}</div>
      <div><b>IN Qty:</b> ${lot.inQty || "-"}</div>
      <div><b>OUT Qty:</b> ${lot.outQty || "-"}</div>
      <div><b>Rej:</b> ${
        Array.isArray(lot.rejEntries)
          ? lot.rejEntries.map(e => `${e.qty}×${e.mode} (${e.process})`).join(", ")
          : "-"
      }</div>
      <div class="lot-btns">
        <button class="lot-btn edit" onclick="editLotInfo(${index}, ${i})">✏️</button>
        <button class="lot-btn delete" onclick="deleteLotInfo(${index}, ${i})">❌</button>
        <button class="lot-btn" onclick="goToSheet15('${lot.device}', '${lot.lot}')">🔗</button>
      </div>
    </div>
  `).join("");

  // ✅ Highlight if redirected from Sheet15
  setTimeout(() => {
    const highlightDevice = (localStorage.getItem("highlightNpiDevice") || "").toLowerCase();
    const highlightLot = (localStorage.getItem("highlightNpiLot") || "").toLowerCase();

    if (!highlightDevice || !highlightLot) return;

    const match = list.querySelector(`.lot-info-entry-grid[data-device="${highlightDevice}"][data-lot="${highlightLot}"]`);
    if (match) {
      match.scrollIntoView({ behavior: "smooth", block: "center" });
      match.classList.add("highlight-row");
    }

    localStorage.removeItem("highlightNpiDevice");
    localStorage.removeItem("highlightNpiLot");
  }, 200);
}

function goToSheet15(deviceNo, lotNo) {
  localStorage.setItem("highlightDevice", deviceNo || "");
  localStorage.setItem("highlightLot", lotNo || "");
  localStorage.setItem("highlightSource", "NPI");
  window.location.href = "sheet15_devicesy.html";
}

function toggleLotInput(index) {
  const div = document.getElementById(`lot-input-${index}`);
  div.style.display = div.style.display === "none" ? "block" : "none";
}

function getLotInputValues(index) {
  const get = id => document.getElementById(`${id}-${index}`).value.trim();
  return {
    wafer: get("wafer"), device: get("device"), run: get("run"), lot: get("lot"),
    inQty: get("inQty"), outQty: get("outQty"), rejEntries: getMultipleRejEntries(index)  // an array like [{ qty: 5, mode: 'Crack' }, { qty: 2, mode: 'Delam' }]
  };
}

function setLotInputValues(index, values) {
  const set = (id, val) => { document.getElementById(`${id}-${index}`).value = val; };
  Object.entries(values).forEach(([key, val]) => {
    if (["wafer", "device", "run", "lot", "inQty", "outQty"].includes(key)) {
      set(key, val);
    }
  });
}

function clearLotInputs(index) {
  setLotInputValues(index, {
    wafer: "", device: "", run: "", lot: "", inQty: "", outQty: ""
  });
  rejEntryMap[index] = []; // clear multiple Rej entries
  renderRejList(index);    // clear list
  lotEditIndexMap[index] = null;
  toggleAddReviseButtons(index, "add");
}

function toggleAddReviseButtons(index, mode) {
  const addBtn = document.getElementById(`addLotBtn-${index}`);
  const revBtn = document.getElementById(`reviseLotBtn-${index}`);
  addBtn.style.display = (mode === "add") ? "inline-block" : "none";
  revBtn.style.display = (mode === "revise") ? "inline-block" : "none";
}

function addLotInfo(index) {
  const newLot = {
    ...getLotInputValues(index),
    rejEntries: getMultipleRejEntries(index) // collect all Rej entries
  };
  historyEntries[index].lotInfo.push(newLot);

  // 🔁 Clear Rej entries after adding
  rejEntryMap[index] = [];
  renderLotList(index);
  clearLotInputs(index);
}

function editLotInfo(index, lotIdx) {
  const lot = historyEntries[index].lotInfo[lotIdx];
  lotEditIndexMap[index] = lotIdx;

  // 🔁 Set normal fields
  setLotInputValues(index, lot);

  // 🔁 Set Rej entries
  rejEntryMap[index] = Array.isArray(lot.rejEntries) ? [...lot.rejEntries] : [];
  renderRejList(index);

  // 🔁 Show revise button
  toggleAddReviseButtons(index, "revise");

  // 🔁 Auto-open Lot Info UI
  const lotInputDiv = document.getElementById(`lot-input-${index}`);
  if (lotInputDiv.style.display === "none") {
    toggleLotInput(index);
  }
}

function reviseLotInfo(index) {
  const lotIdx = lotEditIndexMap[index];
  if (lotIdx === null || lotIdx === undefined) return;

  const revisedLot = {
    ...getLotInputValues(index),
    rejEntries: getMultipleRejEntries(index)
  };

  historyEntries[index].lotInfo[lotIdx] = revisedLot;

  rejEntryMap[index] = [];
  renderLotList(index);
  clearLotInputs(index);
}

function deleteLotInfo(index, lotIdx) {
  if (confirm("Delete this Lot Info entry?")) {
    historyEntries[index].lotInfo.splice(lotIdx, 1);
    renderLotList(index);
    clearLotInputs(index);
  }
}

function editHistory(index) {
  const entry = historyEntries[index];
  ["stage", "aiNo", "requestDate", "bumpAssy", "operInDate", "operOutDate", "faResult", "remark", "changeToNext"].forEach(id => {
    document.getElementById(id).value = entry[id] || "";
  });
  editingHistoryIndex = index;
  document.getElementById("reviseHistoryBtn").style.display = "inline-block";
  document.getElementById("addHistoryBtn").style.display = "none";
}

function deleteHistory(index) {
  if (confirm("Delete this entry?")) {
    historyEntries.splice(index, 1);
    renderHistoryList();
  }
}

function clearHistoryInputs() {
  ["stage", "aiNo", "requestDate", "bumpAssy", "operInDate", "operOutDate", "faResult", "remark", "changeToNext"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

function openAiNoSearch() {
  document.getElementById("aiSearchModal").style.display = "block";
  loadAiNoTable();
}

function closeAiNoSearch() {
  document.getElementById("aiSearchModal").style.display = "none";
}

function loadAiNoTable() {
  const tbody = document.getElementById("aiSearchResults");
  tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

  db.collection("device_list_ai").doc("current").get().then(doc => {
    const raw = doc.data().table;
    const parsed = JSON.parse(raw); // it's a stringified array
    renderAiNoResults(parsed);
  });
}

function renderAiNoResults(dataList) {
  const tbody = document.getElementById("aiSearchResults");
  tbody.innerHTML = "";

  dataList.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.AI_NO}</td>
      <td>${item.BD_NO_CUST || "-"}</td>
      <td>${item.NICKNAME || "-"}</td>
      <td>${item.POD || "-"}</td>
      <td><button onclick="fillAiNo('${item.AI_NO}')">✅</button></td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("aiSearchInput").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
  
    const filtered = dataList.filter(item =>
      (item.AI_NO || "").toLowerCase().includes(term) ||
      (item.BD_NO_CUST || "").toLowerCase().includes(term) ||
      (item.NICKNAME || "").toLowerCase().includes(term) ||
      (item.POD || "").toLowerCase().includes(term)
    );
  
    renderAiNoResults(filtered);
  });
  
}

function fillAiNo(aiNo) {
  document.getElementById("aiNo").value = aiNo;
  closeAiNoSearch();
}

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ ADD HISTORY BUTTON FUNCTIONALITY RESTORED HERE
  document.getElementById("addHistoryBtn").addEventListener("click", () => {
    const entry = {
      stage: document.getElementById("stage").value.trim(),
      aiNo: document.getElementById("aiNo").value.trim(),
      requestDate: document.getElementById("requestDate").value,
      bumpAssy: document.getElementById("bumpAssy").value.trim(),
      operInDate: document.getElementById("operInDate").value,
      operOutDate: document.getElementById("operOutDate").value,
      faResult: document.getElementById("faResult").value.trim(),
      remark: document.getElementById("remark").value.trim(),
      changeToNext: document.getElementById("changeToNext").value.trim(),
      lotInfo: [] // ✅ new independent lotInfo per entry
    };

    historyEntries.push(JSON.parse(JSON.stringify(entry))); // ✅ Deep copy to prevent reference bugs
    renderHistoryList();
    clearHistoryInputs();
  });

  document.getElementById("reviseHistoryBtn").addEventListener("click", () => {
    if (editingHistoryIndex === null) return;
    const revised = {
      stage: document.getElementById("stage").value.trim(),
      aiNo: document.getElementById("aiNo").value.trim(),
      requestDate: document.getElementById("requestDate").value,
      bumpAssy: document.getElementById("bumpAssy").value.trim(),
      operInDate: document.getElementById("operInDate").value,
      operOutDate: document.getElementById("operOutDate").value,
      faResult: document.getElementById("faResult").value.trim(),
      remark: document.getElementById("remark").value.trim(),
      changeToNext: document.getElementById("changeToNext").value.trim(),
      lotInfo: historyEntries[editingHistoryIndex].lotInfo || []
    };
    historyEntries[editingHistoryIndex] = revised;
    renderHistoryList();
    clearHistoryInputs();
    editingHistoryIndex = null;
    document.getElementById("reviseHistoryBtn").style.display = "none";
    document.getElementById("addHistoryBtn").style.display = "inline-block";
  });
  
  document.getElementById("saveNPI").addEventListener("click", async () => {
    const data = collectBasicInfo();
    data.history = historyEntries;
  
    if (!data.customer || !data.packageName || !data.nickname) {
      alert("Please fill in required basic info fields.");
      return;
    }
  
    try {
      const docRef = await db.collection("npi_masterlist").add(data);

      // ✅ Also update devicesy_cache
      data.history.forEach(entry => {
        (entry.lotInfo || []).forEach(lot => {
          if (!lot.lot) return; // 🚫 skip if lot.lot is empty
          db.collection("devicesy_cache").doc(lot.lot).set({
            customer: data.customer,
            packageName: data.packageName,
            nickname: data.nickname,
            pkgSize: data.pkgSize,
            leadNumber: data.leadNumber,
            packageType: data.packageType,
            substrateVendor: data.substrateVendor,
            emcType: data.emcType,
            lotNo: lot.lot,
            deviceNo: lot.device,
            source: "NPI",
            updatedAt: new Date()
          });
        });
      });

      alert("✅ NPI saved.");
      window.location.href = "sheet13_npilist.html";

    } catch (err) {
      console.error("❌ Error saving NPI:", err);
      alert("❌ Failed to save. See console.");
    }
  });

  document.getElementById("reviseNPI").addEventListener("click", async () => {
    const data = collectBasicInfo();
    data.history = historyEntries;
  
    if (!data.customer || !data.packageName || !data.nickname) {
      alert("Please fill in required basic info fields.");
      return;
    }
  
    try {
      const query = await db.collection("npi_masterlist")
        .where("packageName", "==", data.packageName)
        .where("nickname", "==", data.nickname)
        .get();
  
      if (!query.empty) {
        const docId = query.docs[0].id;
        await db.collection("npi_masterlist").doc(docId).set(data);

        // ✅ Also update devicesy_cache
        data.history.forEach(entry => {
          (entry.lotInfo || []).forEach(lot => {
            if (!lot.lot) return; // 🚫 skip if lot.lot is empty
            db.collection("devicesy_cache").doc(lot.lot).set({
              customer: data.customer,
              packageName: data.packageName,
              nickname: data.nickname,
              pkgSize: data.pkgSize,
              leadNumber: data.leadNumber,
              packageType: data.packageType,
              substrateVendor: data.substrateVendor,
              emcType: data.emcType,
              lotNo: lot.lot,
              deviceNo: lot.device,
              source: "NPI",
              updatedAt: new Date()
            });
          });
        });

        alert("🔁 NPI revised.");
        window.location.href = "sheet13_npilist.html";
      } else {
        alert("❌ No matching NPI found to revise.");
      }
    } catch (err) {
      console.error("❌ Error revising NPI:", err);
      alert("❌ Failed to revise. See console.");
    }
  });
  
  const shortcutPkg = localStorage.getItem("npiShortcutPackage");
  const shortcutCustomer = localStorage.getItem("npiShortcutCustomer");

  if (shortcutPkg && shortcutCustomer) {
    const query = await db.collection("npi_masterlist")
      .where("packageName", "==", shortcutPkg)
      .where("customer", "==", shortcutCustomer)
      .get();

    if (!query.empty) {
      const doc = query.docs[0];
      const data = doc.data();
      localStorage.removeItem("npiShortcutPackage");
      localStorage.removeItem("npiShortcutCustomer");

      // Auto-fill fields
      ["customer", "packageName", "nickname", "pkgSize", "leadNumber", "packageType", "substrateVendor", "emcType"].forEach(key => {
        if (data[key]) document.getElementById(key).value = data[key];
      });

      if (data.aiNo) document.getElementById("aiNo").value = data.aiNo;
      if (data.faResult) document.getElementById("faResult").value = data.faResult;

      if (Array.isArray(data.history)) {
        historyEntries.length = 0;
        historyEntries.push(...data.history);
        renderHistoryList();
      }
    }
  }

  let editId = localStorage.getItem("editNPIId") || docId;
  localStorage.removeItem("editNPIId");

  if (!editId) return;

  try {
    const doc = await db.collection("npi_masterlist").doc(editId).get();
    if (doc.exists) {
      const data = doc.data();

      // Fill fields
      ["customer", "packageName", "nickname", "pkgSize", "leadNumber", "packageType", "substrateVendor", "emcType"].forEach(key => {
        if (data[key]) document.getElementById(key).value = data[key];
      });

      if (data.aiNo) document.getElementById("aiNo").value = data.aiNo;
      if (data.faResult) document.getElementById("faResult").value = data.faResult;

      if (Array.isArray(data.history)) {
        historyEntries.length = 0;
        historyEntries.push(...data.history);
        renderHistoryList();

        // ✅ Scroll to Lot after render
        if (lotNo) {
          setTimeout(() => {
            const allLots = document.querySelectorAll(".lot-info-entry-grid");
            allLots.forEach(div => {
              const lotAttr = div.getAttribute("data-lot")?.toLowerCase();
              if (lotAttr === lotNo.toLowerCase()) {
                div.scrollIntoView({ behavior: "smooth", block: "center" });
                div.style.border = "3px solid red";
                div.style.backgroundColor = "#fff3cd";
              }
            });
          }, 500);
        }
      }
    }
  } catch (err) {
    console.error("❌ Failed to load:", err);
  }
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
    db.collection("device_list").get(),
    db.collection("devicesy_cache").get()
  ]).then(([deviceSnap, cacheSnap]) => {
    const deviceList = deviceSnap.docs.map(doc => ({ ...doc.data(), source: "Device List" }));
    const cacheList = cacheSnap.docs.map(doc => ({ ...doc.data(), source: "Cache" }));

    fullDeviceSyList = [...deviceList, ...cacheList];
    renderDeviceSyResults(fullDeviceSyList); // ✅ initial render
  });

  // ✅ Add search filter ONCE
  const input = document.getElementById("deviceSearchInput");
  input.oninput = () => {
    const keyword = input.value.toLowerCase();
    const filtered = fullDeviceSyList.filter(item =>
      (item.deviceNo || "").toLowerCase().includes(keyword) ||
      (item.lotNo || "").toLowerCase().includes(keyword) ||
      (item.packageName || "").toLowerCase().includes(keyword) ||
      (item.nickname || "").toLowerCase().includes(keyword)
    );
    renderDeviceSyResults(filtered);
  };
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
      source: "Reliability"
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

  dataList.forEach(item => {
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
      <td>${item.item || "-"}</td>  <!-- ✅ Action -->
      <td>${item.source || "-"}</td>  <!-- ✅ Source -->
      <td><button>✅</button></td>
    `;

    row.querySelector("button").addEventListener("click", () => {
      fillNPIFields(JSON.stringify(item));
    });

    tbody.appendChild(row);
  });
}

function fillNPIFields(jsonString) {
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

function openFaSearch() {
  document.getElementById("faSearchModal").style.display = "block";
  loadFaList();
}

function closeFaSearch() {
  document.getElementById("faSearchModal").style.display = "none";
}

function loadFaList() {
  const tbody = document.getElementById("faSearchResults");
  tbody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

  db.collection("faManager").get().then(snapshot => {
    const rows = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        faNumber: d.faNumber || "-",
        customer: d.customer || "-",
        packageName: d.packageName || "-",
        tCards: d.tCards || []
      };
    });

    const flat = [];
    rows.forEach(row => {
      row.tCards.forEach(tc => {
        flat.push({
          faNumber: row.faNumber,
          customer: row.customer,
          packageName: row.packageName,
          device: tc.device || "-",
          lotNumber: tc.lotNumber || "-"
        });
      });
    });

    renderFaResults(flat);
  });
}

function renderFaResults(dataList) {
  const tbody = document.getElementById("faSearchResults");
  tbody.innerHTML = "";

  dataList.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.faNumber}</td>
      <td>${item.customer}</td>
      <td>${item.packageName}</td>
      <td>${item.device}</td>
      <td>${item.lotNumber}</td>
      <td><button onclick="fillFaResult('${item.faNumber}')">✅</button></td>
    `;
    tbody.appendChild(row);
  });

  // search filter
  document.getElementById("faSearchInput").addEventListener("input", e => {
    const keyword = e.target.value.toLowerCase();
    const filtered = dataList.filter(item =>
      (item.faNumber || "").toLowerCase().includes(keyword) ||
      (item.device || "").toLowerCase().includes(keyword) ||
      (item.lotNumber || "").toLowerCase().includes(keyword)
    );
    renderFaResults(filtered);
  });
}

function fillFaResult(faNo) {
  document.getElementById("faResult").value = faNo;
  closeFaSearch();
}

const rejEntryMap = {}; // index → temp array of rej entries

function addRejEntry(index) {
  const qtyInput = document.querySelector(`#rejArea-${index} .rejQty-${index}`);
  const modeInput = document.querySelector(`#rejArea-${index} .rejMode-${index}`);
  const processInput = document.querySelector(`#rejArea-${index} .rejProcess-${index}`);
  const qty = qtyInput.value.trim();
  const mode = modeInput.value.trim();
  const process = processInput.value.trim();

  if (!qty || !mode || !process) {
    alert("Enter Rej Qty, Mode, and Process.");
    return;
  }

  const entry = { qty, mode, process };

  if (!rejEntryMap[index]) rejEntryMap[index] = [];
  rejEntryMap[index].push(entry);

  qtyInput.value = "";
  modeInput.value = "";
  renderRejList(index);
}

function getMultipleRejEntries(index) {
  return rejEntryMap[index] || [];
}

function renderRejList(index) {
  const entries = rejEntryMap[index] || [];  // ✅ define entries first
  const list = document.getElementById(`rejList-${index}`);
  list.style.display = "flex";
  list.style.flexWrap = "wrap";
  list.style.alignItems = "center";
  list.style.gap = "6px";
  list.innerHTML = entries.map((e, i) => `
    <div style="background:#eef6ff; padding:4px 8px; border-radius:6px; display:flex; align-items:center;">
      ${e.qty}×${e.mode} (${e.process})
      <button class="lot-btn delete" style="margin-left:6px; padding: 2px 6px;" onclick="removeRejEntry(${index}, ${i})">❌</button>
    </div>
  `).join("");
}

function removeRejEntry(index, i) {
  if (rejEntryMap[index]) {
    rejEntryMap[index].splice(i, 1);
    renderRejList(index);
  }
}
