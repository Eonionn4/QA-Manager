// sheet9_devicelist.js

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

// Memory Storage
let originalDeviceList = [];
let revisedHistory = [];
let newAttachedTable = [];
let newRevisions = [];
let newlyRevisedAINumbers = []; // 🔵 Track newly revised AI_NO numbers
let hasChanges = false;

// DOM Elements
const excelInput = document.getElementById('excelInput');
const tableContainer = document.getElementById('tableContainer');
const searchInput = document.getElementById('searchInput');
const searchInput2 = document.getElementById('searchInput2');
const revisedHistoryContainer = document.getElementById('revisedHistoryContainer');
const goToSheet0Button = document.getElementById('goToSheet0Button');

goToSheet0Button.addEventListener('click', () => {
  window.location.href = "sheet0_qasystem.html";
});

// First Search Box
searchInput.addEventListener('input', () => {
  const keyword = searchInput.value.trim().toLowerCase();
  const keyword2 = searchInput2.value.trim().toLowerCase();

  const filtered = originalDeviceList.filter(row => {
    const match1 = keyword === '' || Object.values(row).some(value =>
      (value ?? '').toString().toLowerCase().includes(keyword)
    );
    const match2 = keyword2 === '' || Object.values(row).some(value =>
      (value ?? '').toString().toLowerCase().includes(keyword2)
    );
    return match1 && match2; // Both filters applied
  });

  displayTable(filtered);
});

// Second Search Box
searchInput2.addEventListener('input', () => {
  const keyword = searchInput.value.trim().toLowerCase();
  const keyword2 = searchInput2.value.trim().toLowerCase();

  const filtered = originalDeviceList.filter(row => {
    const match1 = keyword === '' || Object.values(row).some(value =>
      (value ?? '').toString().toLowerCase().includes(keyword)
    );
    const match2 = keyword2 === '' || Object.values(row).some(value =>
      (value ?? '').toString().toLowerCase().includes(keyword2)
    );
    return match1 && match2; // Both filters applied
  });

  displayTable(filtered);
});

const headers = [
  "AI_NO_INTR", "AI_NO", "AI_REV", "BD_NO_CUST",
  "POD", "CUST", "PKG", "LEAD", "BODY",
  "BODY_DESC", "PRIMARY_DEVICE", "CREATE_TIME",
  "LAST_UPDATE_TIME", "OLDAI", "NICKNAME", "HENG"
];

function getRelatedCustomerKeywords(base) {
  try {
    const map = JSON.parse(localStorage.getItem("customerKeywordMap") || "{}");
    const keywords = map[base] || [];
    return [base, ...keywords].map(k => k.toLowerCase());
  } catch {
    return [base];
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const loginCustomer = localStorage.getItem("loginCustomer")?.trim().toLowerCase() || "all";

  try {
    const currentDoc = await db.collection('device_list_ai').doc('current').get();
    if (currentDoc.exists) {
      const rawData = currentDoc.data().table;
      const updateDate = currentDoc.data().updateDate;

      if (rawData) {
        const fullData = JSON.parse(rawData);
        const relatedCustomers = loginCustomer === "all" ? ["all"] : getRelatedCustomerKeywords(loginCustomer);
        originalDeviceList = loginCustomer === "all"
          ? fullData
          : fullData.filter(row => {
              const cust = (row["CUST"] || "").toLowerCase();
              return relatedCustomers.some(k => cust.includes(k));
          });        

        displayTable(originalDeviceList);
        console.log('✅ Loaded Device List main table from Firestore.');
      }

      if (updateDate) {
        document.getElementById("updateDateDisplay").textContent = `${updateDate} updated`;
      }
    }

    const historyDoc = await db.collection('device_list_ai').doc('history').get();
    if (historyDoc.exists) {
      const historyData = historyDoc.data().table;
      if (historyData) {
        revisedHistory = JSON.parse(historyData);
        console.log('✅ Loaded Device List revised history from Firestore.');
      }
    } else {
      console.log('ℹ️ No revised history yet.');
    }

  } catch (error) {
    console.error('❌ Error loading Device List data:', error);
  }
});

// Excel file upload
excelInput.addEventListener('change', handleFile, false);

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    const data = evt.target.result;
    const workbook = XLSX.read(data, { type: 'binary' });
  
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
  
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (json && json.length) {
      newAttachedTable = json;
      compareAndUpdate();
      // ✅ Show updated date
      document.getElementById("updateDateDisplay").textContent = `${new Date().toISOString().slice(0, 10).replace(/-/g, ".")} updated`;
    }
  };
  reader.readAsBinaryString(file);
}

async function compareAndUpdate() {
  newRevisions = [];
  hasChanges = false;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  newAttachedTable.forEach(newRow => {
    const aiNo = ((newRow['AI_NO'] ?? '') + '').trim();
    if (!aiNo) return;

    const matchIndex = originalDeviceList.findIndex(oldRow => ((oldRow['AI_NO'] ?? '') + '').trim() === aiNo);

    if (matchIndex !== -1) {
      const oldRow = originalDeviceList[matchIndex];
      if (!isSameRow(oldRow, newRow)) {
        newRow["LAST_UPDATE_TIME"] = today;
        newRevisions.push(oldRow);
        originalDeviceList[matchIndex] = newRow;
        hasChanges = true;

        newlyRevisedAINumbers.push(aiNo);
        console.log(`🔄 Revised AI_NO: ${aiNo}`);
      } else {
        console.log(`✅ No change for AI_NO: ${aiNo}`);
      }
    } else {
      newRow["LAST_UPDATE_TIME"] = today;
      originalDeviceList.push(newRow);
      hasChanges = true;
      console.log(`➕ Added new AI_NO: ${aiNo}`);
    }
  });

  await saveUpdatedTable();
}

// Check if two rows are the same
function isSameRow(row1, row2) {
  for (const header of headers) {
    if ((row1[header] ?? '').toString().trim() !== (row2[header] ?? '').toString().trim()) {
      return false;
    }
  }
  return true;
}

async function saveUpdatedTable() {
  if (!hasChanges) {
    console.log('✅ No changes detected. Nothing saved.');
    return;
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  try {
    await db.collection('device_list_ai').doc('current').set({
      table: JSON.stringify(originalDeviceList),
      updateDate: today
    });
    console.log('✅ Updated main table saved.');

    revisedHistory = [...revisedHistory, ...newRevisions];
    await db.collection('device_list_ai').doc('history').set({ table: JSON.stringify(revisedHistory) });
    console.log('✅ Revised history stacked and saved.');

    newlyRevisedAINumbers = []; // 🔵 Clear highlight after save
    document.getElementById("updateDateDisplay").textContent = `${today} updated`;
    displayTable(originalDeviceList);
  } catch (error) {
    console.error('❌ Error saving data:', error);
  }
}

function displayTable(data) {
  tableContainer.innerHTML = '';

  if (!data.length) {
    tableContainer.innerHTML = '<p>No device data found.</p>';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headerRow = document.createElement('tr');
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });

  const thAction = document.createElement('th');
  thAction.textContent = 'Actions';
  headerRow.appendChild(thAction);
  thead.appendChild(headerRow);

  data.forEach(row => {
    const tr = document.createElement('tr');

    const aiNum = (row["AI_NO"] ?? "").trim();
    const isHighlighted = newlyRevisedAINumbers.includes(aiNum);

    if (isHighlighted) {
      tr.style.backgroundColor = '#fff3cd'; // Yellow
      tr.style.fontWeight = 'bold';          // Bold
    }

    headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = row[header] ?? '';
      tr.appendChild(td);
    });

    const tdAction = document.createElement('td');

    const viewButton = document.createElement('button');
    viewButton.className = 'action-btn';
    viewButton.textContent = 'View';
    viewButton.style.marginRight = '5px';
    viewButton.addEventListener('click', () => {
      showRevisedHistory((row["AI_NO"] ?? '').trim());
    });
    tdAction.appendChild(viewButton);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'action-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      deleteDevice(row["AI_NO"]);
    });
    tdAction.appendChild(deleteButton);

    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  tableContainer.appendChild(table);
}

async function deleteDeviceRow(aiNo) {
  if (!confirm(`Are you sure you want to delete AI_NO: ${aiNo}?`)) {
    return;
  }

  // Remove from main device list
  originalDeviceList = originalDeviceList.filter(row => ((row['AI_NO'] ?? '') + '').trim() !== aiNo);

  // Remove from revised history
  revisedHistory = revisedHistory.filter(row => ((row['AI_NO'] ?? '') + '').trim() !== aiNo);

  try {
    await db.collection('device_list_ai').doc('current').set({ table: JSON.stringify(originalDeviceList) });
    await db.collection('device_list_ai').doc('history').set({ table: JSON.stringify(revisedHistory) });
    console.log(`🗑️ Deleted AI_NO: ${aiNo}`);

    displayTable(originalDeviceList); // Refresh table
  } catch (error) {
    console.error('❌ Error deleting AI_NO:', error);
  }
}

// Export Device List to Excel
function exportDeviceListToExcel() {
  if (!originalDeviceList || !originalDeviceList.length) {
    alert('❗ No data to export.');
    return;
  }

  const headers = [
    "AI_NO_INTR", "AI_NO", "AI_REV", "BD_NO_CUST", "POD",
    "CUST", "PKG", "LEAD", "BODY", "BODY_DESC",
    "PRIMARY_DEVICE", "CREATE_TIME", "LAST_UPDATE_TIME",
    "OLDAI", "NICKNAME", "HENG"
  ];

  const exportData = originalDeviceList.map(row => {
    const newRow = {};
    headers.forEach(header => {
      newRow[header] = row[header] ?? '';
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DeviceList");

  XLSX.writeFile(workbook, 'DeviceList_Report.xlsx');
}

function showRevisedHistory(ai_no) {
  const modal = document.getElementById('historyModal');
  const content = document.getElementById('historyModalContent');
  content.innerHTML = '';

  const headers = [
    "AI_NO_INTR", "AI_NO", "AI_REV", "BD_NO_CUST", "POD",
    "CUST", "PKG", "LEAD", "BODY", "BODY_DESC",
    "PRIMARY_DEVICE", "CREATE_TIME", "LAST_UPDATE_TIME",
    "OLDAI", "NICKNAME", "HENG"
  ];

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headerRow = document.createElement('tr');
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const matchingHistory = revisedHistory.filter(row => (row["AI_NO"] ?? '').trim() === ai_no);

  if (!matchingHistory.length) {
    content.innerHTML = `<p>❌ No revised history found for AI_NO: ${ai_no}</p>`;
    modal.style.display = 'block';
    return;
  }

  matchingHistory.forEach((historyRow, index) => {
    const tr = document.createElement('tr');
    headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = historyRow[header] ?? '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);

    // After table row ➔ Add Note + Save
    const noteRow = document.createElement('tr');
    const noteCell = document.createElement('td');
    noteCell.colSpan = headers.length;

    const noteContainer = document.createElement('div');
    noteContainer.style.display = 'flex';
    noteContainer.style.alignItems = 'center';
    noteContainer.style.gap = '10px';

    const textarea = document.createElement('textarea');
    textarea.rows = 2;
    textarea.style.width = '70%';
    textarea.value = historyRow["Note"] ?? '';
    textarea.placeholder = "Add a note for this revision...";
    textarea.dataset.index = index;

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Note';
    saveButton.style.padding = '5px 15px';
    saveButton.addEventListener('click', () => {
      matchingHistory[index]["Note"] = textarea.value.trim();
      updateRevisedHistory(ai_no, matchingHistory);
    
      // 🔵 After saving note, remove highlight
      newlyRevisedAINumbers = newlyRevisedAINumbers.filter(num => num !== ai_no);
      displayTable(originalDeviceList);
      closeHistoryModal(); // Optional: Close after save
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.padding = '5px 15px';
    deleteButton.style.backgroundColor = '#FF4C4C';
    deleteButton.style.color = 'white';
    deleteButton.addEventListener('click', () => {
      if (confirm('❗ Are you sure you want to delete this revision?')) {
        matchingHistory.splice(index, 1);
        updateRevisedHistory(ai_no, matchingHistory);
      }
    });

    noteContainer.appendChild(textarea);
    noteContainer.appendChild(saveButton);
    noteContainer.appendChild(deleteButton);
    noteCell.appendChild(noteContainer);
    noteRow.appendChild(noteCell);
    tbody.appendChild(noteRow);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  content.appendChild(table);
  modal.style.display = 'block';
}

// Save after editing or deleting history
async function updateRevisedHistory(ai_no, matchingHistory) {
  try {
    revisedHistory = revisedHistory.filter(row => (row["AI_NO"] ?? '').trim() !== ai_no).concat(matchingHistory);
    await db.collection('device_list_history').doc('history').set({
      table: JSON.stringify(revisedHistory)
    });
    alert('✅ History updated successfully!');
    closeHistoryModal();
  } catch (error) {
    console.error('❌ Error updating history:', error);
    alert('❌ Failed to update history.');
  }
}

// Close Popup
function closeHistoryModal() {
  const modal = document.getElementById('historyModal');
  modal.style.display = 'none';
}

async function deleteSystemNumber(systemNum) {
  if (!confirm(`Are you sure you want to delete SYSTEM#: ${systemNum}?`)) {
    return;
  }

  // Remove from main current table
  originalSheet7Table = originalSheet7Table.filter(row => ((row['SYSTEM#'] ?? '') + '').trim() !== systemNum);

  // Remove from revised history
  revisedHistory = revisedHistory.filter(row => ((row['SYSTEM#'] ?? '') + '').trim() !== systemNum);

  try {
    await db.collection('csr').doc('current').set({ table: JSON.stringify(originalSheet7Table) });
    await db.collection('csr').doc('history').set({ table: JSON.stringify(revisedHistory) });
    console.log(`🗑️ Deleted SYSTEM#: ${systemNum}`);

    displayTable(originalSheet7Table); // Refresh the table display
  } catch (error) {
    console.error('❌ Error deleting SYSTEM#:', error);
  }
}

// Refresh File Button
const refreshFileButton = document.getElementById('refreshFileButton');

refreshFileButton.addEventListener('click', () => {
  excelInput.value = ''; // Clear file input
  console.log('🔄 File input refreshed.');
});

function createViewRow(row, aiNo, isRevision) {
  const tr = document.createElement('tr');
  headers.forEach(header => {
    const td = document.createElement('td');
    td.textContent = row[header] ?? '';
    tr.appendChild(td);
  });

  // Note input field
  const noteTd = document.createElement('td');
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.value = row['NOTE'] ?? '';
  noteInput.disabled = true;
  noteTd.appendChild(noteInput);
  tr.appendChild(noteTd);

  // Action buttons
  const actionTd = document.createElement('td');

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => {
    noteInput.disabled = false;
    noteInput.focus();
  });

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.marginLeft = '5px';
  saveBtn.addEventListener('click', async () => {
    noteInput.disabled = true;
    await saveNote(aiNo, row, noteInput.value, isRevision);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.style.marginLeft = '5px';
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this revision?')) {
      await deleteRevision(aiNo, row);
    }
  });

  actionTd.appendChild(editBtn);
  actionTd.appendChild(saveBtn);
  actionTd.appendChild(deleteBtn);
  tr.appendChild(actionTd);

  return tr;
}

async function saveNote(aiNo, targetRow, newNote, isRevision) {
  if (isRevision) {
    const idx = revisedHistory.findIndex(row => ((row['AI_NO'] ?? '') + '').trim() === aiNo && isSameRow(row, targetRow));
    if (idx !== -1) {
      revisedHistory[idx]['NOTE'] = newNote;
    }
  } else {
    const idx = originalDeviceList.findIndex(row => ((row['AI_NO'] ?? '') + '').trim() === aiNo);
    if (idx !== -1) {
      originalDeviceList[idx]['NOTE'] = newNote;
    }
  }

  try {
    await db.collection('device_list_ai').doc('current').set({ table: JSON.stringify(originalDeviceList) });
    await db.collection('device_list_ai').doc('history').set({ table: JSON.stringify(revisedHistory) });
    console.log(`💾 Saved note for AI_NO: ${aiNo}`);
  } catch (error) {
    console.error('❌ Error saving note:', error);
  }
}

async function deleteRevision(aiNo, targetRow) {
  revisedHistory = revisedHistory.filter(row => !(isSameRow(row, targetRow) && ((row['AI_NO'] ?? '') + '').trim() === aiNo));

  try {
    await db.collection('device_list_ai').doc('history').set({ table: JSON.stringify(revisedHistory) });
    console.log(`🗑️ Deleted a revision for AI_NO: ${aiNo}`);

    // Refresh popup after delete
    showRevisedHistory(aiNo);
  } catch (error) {
    console.error('❌ Error deleting revision:', error);
  }
}

// Delete All Device List
document.getElementById('deleteAllButton').addEventListener('click', async () => {
  if (!confirm('❗ Are you sure you want to delete the entire Device List?')) {
    return;
  }

  try {
    await db.collection('device_list_ai').doc('current').delete();
    alert('✅ Device List deleted successfully.');
    originalDeviceList = [];
    displayTable(originalDeviceList);
  } catch (error) {
    console.error('❌ Error deleting Device List:', error);
    alert('❌ Failed to delete Device List.');
  }
});
