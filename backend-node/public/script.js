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

const form = document.getElementById("prediction-form");
const categoryEl = document.getElementById("product_category");
const priceEl = document.getElementById("unit_price");
const priceHint = document.getElementById("price-hint");
const btn = document.getElementById("predict-btn");
const btnText = btn ? btn.querySelector(".btn-text") : null;
const btnLoader = btn ? btn.querySelector(".btn-loader") : null;
const resultBox = document.getElementById("result-box");
const resultValue = document.getElementById("predicted-value");
const errorBox = document.getElementById("error-box");
const errorMsg = document.getElementById("error-msg");

if (categoryEl) {
  categoryEl.addEventListener("change", () => {
    const cat = categoryEl.value;
    const range = PRICE_RANGES[cat];

    if (!range) {
      priceEl.removeAttribute("min");
      priceEl.removeAttribute("max");
      priceEl.value = "";
      priceEl.placeholder = "Select a category first";
      priceEl.disabled = true;
      priceHint.style.display = "none";
      return;
    }

    priceEl.disabled = false;
    priceEl.min = range.min;
    priceEl.max = range.max;
    priceEl.value = range.default;
    priceEl.step = "0.01";

    priceHint.textContent =
      range.min === range.max
        ? `Fixed price: ₱${range.min.toFixed(2)}`
        : `Range: ₱${range.min.toFixed(2)} – ₱${range.max.toFixed(2)}`;
    priceHint.style.display = "block";
  });
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    hideResult();
    hideError();

    if (!categoryEl.value) {
      showError("Please select a product category.");
      return;
    }

    const cat = categoryEl.value;
    const range = PRICE_RANGES[cat];
    const price = parseFloat(priceEl.value);

    if (range && (price < range.min || price > range.max)) {
      showError(
        `Price for "${cat}" must be between ₱${range.min.toFixed(2)} and ₱${range.max.toFixed(2)}.`,
      );
      return;
    }

    const locationEl = document.getElementById("store_location");
    const dayEl = document.getElementById("day_of_week");
    const monthEl = document.getElementById("month");
    const hourEl = document.getElementById("hour");

    const payload = {
      store_location: locationEl.value,
      product_category: cat,
      day_of_week: dayEl.value,
      month: monthEl.value,
      hour: hourEl.value,
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
        const formatted = `₱${Number(data.predicted_sales).toFixed(2)}`;
        resultValue.textContent = formatted;
        showResult();

        // Tinatawag nito ang function na nasa dashboard.js para i-update ang mga graph at tables
        if (typeof window.showResult === "function") {
          window.showResult(formatted, {
            location: locationEl.value,
            category: cat,
            day: dayEl.options[dayEl.selectedIndex].text,
            month: monthEl.options[monthEl.selectedIndex].text,
            hour: hourEl.value,
            price: price,
          });
        }
      } else {
        showError(
          data.message || "Could not generate a prediction. Please try again.",
        );
      }
    } catch (err) {
      console.error("Prediction error:", err);
      showError(
        "Could not connect to the ML server. Make sure Flask is running on localhost:5000.",
      );
    } finally {
      setLoading(false);
    }
  });
}

function setLoading(loading) {
  if (!btn || !btnText || !btnLoader) return;
  btn.disabled = loading;
  btnText.hidden = loading;
  btnLoader.hidden = !loading;
}

function showResult() {
  if (resultBox) resultBox.style.display = "grid";
}

function hideResult() {
  if (resultBox) resultBox.style.display = "none";
}

function showError(message) {
  if (!errorBox || !errorMsg) return;
  errorMsg.textContent = message;
  errorBox.style.display = "flex";
}

function hideError() {
  if (!errorBox || !errorMsg) return;
  errorBox.style.display = "none";
  errorMsg.textContent = "";
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}
