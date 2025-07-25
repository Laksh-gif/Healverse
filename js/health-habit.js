const habitForm = document.getElementById("habit-form");
const habitInput = document.getElementById("habit-input");
const habitsList = document.getElementById("habits-list");
const progressBar = document.getElementById("progress-bar");
const resetButton = document.getElementById("reset-button");
const weekSelect = document.getElementById("week-select");
const themeSwitch = document.getElementById("themeSwitch");
const themeLabel = document.getElementById("theme-label");
const calendar = document.getElementById("calendar");
const ctx = document.getElementById("habitChart");

let habits = JSON.parse(localStorage.getItem("habits")) || [];
let currentWeek = "this";

// ======================== Theme Toggle ========================
themeSwitch.addEventListener("change", () => {
  document.body.classList.toggle("dark");
  themeLabel.textContent = document.body.classList.contains("dark")
    ? "Dark"
    : "Light";
});

// ======================== Date Helpers ========================
function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

function getWeekDates(weekType) {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  if (weekType === "last") monday.setDate(monday.getDate() - 7);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d.toISOString().split("T")[0]);
  }
  return week;
}

// ======================== Habit Logic ========================
function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

function renderHabits() {
  habitsList.innerHTML = "";
  const today = getTodayDateStr();

  habits.forEach((habit, i) => {
    if (!habit.history) habit.history = {};
    const todayDone = habit.history[today] || false;

    const item = document.createElement("div");
    item.className = "habit-item";

    const left = document.createElement("div");
    left.className = "habit-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todayDone;
    checkbox.addEventListener("change", () => {
      habit.history[today] = checkbox.checked;
      saveHabits();
      renderHabits();
      updateChart();
      renderCalendar();
    });

    const label = document.createElement("label");
    label.textContent = habit.name;

    left.appendChild(checkbox);
    left.appendChild(label);

    const actions = document.createElement("div");
    actions.className = "habit-actions";

    const editBtn = document.createElement("button");
    editBtn.innerHTML = "✏️";
    editBtn.onclick = () => {
      const newName = prompt("Edit Habit", habit.name);
      if (newName) {
        habit.name = newName;
        saveHabits();
        renderHabits();
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.onclick = () => {
      habits.splice(i, 1);
      saveHabits();
      renderHabits();
      updateChart();
      renderCalendar();
    };

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(left);
    item.appendChild(actions);
    habitsList.appendChild(item);
  });

  updateProgress();
}

// ======================== Add Habit ========================
habitForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = habitInput.value.trim();
  if (name) {
    habits.push({ name, history: {} });
    habitInput.value = "";
    saveHabits();
    renderHabits();
    updateChart();
    renderCalendar();
  }
});

// ======================== Reset Today's Habits ========================
resetButton.addEventListener("click", () => {
  const today = getTodayDateStr();
  habits.forEach((h) => (h.history[today] = false));
  saveHabits();
  renderHabits();
  updateChart();
  renderCalendar();
});

// ======================== Progress Bar ========================
function updateProgress() {
  const today = getTodayDateStr();
  const total = habits.length || 1;
  const completed = habits.filter((h) => h.history[today]).length;
  const percent = (completed / total) * 100;
  progressBar.style.width = `${percent}%`;
}

// ======================== Weekly View Switch ========================
weekSelect.addEventListener("change", () => {
  currentWeek = weekSelect.value;
  updateChart();
  renderCalendar();
});

// ======================== Chart.js ========================
let habitChart;
function updateChart() {
  const weekDates = getWeekDates(currentWeek);
  const labels = weekDates.map((d) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short" })
  );
  const data = weekDates.map((date) =>
    habits.reduce((sum, h) => sum + (h.history[date] ? 1 : 0), 0)
  );

  if (habitChart) habitChart.destroy();

  habitChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "# Habits Completed",
          data: data,
          backgroundColor: "#6c63ff",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, stepSize: 1 },
      },
    },
  });
}

// ======================== Calendar View ========================
function renderCalendar() {
  calendar.innerHTML = "";
  const weekDates = getWeekDates(currentWeek);
  weekDates.forEach((date) => {
    const div = document.createElement("div");
    const day = new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
    });
    const count = habits.reduce((sum, h) => sum + (h.history[date] ? 1 : 0), 0);
    div.textContent = day;
    if (count > 0) div.classList.add("done");
    calendar.appendChild(div);
  });
}

// ======================== Init ========================
renderHabits();
updateChart();
renderCalendar();
