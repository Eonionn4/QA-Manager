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

let currentFTResultID = null;

function renderFTTable(jsonData, filename, index) {
  const container = document.getElementById("ftTableList");

  const fixedHeaderOrder = [
    "Device", "Assy Lot#", "Sub.", "EMC", "FT Lot#", "Rel Status", "Qty",
    "Bin1", "Bin2", "Bin3", "Bin4", "Bin5", "Bin6",
    "Rej", "Yield", "Ship to FT", "Ship back to SCK", "Remark"
  ];

  const tableWrapper = document.createElement("div");
  tableWrapper.style.marginBottom = "30px";
  tableWrapper.style.border = "1px solid #ccc";
  tableWrapper.style.padding = "10px";
  tableWrapper.style.borderRadius = "8px";
  tableWrapper.style.position = "relative";

  const title = document.createElement("h4");
  title.textContent = filename || `Imported Table ${index + 1}`;
  tableWrapper.appendChild(title);

  // ✅ Export Excel Button
  const exportBtn = document.createElement("button");
  exportBtn.innerHTML = "📤 Export Excel";
  exportBtn.className = "cool-export-btn";
  exportBtn.style.position = "absolute";
  exportBtn.style.top = "10px";
  exportBtn.style.right = "130px";
  exportBtn.onclick = () => {
    try {
      const exportHeader = fixedHeaderOrder;
      const exportData = [exportHeader];

      jsonData.forEach(row => {
        const rowArray = fixedHeaderOrder.map(key => row[key] || "");
        exportData.push(rowArray);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "FT Table");

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
      const exportFileName = `${filename || `FT_Table_${index + 1}`}.xlsx`;
      XLSX.writeFile(workbook, exportFileName);
    } catch (err) {
      alert("❌ Failed to export this FT table.");
      console.error(err);
    }
  };
  tableWrapper.appendChild(exportBtn);

  // ❌ Delete Button
  const deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = "❌ Delete Table";
  deleteBtn.className = "cool-delete-btn";
  deleteBtn.style.position = "absolute";
  deleteBtn.style.top = "10px";
  deleteBtn.style.right = "10px";
  deleteBtn.onclick = () => {
    if (confirm("Delete this imported table?")) {
      window.currentImportedFTTableList.splice(index, 1);
      saveImportedFTTables();
      reloadFTTables();
    }
  };
  tableWrapper.appendChild(deleteBtn);

  // Table Construction
  const table = document.createElement("table");
  table.border = "1";
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.marginTop = "10px";

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  if (jsonData.length === 0) return;

  const headerRow = document.createElement("tr");
  fixedHeaderOrder.forEach(key => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  jsonData.forEach(rowData => {
    const tr = document.createElement("tr");
    fixedHeaderOrder.forEach(key => {
      const td = document.createElement("td");
      let value = rowData[key];

      if (key === "Yield" && typeof value === "number") {
        td.textContent = Math.round(value * 100) + "%";
      } else if ((key === "Ship to FT" || key === "Ship back to SCK") && !isNaN(value)) {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
          td.textContent = `${date.m}/${date.d}`;
        } else {
          td.textContent = value || "";
        }
      } else {
        td.textContent = value || "";
      }

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
}

window.addEventListener('DOMContentLoaded', async () => {
  const reliabilityInput = document.getElementById("reliabilityCriteria");
  const binQtyInput = document.getElementById("binQty");
  const saveButton = document.getElementById("saveButton");
  const exportButton = document.getElementById("exportButton");

  currentFTResultID = localStorage.getItem("currentFTResultID");
  if (!currentFTResultID) {
    alert("No FT Result ID found. Please go back to Master List.");
    window.location.href = "sheet1_masterlist.html";
    return;
  }

  saveButton.addEventListener("click", async () => {
    if (!window.currentImportedFTTableList || window.currentImportedFTTableList.length === 0) {
      alert("No FT Report tables to save.");
      return;
    }
  
    try {
      const saveData = {
        importedFTReportList: window.currentImportedFTTableList,
        createdAt: new Date()
      };
  
      await db.collection("ftResults").doc(currentFTResultID).set(saveData, { merge: true });
  
      alert("✅ FT Result saved successfully.");
      window.location.href = "sheet1_masterlist.html";
    } catch (error) {
      console.error("Error saving FT Result:", error);
      alert("Failed to save FT Result.");
    }
  });

  exportButton.addEventListener("click", async () => {
    const criteria = reliabilityInput.value.trim();
    const binQty = parseInt(binQtyInput.value);
  
    if (!criteria || isNaN(binQty) || binQty <= 0) {
      alert("Please fill in both fields correctly before export.");
      return;
    }
  
    try {
      const scheduleDoc = await db.collection("schedules").doc(currentFTResultID).get();
      if (!scheduleDoc.exists) {
        alert("Schedule not found.");
        return;
      }
  
      const scheduleData = scheduleDoc.data();
      const tcardList = scheduleData.tcardList || [];
  
      if (tcardList.length === 0) {
        alert("No T-Card data found for this schedule.");
        return;
      }
  
      const exportHeader = [
        "Device", "Assy Lot#", "Sub.", "EMC", "FT Lot#", "Rel Status", "Qty",
        ...Array.from({ length: binQty }, (_, i) => `Bin${i + 1}`),
        "Rej", "Yield", "Ship to FT", "Ship back to SCK", "Remark"
      ];
  
      const exportData = [exportHeader];
  
      tcardList.forEach((tcard, idx) => {
        const startCol = 72 + 1; // H (Bin1) + 1 → I (Bin2)
        const endCol = 72 + binQty; // H + binQty → last Bin column
  
        const startColLetter = String.fromCharCode(startCol);
        const endColLetter = String.fromCharCode(endCol);
  
        const currentRow = idx + 2; // Correct: Row2 = first T-Card
  
        const binColumns = Array(binQty).fill("");
  
        const row = [
          scheduleData.packageName || "",
          tcard.lotNumber || "",
          tcard.substrateVendor || "",
          tcard.emcType || "",
          "", // FT Lot#
          tcard.relPurpose || "",
          tcard.sampleSize || "",
          ...binColumns,
          { f: `SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` },
          { f: `TEXT(1-(${String.fromCharCode(endCol + 1)}${currentRow}/${String.fromCharCode(71)}${currentRow}), "0.00%")` },
          { f: `TEXT("", "m/d")` }, // Ship to FT (ready for manual input)
          { f: `TEXT("", "m/d")` }, // Ship back to SCK (ready for manual input)
          ""  // Remark
        ];
        exportData.push(row);
      });
  
      const worksheet = XLSX.utils.aoa_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "FT Report");
  
      const today = new Date().toISOString().split('T')[0];
      const safeCriteria = criteria.replace(/\s+/g, "_");
      const filename = `${safeCriteria}_FT_Report_${today}.xlsx`;
      XLSX.writeFile(workbook, filename);      
  
      alert("✅ FT Report exported successfully.");
    } catch (error) {
      console.error("Error exporting FT report:", error);
      alert("Failed to export FT report.");
    }
  });
  
  const importFile = document.getElementById("importFile");
  const importButton = document.getElementById("importButton");  

  importButton.addEventListener("click", async () => {
    const file = importFile.files[0];
    if (!file) {
      alert("Please select a file first.");
      return;
    }
  
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  
        if (!window.currentImportedFTTableList) {
          window.currentImportedFTTableList = [];
        }
  
        const fileNameOnly = file.name.replace(/\.[^/.]+$/, ""); // Remove extension like .xlsx
  
        const existingIndex = window.currentImportedFTTableList.findIndex(item => item.filename === fileNameOnly);
  
        if (existingIndex !== -1) {
          window.currentImportedFTTableList[existingIndex].table = json; // 🛠 Revise existing
        } else {
          window.currentImportedFTTableList.push({ filename: fileNameOnly, table: json }); // 🛠 New
        }
  
        // 🛠 Sort by filename ascending
        window.currentImportedFTTableList.sort((a, b) => a.filename.localeCompare(b.filename));
  
        saveImportedFTTables();
        reloadFTTables();
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error importing Excel:", error);
      alert("Failed to import FT Report.");
    }
  });

  try {
    const ftResultDoc = await db.collection("ftResults").doc(currentFTResultID).get();
    if (ftResultDoc.exists) {
      const ftData = ftResultDoc.data();
      if (ftData.importedFTReportList) {
        window.currentImportedFTTableList = [];
  
        ftData.importedFTReportList.forEach((item, idx) => {
          if (Array.isArray(item)) {
            // 🛠 Old format: simple array
            window.currentImportedFTTableList.push({ filename: `Imported Table ${idx + 1}`, table: item });
          } else {
            // 🛠 New format: object with filename + table
            window.currentImportedFTTableList.push(item);
          }
        });
  
        reloadFTTables(); // 🛠 Render all tables
      }
    }
  } catch (error) {
    console.error("Error loading FT Result tables:", error);
  }
});

function saveImportedFTTables() {
  const criteriaInput = document.getElementById("reliabilityCriteria");
  const binQtyInput = document.getElementById("binQty");

  const criteria = criteriaInput.value.trim();
  const binQty = parseInt(binQtyInput.value);

  const saveData = {
    reliabilityCriteria: criteria,
    binQty: binQty,
    createdAt: new Date(),
    importedFTReportList: window.currentImportedFTTableList
  };

  db.collection("ftResults").doc(currentFTResultID).set(saveData, { merge: true });
}

function reloadFTTables() {
  const container = document.getElementById("ftTableList");
  container.innerHTML = "";

  if (window.currentImportedFTTableList && window.currentImportedFTTableList.length > 0) {
    window.currentImportedFTTableList.forEach((item, idx) => {
      renderFTTable(item.table, item.filename, idx);
    });
  }
}
