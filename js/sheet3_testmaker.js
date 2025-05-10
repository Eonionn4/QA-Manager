// ✅ Firebase Initialization
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

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById('testMakerForm');
  const savedTestsContainer = document.getElementById('savedTests');
  const editIdInput = document.getElementById('editId');
  const saveBtn = document.getElementById('saveBtn');
  const reviseBtn = document.getElementById('reviseBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const backToScheduleBtn = document.getElementById('backToScheduleBtn');

  if (!form) {
    console.error("❌ Form element #testMakerForm not found.");
    return;
  }

  // ✅ Save new test item
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const test = Object.fromEntries(formData.entries());
    test.id = (test.criteria || '').trim();
    if (!test.id) return alert('❗ Test Item/Criteria is required.');

    try {
      await db.collection('testItems').doc(test.id).set(test);
      alert('✅ Test saved!');
      await loadSavedTests();
      form.reset();
      editIdInput.value = '';
      toggleEditMode(false);
    } catch (err) {
      console.error('❌ Save failed:', err);
    }
  });

  // ✅ Revise test item
  if (reviseBtn) {
    reviseBtn.addEventListener('click', async () => {
      const formData = new FormData(form);
      const test = Object.fromEntries(formData.entries());
      const originalId = editIdInput.value.trim();
      const newId = (test.criteria || '').trim();

      if (!originalId || !newId) return alert('❗ Test Item/Criteria is required.');

      try {
        if (originalId !== newId) {
          await db.collection('testItems').doc(originalId).delete();
        }
        test.id = newId;
        await db.collection('testItems').doc(newId).set(test);

        alert("✅ Test revised!");
        await loadSavedTests();
        form.reset();
        editIdInput.value = '';
        toggleEditMode(false);
      } catch (err) {
        console.error('❌ Revise failed:', err);
      }
    });
  }

  // ✅ Cancel edit
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      form.reset();
      editIdInput.value = '';
      toggleEditMode(false);
    });
  }

  // ✅ Back to Schedule Manager
  if (backToScheduleBtn) {
    backToScheduleBtn.addEventListener('click', () => {
      window.location.href = "sheet2_schedulemanager.html";
    });
  }

  function toggleEditMode(isEdit) {
    if (saveBtn) saveBtn.style.display = isEdit ? 'none' : 'inline-block';
    if (reviseBtn) reviseBtn.style.display = isEdit ? 'inline-block' : 'none';
    if (cancelEditBtn) cancelEditBtn.style.display = isEdit ? 'inline-block' : 'none';
    if (backToScheduleBtn) backToScheduleBtn.style.display = localStorage.getItem("unsavedSheet2") ? "inline-block" : "none";
  }

  // ✅ Load saved test items
  async function loadSavedTests() {
    savedTestsContainer.innerHTML = '';
    const snapshot = await db.collection('testItems').get();
    snapshot.forEach(doc => {
      const test = doc.data();
      const wrapper = document.createElement('div');
      wrapper.className = 'saved-item';
      wrapper.innerHTML = `
        <div><strong>🧪 ${test.criteria}</strong></div>
        <div>Temp: ${test.tempFrom} → ${test.tempTo} °C | Humidity: ${test.humidity} RH</div>
        <div>Time: ${test.time} hrs | Cycle: ${test.cycle} | Pressure: ${test.pressure} | Voltage: ${test.voltage}</div>
        <div>Duration: ${test.duration} days</div>
        <div style="margin-top: 6px;">
          <button class="edit-btn" data-id="${test.id}">✏️ Edit</button>
          <button class="delete-btn" data-id="${test.id}">🗑️ Delete</button>
        </div>
      `;

      wrapper.querySelector(".edit-btn").onclick = async () => {
        const doc = await db.collection('testItems').doc(test.id).get();
        if (doc.exists) {
          const data = doc.data();
          Object.keys(data).forEach(key => {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) input.value = data[key];
          });
          editIdInput.value = test.id;
          toggleEditMode(true);
        }
      };

      wrapper.querySelector(".delete-btn").onclick = async () => {
        if (confirm(`Delete "${test.criteria}"?`)) {
          await db.collection("testItems").doc(test.id).delete();
          await loadSavedTests();
        }
      };

      savedTestsContainer.appendChild(wrapper);
    });
  }

  await loadSavedTests();

  // ✅ Auto-load edit if redirected
  const editId = localStorage.getItem("editTestItemId");
  if (editId) {
    const doc = await db.collection("testItems").doc(editId).get();
    if (doc.exists) {
      const data = doc.data();
      Object.keys(data).forEach(key => {
        const input = document.querySelector(`[name="${key}"]`);
        if (input) input.value = data[key];
      });
      editIdInput.value = editId;
      toggleEditMode(true);
    }
    localStorage.removeItem("editTestItemId");
  }
});
