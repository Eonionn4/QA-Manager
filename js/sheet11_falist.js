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

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("faTableContainer");
  const searchInput = document.getElementById("searchInput");
  container.innerHTML = "<p>Loading...</p>";

  const loginCustomer = localStorage.getItem("loginCustomer")?.trim().toLowerCase() || "all";

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
  let allRows = [];

  try {
    const snapshot = await db.collection("faManager").orderBy("faRequestDate", "desc").get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const itemCustomer = (data.customer || "").toLowerCase();
  
      if (loginCustomer === "all" || relatedCustomers.some(k => itemCustomer.includes(k))) {
        allRows.push({ id: doc.id, data });
      }
    });
  
    renderTable(allRows);
  } catch (err) {
    console.error("❌ Failed to load FA list", err);
    container.innerHTML = "<p>Error loading FA list.</p>";
  }

  // ✅ Filter when typing
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase().trim();
    const filtered = allRows.filter(({ data }) => {
      return (
        (data.faNumber || "").toLowerCase().includes(keyword) ||
        (data.customer || "").toLowerCase().includes(keyword) ||
        (data.packageName || "").toLowerCase().includes(keyword) ||
        (data.nickname || "").toLowerCase().includes(keyword)
      );
    });
    renderTable(filtered);
  });

  function renderTable(rows) {
    if (!rows.length) {
      container.innerHTML = "<p>No matching FA entries found.</p>";
      return;
    }

    const tableRows = rows.map(({ id, data }) => {
      const progressStack = (data.tCards || []).map((card, idx) => {
        const progressEntries = (card.extendedInfo || []).map(p =>
          `• ${p.progress || "-"} (${p.result || "-"})`
        ).join("<br>");
        return `<strong>Lot ${idx + 1}:</strong><br>${progressEntries}`;
      }).join("<hr>");

      return `
        <tr>
          <td>${data.faNumber || ""}</td>
          <td>${data.customer || ""}</td>
          <td>${data.packageName || ""}</td>
          <td>${data.nickname || ""}</td>
          <td>${data.faRequestDate || ""}</td>
          <td>${data.productStage || ""}</td>
          <td>${progressStack}</td>
          <td>
            <button onclick="editFA('${id}')" class="action-btn">✏️</button>
            <button onclick="deleteFA('${id}')" class="action-btn">🗑</button>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <table class="styled-table">
        <thead>
          <tr>
            <th>FA Number</th>
            <th>Customer</th>
            <th>Package</th>
            <th>Nickname</th>
            <th>Requested Date</th>
            <th>Stage</th>
            <th>Lot-FA Progress</th>
            <th>Export</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;
  }
});

function editFA(id) {
  localStorage.setItem("editFAId", id);
  // Preserve previously saved openExtendedAreas if it exists
  const savedOpenAreas = localStorage.getItem("openExtendedAreas");
  if (!savedOpenAreas) {
    localStorage.setItem("openExtendedAreas", JSON.stringify([])); // fallback
  }
  window.location.href = "sheet12_famngr.html";
}

async function deleteFA(id) {
  if (!confirm("Are you sure to delete this FA entry?")) return;

  try {
    await db.collection("faManager").doc(id).delete();
    alert("✅ Deleted.");
    location.reload();
  } catch (err) {
    console.error("❌ Delete failed", err);
    alert("❌ Failed to delete.");
  }
}
