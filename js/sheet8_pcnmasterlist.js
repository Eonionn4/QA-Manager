// sheet8_pcnmasterlist.js

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

// DOM
const tableContainer = document.getElementById('tableContainer');

// Fields shown on Sheet8 table (still simple)
const headers = [
  "Issue Date", "Device", "Customer", "Change Description", "Purpose", "PCN Class"
];

async function loadPCNMasterList() {
  const loginCustomer = localStorage.getItem("loginCustomer")?.trim().toLowerCase() || "all";

  // 🔍 Get related keywords from localStorage
  function getRelatedCustomerKeywords(base) {
    try {
      const map = JSON.parse(localStorage.getItem("customerKeywordMap") || "{}");
      const keywords = map[base] || [];
      return [base, ...keywords].map(k => k.toLowerCase());
    } catch {
      return [base];
    }
  }

  const relatedCustomers = loginCustomer === "all" ? ["all"] : getRelatedCustomerKeywords(loginCustomer);

  try {
    const snapshot = await db.collection('pcn_masterlist').get();
    const data = snapshot.docs
      .map(doc => doc.data())
      .filter(row => {
        const customer = (row["Customer"] || "").toLowerCase();
        return loginCustomer === "all" || relatedCustomers.some(k => customer.includes(k));
      });
    
    // ✅ Sort by Issue Date descending
    data.sort((a, b) => new Date(b["Issue Date"]) - new Date(a["Issue Date"]));
    
    displayTable(data);
    
    console.log('✅ Loaded PCN Master List.');
  } catch (error) {
    console.error('❌ Error loading PCN Master List:', error);
  }
}

// Display Table
function displayTable(data) {
tableContainer.innerHTML = '';

if (!data.length) {
  tableContainer.innerHTML = '<p>No PCN data found.</p>';
  return;
}

const table = document.createElement('table');
const thead = document.createElement('thead');
const tbody = document.createElement('tbody');

const headerRow = document.createElement('tr');
headers.forEach(header => {
  const th = document.createElement('th');
  th.textContent = header;
  th.style.border = "1px solid #ccc";
  th.style.padding = "8px";
  th.style.backgroundColor = "#f2f2f2";
  headerRow.appendChild(th);
});

const thAction = document.createElement('th');
thAction.textContent = 'Actions';
thAction.style.border = "1px solid #ccc";
thAction.style.padding = "8px";
thAction.style.backgroundColor = "#f2f2f2";
headerRow.appendChild(thAction);
thead.appendChild(headerRow);

data.forEach(row => {
  const tr = document.createElement('tr');
  headers.forEach(header => {
    const td = document.createElement('td');
    td.textContent = row[header] ?? '';
    td.style.border = "1px solid #ccc";
    td.style.padding = "8px";
    tr.appendChild(td);
  });

  const tdAction = document.createElement('td');
  tdAction.style.border = "1px solid #ccc";
  tdAction.style.padding = "8px";

  // Edit button
  const editButton = document.createElement('button');
  editButton.className = 'action-btn';
  editButton.textContent = 'Edit';
  editButton.style.marginRight = '5px';
  editButton.addEventListener('click', () => {
    openEditPage(row["Issue Date"], row["Device"]);
  });
  tdAction.appendChild(editButton);

  // Delete button
  const deleteButton = document.createElement('button');
  deleteButton.className = 'action-btn';
  deleteButton.textContent = 'Delete';
  deleteButton.style.marginRight = '5px';
  deleteButton.addEventListener('click', () => {
    deletePCN(row["Issue Date"], row["Device"]);
  });
  tdAction.appendChild(deleteButton);

  // Export button
  const exportButton = document.createElement('button');
  exportButton.className = 'action-btn';
  exportButton.textContent = 'Export';
  exportButton.addEventListener('click', () => {
    exportSinglePCN(row["Issue Date"], row["Device"]);
  });
  tdAction.appendChild(exportButton);

  tr.appendChild(tdAction);
  tbody.appendChild(tr);
});

table.appendChild(thead);
table.appendChild(tbody);
tableContainer.appendChild(table);
}

// Open Edit Page
function openEditPage(issueDate, device) {
const editId = `${issueDate}_${device}`;
window.location.href = `sheet10_pcnregistration.html?edit=${encodeURIComponent(editId)}`;
}

// Export Full PCN Master List (Merge all individual reports)
async function exportFullPCNMasterList() {
  try {
    const snapshot = await db.collection('pcn_masterlist').get();
    if (snapshot.empty) {
      alert('❗ No PCN data to export.');
      return;
    }

    const headers = [
      "Issue Date", "Device", "Customer", "SCK DRI", "Customer DRI", "Change Description", "Purpose", "PCN Class",
      "Reliability Criteria Number", "e-CM Register Status", "e-CM Duration (Days)",
      "Process Data Gathering Start", "Process Data to Customer", "Process Data Gathering Result",
      "SPCN Registration Date", "SPCN #", "STR Validation Start", "STR Validation Completed Date",
      "STR Validation Result", "Validation Buy Off Date", "Validation Buy Off Result", "Validation Buy Offer",
      "STR Sample Approval", "STR Sample Release Approver", "STR Sample Release Date",
      "SPCN Effectiveness Initiated", "SPCN Effectiveness Sent to Customer",
      "SPCN Approval Date", "SPCN Approval Result", "SPCN Approval Name"
    ];

    const exportData = [];

    snapshot.forEach(doc => {
      const rowData = doc.data();
      const row = {};
      headers.forEach(header => {
        row[header] = rowData[header] ?? '';
      });
      exportData.push(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PCN_MasterList");

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `PCN_MasterList_Report_${today}.xlsx`);
    alert('✅ PCN Master List Exported Successfully!');
  } catch (error) {
    console.error('❌ Error exporting PCN Master List:', error);
    alert('❌ Error exporting PCN Master List.');
  }
}

// Delete PCN
async function deletePCN(issueDate, device) {
if (!confirm(`❗ Are you sure you want to delete PCN for Device: ${device}?`)) {
  return;
}
const docId = `${issueDate}_${device}`;

try {
  await db.collection('pcn_masterlist').doc(docId).delete();
  alert('🗑️ Deleted successfully!');
  loadPCNMasterList(); // Reload after delete
} catch (error) {
  console.error('❌ Error deleting PCN:', error);
  alert('❌ Error deleting PCN.');
}
}

async function exportSinglePCN(issueDate, device) {
  const docId = `${issueDate}_${device}`;

  try {
    const doc = await db.collection('pcn_masterlist').doc(docId).get();
    if (!doc.exists) {
      alert('❌ PCN not found.');
      return;
    }
    const data = doc.data();

    if (!confirm(`❓ Confirm Export PCN Report for Device: ${data["Device"] ?? "Unknown Device"}?`)) {
      return;
    }

    const rows = [];

    // 🧩 Section 1: PCN Information
    rows.push(["🟦 PCN Information"]);
    rows.push(["Issue Date", data["Issue Date"] ?? ""]);
    rows.push(["Device", data["Device"] ?? ""]);
    rows.push(["Customer", data["Customer"] ?? ""]);
    rows.push(["SCK DRI", data["SCK DRI"] ?? ""]);
    rows.push(["Customer DRI", data["Customer DRI"] ?? ""]);
    rows.push(["Change Description", data["Change Description"] ?? ""]);
    rows.push(["Purpose", data["Purpose"] ?? ""]);
    rows.push(["PCN Class", data["PCN Class"] ?? ""]);
    rows.push(["Reliability Criteria Number", data["Reliability Criteria Number"] ?? ""]);
    rows.push(["e-CM Register Status", data["e-CM Register Status"] ?? ""]);
    rows.push(["e-CM Duration (Days)", data["e-CM Duration (Days)"] ?? ""]);
    rows.push([]);

    // 🧩 Section 2: 📦 T-Card Information
    rows.push(["📦 T-Card Information"]);
    const tList = data.tcardList || [];
    rows.push(["Customer", "Package Name", "Nickname", "PKG Size", "Lead#", "Type", "Substrate", "EMC", "Device#", "Lot#"]);
    tList.forEach(t => {
      rows.push([
        t.customer || "", t.packageName || "", t.nickname || "", t.pkgSize || "", t.leadNumber || "",
        t.packageType || "", t.substrateVendor || "", t.emcType || "", t.deviceNo || "", t.lotNo || ""
      ]);
    });
    rows.push([]);

    // 🧩 Section 3: Process Data to SPCN Register
    rows.push(["🟨 Process Data to SPCN Register"]);
    rows.push(["Process Data Gathering Start", data["Process Data Gathering Start"] ?? ""]);
    rows.push(["Process Data to Customer", data["Process Data to Customer"] ?? ""]);
    rows.push(["Process Data Gathering Result", data["Process Data Gathering Result"] ?? ""]);
    rows.push(["SPCN Registration Date", data["SPCN Registration Date"] ?? ""]);
    rows.push(["SPCN #", data["SPCN #"] ?? ""]);
    rows.push([]);

    // 🧩 Section 4: STR Validation
    rows.push(["🟧 STR Validation"]);
    rows.push(["STR Validation Start", data["STR Validation Start"] ?? ""]);
    rows.push(["STR Validation Completed Date", data["STR Validation Completed Date"] ?? ""]);
    rows.push(["STR Validation Result", data["STR Validation Result"] ?? ""]);
    rows.push(["Validation Buy Off Date", data["Validation Buy Off Date"] ?? ""]);
    rows.push(["Validation Buy Off Result", data["Validation Buy Off Result"] ?? ""]);
    rows.push(["Validation Buy Offer", data["Validation Buy Offer"] ?? ""]);
    rows.push(["STR Sample Approval", data["STR Sample Approval"] ?? ""]);
    rows.push(["STR Sample Release Approver", data["STR Sample Release Approver"] ?? ""]);
    rows.push(["STR Sample Release Date", data["STR Sample Release Date"] ?? ""]);
    rows.push([]);

    // 🧩 Section 5: SPCN Effectiveness Validation
    rows.push(["🟥 SPCN Effectiveness Validation"]);
    rows.push(["SPCN Effectiveness Initiated", data["SPCN Effectiveness Initiated"] ?? ""]);
    rows.push(["SPCN Effectiveness Sent to Customer", data["SPCN Effectiveness Sent to Customer"] ?? ""]);
    rows.push(["SPCN Approval Date", data["SPCN Approval Date"] ?? ""]);
    rows.push(["SPCN Approval Result", data["SPCN Approval Result"] ?? ""]);
    rows.push(["SPCN Approval Name", data["SPCN Approval Name"] ?? ""]);

    // Generate Excel
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PCN Report");

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    const today = new Date().toISOString().split('T')[0];
    const filename = `PCN_Report_${(data["Device"] ?? "UnknownDevice")}_${today}.xlsx`;

    if (window.electronAPI) {
      window.electronAPI.exportExcel(wbout, filename);
    } else {
      const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

  } catch (error) {
    console.error('❌ Error exporting PCN report:', error);
  }
}


// Helper for browser download
function s2ab(s) {
const buf = new ArrayBuffer(s.length);
const view = new Uint8Array(buf);
for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
return buf;
}

// Load on start
loadPCNMasterList();
