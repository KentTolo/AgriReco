const API_BASE = "http://localhost:8000";
const authToken = localStorage.getItem("auth_token");

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch("http://localhost:8000/users/me", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch user data");

    const user = await response.json();
    document.getElementById("username").textContent =
      user.full_name || user.email;
  } catch (error) {
    console.error("Authentication check failed:", error);
    await supabase.auth.signOut();
    window.location.href = "login.html";
  }
});

// Add logout function
async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem("auth_token");
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", function () {
  function loadMap() {
    return new Promise((resolve) => {
      const map = L.map("map", {
        loadingControl: true,
      }).setView([-29.6133, 28.2336], 8);

      const tileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "© OpenStreetMap contributors",
        }
      ).addTo(map);

      tileLayer.on("load", () => {
        document.getElementById("map-loading").style.display = "none";
        resolve(map);
      });
    });
  }

  const sensors = [
    {
      name: "National University of Lesotho",
      location: [-29.4477, 27.7428],
      status: "Active",
      type: "Environmental",
      lastReading: "10 minutes ago",
    },
    {
      name: "Lerotholi Polytechnic",
      location: [-29.3167, 27.4833],
      status: "Active",
      type: "Soil",
      lastReading: "5 minutes ago",
    },
    {
      name: "Agriculture College",
      location: [-28.8786, 28.0478],
      status: "Active",
      type: "Weather",
      lastReading: "2 minutes ago",
    },
  ];

  loadMap()
    .then((map) => {
      const SensorIcon = L.divIcon({
        className: "sensor-marker",
        html: "📍",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });

      sensors.forEach((sensor) => {
        const marker = L.marker(sensor.location, {
          icon: SensorIcon,
        }).addTo(map);

        const popupContent = `
                      <div class="sensor-popup">
                          <h3>${sensor.name}</h3>
                          <p><strong>Status:</strong> ${sensor.status}</p>
                          <p><strong>Type:</strong> ${sensor.type}</p>
                          <p><strong>Last Reading:</strong> ${sensor.lastReading}</p>
                      </div>
                  `;

        marker.bindPopup(popupContent);
      });

      const fieldSelect = document.getElementById("fieldSelect");
      if (fieldSelect) {
        fieldSelect.addEventListener("change", function (e) {
          const selectedField = e.target.value;
          const sensor = sensors.find((s) => s.name === selectedField);

          if (sensor) {
            map.setView(sensor.location, 13);
          }
        });
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    })
    .catch((error) => {
      console.error("Error loading map:", error);
      document.getElementById("map-loading").textContent =
        "Error loading map. Please refresh the page.";
    });
});

document
  .getElementById("fieldForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const authToken = localStorage.getItem("auth_token");
    if (!authToken) {
      window.location.href = "login.html";
      return;
    }

    const data = {
      N: parseInt(document.getElementById("N").value),
      P: parseInt(document.getElementById("P").value),
      K: parseInt(document.getElementById("K").value),
      temperature: parseFloat(document.getElementById("temperature").value),
      humidity: parseFloat(document.getElementById("humidity").value),
      ph: parseFloat(document.getElementById("ph").value),
      rainfall: parseFloat(document.getElementById("rainfall").value),
    };

    try {
      const response = await fetch("http://localhost:8000/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      showRecommendation(result.recommended_crop, data);
    } catch (error) {
      console.error("Recommendation failed:", error);
      alert("Failed to get recommendation. Please try again.");
    }
  });

//Recommendation function

function showRecommendation(crop, conditions) {
  const recommendationCard = document.createElement("div");
  recommendationCard.className = "recommendation-card";

  recommendationCard.innerHTML = `
          <div class="recommendation-header">
              <div class="recommendation-icon">🌱</div>
              <h2 class="recommendation-title">Crop Recommendation</h2>
          </div>
          
          <div class="crop-name">
              <h3>${crop}</h3>
          </div>
          
          <div class="conditions-grid">
              <div class="condition-card">
                  <div class="condition-value">${conditions.temperature}°C</div>
                  <div class="condition-label">Temperature</div>
              </div>
              <div class="condition-card">
                  <div class="condition-value">${conditions.humidity}%</div>
                  <div class="condition-label">Humidity</div>
              </div>
              <div class="condition-card">
                  <div class="condition-value">${conditions.ph}</div>
                  <div class="condition-label">pH Level</div>
              </div>
              <div class="condition-card">
                  <div class="condition-value">${conditions.rainfall}mm</div>
                  <div class="condition-label">Rainfall</div>
              </div>
          </div>
          
          <div class="success-rate">
              <div>Estimated Success Rate</div>
              <div class="progress-bar">
                  <div class="progress-fill">
                      <span class="progress-percentage">80%</span>
                  </div>
              </div>
          </div>
      `;

  const existingRecommendation = document.querySelector(".recommendation-card");
  if (existingRecommendation) {
    existingRecommendation.replaceWith(recommendationCard);
  } else {
    document.getElementById("recommendationSection").innerHTML = "";
    document
      .getElementById("recommendationSection")
      .appendChild(recommendationCard);
    document.getElementById("recommendationSection").style.display = "block";
  }

  setTimeout(() => {
    const progressFill = recommendationCard.querySelector(".progress-fill");
    progressFill.style.width = "85%";
  }, 100);
}

function setActiveTab(tabId) {
  document.querySelectorAll(".content-area").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.getElementById(tabId).classList.add("active");

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });
  event.target.classList.add("active");
}

const ctx = document.getElementById("growthChart").getContext("2d");
new Chart(ctx, {
  type: "line",
  data: {
    labels: ["April", "May", "June", "July", "August", "September"],
    datasets: [
      {
        label: "Carrots Growth",
        data: [1000, 5000, 7000, 9800, 12000, 15000],
        borderColor: "#1B4D3E",
        tension: 0.4,
        fill: false,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "9.8K carrots",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value + "k";
          },
        },
      },
    },
  },
});

const fields = {
  "National University of Lesotho": {
    length: 1000,
    width: 750,
    location: "Roma, Lesotho",
  },
  "Lerotholi Polytechnic": {
    length: 750,
    width: 500,
    location: "Maseru, Lesotho",
  },
  "Agriculture College": {
    length: 500,
    width: 500,
    location: "Hlotse, Lesotho",
  },
};

const cropData = {
  "National University of Lesotho": {
    crop: "Maize",
    timeline: [
      {
        day: "1",
        stage: "Planting",
        description: "Seeds planted in moist soil",
      },
      {
        day: "5-10",
        stage: "Emergence",
        description: "Seedlings emerge from soil",
      },
      {
        day: "14-21",
        stage: "Early Vegetative",
        description: "First true leaves appear",
      },
      {
        day: "28-35",
        stage: "V6 Stage",
        description: "Six leaves fully emerged",
      },
      { day: "42-49", stage: "V12 Stage", description: "Rapid growth begins" },
      { day: "50-63", stage: "Tasseling", description: "Tassels emerge" },
      { day: "64-84", stage: "Silking", description: "Silks emerge from ears" },
      {
        day: "85-105",
        stage: "Kernel Development",
        description: "Kernels fill with starch",
      },
      {
        day: "105-119",
        stage: "Dent Stage",
        description: "Kernels begin to dry",
      },
      { day: "120-140", stage: "Maturity", description: "Black layer forms" },
    ],
  },
  "Lerotholi Polytechnic": {
    crop: "Wheat",
    timeline: [
      {
        day: "1",
        stage: "Planting",
        description: "Seeds sown at appropriate depth",
      },
      { day: "7-10", stage: "Germination", description: "First shoots emerge" },
      {
        day: "14-25",
        stage: "Tillering",
        description: "Multiple stems develop",
      },
      {
        day: "26-45",
        stage: "Stem Extension",
        description: "Rapid vertical growth",
      },
      { day: "46-60", stage: "Heading", description: "Seed heads emerge" },
      { day: "61-77", stage: "Flowering", description: "Pollination occurs" },
      { day: "78-95", stage: "Grain Fill", description: "Kernels develop" },
      {
        day: "96-120",
        stage: "Maturity",
        description: "Grain hardens and dries",
      },
    ],
  },
  "Agriculture College": {
    crop: "Potatoes",
    timeline: [
      { day: "1", stage: "Planting", description: "Seed potatoes planted" },
      {
        day: "14-20",
        stage: "Emergence",
        description: "Sprouts break through",
      },
      {
        day: "21-40",
        stage: "Vegetative Growth",
        description: "Leaf development",
      },
      {
        day: "41-55",
        stage: "Tuber Initiation",
        description: "Small potatoes form",
      },
      {
        day: "56-75",
        stage: "Tuber Bulking",
        description: "Potatoes increase in size",
      },
      { day: "76-95", stage: "Maturation", description: "Vines die back" },
      {
        day: "96-110",
        stage: "Harvest Ready",
        description: "Ready for harvest",
      },
    ],
  },
};

function updateTrackCropSection(fieldName) {
  const cropInfo = cropData[fieldName];
  if (!cropInfo) {
    document.getElementById("trackCropTitle").textContent =
      "Select a field to track crops";
    document.getElementById("trackCropStatus").textContent = "";
    return;
  }

  // Get the plantation date from local storage
  const plantationDate = localStorage.getItem(`${fieldName}_plantationDate`);
  if (!plantationDate) {
    document.getElementById("trackCropTitle").textContent =
      "Select a field to track crops";
    document.getElementById("trackCropStatus").textContent = "";
    return;
  }

  // Calculate the current day
  const currentDay = calculateCurrentDay(plantationDate);

  // Update header
  document.getElementById(
    "trackCropTitle"
  ).textContent = `Track Crop: ${cropInfo.crop}`;
  document.getElementById("trackCropStatus").textContent = `Day ${currentDay}`;

  // Update growth stages
  const stages = ["Planting", "Vegetative", "Reproductive", "Maturity"];
  const currentStage = getCurrentStage(cropInfo.timeline, currentDay);

  stages.forEach((stage, index) => {
    const stageElement = document.getElementById(`${stage.toLowerCase()}Stage`);
    const statusText =
      index < stages.indexOf(currentStage)
        ? "Completed"
        : index === stages.indexOf(currentStage)
        ? `In Progress - Day ${currentDay}`
        : "Upcoming";
    stageElement.querySelector("p").textContent = statusText;
  });

  // Update timeline
  const timeline = document.getElementById("cropTimeline");
  timeline.innerHTML = cropInfo.timeline
    .map((item, index) => {
      const dayStart = parseInt(item.day.split("-")[0]);
      const isCompleted = currentDay >= dayStart;
      const isCurrent =
        currentDay >= dayStart &&
        currentDay <= parseInt(item.day.split("-")[1] || dayStart);

      return `
          <div class="timeline-item ${index % 2 === 0 ? "left" : "right"} 
                              ${isCompleted ? "completed" : ""} 
                              ${isCurrent ? "current" : ""}">
              <div class="timeline-content">
                  <h3>Day ${item.day}: ${item.stage}</h3>
                  <p>${item.description}</p>
              </div>
          </div>
      `;
    })
    .join("");
}

function calculateCurrentDay(plantationDate) {
  if (!plantationDate) {
    return 0; // Return 0 if no plantation date is set
  }

  const start = new Date(plantationDate);
  const now = new Date();

  // Check if the plantation date is valid
  if (isNaN(start.getTime())) {
    return 0; // Return 0 if the date is invalid
  }

  const timeDiff = now - start;
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  return daysDiff;
}

function getCurrentStage(timeline, currentDay) {
  for (const item of timeline) {
    const dayStart = parseInt(item.day.split("-")[0]);
    const dayEnd = parseInt(item.day.split("-")[1] || dayStart);
    if (currentDay >= dayStart && currentDay <= dayEnd) {
      return item.stage;
    }
  }
  return "Maturity"; // Default to maturity if no stage matches
}

function updateFieldInfo(fieldName) {
  const field = fields[fieldName];
  if (field) {
    document.getElementById("fieldName").value = fieldName;
    document.getElementById("fieldLength").value = field.length;
    document.getElementById("fieldWidth").value = field.width;
    document.getElementById("fieldLocation").value = field.location;
    generateRandomValues();
    updateTrackCropSection(fieldName);
  } else {
    document.getElementById("fieldName").value = "";
    document.getElementById("fieldLength").value = "";
    document.getElementById("fieldWidth").value = "";
    document.getElementById("fieldLocation").value = "";
    updateTrackCropSection("");
  }
}

document.getElementById("fieldSelect").addEventListener("change", function () {
  updateFieldInfo(this.value);
});

document.getElementById("fieldSelect").addEventListener("change", function () {
  const fieldName = this.value;
  updateFieldInfo(fieldName);

  // Load the saved plantation date for the selected field
  const savedPlantationDate = localStorage.getItem(
    `${fieldName}_plantationDate`
  );
  if (savedPlantationDate) {
    document.getElementById("plantationDate").value = savedPlantationDate;
  } else {
    document.getElementById("plantationDate").value = ""; // Clear if no date is saved
  }
});

// Initialize the track crop section
document.addEventListener("DOMContentLoaded", function () {
  setActiveTab("overview");
  generateRandomValues();
  updateTrackCropSection(""); // Initialize track crop section
});

function generateRandomValues() {
  const temperature = Math.floor(Math.random() * 34) + 1;
  const humidity = Math.random() * 100;
  const pH = Math.floor(Math.random() * 14);
  const nitrogen = Math.floor(Math.random() * (50 - 20)) + 20;
  const phosphorus = Math.floor(Math.random() * (20 - 10)) + 10;
  const potassium = Math.floor(Math.random() * (20 - 10)) + 10;
  const rainfall = Math.floor(Math.random() * 200) + 50;

  document.getElementById("temperature").value = temperature;
  document.getElementById("humidity").value = humidity.toFixed(0);
  document.getElementById("ph").value = pH;
  document.getElementById("N").value = nitrogen;
  document.getElementById("P").value = phosphorus;
  document.getElementById("K").value = potassium;
  document.getElementById("rainfall").value = rainfall;

  document.getElementById("soil-temperature").textContent = `${temperature}°C`;
  document.getElementById("soil-ph").textContent = `pH ${pH}`;
  document.getElementById("air-quality").textContent = `${(
    Math.random() * 100
  ).toFixed(2)}%`;
  document.getElementById("soil-moisture").textContent = `${humidity.toFixed(
    2
  )}%`;
  document.getElementById("land-fertility").textContent = `${(
    (nitrogen + phosphorus + potassium) /
    3
  ).toFixed(2)}%`;

  document.getElementById(
    "real-time-temperature"
  ).textContent = `${temperature}°C`;
  document.getElementById(
    "real-time-humidity"
  ).textContent = `${humidity.toFixed(2)}%`;
  document.getElementById("real-time-ph").textContent = pH;
  document.getElementById("real-time-light").textContent = `${(
    Math.random() * 1000
  ).toFixed(2)} lux`;
}

document.getElementById("fieldSelect").addEventListener("change", function () {
  updateFieldInfo(this.value);
});

document
  .getElementById("addFieldForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const newFieldName = document.getElementById("newFieldName").value;
    const newFieldLength = document.getElementById("newFieldLength").value;
    const newFieldWidth = document.getElementById("newFieldWidth").value;
    const newFieldLocation = document.getElementById("newFieldLocation").value;

    fields[newFieldName] = {
      length: parseInt(newFieldLength),
      width: parseInt(newFieldWidth),
      location: newFieldLocation,
    };

    //add the new field to the drop down
    const option = document.createElement("option");
    option.value = newFieldName;
    option.textContent = newFieldName;
    document.getElementById("fieldSelect").appendChild(option);

    //Clear the form
    this.reset();

    alert("New field added successfully!");
  });

// Event listener for form submission
document.getElementById("fieldForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const temperature = parseFloat(document.getElementById("temperature").value);
  const humidity = parseFloat(document.getElementById("humidity").value);
  const pH = parseFloat(document.getElementById("pH").value);
  const nutrients = parseFloat(document.getElementById("nutrients").value);
  const nitrogen = parseFloat(document.getElementById("nitrogen").value);
  const phosphorus = parseFloat(document.getElementById("phosphorus").value);
  const potassium = parseFloat(document.getElementById("potassium").value);

  const recommendation = provideCropRecommendation(
    temperature,
    humidity,
    pH,
    nitrogen,
    potassium,
    phosphorus
  );

  document.getElementById("recommendedCrop").textContent = recommendation.crop;
  document.getElementById(
    "recommendationReason"
  ).textContent = `Based on the provided conditions, ${recommendation.crop} is the most suitable crop for this field.`;
  document.getElementById(
    "survivalRate"
  ).textContent = `Estimated survival rate: ${recommendation.survivalRate}%`;

  document.getElementById("recommendationSection").style.display = "block";
});

document.getElementById("startTracking").addEventListener("click", function () {
  const fieldName = document.getElementById("fieldSelect").value;
  if (!fieldName) {
    alert("Please select a field.");
    return;
  }
  updateTrackCropSection(fieldName);
});

document.getElementById("startTracking").addEventListener("click", function () {
  const fieldName = document.getElementById("fieldSelect").value;
  const plantationDate = document.getElementById("plantationDate").value;

  if (!fieldName || !plantationDate) {
    alert("Please select a field and enter the plantation date.");
    return;
  }

  // Save the plantation date to local storage
  localStorage.setItem(`${fieldName}_plantationDate`, plantationDate);

  // Update the track crop section
  updateTrackCropSection(fieldName);
});

document.addEventListener("DOMContentLoaded", function () {
  const fieldName = document.getElementById("fieldSelect").value;
  if (fieldName) {
    const savedPlantationDate = localStorage.getItem(
      `${fieldName}_plantationDate`
    );
    if (savedPlantationDate) {
      document.getElementById("plantationDate").value = savedPlantationDate;
    }
  }
});

document.getElementById("clearTracking").addEventListener("click", function () {
  const fieldName = document.getElementById("fieldSelect").value;
  if (fieldName) {
    // Remove the plantation date from local storage
    localStorage.removeItem(`${fieldName}_plantationDate`);

    // Clear the input field
    document.getElementById("plantationDate").value = "";

    // Reset the UI
    document.getElementById("trackCropTitle").textContent =
      "Select a field to track crops";
    document.getElementById("trackCropStatus").textContent = "";
    document.getElementById("cropTimeline").innerHTML = "";

    // Reset the growth stages
    const stages = [
      "plantingStage",
      "vegetativeStage",
      "reproductiveStage",
      "maturityStage",
    ];
    stages.forEach((stage) => {
      const stageElement = document.getElementById(stage);
      stageElement.querySelector("p").textContent = "Select a field";
    });

    alert("Tracking data cleared.");
  }
});

// Check authentication status
document.addEventListener("DOMContentLoaded", function () {
  const authToken = localStorage.getItem("auth_token");

  if (!authToken) {
    window.location.href = "login.html";
  } else {
    // Fetch user details
    fetch("http://localhost:8000/users/me", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unauthorized");
        return response.json();
      })
      .then((user) => {
        document.querySelector(".user-profile span").textContent =
          user.full_name || user.email;
      })
      .catch((error) => {
        localStorage.removeItem("auth_token");
        window.location.href = "login.html";
      });
  }
});

// Add logout functionality
function logout() {
  localStorage.removeItem("auth_token");
  window.location.href = "login.html";
}

if (!authToken) {
  window.location.href = "login.html";
}

// Modify all fetch calls to include the auth header
async function authFetch(url, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
}

async function checkCropCompatibility() {
  const cropInput = document
    .getElementById("cropInput")
    .value.trim()
    .toLowerCase();
  const resultSection = document.getElementById("compatibilityResult");
  const feedbackContent = document.getElementById("feedbackContent");
  const scoreValue = document.getElementById("scoreValue");
  const scoreContainer = document.querySelector(".compatibility-score");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    alert("Please log in to check crop compatibility.");
    window.location.href = "login.html";
    return;
  }

  if (!cropInput) {
    alert("Please enter a crop name.");
    return;
  }

  const data = {
    desired_crop: cropInput,
    N: parseInt(document.getElementById("N").value) || 0,
    P: parseInt(document.getElementById("P").value) || 0,
    K: parseInt(document.getElementById("K").value) || 0,
    temperature: parseFloat(document.getElementById("temperature").value) || 0,
    humidity: parseFloat(document.getElementById("humidity").value) || 0,
    ph: parseFloat(document.getElementById("ph").value) || 0,
    rainfall: parseFloat(document.getElementById("rainfall").value) || 0,
  };

  try {
    feedbackContent.innerHTML = "<p>Analyzing compatibility...</p>";
    resultSection.classList.add("active");

    const response = await fetch("http://localhost:8000/compare_crop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();
      const formattedFeedback = result.feedback.replace(/\n/g, "<br>");
      feedbackContent.innerHTML = `
        <h4>${result.recommended_crop.toUpperCase()} Analysis</h4>
        <div class="expert-feedback">${formattedFeedback}</div>
      `;
      const compatibilityScore =
        result.compatibility_score ||
        calculateCompatibilityScore(result.feedback);
      scoreValue.textContent = `${compatibilityScore}%`;
      scoreContainer.className = "compatibility-score";
      if (compatibilityScore >= 75) {
        scoreContainer.classList.add("compatibility-high");
      } else if (compatibilityScore >= 50) {
        scoreContainer.classList.add("compatibility-medium");
      } else {
        scoreContainer.classList.add("compatibility-low");
      }
      const scoreFill = scoreContainer.querySelector(".score-fill");
      scoreFill.style.width = `${compatibilityScore}%`;
    } else {
      const errorData = await response.json();
      feedbackContent.innerHTML = `<p>Error: ${
        errorData.detail ||
        "Could not retrieve compatibility data. Please try again."
      }</p>`;
    }
  } catch (error) {
    console.error("Error:", error);
    feedbackContent.innerHTML =
      "<p>Analysis failed. Please check input values or try again later.</p>";
  }
}

// Fallback function to calculate compatibility score from feedback text
function calculateCompatibilityScore(feedback) {
  // Simple sentiment analysis to determine score
  const positiveTerms = [
    "suitable",
    "good",
    "excellent",
    "ideal",
    "perfect",
    "recommended",
  ];
  const negativeTerms = [
    "not suitable",
    "poor",
    "challenging",
    "difficult",
    "not recommended",
  ];

  let score = 50; // Default neutral score

  // Check for positive terms
  positiveTerms.forEach((term) => {
    if (feedback.toLowerCase().includes(term)) score += 10;
  });

  // Check for negative terms
  negativeTerms.forEach((term) => {
    if (feedback.toLowerCase().includes(term)) score -= 15;
  });

  // Ensure score is within bounds
  return Math.max(10, Math.min(95, score));
}

setActiveTab("overview");
generateRandomValues();

const { createClient } = supabase;
const supabase = createClient(
  "https://orrpihjleufxfbtpgfwr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycnBpaGpsZXVmeGZidHBnZndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5OTIxNjIsImV4cCI6MjA2MDU2ODE2Mn0.s7t-VwI7yFffkyEUL8dwGCTsXWEe8gKz4njpGQl5ZjI"
);
