// DOM Elements
const medForm = document.getElementById("medForm");
const medList = document.getElementById("medList");
const todaySchedule = document.getElementById("todaySchedule");
const downloadBtn = document.getElementById("downloadReport");

// Initialize with localStorage data or empty arrays
let medications = JSON.parse(localStorage.getItem("medications")) || [];
let takenLog = JSON.parse(localStorage.getItem("takenLog")) || {};

// Initial render
renderAll();

// Form Submission with enhanced UX
medForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("medName").value.trim();
  const dose = document.getElementById("medDose").value.trim();
  const date = document.getElementById("medDate").value;
  const time = document.getElementById("medTime").value;

  if (!name || !dose || !date || !time) {
    showAlert("Please fill all fields!", "error");
    return;
  }

  const med = {
    id: Date.now(),
    name,
    dose,
    date,
    time,
    added: new Date().toISOString(),
  };

  medications.push(med);
  saveMedications();
  renderAll();
  medForm.reset();

  showAlert(`${name} added successfully!`, "success");
  checkInteractions(name);
});

// Save to localStorage
function saveMedications() {
  localStorage.setItem("medications", JSON.stringify(medications));
  localStorage.setItem("takenLog", JSON.stringify(takenLog));
}

// Render all components
function renderAll() {
  renderMedicationList();
  renderTodaySchedule();
  renderChart();
}

// Render medication list with modern UI
function renderMedicationList() {
  if (medications.length === 0) {
    medList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-pills"></i>
        <h3>No Medications Added</h3>
        <p>Add your first medication to get started</p>
      </div>
    `;
    return;
  }

  medList.innerHTML = "";

  // Sort by date (newest first)
  const sortedMeds = [...medications].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  sortedMeds.forEach((med) => {
    const takenCount = takenLog[med.id]?.length || 0;
    const lastTaken = takenLog[med.id]?.length
      ? `Last taken: ${takenLog[med.id][takenLog[med.id].length - 1]}`
      : "Not taken yet";

    const item = document.createElement("div");
    item.className = "med-item";
    item.innerHTML = `
      <div class="med-details">
        <strong>${med.name}</strong> 
        <span class="dose-badge">${med.dose}</span>
        <div class="meta">
          <span><i class="far fa-calendar-alt"></i> ${formatDate(
            med.date
          )}</span>
          <span><i class="far fa-clock"></i> ${med.time}</span>
        </div>
        <div class="stats">
          <span class="taken-count"><i class="fas fa-check-circle"></i> ${takenCount}x</span>
          <span class="last-taken">${lastTaken}</span>
        </div>
      </div>
      <div class="med-buttons">
        <button class="btn-taken" onclick="markTaken(${med.id})">
          <i class="fas fa-check"></i> Taken
        </button>
        <button class="btn-edit" onclick="editMed(${med.id})">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn-delete" onclick="deleteMed(${med.id})">
          <i class="fas fa-trash-alt"></i> Delete
        </button>
      </div>
    `;
    medList.appendChild(item);
  });
}

// Render today's schedule with visual indicators
function renderTodaySchedule() {
  const today = new Date().toISOString().split("T")[0];
  const todaysMeds = medications
    .filter((m) => m.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todaysMeds.length === 0) {
    todaySchedule.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-smile-beam"></i>
        <h3>No Medications Today</h3>
        <p>Enjoy your day medication-free!</p>
      </div>
    `;
    return;
  }

  todaySchedule.innerHTML = "";

  todaysMeds.forEach((med) => {
    const now = new Date();
    const medTime = new Date(`${today}T${med.time}`);
    const isPast = now > medTime;
    const isTaken = takenLog[med.id]?.includes(today);

    const item = document.createElement("div");
    item.className = `schedule-item ${isPast ? "past" : ""} ${
      isTaken ? "taken" : ""
    }`;

    item.innerHTML = `
      <div class="schedule-details">
        <div class="med-info">
          <h4>${med.name}</h4>
          <span class="time ${isPast ? "past" : "upcoming"}">
            <i class="far fa-clock"></i> ${med.time}
          </span>
        </div>
        <div class="status-indicator">
          ${
            isTaken
              ? '<span class="status-badge success"><i class="fas fa-check"></i> Taken</span>'
              : isPast
              ? '<span class="status-badge warning"><i class="fas fa-exclamation"></i> Missed</span>'
              : '<span class="status-badge info"><i class="fas fa-bell"></i> Upcoming</span>'
          }
        </div>
      </div>
      <div class="dose-info">
        <span class="dose">${med.dose}</span>
        ${
          !isTaken && !isPast
            ? `<button onclick="markTaken(${med.id})" class="take-now-btn">
            <i class="fas fa-check"></i> Mark as Taken
          </button>`
            : ""
        }
      </div>
    `;
    todaySchedule.appendChild(item);
  });
}

// Mark medication as taken with feedback
function markTaken(id) {
  const date = new Date().toLocaleDateString();
  if (!takenLog[id]) takenLog[id] = [];

  if (!takenLog[id].includes(date)) {
    takenLog[id].push(date);
    saveMedications();
    renderAll();
    showAlert("Medication marked as taken!", "success");

    // Visual feedback
    const medItem = document.querySelector(`.med-item[data-id="${id}"]`);
    if (medItem) {
      medItem.classList.add("taken-pulse");
      setTimeout(() => medItem.classList.remove("taken-pulse"), 1000);
    }
  } else {
    showAlert("Already marked as taken today.", "info");
  }
}

// Delete medication with confirmation
function deleteMed(id) {
  showDialog(
    "Delete Medication",
    "Are you sure you want to delete this medication? This action cannot be undone.",
    "Delete",
    "Cancel",
    () => {
      medications = medications.filter((med) => med.id !== id);
      delete takenLog[id];
      saveMedications();
      renderAll();
      showAlert("Medication deleted successfully.", "success");
    }
  );
}

// Edit medication (pre-fill form)
function editMed(id) {
  const med = medications.find((m) => m.id === id);
  if (!med) return;

  document.getElementById("medName").value = med.name;
  document.getElementById("medDose").value = med.dose;
  document.getElementById("medDate").value = med.date;
  document.getElementById("medTime").value = med.time;

  // Scroll to form
  document
    .querySelector(".add-medication")
    .scrollIntoView({ behavior: "smooth" });

  // Delete the old entry
  deleteMed(id);
}

// Check for drug interactions
function checkInteractions(newMedName) {
  const interactionMap = {
    Paracetamol: ["Ibuprofen", "Alcohol"],
    Ibuprofen: ["Aspirin", "Blood Pressure Medications"],
    Aspirin: ["Warfarin", "NSAIDs"],
    Metformin: ["Insulin", "Contrast Dye"],
  };

  const interactions = interactionMap[newMedName] || [];

  interactions.forEach((interactingDrug) => {
    if (medications.some((m) => m.name === interactingDrug)) {
      showAlert(
        `⚠️ Potential Interaction: ${newMedName} + ${interactingDrug}`,
        "warning",
        5000
      );
    }
  });
}

// Render adherence chart with Chart.js
function renderChart() {
  if (medications.length === 0) {
    document.getElementById("adherenceChart").innerHTML = `
      <div class="empty-chart">
        <i class="fas fa-chart-pie"></i>
        <p>No data available yet</p>
      </div>
    `;
    return;
  }

  const ctx = document.getElementById("adherenceChart").getContext("2d");
  if (window.chartInstance) window.chartInstance.destroy();

  // Prepare data for last 7 days
  const labels = [];
  const datasets = [];

  // Last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));
  }

  // For each medication, count taken days in last week
  medications.forEach((med) => {
    const takenDays = takenLog[med.id] || [];
    const data = labels.map((label) => {
      return takenDays.includes(label) ? 1 : 0;
    });

    datasets.push({
      label: med.name,
      data,
      backgroundColor: getRandomColor(),
      borderWidth: 1,
    });
  });

  window.chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            callback: (value) => (value === 1 ? "Taken" : "Missed"),
          },
        },
        x: {
          stacked: true,
        },
      },
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return context.raw === 1
                ? `${context.dataset.label}: Taken`
                : `${context.dataset.label}: Missed`;
            },
          },
        },
      },
    },
  });
}

// Download PDF report
downloadBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(67, 97, 238);
  doc.text("MedTrack Pro Report", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 28, {
    align: "center",
  });

  // Current Medications
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Current Medications", 14, 40);

  let y = 50;
  medications.forEach((med, i) => {
    const takenCount = takenLog[med.id]?.length || 0;
    const adherence =
      medications.length > 0
        ? Math.round((takenCount / medications.length) * 100)
        : 0;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`${i + 1}. ${med.name} (${med.dose})`, 16, y);

    doc.setTextColor(100, 100, 100);
    doc.text(`Scheduled: ${med.date} at ${med.time}`, 16, y + 5);
    doc.text(`Taken ${takenCount} times (${adherence}% adherence)`, 16, y + 10);

    y += 18;

    // Page break if needed
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  // Adherence Summary
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Adherence Summary", 14, y + 10);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("Your medication adherence statistics:", 16, y + 20);

  const totalMeds = medications.length;
  const totalTaken = Object.values(takenLog).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const overallAdherence =
    totalMeds > 0 ? Math.round((totalTaken / totalMeds) * 100) : 0;

  doc.text(`Total Medications: ${totalMeds}`, 16, y + 30);
  doc.text(`Total Doses Taken: ${totalTaken}`, 16, y + 40);
  doc.text(`Overall Adherence: ${overallAdherence}%`, 16, y + 50);

  // Save the PDF
  doc.save(`MedTrack_Report_${new Date().toISOString().split("T")[0]}.pdf`);
});

// Helper functions
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

function getRandomColor() {
  const colors = [
    "#4361ee",
    "#3f37c9",
    "#4895ef",
    "#4cc9f0",
    "#7209b7",
    "#560bad",
    "#480ca8",
    "#3a0ca3",
    "#3f37c9",
    "#4361ee",
    "#4895ef",
    "#4cc9f0",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function showAlert(message, type, duration = 3000) {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;

  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), duration);
}

function showDialog(title, message, confirmText, cancelText, onConfirm) {
  const dialog = document.createElement("div");
  dialog.className = "dialog-overlay";

  dialog.innerHTML = `
    <div class="dialog">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="dialog-actions">
        <button class="cancel-btn">${cancelText}</button>
        <button class="confirm-btn">${confirmText}</button>
      </div>
    </div>
  `;

  dialog
    .querySelector(".cancel-btn")
    .addEventListener("click", () => dialog.remove());
  dialog.querySelector(".confirm-btn").addEventListener("click", () => {
    onConfirm();
    dialog.remove();
  });

  document.body.appendChild(dialog);
}
