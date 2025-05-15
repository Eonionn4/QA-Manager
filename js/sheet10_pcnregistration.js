// Initialize Firebase
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
let fullLotList = [];

const pcnInfoContainer = document.getElementById('pcnInfoContainer');
const formContainer = document.getElementById('formContainer');
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit');
const lotHighlight = urlParams.get("lotNo") || null;

// Top PCN Information Fields
const pcnInfoFields = [
  { label: "Issue Date", id: "IssueDate", type: "date" },
  { label: "Device", id: "Device", type: "text" },
  { label: "Customer", id: "Customer", type: "text" },
  { label: "SCK DRI", id: "SCKDRI", type: "text" },
  { label: "Customer DRI", id: "CustomerDRI", type: "text" },
  { label: "Change Description", id: "ChangeDescription", type: "textarea" },
  { label: "Purpose", id: "Purpose", type: "textarea" },
  { label: "PCN Class", id: "PCNClass", type: "select", options: ["1", "2", "3"] },
  { label: "Reliability Criteria Number", id: "ReliabilityNumber", type: "text" },
  { label: "e-CM Register Status", id: "ECMStatus", type: "select", options: ["Ongoing", "Completed"] },
  { label: "e-CM Duration (Days)", id: "ECMDuration", type: "number" }
];

const formStructure = [
  {
    title: "Process Data to SPCN Register",
    fields: [
      { label: "Process Data Gathering Start", id: "ProcessStart", type: "date" },
      { label: "Process Data to Customer", id: "ProcessRegDate", type: "date" },
      { label: "Process Data Gathering Result", id: "ProcessResult", type: "select", options: ["", "Pass", "Fail"] },
      { label: "SPCN Registration Date", id: "SPCNRegistrationDate", type: "date" },
      { label: "SPCN #", id: "SPCNRegistrationName", type: "text" }
    ]
  },
  {
    title: "STR Validation",
    fields: [
      { label: "STR Validation Start", id: "STRStart", type: "date" },
      { label: "STR Validation Completed Date", id: "STRRegDate", type: "date" }, // Renamed
      { label: "STR Validation Result", id: "STRResult", type: "select", options: ["", "Pass", "Fail"] },
      { label: "Validation Buy Off Date", id: "BuyoffDate", type: "date" },
      { label: "Validation Buy Off Result", id: "BuyoffResult", type: "select", options: ["", "Approved", "Denied"] },
      { label: "Validation Buy Offer", id: "BuyoffName", type: "text" }, // Renamed
      { label: "STR Sample Approval", id: "STRReleaseResult", type: "select", options: ["", "Approved", "Denied"] }, // Renamed
      { label: "STR Sample Release Approver", id: "STRReleaseName", type: "text" }, // Renamed
      { label: "STR Sample Release Date", id: "STRReleaseDate", type: "date" }
    ]
  },
  {
    title: "SPCN Effectiveness Validation",
    fields: [
      { label: "SPCN Effectiveness Initiated", id: "SPCNEffectivenessStart", type: "date" },
      { label: "SPCN Effectiveness Sent to Customer", id: "SPCNEffectivenessSent", type: "date" },
      // { label: "SPCN Effectiveness Name", id: "SPCNEffectivenessName", type: "text" },  ❌ Deleted
      { label: "SPCN Approval Date", id: "SPCNApprovalDate", type: "date" },
      { label: "SPCN Approval Result", id: "SPCNApprovalResult", type: "select", options: ["", "Approved", "Denied"] },
      { label: "SPCN Approval Name", id: "SPCNApprovalName", type: "text" }
    ]
  }
];

// Build Top PCN Information
function createPCNInfo() {
  const h2 = document.createElement('h2');
  h2.textContent = "PCN Information";
  pcnInfoContainer.appendChild(h2);

  // Row 1: 4 fields
  const row1 = document.createElement('div');
  row1.className = 'pcn-info-row';
  ["IssueDate", "Device", "Customer", "SCKDRI"].forEach(id => {
    row1.appendChild(createInputGroup(id));
  });
  pcnInfoContainer.appendChild(row1);

  // Row 2: 2 wide fields
  const row2 = document.createElement('div');
  row2.className = 'pcn-info-row';
  ["ChangeDescription", "Purpose"].forEach(id => {
    row2.appendChild(createInputGroup(id));
  });
  pcnInfoContainer.appendChild(row2);

  // Row 3: 4 fields
  const row3 = document.createElement('div');
  row3.className = 'pcn-info-row';
  ["PCNClass", "ReliabilityNumber", "ECMStatus", "ECMDuration"].forEach(id => {
    row3.appendChild(createInputGroup(id));
  });
  pcnInfoContainer.appendChild(row3);
}

function createInputGroup(id) {
  const field = pcnInfoFields.find(f => f.id === id) || 
                formStructure.flatMap(section => section.fields).find(f => f.id === id);
  
  const div = document.createElement('div');
  div.className = 'pcn-info-group';

  const label = document.createElement('label');
  label.textContent = field.label;
  div.appendChild(label);

  let input;
  if (field.type === "textarea") {
    input = document.createElement('textarea');
  } else if (field.type === "select") {
    input = document.createElement('select');
    field.options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      input.appendChild(option);
    });
  } else {
    input = document.createElement('input');
    input.type = field.type;
  }

  input.id = field.id;
  div.appendChild(input);
  return div;
}

function createFormBlocks() {
  formStructure.forEach(section => {
    const block = document.createElement('div');
    block.className = 'form-block';

    const h3 = document.createElement('h3');
    h3.textContent = section.title;
    block.appendChild(h3);

    if (section.title === "Process Data to SPCN Register") {
      const row1 = document.createElement('div');
      row1.className = 'pcn-info-row';
      ["ProcessStart", "ProcessRegDate", "ProcessResult"].forEach(id => {
        row1.appendChild(createInputGroup(id));
      });
      block.appendChild(row1);

      const row2 = document.createElement('div');
      row2.className = 'pcn-info-row';
      ["SPCNRegistrationDate", "SPCNRegistrationName"].forEach(id => {
        row2.appendChild(createInputGroup(id));
      });
      block.appendChild(row2);

      addTCardSection(block, "Process");

    } else if (section.title === "STR Validation") {
      const row1 = document.createElement('div');
      row1.className = 'pcn-info-row';
      ["STRStart", "STRRegDate", "STRResult"].forEach(id => {
        row1.appendChild(createInputGroup(id));
      });
      block.appendChild(row1);

      const row2 = document.createElement('div');
      row2.className = 'pcn-info-row';
      ["BuyoffDate", "BuyoffResult", "BuyoffName"].forEach(id => {
        row2.appendChild(createInputGroup(id));
      });
      block.appendChild(row2);

      const row3 = document.createElement('div');
      row3.className = 'pcn-info-row';
      ["STRReleaseResult", "STRReleaseName", "STRReleaseDate"].forEach(id => {
        row3.appendChild(createInputGroup(id));
      });
      block.appendChild(row3);

      addTCardSection(block, "STR");

    } else if (section.title === "SPCN Effectiveness Validation") {
      const row1 = document.createElement('div');
      row1.className = 'pcn-info-row';
      ["SPCNEffectivenessStart", "SPCNEffectivenessSent"].forEach(id => {
        row1.appendChild(createInputGroup(id));
      });
      block.appendChild(row1);

      const row2 = document.createElement('div');
      row2.className = 'pcn-info-row';
      ["SPCNApprovalDate", "SPCNApprovalResult", "SPCNApprovalName"].forEach(id => {
        row2.appendChild(createInputGroup(id));
      });
      block.appendChild(row2);

      addTCardSection(block, "SPCN");
    }

    formContainer.appendChild(block);
  });
}

function addTCardSection(parent, sectionKey) {
  const tcardBox = document.createElement('div');
  tcardBox.style.marginTop = "20px";

  tcardBox.innerHTML = `
    <h4 style="color:#28a745; margin-bottom:10px;">📦 T-Card Information</h4>
    <div class="pcn-info-row">
      <div class="pcn-info-group"><label>Customer</label><input id="tCustomer_${sectionKey}" type="text"></div>
      <div class="pcn-info-group"><label>Package Name</label><input id="tPackage_${sectionKey}" type="text"></div>
      <div class="pcn-info-group"><label>Nickname</label><input id="tNickname_${sectionKey}" type="text"></div>
      <div class="pcn-info-group"><label>PKG Size</label><input id="tSize_${sectionKey}" type="text"></div>
      <div class="pcn-info-group"><label>Lead Number</label><input id="tLead_${sectionKey}" type="text"></div>
    </div>

    <div class="pcn-info-row">
      <div class="pcn-info-group"><label>Package Type</label><input id="tType_${sectionKey}" type="text"></div>
      <div class="pcn-info-group"><label>Sub Ven</label><input id="tSubstrate_${sectionKey}" type="text"></div>
      <div class="pcn-info-group"><label>EMC Type</label><input id="tEMC_${sectionKey}" type="text"></div>
      <div class="pcn-info-group"><label>Device No</label><input id="tDevice_${sectionKey}" type="text"></div>
      <div class="pcn-info-group"><label>Lot No</label><input id="tLot_${sectionKey}" type="text"></div>
    </div>

    <div style="display:flex; gap:10px; margin-top:10px;">
      <button onclick="addTCard('${sectionKey}')">➕ Save T-Card</button>
      <button onclick="showLotSearchModal(this)" data-section="${sectionKey}">🔍 Bring information from Device List</button>
    </div>

    <div id="tcardListArea_${sectionKey}" style="margin-top:15px;"></div>
  `;

  parent.appendChild(tcardBox);
}

function calculateECMDuration() {
  const approvalInput = document.getElementById("SPCNApprovalDate");
  const durationInput = document.getElementById("ECMDuration");

  if (!approvalInput || !durationInput) return;

  const approvalDateStr = approvalInput.value;
  if (!approvalDateStr) {
    durationInput.value = "";
    return;
  }

  const approvalDate = new Date(approvalDateStr);
  const today = new Date();
  const diffTime = today - approvalDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  durationInput.value = diffDays >= 0 ? diffDays : "";
}

async function savePCN() {
  const pcnData = {};

  // Save top block
  pcnInfoFields.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) {
      pcnData[field.label] = input.value.trim();
    }
  });

  // Save 3 column blocks
  formStructure.forEach(section => {
    section.fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input) {
        pcnData[field.label] = input.value.trim();
      }
    });
  });

  pcnData.tcardList_Process = tcardList.Process || [];
  pcnData.tcardList_STR = tcardList.STR || [];
  pcnData.tcardList_SPCN = tcardList.SPCN || [];

  // Clean Firestore ID
  const cleanedDevice = (pcnData["Device"] ?? "").replace(/[\/\\.#$\[\]]/g, '-').trim();
  const cleanedIssueDate = (pcnData["Issue Date"] ?? "").trim();
  const docId = `${cleanedIssueDate}_${cleanedDevice}`;

  try {
    await db.collection('pcn_masterlist').doc(docId).set(pcnData);

    // ✅ Update devicesy_cache
    updateDeviceSyCacheFromPCN(pcnData);

    alert('✅ PCN Saved Successfully!');
    window.location.href = "sheet8_pcnmasterlist.html";

  } catch (error) {
    console.error('❌ Error saving PCN:', error);
    alert('❌ Error saving PCN.');
  }
}

// Load for Edit Mode
if (editId) {
  loadExistingPCN(editId);
}

async function loadExistingPCN(docId) {
  try {
    const doc = await db.collection('pcn_masterlist').doc(docId).get();
    if (doc.exists) {
      const data = doc.data();

      // Fill top block
      pcnInfoFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (input && data[field.label] !== undefined) {
          input.value = data[field.label];
        }
      });

      // Fill 3 column blocks
      formStructure.forEach(section => {
        section.fields.forEach(field => {
          const input = document.getElementById(field.id);
          if (input && data[field.label] !== undefined) {
            input.value = data[field.label];
          }
        });
      });

      tcardList = {
        Process: data.tcardList_Process || [],
        STR: data.tcardList_STR || [],
        SPCN: data.tcardList_SPCN || []
      };

      ["Process", "STR", "SPCN"].forEach(key => renderTCardList(key));

      // ✅ Highlight target lot if passed from Sheet15
      const urlParams = new URLSearchParams(window.location.search);
      const lotHighlight = urlParams.get("lotNo") || "";
      if (lotHighlight) {
        setTimeout(() => {
          ["Process", "STR", "SPCN"].forEach(section => {
            const area = document.getElementById(`tcardListArea_${section}`);
            if (!area) return;
            const cards = area.querySelectorAll(".tcard-saved-row");
            cards.forEach(row => {
              if (row.textContent.includes(lotHighlight)) {
                row.scrollIntoView({ behavior: "smooth", block: "center" });
                row.style.border = "3px solid red";
                row.style.backgroundColor = "#fff3cd";
              }
            });
          });
        }, 500);
      }
    }
  } catch (error) {
    console.error('❌ Error loading PCN:', error);
  }
}

async function showRelSearchModal() {
  document.getElementById('relSearchModal').style.display = 'block';
  await populateRelSearchList();
}

async function populateRelSearchList() {
  const container = document.getElementById('relSearchList');
  container.innerHTML = "🔄 Loading...";
  try {
    const snapshot = await db.collection("schedules").get();
    container.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const relNo = data.reliabilityNumber || "(No Rel No)";
      const customer = data.customer || "";
      const pkg = data.packageName || "";

      const div = document.createElement("div");
      const purpose = data.purpose || "";
      div.textContent = `🔹 ${relNo} - ${customer} / ${pkg} / ${purpose}`;
      div.style.padding = "6px";
      div.style.borderBottom = "1px solid #ddd";
      div.style.cursor = "pointer";
      div.onclick = () => {
        document.getElementById('ReliabilityNumber').value = relNo;
        document.getElementById('relSearchModal').style.display = 'none';
      };
      container.appendChild(div);
    });
  } catch (err) {
    container.innerHTML = "❌ Failed to load reliability numbers.";
    console.error(err);
  }
}

function filterRelSearchList() {
  const input = document.getElementById('relSearchInput');
  input.oninput = () => {
    const keyword = input.value.toLowerCase();
    const items = document.getElementById('relSearchList').children;
    for (let item of items) {
      item.style.display = item.textContent.toLowerCase().includes(keyword) ? "block" : "none";
    }
  };
}

// Build
createPCNInfo();
createFormBlocks();

// ⏱️ Calculate e-CM Duration after loading
setTimeout(() => {
  calculateECMDuration();

  const approvalInput = document.getElementById("SPCNApprovalDate");
  if (approvalInput) {
    approvalInput.addEventListener("change", calculateECMDuration);
  }
}, 300);

let tcardList = {
  Process: [],
  STR: [],
  SPCN: []
};

function addTCard(sectionKey = "Process") {
  const prefix = id => document.getElementById(`${id}_${sectionKey}`)?.value.trim() || "";

  const newCard = {
    customer: prefix("tCustomer"),
    packageName: prefix("tPackage"),
    nickname: prefix("tNickname"),
    pkgSize: prefix("tSize"),
    leadNumber: prefix("tLead"),
    packageType: prefix("tType"),
    substrateVendor: prefix("tSubstrate"),
    emcType: prefix("tEMC"),
    deviceNo: prefix("tDevice"),
    lotNo: prefix("tLot")
  };

  if (!newCard.customer || !newCard.deviceNo || !newCard.lotNo) {
    if (sectionKey === "STR" || sectionKey === "SPCN") {
      alert("Customer, Device No, and Lot No are required.");
    }
    return;
  }  

  if (!tcardList[sectionKey]) tcardList[sectionKey] = [];
  tcardList[sectionKey].push(newCard);
  renderTCardList(sectionKey);
  clearTCardInputs(sectionKey);
}

function renderTCardList(sectionKey = "Process") {
  const container = document.getElementById(`tcardListArea_${sectionKey}`);
  if (!container) return;

  container.innerHTML = "";
  const list = tcardList[sectionKey] || [];

  list.forEach((card, index) => {
    const row = document.createElement("div");
    row.className = "tcard-saved-row";

    const info = document.createElement("div");
    info.className = "tcard-saved-info";
    info.textContent =
      `${card.customer}  ${card.packageName}  ${card.nickname}  ` +
      `Lot: ${card.lotNo}  PKG: ${card.pkgSize}  Lead: ${card.leadNumber}  ` +
      `Type: ${card.packageType}  Substrate: ${card.substrateVendor}  EMC: ${card.emcType}`;

    const actions = document.createElement("div");
    actions.className = "tcard-saved-actions";
    actions.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="table-button" style="height: 32px;" onclick="editTCard('${sectionKey}', ${index})">✏️</button>
        <button class="table-button" style="height: 32px;" onclick="deleteTCard('${sectionKey}', ${index})">🗑️</button>
        <button class="table-button" style="height: 32px;" title="Go to Sheet15"
          onclick="goToSheet15FromPCN('${card.lotNo}', '${card.substrateVendor}', '${card.emcType}', '${sectionKey}')">🔗</button>
      </div>
    `;

    row.appendChild(info);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function goToSheet15FromPCN(lot, vendor, emc, sectionKey) {
  localStorage.setItem("highlightLot", lot || "");
  localStorage.setItem("highlightSubstrate", vendor || "");
  localStorage.setItem("highlightEMC", emc || "");
  localStorage.setItem("highlightSource", "PCN");
  window.location.href = "sheet15_devicesy.html";
}

function clearTCardInputs(sectionKey = "Process") {
  const fields = ["Customer", "Package", "Nickname", "Size", "Lead", "Type", "Substrate", "EMC", "Device", "Lot"];
  fields.forEach(id => {
    const input = document.getElementById(`t${id}_${sectionKey}`);
    if (input) input.value = "";
  });
}

function editTCard(sectionKey, index) {
  const card = tcardList[sectionKey][index];

  document.getElementById(`tCustomer_${sectionKey}`).value = card.customer;
  document.getElementById(`tPackage_${sectionKey}`).value = card.packageName;
  document.getElementById(`tNickname_${sectionKey}`).value = card.nickname;
  document.getElementById(`tSize_${sectionKey}`).value = card.pkgSize;
  document.getElementById(`tLead_${sectionKey}`).value = card.leadNumber;
  document.getElementById(`tType_${sectionKey}`).value = card.packageType;
  document.getElementById(`tSubstrate_${sectionKey}`).value = card.substrateVendor;
  document.getElementById(`tEMC_${sectionKey}`).value = card.emcType;
  document.getElementById(`tDevice_${sectionKey}`).value = card.deviceNo;
  document.getElementById(`tLot_${sectionKey}`).value = card.lotNo;

  tcardList[sectionKey].splice(index, 1);
  renderTCardList(sectionKey);
}

function deleteTCard(sectionKey, index) {
  if (confirm("Delete this T-Card entry?")) {
    tcardList[sectionKey].splice(index, 1);
    renderTCardList(sectionKey);
  }
}

async function searchFromSheet15() {
  const lotNo = document.getElementById("tLot").value.trim();
  if (!lotNo) {
    alert("Please enter Lot No first.");
    return;
  }

  try {
    const snapshot = await db.collection("devicesystem_list")
      .where("lotNo", "==", lotNo)
      .limit(1)
      .get();

    if (snapshot.empty) {
      alert("❌ No matching Lot No found in Sheet15.");
      return;
    }

    const data = snapshot.docs[0].data();

    // Fill matching T-Card fields
    document.getElementById("tCustomer").value = data.customer || "";
    document.getElementById("tPackage").value = data.packageName || "";
    document.getElementById("tNickname").value = data.nickname || "";
    document.getElementById("tSize").value = data.pkgSize || "";
    document.getElementById("tLead").value = data.leadNumber || "";
    document.getElementById("tType").value = data.packageType || "";
    document.getElementById("tSubstrate").value = data.substrateVendor || "";
    document.getElementById("tEMC").value = data.emcType || "";

    alert("✅ T-Card fields loaded from Sheet15.");
  } catch (error) {
    console.error("Error searching Sheet15:", error);
    alert("❌ Failed to search Sheet15.");
  }
}

let currentTCardSection = "Process"; // default fallback

function showLotSearchModal(button) {
  currentTCardSection = button.getAttribute("data-section") || "Process";
  document.getElementById("lotSearchModal").style.display = "block";
  loadUnifiedLotList();
}

function loadUnifiedLotList() {
  const tbody = document.getElementById("lotSearchResults");
  tbody.innerHTML = "<tr><td colspan='12'>Loading...</td></tr>";

  Promise.all([
    db.collection("device_list").get(),
    db.collection("devicesy_cache").get()
  ]).then(([deviceSnap, cacheSnap]) => {
    const deviceList = deviceSnap.docs.map(doc => {
      const d = doc.data();
      return {
        customer: d.customer || "-",
        packageName: d.packageName || "-",
        nickname: d.nickname || "-",
        pkgSize: d.pkgSize || "-",
        leadNumber: d.leadNumber || "-",
        packageType: d.packageType || "-",
        substrateVendor: d.substrateVendor || "-",
        emcType: d.emcType || "-",
        lotNo: d.lotNo || "-",
        deviceNo: d.deviceNo || "-",
        source: d.source || "Device List"
      };
    });

    const cacheList = cacheSnap.docs.map(doc => {
      const d = doc.data();
      return {
        customer: d.customer || "-",
        packageName: d.packageName || "-",
        nickname: d.nickname || "-",
        pkgSize: d.pkgSize || "-",
        leadNumber: d.leadNumber || "-",
        packageType: d.packageType || "-",
        substrateVendor: d.substrateVendor || "-",
        emcType: d.emcType || "-",
        lotNo: d.lotNo || "-",
        deviceNo: d.deviceNo || "-",
        source: d.source || "Cache"
      };
    });

    fullLotList = [...deviceList, ...cacheList];
    renderUnifiedLotTable(fullLotList);
    setupUnifiedLotSearch();
  });

}

function updateDeviceSyCacheFromPCN(pcnData) {
  const allCards = [
    ...(pcnData.tcardList_Process || []),
    ...(pcnData.tcardList_STR || []),
    ...(pcnData.tcardList_SPCN || [])
  ];

  allCards.forEach(card => {
    db.collection("devicesy_cache").doc(card.lotNo).set({
      customer: card.customer,
      packageName: card.packageName,
      nickname: card.nickname,
      pkgSize: card.pkgSize,
      leadNumber: card.leadNumber,
      packageType: card.packageType,
      substrateVendor: card.substrateVendor,
      emcType: card.emcType,
      lotNo: card.lotNo,
      deviceNo: card.deviceNo || "-",
      source: "PCN",
      updatedAt: new Date()
    });
  });
}

function flattenLotNPI(docs) {
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

function flattenLotSchedule(docs) {
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

function flattenLotFA(docs) {
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

function renderUnifiedLotTable(dataList) {
  const tbody = document.getElementById("lotSearchResults");
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
      <td>${item.source}</td>
      <td><button onclick='fillTCardFromUnified(${JSON.stringify(JSON.stringify(item))})'>✅</button></td>
    `;
    tbody.appendChild(row);
  });
}

function setupUnifiedLotSearch() {
  const input = document.getElementById("lotSearchInput");
  input.oninput = () => {
    const keyword = input.value.toLowerCase();
    const filtered = fullLotList.filter(item =>
      (item.deviceNo || "").toLowerCase().includes(keyword) ||
      (item.lotNo || "").toLowerCase().includes(keyword) ||
      (item.packageName || "").toLowerCase().includes(keyword) ||
      (item.nickname || "").toLowerCase().includes(keyword)
    );
    renderUnifiedLotTable(filtered);
  };
}

function fillTCardFromUnified(jsonString) {
  const item = JSON.parse(jsonString);
  const prefix = `t`;

  const fill = (field, value) => {
    const el = document.getElementById(`${prefix}${field}_${currentTCardSection}`);
    if (el) el.value = value || "";
  };

  fill("Customer", item.customer);
  fill("Package", item.packageName);
  fill("Nickname", item.nickname);
  fill("Size", item.pkgSize);
  fill("Lead", item.leadNumber);
  fill("Type", item.packageType);
  fill("Substrate", item.substrateVendor);
  fill("EMC", item.emcType);
  fill("Device", item.deviceNo);
  fill("Lot", item.lotNo);

  document.getElementById("lotSearchModal").style.display = "none";
}
