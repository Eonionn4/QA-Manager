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

document.addEventListener("DOMContentLoaded", () => {
  loadFromFirestore(); // no keyword = load all initially

  const searchInput = document.getElementById("searchMasterList");
  searchInput.addEventListener("input", (e) => {
    loadFromFirestore(e.target.value.trim());
  });
});

async function exportItem(id) {
  try {
    const docRef = db.collection("schedules").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      alert("Schedule not found.");
      return;
    }

    const item = docSnap.data();

    const ws_data = [
      [],
      ["", "Reliability Report"], // B2
      ["", "Reliability Number", "", item.reliabilityNumber || ""],
      ["", "Customer", "", item.customer || ""],
      ["", "Package Name", "", item.packageName || ""],
      ["", "Nickname", "", item.nickname || ""],
      ["", "Package Type", "", item.packageType || ""],
      ["", "PKG Size", "", item.pkgSize || ""],
      ["", "Lead Number", "", item.leadNumber || ""],
      ["", "Run Number", "", item.runNumber || ""],
      ["", "Purpose", "", item.purpose || ""],
      ["", "Start Date", "", item.startDate || ""],
      [],
      ["", "T-Card Information"], // B14
      ["", "Lot Number", "Substrate Vendor", "EMC Type", "Sample Size", "Reliability Purpose"] // B15
    ];

    const tcardList = item.tcardList || [];

    tcardList.forEach(tcard => {
      ws_data.push([
        "",
        tcard.lotNumber || "",
        tcard.substrateVendor || "",
        tcard.emcType || "",
        tcard.sampleSize || "",
        tcard.relPurpose || ""
      ]);
    });

    // Add empty lines to reach B19
    while (ws_data.length < 18) {
      ws_data.push([]);
    }

    ws_data.push(["", "Reliability Schedule"]); // B19

    const scheduleDropped = item.scheduleDroppedTests || {};

    Object.keys(scheduleDropped).forEach(areaName => {
      ws_data.push(["", areaName]); // Bx: Schedule Area Name
      ws_data.push([
        "", 
        "No", 
        "Criteria", 
        "Plan In", 
        "Plan Out", 
        "Plan Duration", 
        "Actual In", 
        "Actual Out", 
        "Actual Duration"
      ]);

      scheduleDropped[areaName].forEach((testItem, idx) => {
        ws_data.push([
          "",
          idx + 1,
          testItem.criteria || "",
          testItem.planIn || "",
          testItem.planOut || "",
          testItem.planDuration || "",
          testItem.actualIn || "",
          testItem.actualOut || "",
          testItem.actualDuration || ""
        ]);
      });

      ws_data.push([]); // empty line between areas
    });

    const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reliability Report");
    
    const today = new Date().toISOString().split('T')[0];
    const packageName = (item.packageName || "Unknown").replace(/\s+/g, "_");
    const filename = `Reliability Report_${packageName}_${today}.xlsx`;
        
    XLSX.writeFile(workbook, filename);

    alert("✅ Reliability Report exported successfully.");
  } catch (error) {
    console.error("Error exporting Reliability Report:", error);
    alert("Failed to export Reliability Report.");
  }
}

async function loadFromFirestore(searchKeyword = "") {
  const body = document.getElementById("masterListBody");
  body.innerHTML = "";

  const loginCustomer = localStorage.getItem("loginCustomer")?.trim().toLowerCase() || "all";

  try {
    const snapshot = await db.collection("schedules").orderBy("startDate", "desc").get();
    snapshot.forEach(doc => {
      const item = doc.data();

      const itemCustomer = (item.customer || "").toLowerCase();
      if (loginCustomer !== "all" && !itemCustomer.includes(loginCustomer)) return;

      const combinedText = `
        ${item.reliabilityNumber || ""}
        ${item.customer || ""}
        ${item.packageName || ""}
        ${item.nickname || ""}
        ${item.purpose || ""}
      `.toLowerCase();
      if (searchKeyword && !combinedText.includes(searchKeyword.toLowerCase())) return;

      const violationMessages = [];

      const tcardPurposes = (item.tcardList || []).map(t => t.relPurpose?.toLowerCase().trim());

      const testListByArea = Object.entries(item.scheduleDroppedTests || {})
        .filter(([areaId]) => {
          return (
            areaId.toLowerCase().trim() === "preconditioning" || 
            tcardPurposes.includes(areaId.toLowerCase().trim())
          );
        })
        .sort(([a], [b]) => {
          if (a.toLowerCase() === "preconditioning") return -1;
          if (b.toLowerCase() === "preconditioning") return 1;
          return a.localeCompare(b);
        });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const withPreconMap = item.withPreconMap || {};

      testListByArea.forEach(([areaId, testList]) => {
        testList.forEach(test => {
          const planIn = test.planIn ? new Date(test.planIn) : null;
          const planOut = test.planOut ? new Date(test.planOut) : null;
          const actualIn = test.actualIn ? new Date(test.actualIn) : null;
          const actualOut = test.actualOut ? new Date(test.actualOut) : null;

          if (planIn) planIn.setHours(0, 0, 0, 0);
          if (planOut) planOut.setHours(0, 0, 0, 0);

          if (!actualIn && planIn && today > planIn) {
            violationMessages.push(`[${areaId}] Input violation - ${test.criteria}`);
          }

          if (!actualOut && planOut && today > planOut) {
            violationMessages.push(`[${areaId}] Test Out violation - ${test.criteria}`);
          }

          const planDuration = parseInt(test.planDuration) || 0;
          const actualDuration = parseInt(test.actualDuration) || 0;

          if (actualDuration > planDuration) {
            violationMessages.push(`[${areaId}] Duration violation - ${test.criteria}`);
          }
        });
      });

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.reliabilityNumber || ""}</td>
        <td>${item.startDate || ""}</td>
        <td>${item.customer || ""}</td>
        <td>${item.packageName || ""}</td>
        <td>${item.leadNumber || ""}</td>
        <td style="font-size: 12px; text-align: center;">
          ${(item.tcardList || []).map(t => 
            `• ${t.lotNumber || ""}, ${t.substrateVendor || ""}, ${t.emcType || ""}, ${t.sampleSize || ""}, ${t.relPurpose || ""}`
          ).join('<br>')}
        </td>
        <td>${item.purpose || ""}</td>
        <td style="color: red; font-size: 12px;">
          ${violationMessages.length > 0 ? violationMessages.join('<br>') : "-"}
        </td>
        <td>
          <button class="table-button edit-button" onclick="editItem('${doc.id}')">Edit</button>
          <button class="table-button delete-button" onclick="deleteItem('${doc.id}')">Delete</button>
          <button class="table-button export-button" onclick="exportItem('${doc.id}')">Export</button>
          <button class="table-button ftresult-button" onclick="goToFTResult('${doc.id}')">FT Result</button>
        </td>
      `;
      body.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Firestore load error:", err);
    alert("❌ Failed to load schedules.");
  }
}

function goToFTResult(id) {
  localStorage.setItem("currentFTResultID", id);
  window.location.href = "sheet6_ftresult.html";
}

function editItem(id) {
  localStorage.setItem("currentEditId", id);
  window.location.href = "sheet2_schedulemanager.html";
}

async function deleteItem(id) {
  if (!confirm("Are you sure to delete this entry?")) return;

  try {
    const docSnap = await db.collection("schedules").doc(id).get();
    if (!docSnap.exists) return;

    const deletedData = docSnap.data();
    const relPurposes = (deletedData.tcardList || [])
      .map(t => (t.relPurpose || "").toLowerCase().trim())
      .filter(Boolean);

    // Step 1: delete the schedule itself
    await db.collection("schedules").doc(id.toString()).delete();

    // Step 2: check if any other schedule uses these purposes
    const allSchedules = await db.collection("schedules").get();
    const usedPurposes = new Set();
    allSchedules.forEach(doc => {
      const tcards = doc.data().tcardList || [];
      tcards.forEach(t => {
        const p = (t.relPurpose || "").toLowerCase().trim();
        if (p) usedPurposes.add(p);
      });
    });

    // Step 3: delete unused schedule areas
    for (const purpose of relPurposes) {
      if (!usedPurposes.has(purpose)) {
        const idToDelete = purpose.toLowerCase().replace(/\s+/g, "-");
        await db.collection("scheduleItems").doc(idToDelete).delete();
      }
    }

    alert("✅ Deleted successfully");
    loadFromFirestore();
  } catch (err) {
    console.error("❌ Delete error:", err);
    alert("❌ Failed to delete");
  }
}