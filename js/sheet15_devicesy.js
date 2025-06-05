const firebaseConfig = {
  apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
  authDomain: "reliability-program.firebaseapp.com",
  projectId: "reliability-program"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const tableBody = document.getElementById("deviceTableBody");

let currentSourceFilter = "";
let editingId = null;
const globalRowBuffer = [];

let customerKeywordMap = {};
(async function loadCustomerKeywords() {
  const snapshot = await firebase.firestore().collection("customer_keywords").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const main = (data.customer || "").toLowerCase();
    const keywords = (data.keywords || []).map(k => k.toLowerCase());
    customerKeywordMap[main] = keywords;
  });
})();

const fixedColorMap = {
  rel: '#388e3c',       // Green
  fa: '#ef6c00',        // Orange
  npi: '#1976d2',       // Blue
  pcn: '#7b1fa2'        // Purple
};

const allowedCustomers = (() => {
  const raw = localStorage.getItem("loginCustomer") || "all";
  return raw.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
})();

const dynamicColorMap = {}; // For random colors assigned to new sources

function isCustomerAllowed(customerName = "") {
  if (!customerName) return false;
  const lowerName = customerName.toLowerCase();

  // Allow all if user selected 'all'
  if (allowedCustomers.includes("all")) return true;

  return allowedCustomers.some(main => {
    if (lowerName.includes(main)) return true;
    const synonyms = customerKeywordMap[main] || [];
    return synonyms.some(k => lowerName.includes(k));
  });
}


function generateDarkFancyColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 80%, 30%)`; // Dark fancy
}

function getColorForSource(source) {
  const key = source.toLowerCase();
  if (fixedColorMap[key]) return fixedColorMap[key];
  if (!dynamicColorMap[key]) dynamicColorMap[key] = generateDarkFancyColor();
  return dynamicColorMap[key];
}

function getInputData() {
  const loginCustomer = localStorage.getItem("loginCustomer") || "";
  return {
    customer: customer.value.trim(),
    packageName: packageName.value.trim(),
    nickname: nickname.value.trim(),
    pkgSize: pkgSize.value.trim(),
    leadNumber: leadNumber.value.trim(),
    packageType: packageType.value.trim(),
    substrateVendor: substrateVendor.value.trim(),
    emcType: emcType.value.trim(),
    inDate: inDate.value,
    outDate: outDate.value,
    deviceNo: deviceNo.value.trim(),
    lotNo: lotNo.value.trim(),
    item: item.value.trim(),
    detail: detail.value.trim(),
    source: source.value.trim(),
    createdAt: new Date(),
    loginCustomer: loginCustomer.toLowerCase()  // ✅ ADD THIS
  };
}

function fillInputFields(data) {
  customer.value = data.customer || "";
  packageName.value = data.packageName || "";
  nickname.value = data.nickname || "";
  pkgSize.value = data.pkgSize || "";
  leadNumber.value = data.leadNumber || "";
  packageType.value = data.packageType || "";
  substrateVendor.value = data.substrateVendor || "";
  emcType.value = data.emcType || "";
  inDate.value = data.inDate || "";
  outDate.value = data.outDate || "";
  deviceNo.value = data.deviceNo || "";
  lotNo.value = data.lotNo || "";
  item.value = data.item || "";
  detail.value = data.detail || "";
  source.value = data.source || "";
}

function clearInputs() {
  document.querySelectorAll("input").forEach(input => input.value = "");
  editingId = null;
}

function saveToFirestore() {
  const data = getInputData();
  if (editingId) {
    db.collection("device_list").doc(editingId).update(data).then(() => {
      alert("✅ Revised!");
      clearInputs();
      loadAllDeviceData(); // ✅ reload after revise
    });
  } else {
    db.collection("device_list").add(data).then(docRef => {
      alert("✅ Saved!");
      clearInputs();
      addRow({ ...data }, docRef.id); // ✅ attach ID
      flushGlobalBuffer();            // ✅ renders Edit/Delete
    });
  }
}

function reviseItem(id) {
  db.collection("device_list").doc(id).get().then(doc => {
    if (doc.exists) {
      fillInputFields(doc.data());
      editingId = id;
    }
  });
}

function deleteItem(id) {
  if (confirm("Delete this item?")) {
    db.collection("device_list").doc(id).delete().then(() => {
      alert("🗑️ Deleted!");
      if (editingId === id) clearInputs();
      loadAllDeviceData(); // ✅ reload list after delete
    });
  }
}

function renderRow(data, id = null, editable = true) {
  const row = document.createElement("tr");
  row.classList.add("lot-data-row");
  row.style.display = "none";
  row.innerHTML = `
    <td>${data.customer || ""}</td>
    <td>${data.packageName || "-"}</td>
    <td>${data.nickname || "-"}</td>
    <td>${data.pkgSize || "-"}</td>
    <td>${data.leadNumber || "-"}</td>
    <td>${data.packageType || "-"}</td>
    <td>${data.substrateVendor || "-"}</td>
    <td>${data.emcType || "-"}</td>
    <td>${data.inDate || "-"}</td>
    <td>${data.outDate || "-"}</td>
    <td>${data.deviceNo || "-"}</td>
    <td>${data.lotNo || "-"}</td>
    <td>${data.item || "-"}</td>
    <td>${data.detail || "-"}</td>
    <td>${data.source || "-"}</td>
    <td>
      ${editable && id ? `
        <button class="revise-btn" onclick="reviseItem('${id}')">✏️</button>
        <button class="delete-btn" onclick="deleteItem('${id}')">❌</button>
      ` : data.source?.toLowerCase() === "npi" && data.npiDocId && data.lotNo ? `
        <button class="table-button" onclick="goToNPI('${data.npiDocId}', '${data.lotNo}')">🛠️</button>
      ` : data.source?.toLowerCase() === "pcn" && data.pcnDocId && data.lotNo ? `
        <button class="table-button" onclick="goToPCN('${data.pcnDocId}', '${data.lotNo}')">🛠️</button>
      ` : data.source?.toLowerCase() === "fa" && data.faDocId && data.lotNo ? `
        <button class="table-button" onclick="goToFA('${data.faDocId}', '${data.lotNo}')">🛠️</button>
      ` : data.source?.toLowerCase() === "reliability" && data.lotNo && id ? `
        <button class="table-button" onclick="goToRel('${id}', '${data.lotNo}', \`${data.item || ""}\`)">🛠️</button>
      ` : "-"}
    </td>
  `;
  tableBody.appendChild(row);
}


function flushGlobalBuffer() {
  const uniqueSources = new Set();
  globalRowBuffer.forEach(data => {
    if (data.source) {
      uniqueSources.add(data.source.trim());
    }
  });

  const filterBar = document.getElementById("sourceFilterBar");
  filterBar.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.textContent = "All";
  allBtn.className = "filter-btn";
  allBtn.dataset.source = "";
  filterBar.appendChild(allBtn);

  Array.from(uniqueSources).sort().forEach(source => {
    const btn = document.createElement("button");
    btn.textContent = source;
    btn.className = "filter-btn";
    btn.dataset.source = source.toLowerCase();
    filterBar.appendChild(btn);
  });

  const switchBtn = document.createElement("button");
  switchBtn.textContent = "🔄 Toggle All Lots";
  switchBtn.className = "cool-btn";
  switchBtn.style.marginLeft = "8px";
  switchBtn.onclick = () => {
    const rows = document.querySelectorAll(".lot-data-row");
    const allHidden = Array.from(rows).every(row => row.style.display === "none");
    rows.forEach(row => {
      row.style.display = allHidden ? "" : "none";
    });
  };
  filterBar.appendChild(switchBtn);


  globalRowBuffer.sort((a, b) => {
    if (a.lotNo < b.lotNo) return -1;
    if (a.lotNo > b.lotNo) return 1;
    return new Date(a.inDate) - new Date(b.inDate);
  });

  tableBody.innerHTML = "";
  let currentLot = null;

  globalRowBuffer.forEach(data => {
    const source = data.source?.toLowerCase() || "";

    if (currentSourceFilter && source !== currentSourceFilter) return;

    if (data.lotNo !== currentLot) {
      currentLot = data.lotNo;
      const lotRow = document.createElement("tr");
      lotRow.className = "lot-header";
      lotRow.innerHTML = `<td colspan="16" style="font-weight:bold; background:#f0f0f0">📦 Lot: ${currentLot}</td>`;
      tableBody.appendChild(lotRow);
    }

    const isSystemSource = ["fa", "reliability", "pcn", "npi"].includes(source);
    const editable = !isSystemSource;

    renderRow(data, data.docId || null, editable);
  });

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentSourceFilter = btn.dataset.source;
      flushGlobalBuffer();
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active-filter"));
      btn.classList.add("active-filter");
    });
  });

  document.querySelectorAll(".lot-header").forEach(headerRow => {
    headerRow.style.cursor = "pointer";
    headerRow.addEventListener("click", () => {
      let nextRow = headerRow.nextElementSibling;
      while (nextRow && !nextRow.classList.contains("lot-header")) {
        nextRow.style.display = (nextRow.style.display === "none") ? "" : "none";
        nextRow = nextRow.nextElementSibling;
      }
    });
  });

  renderFullCalendar(currentSourceFilter);

  setTimeout(() => {
    const highlightDevice = (localStorage.getItem("highlightDevice") || "").toLowerCase();
    const highlightLot = (localStorage.getItem("highlightLot") || "").toLowerCase();
    const source = localStorage.getItem("highlightSource");

    if (!highlightLot) return;

    const rows = document.querySelectorAll("#deviceTableBody tr");
    rows.forEach(row => {
      const lotCell = row.cells[11];
      const deviceCell = row.cells[10];
      const sourceCell = row.cells[14];

      if (!lotCell) return;

      const lot = lotCell.textContent.trim().toLowerCase();
      const device = deviceCell?.textContent.trim().toLowerCase();
      const rowSource = sourceCell?.textContent.trim().toLowerCase();

      if (
        lot === highlightLot &&
        (!highlightDevice || device === highlightDevice) &&
        (!source || rowSource === source.toLowerCase())
      ) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.style.border = "3px solid red";
        row.style.backgroundColor = "#fff3cd";
      }
    });

    localStorage.removeItem("highlightLot");
    localStorage.removeItem("highlightDevice");
    localStorage.removeItem("highlightSource");
  }, 500);
}


function addRow(data, id = null) {
  // ✅ Attach docId for reliability rows
  if (id) {
    data.docId = id;
  }

  if (data.source === "NPI" && data.docId) {
    data.npiDocId = data.docId;
  }

  globalRowBuffer.push(data);
}

function loadAllDeviceData() {
  tableBody.innerHTML = "";
  globalRowBuffer.length = 0;

  db.collection("device_list").orderBy("createdAt", "desc").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!isCustomerAllowed(data.customer)) return; // ✅ Apply filter here
      addRow(data, doc.id);
    });
    loadNPIData(); // ➡️ Next
  });
}

// Remove real-time listener
// Add a Search button
const searchInput = document.getElementById("searchInput");
const searchBtn = document.createElement("button");
searchBtn.textContent = "🔍 Search";
searchBtn.className = "cool-btn";
searchBtn.style.marginLeft = "8px";
searchBtn.onclick = () => {
  console.time("searchExecution");
  const keyword = searchInput.value.trim().toLowerCase();
  const rows = document.querySelectorAll("#deviceTableBody tr");
  let currentLot = null;

  rows.forEach(row => {
    if (row.classList.contains("lot-header")) {
      currentLot = row;
      row.style.display = "none";
    } else {
      const text = row.textContent.toLowerCase();
      const match = keyword === "" || text.includes(keyword);
      row.style.display = match ? "" : "none";
      if (match && currentLot) {
        currentLot.style.display = "";
      }
    }
  });

  requestAnimationFrame(() => {
    console.timeEnd("searchExecution");
  });
};
searchInput.parentElement.appendChild(searchBtn);



function loadNPIData() {
  db.collection("npi_masterlist").get().then(snapshot => {
    snapshot.forEach(doc => {
      const base = doc.data();
      if (!isCustomerAllowed(base.customer)) return;

      (base.history || []).forEach(entry => {
        (entry.lotInfo || []).forEach(lot => {
          addRow({
            customer: base.customer,
            packageName: base.packageName,
            nickname: base.nickname,
            pkgSize: base.pkgSize,
            leadNumber: base.leadNumber,
            packageType: base.packageType,
            substrateVendor: base.substrateVendor,
            emcType: base.emcType,
            inDate: entry.operInDate,
            outDate: entry.operOutDate,
            deviceNo: lot.device,
            lotNo: lot.lot,
            item: entry.stage,
            detail: entry.remark,
            source: "NPI",
            npiDocId: doc.id
          });
        });
      });
    });

    loadFAData(); // ➡️ Next
  });
}


function loadFAData() {
  db.collection("faManager").get().then(snapshot => {
    snapshot.forEach(doc => {
      const base = doc.data();
      if (!isCustomerAllowed(base.customer)) return;

      (base.tCards || []).forEach(card => {
        (card.extendedInfo || []).forEach(p => {
          addRow({
            customer: base.customer,
            packageName: base.packageName,
            nickname: base.nickname,
            pkgSize: base.pkgSize,
            leadNumber: base.leadNumber,
            packageType: base.packageType,
            substrateVendor: card.substrateVendor,
            emcType: card.emcType,
            lotNo: card.lotNumber,
            deviceNo: "-",
            inDate: p.inDate,
            outDate: p.outDate,
            item: p.progress,
            detail: base.productStage,
            source: "FA",
            faDocId: doc.id
          });
        });
      });
    });

    loadPCNData(); // ➡️ Next
  });
}


function loadPCNData() {
  db.collection("pcn_masterlist").get().then(snapshot => {
    snapshot.forEach(doc => {
      const d = doc.data();
      if (!isCustomerAllowed(d.customer)) return;

      const changeDesc = d["Change Description"] || "-";
      const purpose = d["Purpose"] || "-";

      const handle = (list, mappings) => {
        (list || []).forEach(card => {
          mappings.forEach(map => {
            addRow({
              customer: card.customer,
              packageName: card.packageName,
              nickname: card.nickname,
              pkgSize: card.pkgSize,
              leadNumber: card.leadNumber,
              packageType: card.packageType,
              substrateVendor: card.substrateVendor,
              emcType: card.emcType,
              lotNo: card.lotNo,
              deviceNo: "-",
              inDate: d[map.in],
              outDate: d[map.out],
              item: `${map.label} - ${changeDesc}`,
              detail: purpose,
              source: "PCN",
              pcnDocId: doc.id
            });
          });
        });
      };

      handle(d.tcardList_Process, [
        { label: "PCN_Process Data", in: "Process Data Gathering Start", out: "Process Data to Customer" },
        { label: "PCN_SPCN Registration", in: "Process Data to Customer", out: "SPCN Registration Date" }
      ]);

      handle(d.tcardList_STR, [
        { label: "PCN_STR Validation", in: "STR Validation Start", out: "STR Validation Completed Date" },
        { label: "PCN_Validation Buy Off", in: "STR Validation Completed Date", out: "Validation Buy Off Date" },
        { label: "PCN_STR Sample Release", in: "Validation Buy Off Date", out: "STR Sample Release Date" }
      ]);

      handle(d.tcardList_SPCN, [
        { label: "PCN_SPCN Effectiveness", in: "SPCN Effectiveness Initiated", out: "SPCN Effectiveness Sent to Customer" },
        { label: "PCN_SPCN Approval", in: "SPCN Effectiveness Sent to Customer", out: "SPCN Approval Date" }
      ]);
    });

    loadRelData(); // ➡️ Final step
  });
}


function loadRelData() {
  db.collection("schedules").get().then(snapshot => {
    snapshot.forEach(doc => {
      const d = doc.data();
      if (!isCustomerAllowed(d.customer)) return; // ✅ FIXED here

      const tCards = d.tcardList || [];
      const areaMap = d.scheduleDroppedTests || {};

      Object.entries(areaMap).forEach(([areaName, tests]) => {
        const normalizedArea = areaName.toLowerCase();

        (tests || []).forEach(test => {
          const testName = test.criteria || test.id || "-";
          const planIn = test.planIn || "-";
          const planOut = test.planOut || "-";
          const actualOut = test.actualOut || null;

          tCards.forEach(card => {
            const lotPurpose = (card.relPurpose || "").toLowerCase();
            const isPrecon = normalizedArea === "preconditioning";
            const isMatchingArea = normalizedArea === lotPurpose;

            if (!isPrecon && !isMatchingArea) return;

            addRow({
              customer: d.customer,
              packageName: d.packageName,
              nickname: d.nickname,
              pkgSize: d.pkgSize,
              leadNumber: d.leadNumber,
              packageType: d.packageType,
              substrateVendor: card.substrateVendor,
              emcType: card.emcType,
              lotNo: card.lotNumber,
              deviceNo: "-",
              inDate: planIn,
              outDate: actualOut || planOut || "-",
              item: `${areaName} - ${testName}`,
              detail: d.purpose,
              source: "Reliability"
            }, doc.id);
          });
        });
      });
    });

    flushGlobalBuffer();  // ✅ FINAL RENDER
    renderFullCalendar(); // ✅ Show calendar
  });
}

window.saveToFirestore = saveToFirestore;
window.reviseItem = reviseItem;
window.deleteItem = deleteItem;

window.goToNPI = function(docId, lotNo) {
  const url = `sheet14_npimkr.html?docId=${encodeURIComponent(docId)}&lotNo=${encodeURIComponent(lotNo)}`;
  window.location.href = url;  // ✅ opens in same page/tab
}

window.goToPCN = function(docId, lotNo) {
  const url = `sheet10_pcnregistration.html?edit=${encodeURIComponent(docId)}&lotNo=${encodeURIComponent(lotNo)}`;
  window.location.href = url;
}

window.goToFA = function(docId, lotNo) {
  const url = `sheet12_famngr.html?docId=${encodeURIComponent(docId)}&lotNo=${encodeURIComponent(lotNo)}`;
  window.location.href = url;
};

window.goToRel = function(docId, lotNo, itemText = "") {
  localStorage.setItem("highlightLot", lotNo || "");
  localStorage.setItem("highlightTestItem", itemText || "");
  localStorage.setItem("highlightSource", "Reliability");
  localStorage.setItem("currentEditId", docId); // ✅ critical!
  window.location.href = "sheet2_schedulemanager.html";
};

loadAllDeviceData();

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentSourceFilter = btn.dataset.source; // "" means All
    flushGlobalBuffer();

    // Highlight active button
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active-filter"));
    btn.classList.add("active-filter");
  });
});

const calendarColorMap = {}; // 🔁 persistent map

function getDarkColorForSource(source) {
  // Reuse color if already set
  if (calendarColorMap[source]) return calendarColorMap[source];

  // Generate a dark random color
  const hue = Math.floor(Math.random() * 360);
  const color = `hsl(${hue}, 70%, 35%)`; // Dark color
  calendarColorMap[source] = color;
  return color;
}

function renderFullCalendar(sourceFilter = "") {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;
  calendarEl.innerHTML = "";

  const mergedMap = {};

  globalRowBuffer.forEach(row => {
    const source = (row.source || "Unknown").trim();
    const sourceKey = source.toLowerCase();
    if (sourceFilter && sourceKey !== sourceFilter) return;

    const inDate = row.inDate;
    const outDate = row.outDate;
    const item = row.item || "-";
    const lotNo = row.lotNo || "-";

    const key = `${inDate}|${outDate}|${source}|${item}`;
    if (!mergedMap[key]) {
      mergedMap[key] = {
        inDate,
        outDate,
        source,
        item,
        lotNos: [lotNo]
      };
    } else {
      if (!mergedMap[key].lotNos.includes(lotNo)) {
        mergedMap[key].lotNos.push(lotNo);
      }
    }
  });

  const events = Object.values(mergedMap).map(data => {
    const lotString = data.lotNos.join(" - ");
    const title = `${data.source} - ${lotString} - ${data.item}`;
    const color = getColorForSource(data.source.toLowerCase());

    const extended = {
      title,
      color,
      textColor: "#fff",
      borderColor: "#111",
      extendedProps: {
        lotNo: lotString,
        item: data.item
      }
    };

    if (data.inDate && data.outDate) {
      return {
        ...extended,
        start: data.inDate,
        end: new Date(new Date(data.outDate).getTime() + 86400000).toISOString().split("T")[0]
      };
    } else if (data.inDate) {
      return { ...extended, title: `IN: ${title}`, start: data.inDate };
    } else if (data.outDate) {
      return { ...extended, title: `OUT: ${title}`, start: data.outDate };
    } else {
      return null;
    }
  }).filter(Boolean);

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    events,
    eventClick: function(info) {
      const lotNo = (info.event.extendedProps.lotNo || "").toLowerCase();
      const itemText = (info.event.extendedProps.item || "").toLowerCase();

      const rows = document.querySelectorAll("#deviceTableBody tr");
      let found = false;
      let currentLotHeader = null;

      rows.forEach(row => {
        if (row.classList.contains("lot-header")) {
          currentLotHeader = row;
        } else {
          const lotCell = row.cells[11];
          const itemCell = row.cells[12];
          if (!lotCell || !itemCell) return;

          const lot = lotCell.textContent.trim().toLowerCase();
          const item = itemCell.textContent.trim().toLowerCase();

          if (lotNo.includes(lot) && item === itemText) {
            // Make sure the lot is expanded
            if (currentLotHeader) {
              let nextRow = currentLotHeader.nextElementSibling;
              while (nextRow && !nextRow.classList.contains("lot-header")) {
                nextRow.style.display = "";
                nextRow = nextRow.nextElementSibling;
              }
            }

            row.scrollIntoView({ behavior: "smooth", block: "center" });
            row.style.transition = "background 0.5s, border 0.5s";
            row.style.backgroundColor = "#fff3cd";
            row.style.border = "2px solid red";
            found = true;

            setTimeout(() => {
              row.style.backgroundColor = "";
              row.style.border = "";
            }, 2500);
          }
        }
      });

      if (!found) alert("⚠️ Matching row not found in table.");
    }
  });

  calendar.render();

  const legendDiv = document.getElementById("calendarLegend");
  if (legendDiv) {
    const allSources = new Set([...Object.keys(fixedColorMap), ...Object.keys(dynamicColorMap)]);
    legendDiv.innerHTML = Array.from(allSources).map(src => {
      const clr = getColorForSource(src);
      return `<span style="color:${clr}; font-weight:bold; margin-right:12px;">● ${src.toUpperCase()}</span>`;
    }).join(" ");
  }
}

function scrollToCalendar() {
  const calendar = document.getElementById("calendar");
  if (calendar) {
    calendar.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}