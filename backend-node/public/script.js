// ── Price ranges per category (min, max from CSV data) ──────
const PRICE_RANGES = {
  Bakery: { min: 2.65, max: 5.63, default: 3.5 },
  Branded: { min: 12.0, max: 28.0, default: 15.0 },
  Coffee: { min: 2.0, max: 4.25, default: 3.5 },
  "Coffee beans": { min: 10.0, max: 45.0, default: 12.0 },
  "Drinking Chocolate": { min: 3.5, max: 4.75, default: 4.0 },
  Flavours: { min: 0.8, max: 0.8, default: 0.8 },
  "Loose Tea": { min: 8.95, max: 10.95, default: 9.0 },
  "Packaged Chocolate": { min: 6.4, max: 13.33, default: 7.0 },
  Tea: { min: 2.5, max: 4.0, default: 3.0 },
};

// ── Init: make sure error/result boxes are hidden on load ────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("result-box").hidden = true;
  document.getElementById("error-box").hidden = true;
  document.getElementById("price-hint").hidden = true;
});

// ── DOM refs ─────────────────────────────────────────────────
const form = document.getElementById("prediction-form");
const categoryEl = document.getElementById("product_category");
const priceEl = document.getElementById("unit_price");
const priceHint = document.getElementById("price-hint");
const btn = document.getElementById("predict-btn");
const btnText = btn.querySelector(".btn-text");
const btnLoader = btn.querySelector(".btn-loader");
const resultBox = document.getElementById("result-box");
const resultValue = document.getElementById("predicted-value");
const errorBox = document.getElementById("error-box");
const errorMsg = document.getElementById("error-msg");

// ── Auto-fill price range when category changes ───────────────
categoryEl.addEventListener("change", () => {
  const cat = categoryEl.value;
  const range = PRICE_RANGES[cat];

  if (!range) {
    priceEl.removeAttribute("min");
    priceEl.removeAttribute("max");
    priceEl.value = "";
    priceEl.placeholder = "Pumili ng kategorya muna";
    priceEl.disabled = true;
    priceHint.hidden = true;
    return;
  }

  priceEl.disabled = false;
  priceEl.min = range.min;
  priceEl.max = range.max;
  priceEl.value = range.default;
  priceEl.step = "0.01";

  if (range.min === range.max) {
    priceHint.textContent = `Nakatakdang presyo: ₱${range.min.toFixed(2)}`;
  } else {
    priceHint.textContent = `Mula ₱${range.min.toFixed(2)} hanggang ₱${range.max.toFixed(2)}`;
  }
  priceHint.hidden = false;
});

// ── Form submit ───────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Always reset both boxes first
  resultBox.hidden = true;
  errorBox.hidden = true;

  // Validate category picked
  if (!categoryEl.value) {
    showError("Pumili muna ng product category.");
    return;
  }

  // Validate price within range
  const cat = categoryEl.value;
  const range = PRICE_RANGES[cat];
  const price = parseFloat(priceEl.value);

  if (range && (price < range.min || price > range.max)) {
    showError(
      `Ang presyo para sa "${cat}" ay dapat nasa pagitan ng ₱${range.min.toFixed(2)} at ₱${range.max.toFixed(2)}.`,
    );
    return;
  }

  const payload = {
    store_location: document.getElementById("store_location").value,
    product_category: cat,
    day_of_week: document.getElementById("day_of_week").value,
    month: document.getElementById("month").value,
    hour: document.getElementById("hour").value,
    unit_price: price,
  };

  setLoading(true);

  try {
    const response = await fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      resultValue.textContent = `₱${Number(data.predicted_sales).toFixed(2)}`;
      resultBox.hidden = false;
      errorBox.hidden = true;
    } else {
      resultBox.hidden = true;
      showError(data.message || "Hindi ma-predict ang halaga. Subukan ulit.");
    }
  } catch (err) {
    console.error("Prediction error:", err);
    showError(
      "Hindi makakonekta sa ML server. Siguraduhin na tumatakbo ang Flask sa localhost:5000.",
    );
  } finally {
    setLoading(false);
  }
});

// ── Helpers ───────────────────────────────────────────────────
function setLoading(loading) {
  btn.disabled = loading;
  btnText.hidden = loading;
  btnLoader.hidden = !loading;
}

function showError(message) {
  errorMsg.textContent = message;
  errorBox.hidden = false;
}
