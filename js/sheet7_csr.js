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
let originalSheet7Table = [];
let revisedHistory = [];
let newAttachedTable = [];
let newRevisions = [];
let newlyRevisedSystemNumbers = []; // 🔵 Track SYSTEM# that were newly revised
let hasChanges = false;

// DOM Elements
const excelInput = document.getElementById('excelInput');
const tableContainer = document.getElementById('tableContainer');
const revisedHistoryContainer = document.getElementById('revisedHistoryContainer');
const goToSheet0Button = document.getElementById('goToSheet0Button');
goToSheet0Button.addEventListener('click', () => {
  window.location.href = "sheet0_qasystem.html";
});

document.addEventListener('DOMContentLoaded', async () => {
  const loginCustomer = localStorage.getItem("loginCustomer")?.trim().toLowerCase() || "all";

  async function getAllKeywordMap() {
    const map = {};
    try {
      const snapshot = await db.collection("customer_keywords").get();
      snapshot.forEach(doc => {
        const data = doc.data();
        const main = data.customer?.toLowerCase();
        const keywords = (data.keywords || []).map(k => k.toLowerCase());
        if (main) {
          map[main] = [...new Set(keywords)];
        }
      });
    } catch (e) {
      console.error("❌ Error loading keyword map:", e);
    }
    return map;
  }

  try {
    const keywordMap = await getAllKeywordMap();
    const baseCustomers = loginCustomer.split(',').map(c => c.trim().toLowerCase());

    let allKeywords = new Set();
    baseCustomers.forEach(base => {
      allKeywords.add(base);
      const mapped = keywordMap[base] || [];
      mapped.forEach(k => allKeywords.add(k));
    });

    const currentDoc = await db.collection('csr').doc('current').get();
    if (currentDoc.exists) {
      const rawData = currentDoc.data().table;
      const updateDate = currentDoc.data().updateDate;

      if (rawData) {
        const fullData = JSON.parse(rawData);

        originalSheet7Table = loginCustomer === "all"
          ? fullData
          : fullData.filter(row => {
              const rowCustomer = (row["CUSTNAME"] || "").toLowerCase();
              return Array.from(allKeywords).some(k => rowCustomer.includes(k));
            });

        displayTable(originalSheet7Table);
        console.log(`✅ Loaded CSR main table (${originalSheet7Table.length} items).`);
      }

      if (updateDate) {
        document.getElementById("updateDateDisplay").textContent = `${updateDate} updated`;
      }
    }

    const historyDoc = await db.collection('csr').doc('history').get();
    if (historyDoc.exists) {
      const historyData = historyDoc.data().table;
      if (historyData) {
        revisedHistory = JSON.parse(historyData);
        console.log('✅ Loaded CSR revised history from Firestore.');
      }
    } else {
      console.log('ℹ️ No revised history yet.');
    }

  } catch (error) {
    console.error('❌ Error loading CSR data:', error);
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
      // ✅ Display updated date
    }
  };  
  reader.readAsBinaryString(file);
}

const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', () => {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) {
    displayTable(originalSheet7Table); // No filter, show all
  } else {
    const filtered = originalSheet7Table.filter(row => {
      return Object.values(row).some(value => 
        (value ?? '').toString().toLowerCase().includes(keyword)
      );
    });
    displayTable(filtered); // Show matching
  }
});

async function compareAndUpdate() {
  newRevisions = [];
  hasChanges = false;
  newlyRevisedSystemNumbers = [];

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  newAttachedTable.forEach(newRow => {
    const systemNum = ((newRow['SYSTEM#'] ?? '') + '').trim();
    if (!systemNum) return;

    const matchIndex = originalSheet7Table.findIndex(oldRow => ((oldRow['SYSTEM#'] ?? '') + '').trim() === systemNum);

    if (matchIndex !== -1) {
      const oldRow = originalSheet7Table[matchIndex];
      if (!isSameRow(oldRow, newRow)) {

        const alreadyHasOld = revisedHistory.some(r => r['SYSTEM#'] === systemNum && r['SPECREV'] === oldRow['SPECREV']);
        if (!alreadyHasOld) {
          newRevisions.push(oldRow);
        }

        newRow["UPDATED"] = today;
        originalSheet7Table[matchIndex] = newRow;

        const alreadyHasNew = revisedHistory.some(r => r['SYSTEM#'] === systemNum && r['SPECREV'] === newRow['SPECREV']);
        if (!alreadyHasNew) {
          newRevisions.push({ ...newRow });
        }

        hasChanges = true;
        newlyRevisedSystemNumbers.push(systemNum);
        console.log(`🔄 Revised SYSTEM#: ${systemNum}`);
      } else {
        console.log(`✅ No change for SYSTEM#: ${systemNum}`);
      }
    } else {
      newRow["UPDATED"] = today;
      originalSheet7Table.push(newRow);
      hasChanges = true;
      console.log(`➕ Added new SYSTEM#: ${systemNum}`);
    }
  });

  await saveUpdatedTable();
}

// Check if two rows are the same
function isSameRow(row1, row2) {
  const headers = ["SITE", "SYSTEM#", "CUSTNAME", "SPECTYPE", "SPECTITLE", "SPEC#", "SPECREV", "RECEIVED IN", "REQ BY", "STATUS", "SUBMITTED IN", "CLOSED IN"];
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
    await db.collection('csr').doc('current').set({
      table: JSON.stringify(originalSheet7Table),
      updateDate: today
    });
    console.log('✅ Updated main table saved.');

    revisedHistory = [...revisedHistory, ...newRevisions];
    await db.collection('csr').doc('history').set({ table: JSON.stringify(revisedHistory) });
    console.log('✅ Revised history stacked and saved.');

    document.getElementById("updateDateDisplay").textContent = `${today} updated`;
    displayTable(originalSheet7Table); // Refresh screen
  } catch (error) {
    console.error('❌ Error saving data:', error);
  }
}

function displayTable(data) {
  tableContainer.innerHTML = '';

  if (!data.length) {
    tableContainer.innerHTML = '<p>No data found.</p>';
    return;
  }

  const headers = [
    "SITE", "SYSTEM#", "CUSTNAME", "SPECTYPE", "SPECTITLE",
    "SPEC#", "SPECREV", "RECEIVED IN", "REQ BY",
    "STATUS", "SUBMITTED IN", "CLOSED IN"
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
  const thAction = document.createElement('th');
  thAction.textContent = 'Revised History';
  headerRow.appendChild(thAction);
  thead.appendChild(headerRow);

  data.forEach(row => {
    const tr = document.createElement('tr');

    const systemNum = (row['SYSTEM#'] ?? '').trim();
    const isHighlighted = newlyRevisedSystemNumbers.includes(systemNum);

    headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = row[header] ?? '';

      // 🔵 Apply yellow background and bold to each <td> individually if revised
      if (isHighlighted) {
        td.style.backgroundColor = '#fff3cd'; // Yellow color
        td.style.fontWeight = 'bold';          // Bold text
      }

      tr.appendChild(td);
    });

    const tdAction = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'view-btn';
    button.innerHTML = '🔍 View';
    button.addEventListener('click', () => {
      showRevisedHistory(systemNum);
    });

    if (isHighlighted) {
      tdAction.style.backgroundColor = '#fff3cd'; // Also yellow for button area
      tdAction.style.fontWeight = 'bold';
    }

    tdAction.appendChild(button);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  tableContainer.appendChild(table);
}

// Revised History Popup with Individual Notes + Delete Button
function showRevisedHistory(systemNum) {
  const modal = document.getElementById('historyModal');
  const content = document.getElementById('historyModalContent');
  content.innerHTML = '';

  const headers = [
    "SITE", "SYSTEM#", "CUSTNAME", "SPECTYPE", "SPECTITLE",
    "SPEC#", "SPECREV", "RECEIVED IN", "REQ BY",
    "STATUS", "SUBMITTED IN", "CLOSED IN"
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

  const matchingHistory = revisedHistory.filter(row => (row["SYSTEM#"] ?? "").trim() === systemNum);

  if (!matchingHistory.length) {
    content.innerHTML = `<p>❌ No revised history found for SYSTEM#: ${systemNum}</p>`;
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
      const updatedNote = textarea.value.trim();
      matchingHistory[index]["Note"] = updatedNote;
      updateRevisedHistory(systemNum, matchingHistory);
    
      // ✅ REMOVE highlight here
      newlyRevisedSystemNumbers = newlyRevisedSystemNumbers.filter(num => num !== systemNum);
      displayTable(originalSheet7Table);
      closeHistoryModal();
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.padding = '5px 15px';
    deleteButton.style.backgroundColor = '#FF4C4C';
    deleteButton.style.color = 'white';
    deleteButton.addEventListener('click', () => {
      if (confirm('❗ Are you sure you want to delete this revision?')) {
        matchingHistory.splice(index, 1);
        updateRevisedHistory(systemNum, matchingHistory);
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

// Save Revised History including Note changes and Deletions
async function updateRevisedHistory(systemNum, matchingHistory) {
  try {
    // Keep only the updated matching items + rest of other SYSTEM# unaffected
    revisedHistory = revisedHistory.filter(row => (row["SYSTEM#"] ?? "").trim() !== systemNum).concat(matchingHistory);

    await db.collection('csr').doc('history').set({
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

function createViewRow(row, systemNum, isRevision) {
  const headers = ["SITE", "SYSTEM#", "CUSTNAME", "SPECTYPE", "SPECTITLE", "SPEC#", "SPECREV", "RECEIVED IN", "REQ BY", "STATUS", "SUBMITTED IN", "CLOSED IN"];
  
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
  noteInput.value = row['NOTE'] ?? ''; // Use saved NOTE or blank
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
    await saveNote(systemNum, row, noteInput.value, isRevision);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.style.marginLeft = '5px';
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this revision?')) {
      await deleteRevision(systemNum, row);
    }
  });

  actionTd.appendChild(editBtn);
  actionTd.appendChild(saveBtn);
  actionTd.appendChild(deleteBtn);
  tr.appendChild(actionTd);

  return tr;
}
async function saveNote(systemNum, targetRow, newNote, isRevision) {
  if (isRevision) {
    const idx = revisedHistory.findIndex(row => ((row['SYSTEM#'] ?? '') + '').trim() === systemNum && isSameRow(row, targetRow));
    if (idx !== -1) {
      revisedHistory[idx]['NOTE'] = newNote;
    }
  } else {
    const idx = originalSheet7Table.findIndex(row => ((row['SYSTEM#'] ?? '') + '').trim() === systemNum);
    if (idx !== -1) {
      originalSheet7Table[idx]['NOTE'] = newNote;
    }
  }

  try {
    await db.collection('csr').doc('current').set({ table: JSON.stringify(originalSheet7Table) });
    await db.collection('csr').doc('history').set({ table: JSON.stringify(revisedHistory) });
    console.log(`💾 Saved note for SYSTEM#: ${systemNum}`);
  } catch (error) {
    console.error('❌ Error saving note:', error);
  }
}
async function deleteRevision(systemNum, targetRow) {
  revisedHistory = revisedHistory.filter(row => !(isSameRow(row, targetRow) && ((row['SYSTEM#'] ?? '') + '').trim() === systemNum));

  try {
    await db.collection('csr').doc('history').set({ table: JSON.stringify(revisedHistory) });
    console.log(`🗑️ Deleted a revision for SYSTEM#: ${systemNum}`);

    // Refresh popup after delete
    showRevisedHistory(systemNum);
  } catch (error) {
    console.error('❌ Error deleting revision:', error);
  }
}

// Export CSR Master List to Excel
function exportCSRListToExcel() {
  if (!originalSheet7Table || !originalSheet7Table.length) {
    alert('❗ No data to export.');
    return;
  }

  const headers = [
    "SITE", "SYSTEM#", "CUSTNAME", "SPECTYPE", "SPECTITLE",
    "SPEC#", "SPECREV", "RECEIVED IN", "REQ BY",
    "STATUS", "SUBMITTED IN", "CLOSED IN"
  ];

  const exportData = originalSheet7Table.map(row => {
    const newRow = {};
    headers.forEach(header => {
      newRow[header] = row[header] ?? '';
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "CSRList");

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `CSR_List_Report_${today}.xlsx`);  
}

// Delete All CSR List
document.getElementById('deleteAllButton').addEventListener('click', async () => {
  if (!confirm('❗ Are you sure you want to delete the entire CSR list?')) {
    return;
  }

  try {
    await db.collection('csr').doc('current').delete();
    alert('✅ CSR List deleted successfully.');
    originalSheet7Table = [];
    displayTable(originalSheet7Table);
  } catch (error) {
    console.error('❌ Error deleting CSR list:', error);
    alert('❌ Failed to delete CSR list.');
  }
});
