const firebaseConfig = {
  apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
  authDomain: "reliability-program.firebaseapp.com",
  projectId: "reliability-program"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const searchInput = document.getElementById("searchInput");
const loginCustomer = localStorage.getItem("loginCustomer")?.trim().toLowerCase() || "all";

// 🔍 Helper for keyword mapping
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

function renderNPIList(data) {
  const tbody = document.getElementById("npiTableBody");
  tbody.innerHTML = "";

  data.forEach(doc => {
    const item = doc.data();
    const id = doc.id;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.customer || '-'}</td>
      <td>${item.packageName || '-'}</td>
      <td>${item.nickname || '-'}</td>
      <td>${item.pkgSize || '-'}</td>
      <td>${item.leadNumber || '-'}</td>
      <td>${item.packageType || '-'}</td>
      <td>${item.substrateVendor || '-'}</td>
      <td>${item.emcType || '-'}</td>
      <td>
        <button onclick="editNPI('${id}')" class="edit-button table-button">✏️ Edit</button>
        <button onclick="deleteNPI('${id}')" class="delete-button table-button">❌ Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function fetchNPIs() {
  db.collection("npi_masterlist")
    .orderBy("packageName", "desc")
    .get()
    .then(snapshot => {
      let docs = snapshot.docs;

      if (loginCustomer !== "all") {
        docs = docs.filter(doc => {
          const customer = (doc.data().customer || "").toLowerCase();
          return relatedCustomers.some(k => customer.includes(k));
        });
      }

      renderNPIList(docs);
    });
}

function editNPI(id) {
  localStorage.setItem("editNPIId", id);
  window.location.href = "sheet14_npimkr.html";
}

function deleteNPI(id) {
  if (confirm("Are you sure you want to delete this NPI entry?")) {
    db.collection("npi_masterlist").doc(id).delete().then(() => {
      alert("✅ NPI deleted.");
      fetchNPIs();
    });
  }
}

searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();

  db.collection("npi_masterlist").get().then(snapshot => {
    let docs = snapshot.docs;

    if (loginCustomer !== "all") {
      docs = docs.filter(doc => {
        const customer = (doc.data().customer || "").toLowerCase();
        return relatedCustomers.some(k => customer.includes(k));
      });
    }

    const filtered = docs.filter(doc => {
      const item = doc.data();
      return (
        (item.nickname || "").toLowerCase().includes(term) ||
        (item.packageName || "").toLowerCase().includes(term) ||
        (item.customer || "").toLowerCase().includes(term)
      );
    });

    renderNPIList(filtered);
  });
});

fetchNPIs();
