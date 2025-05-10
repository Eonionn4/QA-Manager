// ✅ Firebase Initialization (Compat Version)
const firebaseConfig = {
  apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
  authDomain: "reliability-program.firebaseapp.com",
  projectId: "reliability-program",
  storageBucket: "reliability-program.firebasestorage.app",
  messagingSenderId: "954792974445",
  appId: "1:954792974445:web:7b39d5a876300167d68764",
  measurementId: "G-BES706G2PR"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let tCards = [];
let _editTCardIndex = null;

function clearTCardInputs() {
  document.getElementById("lotNumber").value = "";
  document.getElementById("substrateVendor").value = "";
  document.getElementById("emcType").value = "";
  document.getElementById("sampleSize").value = "";
  document.getElementById("relPurpose").value = "";
}

// ✅ Add this helper function here:
function escapeId(id) {
  return CSS.escape(id);
}

function loadTestItems(filter = "") {
  const container = document.getElementById("testList");
  container.innerHTML = "";

  db.collection("testItems").get().then(snapshot => {
    snapshot.forEach(doc => {
      const item = doc.data();
      const label = `${item.criteria} (${item.duration || "-"} days)`;

      if (!filter || label.toLowerCase().includes(filter.toLowerCase())) {
        const div = document.createElement("div");
        div.className = "test-card";
        div.draggable = true;
        div.textContent = label;

        div.addEventListener("dragstart", e => {
          div.classList.add("dragging");
          e.dataTransfer.setData("text/plain", JSON.stringify(item));
        });
        div.addEventListener("dragend", () => div.classList.remove("dragging"));

        container.appendChild(div);
      }
    });
  });
}

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
      <td><button onclick='fillMainForm(${JSON.stringify(JSON.stringify(item))})'>✅</button></td>
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

function fillMainForm(jsonString) {
  const item = JSON.parse(jsonString);
  document.getElementById("customer").value = item.customer;
  document.getElementById("packageName").value = item.packageName;
  document.getElementById("nickname").value = item.nickname;
  document.getElementById("pkgSize").value = item.pkgSize;
  document.getElementById("leadNumber").value = item.leadNumber;
  document.getElementById("packageType").value = item.packageType;
  document.getElementById("substrateVendor").value = item.substrateVendor;
  document.getElementById("emcType").value = item.emcType;
  document.getElementById("lotNumber").value = item.lotNo;
  closeDeviceSySearch();
}

function renderDroppedCards(areaId) {
  const dropZone = document.getElementById(`drop_${areaId}`);
  dropZone.innerHTML = "";

  const dropList = droppedDataMap[areaId] || [];
  const startDateValue = document.getElementById("startDate").value;
  const baseDate = startDateValue ? new Date(startDateValue) : new Date();

  // ✅ Precompute Plan In/Out for each item
  dropList.forEach((item, index) => {
    let planIn = new Date(baseDate);

    // Inherit from Preconditioning's last Plan Out if applicable
    if (areaId !== 'preconditioning' && droppedDataMap["preconditioning"]?.length > 0) {
      const preList = droppedDataMap["preconditioning"];
      const last = preList[preList.length - 1];
      if (last?.planOut) {
        planIn = new Date(last.planOut);
      } else {
        const fallback = new Date(baseDate);
        preList.forEach(p => {
          const d = parseInt(p.duration) || 0;
          fallback.setDate(fallback.getDate() + d);
        });
        planIn = fallback;
      }
    }

    // Shift based on previous items in same area
    for (let i = 0; i < index; i++) {
      const prevDur = parseInt(dropList[i].duration) || 0;
      planIn.setDate(planIn.getDate() + prevDur);
    }

    const planOut = new Date(planIn);
    const currDur = parseInt(item.duration) || 0;
    planOut.setDate(planIn.getDate() + currDur);

    item._calculatedPlanIn = planIn;
    item._calculatedPlanOut = planOut;
  });

  dropList.forEach((item, index) => {
    const planIn = new Date(item._calculatedPlanIn);
    const planOut = new Date(item._calculatedPlanOut);

    const card = document.createElement("div");
    card.className = "test-card";
    card.draggable = true;

    card.innerHTML = `
      <div><strong>${item.criteria}</strong> (${item.duration || "-"} days)</div>
      <div>Plan In: ${planIn.toISOString().split('T')[0]}</div>
      <div>Plan Out: ${planOut.toISOString().split('T')[0]}</div>
      <div>
        Actual In: <input type="date" class="actual-in" data-index="${index}" value="${item.actualIn || ""}" />
        Actual Out: <input type="date" class="actual-out" data-index="${index}" value="${item.actualOut || ""}" />
      </div>
      <div class="violation" id="violation_in_${areaId}_${index}" style="color:red;"></div>
      <div class="violation" id="violation_out_${areaId}_${index}" style="color:red;"></div>
      <div class="actual-duration" id="duration_${areaId}_${index}">Actual Duration: -</div>
      <button class="delete-btn" data-index="${index}" style="margin-top: 4px;">❌ Delete</button>
    `;

    card.addEventListener("dragstart", e => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", JSON.stringify(item));
      e.dataTransfer.effectAllowed = "copyMove";
    });

    card.addEventListener("dragend", () => card.classList.remove("dragging"));

    card.querySelector(".actual-in").addEventListener("change", updateStatus);
    card.querySelector(".actual-out").addEventListener("change", updateStatus);

    card.querySelector(".delete-btn").addEventListener("click", () => {
      dropList.splice(index, 1);
      renderDroppedCards(areaId);
    });

    dropZone.appendChild(card);
  });

  updateStatus();

  // ✅ Corrected updateStatus using precomputed planIn/planOut
  function updateStatus() {
    dropList.forEach((item, index) => {
      const inInput = dropZone.querySelector(`.actual-in[data-index="${index}"]`);
      const outInput = dropZone.querySelector(`.actual-out[data-index="${index}"]`);
      const inValue = inInput ? inInput.value : "";
      const outValue = outInput ? outInput.value : "";

      const violationIn = dropZone.querySelector(`#${escapeId(`violation_in_${areaId}_${index}`)}`);
      const violationOut = dropZone.querySelector(`#${escapeId(`violation_out_${areaId}_${index}`)}`);
      const durationLabel = dropZone.querySelector(`#${escapeId(`duration_${areaId}_${index}`)}`);

      const today = new Date();
      today.setHours(0, 0, 0, 0); // normalize

      const planInDate = new Date(item._calculatedPlanIn);
      planInDate.setHours(0, 0, 0, 0);

      const planOutDate = new Date(item._calculatedPlanOut);
      planOutDate.setHours(0, 0, 0, 0);

      // ✅ Input Violation Check
      if (violationIn) {
        violationIn.textContent = (!inValue && today > planInDate)
          ? "⚠️ Input Violation: Actual In not entered"
          : "";
      }

      // ✅ Output Violation Check
      if (violationOut) {
        violationOut.textContent = (!outValue && today > planOutDate)
          ? "⚠️ Test Out Violation: Actual Out not entered"
          : "";
      }

      // ✅ Duration Calculation
      if (durationLabel) {
        if (inValue && outValue) {
          const d1 = new Date(inValue);
          const d2 = new Date(outValue);
          const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
          durationLabel.textContent = `Actual Duration: ${diff} days`;
        } else {
          durationLabel.textContent = `Actual Duration: -`;
        }
      }
    });
  }
}

function applyScheduleAreaData(data) {
  if (data.scheduleDroppedTests) {
    // Step 1: Populate droppedDataMap first
    Object.entries(data.scheduleDroppedTests).forEach(([areaId, list]) => {
      droppedDataMap[areaId] = list;
    });

    // Step 2: Render all areas AFTER everything is assigned
    Object.keys(droppedDataMap).forEach(areaId => {
      if (document.getElementById(`drop_${areaId}`)) {
        renderDroppedCards(areaId);
      }
    });
  }

  if (data.areaStatus) {
    Object.entries(data.areaStatus).forEach(([areaId, isOpen]) => {
      const wrapper = document.getElementById(`wrapper_${areaId}`);
      if (wrapper) {
        wrapper.style.display = isOpen ? "block" : "none";
      }
    });
  }
}

const saveBtn = document.getElementById("saveBtn");
const reviseBtn = document.getElementById("reviseBtn");
const addTCardBtn = document.getElementById("addTCard");
const tcardListEl = document.getElementById("tcardList");

addTCardBtn.addEventListener("click", async () => {
  const relPurpose = document.getElementById("relPurpose").value.trim();
  if (!relPurpose) return alert("⚠️ Please enter Reliability Purpose");

  const tcard = {
    lotNumber: document.getElementById("lotNumber").value,
    substrateVendor: document.getElementById("substrateVendor").value,
    emcType: document.getElementById("emcType").value,
    sampleSize: document.getElementById("sampleSize").value,
    relPurpose
  };

  const newAreaId = relPurpose.toLowerCase().replace(/\s+/g, '-');

  if (_editTCardIndex !== null) {
    const oldPurpose = tCards[_editTCardIndex].relPurpose;
    const oldAreaId = oldPurpose.toLowerCase().replace(/\s+/g, '-');

    // ✅ Revise existing
    tCards[_editTCardIndex] = tcard;
    _editTCardIndex = null;
    addTCardBtn.textContent = "➕ Add T-Card";

    // 🔁 If the purpose has changed:
    if (oldAreaId !== newAreaId) {
      // Remove old area if no other T-Cards use it
      const stillUsed = tCards.some(t => t.relPurpose === oldPurpose);
      if (!stillUsed) {
        const wrapper = document.getElementById(`wrapper_${oldAreaId}`);
        const button = Array.from(document.querySelectorAll(".schedule-area-button"))
          .find(btn => btn.textContent === oldPurpose);
        if (wrapper) wrapper.remove();
        if (button) button.remove();
        delete droppedDataMap[oldAreaId];
      }

      // Save new area to Firestore if it doesn't exist
      const areaDoc = await db.collection("scheduleItems").doc(newAreaId).get();
      if (!areaDoc.exists) {
        await db.collection("scheduleItems").doc(newAreaId).set({ id: newAreaId, name: relPurpose });
      }

      // Create new area in UI if not already there
      const existingWrapper = document.getElementById(`wrapper_${newAreaId}`);
      if (!existingWrapper) {
        const scheduleAreaList = document.getElementById("scheduleAreas");
        const rightArea = document.getElementById("rightArea");

        const areaButton = document.createElement("div");
        areaButton.className = "schedule-area-button";
        areaButton.textContent = relPurpose;
        areaButton.style.cursor = "pointer";
        scheduleAreaList.appendChild(areaButton);

        const wrapper = document.createElement("div");
        wrapper.className = "area-wrapper";
        wrapper.id = `wrapper_${newAreaId}`;
        wrapper.style.display = "block";

        const title = document.createElement("h4");
        title.textContent = `Schedule Area: ${relPurpose}`;

        const dropZone = document.createElement("div");
        dropZone.className = "drop-target";
        dropZone.id = `drop_${newAreaId}`;
        dropZone.ondragover = e => e.preventDefault();
        dropZone.ondrop = e => onDropToSchedule(e, newAreaId);

        wrapper.appendChild(title);
        wrapper.appendChild(dropZone);
        rightArea.appendChild(wrapper);

        areaButton.addEventListener("click", () => {
          wrapper.style.display = wrapper.style.display === "none" ? "block" : "none";
          renderDroppedCards(newAreaId);
        });

        if (!droppedDataMap[newAreaId]) droppedDataMap[newAreaId] = [];
      }
    }
  } else {
    // ✅ Add new T-Card
    tCards.push(tcard);

    const areaDoc = await db.collection("scheduleItems").doc(newAreaId).get();
    if (!areaDoc.exists) {
      await db.collection("scheduleItems").doc(newAreaId).set({ id: newAreaId, name: relPurpose });
    }

    const existingWrapper = document.getElementById(`wrapper_${newAreaId}`);
    if (!existingWrapper) {
      const scheduleAreaList = document.getElementById("scheduleAreas");
      const rightArea = document.getElementById("rightArea");

      const areaButton = document.createElement("div");
      areaButton.className = "schedule-area-button";
      areaButton.textContent = relPurpose;
      areaButton.style.cursor = "pointer";
      scheduleAreaList.appendChild(areaButton);

      const wrapper = document.createElement("div");
      wrapper.className = "area-wrapper";
      wrapper.id = `wrapper_${newAreaId}`;
      wrapper.style.display = "block";

      const title = document.createElement("h4");
      title.textContent = `Schedule Area: ${relPurpose}`;

      const dropZone = document.createElement("div");
      dropZone.className = "drop-target";
      dropZone.id = `drop_${newAreaId}`;
      dropZone.ondragover = e => e.preventDefault();
      dropZone.ondrop = e => onDropToSchedule(e, newAreaId);

      wrapper.appendChild(title);
      wrapper.appendChild(dropZone);
      rightArea.appendChild(wrapper);

      areaButton.addEventListener("click", () => {
        wrapper.style.display = wrapper.style.display === "none" ? "block" : "none";
        renderDroppedCards(newAreaId);
      });

      if (!droppedDataMap[newAreaId]) droppedDataMap[newAreaId] = [];
    }
  }

  renderTCards();
  clearTCardInputs();
});

async function loadScheduleAreas() {
  const scheduleAreaList = document.getElementById("scheduleAreas");
  const rightArea = document.getElementById("rightArea");

  scheduleAreaList.innerHTML = "";
  rightArea.innerHTML = "";

  // ✅ Always hardcode Preconditioning area first
  const preId = "preconditioning";
  const preName = "Preconditioning";

  const preBtn = document.createElement("div");
  preBtn.className = "schedule-area-button";
  preBtn.textContent = preName;
  preBtn.style.cursor = "pointer";
  scheduleAreaList.appendChild(preBtn);

  const preWrapper = document.createElement("div");
  preWrapper.className = "area-wrapper";
  preWrapper.id = `wrapper_${preId}`;
  preWrapper.style.display = "block";

  const preTitle = document.createElement("h4");
  preTitle.textContent = `Schedule Area: ${preName}`;

  const preDrop = document.createElement("div");
  preDrop.className = "drop-target";
  preDrop.id = `drop_${preId}`;
  preDrop.ondragover = e => e.preventDefault();
  preDrop.ondrop = e => onDropToSchedule(e, preId);

  preWrapper.appendChild(preTitle);
  preWrapper.appendChild(preDrop);
  rightArea.appendChild(preWrapper);

  preBtn.addEventListener("click", () => {
    preWrapper.style.display = preWrapper.style.display === "none" ? "block" : "none";
    renderDroppedCards(preId);
  });

  if (!droppedDataMap[preId]) {
    droppedDataMap[preId] = [];
  }

  // ✅ Load only schedule areas used by this schedule’s T-Cards
  const tcardPurposes = (window._scheduleEditData?.tcardList || [])
    .map(t => (t.relPurpose || "").toLowerCase().trim())
    .filter(Boolean);

  const snapshot = await db.collection("scheduleItems").get();
  const areaDocs = snapshot.docs
    .map(doc => doc.data())
    .filter(item => {
      const name = item.name.toLowerCase();
      return name !== "preconditioning" && tcardPurposes.includes(name);
    });

  areaDocs.forEach(item => {
    const id = item.id;

    const areaButton = document.createElement("div");
    areaButton.className = "schedule-area-button";
    areaButton.textContent = item.name;
    areaButton.style.cursor = "pointer";
    scheduleAreaList.appendChild(areaButton);

    const wrapper = document.createElement("div");
    wrapper.className = "area-wrapper";
    wrapper.id = `wrapper_${id}`;
    wrapper.style.display = "none";

    const title = document.createElement("h4");
    title.textContent = `Schedule Area: ${item.name}`;

    const dropZone = document.createElement("div");
    dropZone.className = "drop-target";
    dropZone.id = `drop_${id}`;
    dropZone.ondragover = e => e.preventDefault();
    dropZone.ondrop = e => onDropToSchedule(e, id);

    wrapper.appendChild(title);
    wrapper.appendChild(dropZone);
    rightArea.appendChild(wrapper);

    areaButton.addEventListener("click", () => {
      wrapper.style.display = wrapper.style.display === "none" ? "block" : "none";
      renderDroppedCards(id);
    });

    if (!droppedDataMap[id]) droppedDataMap[id] = [];
  });

  // ✅ Filter functionality
  document.getElementById("searchScheduleAreas").addEventListener("input", e => {
    const keyword = e.target.value.toLowerCase();
    const allButtons = document.querySelectorAll("#scheduleAreas .schedule-area-button");
    allButtons.forEach(btn => {
      btn.style.display = btn.textContent.toLowerCase().includes(keyword) ? "block" : "none";
    });
  });
}

const droppedDataMap = {}; // { areaId: [testItems...] }

function onDropToSchedule(event, areaId) {
  event.preventDefault();
  const raw = event.dataTransfer.getData("text/plain");
  if (!raw) return;

  const draggedItem = JSON.parse(raw);

  if (!droppedDataMap[areaId]) droppedDataMap[areaId] = [];
  const dropList = droppedDataMap[areaId];
  const dropZone = document.getElementById(`drop_${areaId}`);
  const targetCard = event.target.closest(".test-card");

  let insertIndex = dropList.length;

  if (targetCard) {
    const allCards = Array.from(dropZone.querySelectorAll(".test-card"));
    insertIndex = allCards.indexOf(targetCard);
  }

  const fromSameArea = dropZone.contains(document.querySelector(".dragging"));

  if (fromSameArea) {
    const existingIndex = dropList.findIndex(i =>
      i.criteria === draggedItem.criteria && i.duration === draggedItem.duration
    );

    if (existingIndex !== -1) {
      const movedItem = dropList.splice(existingIndex, 1)[0];
      if (existingIndex < insertIndex) insertIndex--;
      dropList.splice(insertIndex, 0, movedItem);
    }
  } else {
    dropList.splice(insertIndex, 0, { ...draggedItem });
  }

  renderDroppedCards(areaId);
}

function renderTCards() {
  const tcardListEl = document.getElementById("tcardList");
  tcardListEl.innerHTML = "";

  tCards.forEach((card, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${card.lotNumber}</td>
      <td>${card.substrateVendor}</td>
      <td>${card.emcType}</td>
      <td>${card.sampleSize}</td>
      <td>${card.relPurpose}</td>
      <td>
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">❌</button>
        <button class="call-btn">📞</button>
        <button class="link-btn" title="Go to Sheet15" onclick="goToSheet15FromTCard('${card.lotNumber}', '${card.substrateVendor}', '${card.emcType}')">🔗</button>
      </td>
    `;

    row.querySelector(".delete-btn").onclick = () => {
      const removed = tCards.splice(index, 1)[0];
      renderTCards();

      // ✅ Check if any T-Card still uses this relPurpose
      const stillExists = tCards.some(t => t.relPurpose === removed.relPurpose);
      const areaId = removed.relPurpose.toLowerCase().replace(/\s+/g, '-');

      if (!stillExists) {
        // Remove from DOM
        const wrapper = document.getElementById(`wrapper_${areaId}`);
        const button = Array.from(document.querySelectorAll(".schedule-area-button"))
          .find(btn => btn.textContent === removed.relPurpose);
        if (wrapper) wrapper.remove();
        if (button) button.remove();

        // Remove from droppedDataMap
        delete droppedDataMap[areaId];
      }
    };

    // Call button functionality
    row.querySelector(".call-btn").onclick = () => {
      document.getElementById("lotNumber").value = card.lotNumber || "";
      document.getElementById("substrateVendor").value = card.substrateVendor || "";
      document.getElementById("emcType").value = card.emcType || "";
      document.getElementById("sampleSize").value = card.sampleSize || "";
      document.getElementById("relPurpose").value = card.relPurpose || "";
    };

    // Edit button functionality
    row.querySelector(".edit-btn").onclick = () => {
      _editTCardIndex = index;
      document.getElementById("lotNumber").value = card.lotNumber || "";
      document.getElementById("substrateVendor").value = card.substrateVendor || "";
      document.getElementById("emcType").value = card.emcType || "";
      document.getElementById("sampleSize").value = card.sampleSize || "";
      document.getElementById("relPurpose").value = card.relPurpose || "";
      addTCardBtn.textContent = "🔄 Revise T-Card";
    };

    tcardListEl.appendChild(row);
  });
}

async function saveScheduleToFirestore(isNew = false) {
  const reliabilityNumber = document.getElementById("relNum").value.trim();
  const id = isNew ? window._currentEditDocId : reliabilityNumber;

  const startDateValue = document.getElementById("startDate").value;
  const baseDate = startDateValue ? new Date(startDateValue) : new Date();

  const updatedDroppedDataMap = {};

  Object.keys(droppedDataMap).forEach(areaId => {
    const dropZone = document.getElementById(`drop_${areaId}`);
    const dropList = droppedDataMap[areaId];
    const updatedList = [];

    let planInDate = new Date(baseDate);

    // If not "preconditioning", adjust based on Preconditioning's last planOut
    if (areaId !== "preconditioning" && updatedDroppedDataMap["preconditioning"]?.length > 0) {
      const precondList = updatedDroppedDataMap["preconditioning"];
      const lastPreOutStr = precondList[precondList.length - 1].planOut;
      planInDate = new Date(lastPreOutStr);
    }

    // ✅ Null check for dropZone to avoid crashes
    if (!dropZone) {
      console.warn(`⚠️ Drop zone not found for '${areaId}'. Skipping.`);
      updatedDroppedDataMap[areaId] = dropList; // Save raw dropList anyway
      return;
    }

    [...dropZone.children].forEach((cardElement, index) => {
      const item = dropList[index];
      const planDuration = parseInt(item.duration) || 0;

      const planIn = new Date(planInDate);
      const planOut = new Date(planInDate);
      planOut.setDate(planIn.getDate() + planDuration);

      const actualInInput = cardElement.querySelector(".actual-in");
      const actualOutInput = cardElement.querySelector(".actual-out");

      const actualIn = actualInInput ? actualInInput.value : "";
      const actualOut = actualOutInput ? actualOutInput.value : "";

      let actualDuration = "";
      if (actualIn && actualOut) {
        const d1 = new Date(actualIn);
        const d2 = new Date(actualOut);
        actualDuration = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
      }

      updatedList.push({
        ...item,
        planIn: planIn.toISOString().split('T')[0],
        planOut: planOut.toISOString().split('T')[0],
        planDuration: planDuration,
        actualIn: actualIn,
        actualOut: actualOut,
        actualDuration: actualDuration
      });

      // Move planIn forward
      planInDate = new Date(planOut);
    });

    updatedDroppedDataMap[areaId] = updatedList;
  });

  // Save which schedule areas are open
  const areaStatus = {};
  Object.keys(droppedDataMap).forEach(areaId => {
    const wrapper = document.getElementById(`wrapper_${areaId}`);
    if (wrapper) {
      areaStatus[areaId] = wrapper.style.display === "block";
    }
  });

  const data = {
    id,
    reliabilityNumber,
    customer: document.getElementById("customer").value,
    packageName: document.getElementById("packageName").value,
    nickname: document.getElementById("nickname").value,
    packageType: document.getElementById("packageType").value,
    pkgSize: document.getElementById("pkgSize").value,
    leadNumber: document.getElementById("leadNumber").value,
    runNumber: document.getElementById("runNumber").value,
    purpose: document.getElementById("purpose").value,
    startDate: document.getElementById("startDate").value,
    tcardList: tCards,
    scheduleDroppedTests: updatedDroppedDataMap,
    areaStatus
  };

  try {
    await db.collection("schedules").doc(id).set(data);
    alert(isNew ? "✅ New schedule saved!" : "✅ Schedule revised!");
    window.location.href = "sheet1_masterlist.html";
  } catch (e) {
    console.error("❌ Firestore save error:", e);
    alert("❌ Failed to save.");
  }
}

saveBtn.addEventListener("click", async () => {
  const uniqueId = Date.now().toString();
  window._currentEditDocId = uniqueId; // ✅ new unique ID
  await saveScheduleToFirestore(true); // pass isNew flag
});

reviseBtn.addEventListener("click", saveScheduleToFirestore);

// ✅ Load Previous Data If Editing
async function loadScheduleForEdit(id) {
  try {
    const docSnap = await db.collection("schedules").doc(id).get();
    if (!docSnap.exists) return;

    const data = docSnap.data();

    document.getElementById("relNum").value = data.reliabilityNumber || "";
    document.getElementById("customer").value = data.customer || "";
    document.getElementById("packageName").value = data.packageName || "";
    document.getElementById("nickname").value = data.nickname || "";
    document.getElementById("packageType").value = data.packageType || "";
    document.getElementById("pkgSize").value = data.pkgSize || "";
    document.getElementById("leadNumber").value = data.leadNumber || "";
    document.getElementById("runNumber").value = data.runNumber || "";
    document.getElementById("purpose").value = data.purpose || "";
    document.getElementById("startDate").value = data.startDate || "";

    if (Array.isArray(data.tcardList)) {
      tCards = [...data.tcardList];
      renderTCards();
    }

    // ✅ Save for delayed use after loadScheduleAreas()
    window._scheduleEditData = data;
    window._currentEditDocId = id;

  } catch (err) {
    console.error("❌ Failed to load schedule for edit:", err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const editId = localStorage.getItem("currentEditId");
  if (editId) {
    await loadScheduleForEdit(editId);
    localStorage.removeItem("currentEditId");
  }

  await loadTestItems();
  await loadScheduleAreas();

  // ✅ Apply area drop + visibility AFTER UI is ready
  if (window._scheduleEditData) {
    applyScheduleAreaData(window._scheduleEditData);
    window._scheduleEditData = null;
  }
  // ✅ Highlight T-Card and dragged test item from Sheet15 (Rel 🛠️ link)
  const highlightLot = localStorage.getItem("highlightLot")?.toLowerCase();
  const highlightItem = localStorage.getItem("highlightTestItem")?.toLowerCase();
  const highlightSource = localStorage.getItem("highlightSource");

  if (highlightSource === "Reliability") {
    // Highlight T-Card
    const tcardRows = document.querySelectorAll("#tcardList tr");
    tcardRows.forEach(row => {
      const lotCell = row.cells[0];
      const lot = lotCell?.textContent?.trim().toLowerCase();
      if (lot === highlightLot) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.style.border = "3px solid red";
        row.style.backgroundColor = "#fff3cd";
      }
    });

    // Highlight dragged test item
    const cards = document.querySelectorAll(".test-card");
    cards.forEach(card => {
      const content = card.textContent.toLowerCase();
      if (highlightItem && content.includes(highlightItem)) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.style.border = "3px solid red";
        card.style.backgroundColor = "#fff3cd";
      }
    });

    // Clear highlight
    localStorage.removeItem("highlightLot");
    localStorage.removeItem("highlightTestItem");
    localStorage.removeItem("highlightSubstrate");
    localStorage.removeItem("highlightEMC");
    localStorage.removeItem("highlightSource");
  }

  // ✅ Added: Test Items Search
  document.getElementById("searchTestItems").addEventListener("input", e => {
    loadTestItems(e.target.value.trim());
  });
});

function goToSheet15FromTCard(lot, vendor, emc) {
  localStorage.setItem("highlightLot", lot || "");
  localStorage.setItem("highlightSubstrate", vendor || "");
  localStorage.setItem("highlightEMC", emc || "");
  localStorage.setItem("highlightSource", "Reliability");
  window.location.href = "sheet15_devicesy.html";
}
