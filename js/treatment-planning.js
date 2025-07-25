document
  .getElementById("treatmentForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    // Get input values
    const name = document.getElementById("name").value.trim();
    const condition = document.getElementById("condition").value.trim();
    const preference = document.getElementById("preferences").value;
    const symptoms = document.getElementById("symptoms").value.trim();
    const bp = document.getElementById("bp").value.trim();
    const sugar = parseInt(document.getElementById("sugar").value);
    const heartRate = parseInt(document.getElementById("heartRate").value);
    const date = document.getElementById("date").value;

    // Determine severity class
    let severityClass = "severity-mild";
    let severityText = "🟢 Mild";

    if (sugar > 180 || heartRate > 110) {
      severityClass = "severity-severe";
      severityText = "🔴 Severe – Immediate attention suggested!";
    } else if (sugar > 140 || heartRate > 90) {
      severityClass = "severity-moderate";
      severityText = "🟡 Moderate – Monitor closely.";
    }

    // Generate AI-like treatment plan
    const planText = generatePlan(
      condition,
      preference,
      sugar,
      heartRate,
      bp,
      symptoms
    );

    // Output HTML
    const planHTML = `
    <div class="${severityClass}">
      <strong>📅 Date:</strong> ${date}<br>
      <strong>👤 Patient:</strong> ${name}<br>
      <strong>🩺 Condition:</strong> ${condition}<br>
      <strong>⚠️ Severity:</strong> ${severityText}<br><br>
      <strong>📝 Symptoms:</strong> ${symptoms || "Not specified"}<br>
      <strong>💊 Preference:</strong> ${getPreferenceText(preference)}<br><br>
      <strong>🧠 AI Plan Suggestion:</strong><br>
      ${planText}
    </div>
  `;

    document.getElementById("planContent").innerHTML = planHTML;
    document.getElementById("result").classList.remove("hidden");

    drawVitalsChart(bp, sugar, heartRate);
  });

function getPreferenceText(pref) {
  if (pref === "minimal") return "Minimal Side Effects";
  if (pref === "cost") return "Cost Efficient";
  return "Quick Recovery";
}

function generatePlan(
  condition,
  preference,
  sugar,
  heartRate,
  bpStr,
  symptoms
) {
  const systolicBP = parseInt(bpStr.split("/")[0]);
  const points = [];

  // Base suggestion
  points.push("• Confirm diagnosis with recent lab reports and vitals.");
  points.push(`• Personalized plan to target <em>${condition}</em>.`);

  // Vitals logic
  if (systolicBP > 140)
    points.push("• Consider anti-hypertensive therapy due to elevated BP.");
  if (sugar > 180)
    points.push("• Begin low-glycemic diet & blood sugar medication.");
  if (heartRate > 100) points.push("• ECG recommended to rule out arrhythmia.");

  // Condition logic
  if (/asthma|breathing|lungs/i.test(condition)) {
    points.push("• Prescribe bronchodilators and recommend spirometry test.");
  } else if (/diabetes/i.test(condition)) {
    points.push("• Initiate metformin-based therapy and glucose monitoring.");
  } else if (/covid|fever|infection/i.test(condition)) {
    points.push(
      "• Recommend antiviral or antibiotic treatment based on bloodwork."
    );
  } else if (/hypertension|high bp/i.test(condition)) {
    points.push("• Suggest DASH diet and monitor BP twice daily.");
  } else if (/thyroid/i.test(condition)) {
    points.push("• Perform TSH test and consider thyroxine therapy.");
  }

  // Preferences
  if (preference === "minimal") {
    points.push("• Use lowest effective dose to minimize side effects.");
  } else if (preference === "cost") {
    points.push("• Prefer generic medication and avoid unnecessary tests.");
  } else if (preference === "quick") {
    points.push("• Consider aggressive treatment with close follow-ups.");
  }

  // Symptom suggestions
  if (symptoms.toLowerCase().includes("fatigue")) {
    points.push("• Include multivitamins and hydration for fatigue.");
  }
  if (symptoms.toLowerCase().includes("nausea")) {
    points.push("• Prescribe antiemetics and bland diet recommendations.");
  }
  if (symptoms.toLowerCase().includes("headache")) {
    points.push("• Recommend hydration, paracetamol, and sleep hygiene.");
  }

  points.push("• Weekly checkups and patient monitoring advised.");

  return points.join("<br>");
}

// 📊 Chart drawing
function drawVitalsChart(bpStr, sugar, hr) {
  const systolic = parseInt(bpStr.split("/")[0]);
  const ctx = document.getElementById("vitalsChart").getContext("2d");

  if (window.vitalsChartInstance) {
    window.vitalsChartInstance.destroy();
  }

  window.vitalsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Systolic BP", "Sugar (mg/dL)", "Heart Rate (bpm)"],
      datasets: [
        {
          label: "Vitals",
          data: [systolic, sugar, hr],
          backgroundColor: [
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(255, 99, 132, 0.6)",
          ],
          borderColor: [
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(255, 99, 132, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

// 📥 Download report
function downloadReport() {
  const text = document.getElementById("planContent").innerText;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Treatment_Plan.txt";
  link.click();
}
