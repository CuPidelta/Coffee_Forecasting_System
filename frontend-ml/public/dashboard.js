const analyticsState = {
  forecasts: [],
  catTotals: {},
  trendChart: null,
};

//  (STORE BRANCHES)
const STORE_COLORS = {
  "Lower Manhattan": "#5c62f5",
  "Hell's Kitchen": "#f59e0b",
  Astoria: "#10b981",
};
const DEFAULT_COLOR = "#94a3b8";

//  (PRODUCT CATEGORIES)
const CAT_COLORS = {
  Coffee: "#6366f1",
  Tea: "#06b6d4",
  Bakery: "#d946ef",
  Branded: "#3b82f6",
  "Coffee beans": "#a855f7",
  "Drinking Chocolate": "#f97316",
  Flavours: "#ec4899",
  "Loose Tea": "#84cc16",
  "Packaged Chocolate": "#14b8a6",
};

// STEP 1: Initialization of Graph (Chart.js)
function initTrendChart() {
  const ctx = document.getElementById("trendChart");
  if (!ctx) return;
  analyticsState.trendChart = new Chart(ctx, {
    type: "line",
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#ffffff",
            font: { size: 12, weight: "bold" },
            boxWidth: 15,
            generateLabels: (chart) => {
              return Object.keys(STORE_COLORS).map((loc) => ({
                text: `${loc} Branch Line`,
                fillStyle: STORE_COLORS[loc],
                strokeStyle: STORE_COLORS[loc],
                lineWidth: 3,
                fontColor: "#ffffff",
                hidden: false,
                index: 0,
              }));
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.98)",
          titleColor: "#ffffff",
          titleFont: { weight: "bold", size: 13 },
          bodyColor: "#e2e8f0",
          bodyFont: { size: 12 },
          borderColor: "#334155",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (context) => {
              const item = context[0].dataset.rawObjects[context[0].dataIndex];
              return item ? `Branch Forecast #${context[0].raw.x}` : "";
            },
            label: (context) => {
              const rawData = context.dataset.rawObjects[context.dataIndex];
              if (rawData) {
                return [
                  ` Branch [X]: ${rawData.location}`,
                  ` Category [X]: ${rawData.category.toUpperCase()}`,
                  ` Date [X]: ${rawData.month}, ${rawData.day} (${rawData.hour}:00)`,
                  ` Price [X]: ₱${Number(rawData.price).toFixed(2)}`,
                  ` Pred Yield [y]: ₱${Number(rawData.value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                  rawData.source === "csv"
                    ? " [via CSV Batch]"
                    : " [via Manual Form]",
                ];
              }
              return (
                " Predicted Target y: ₱" +
                Number(context.raw.y).toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })
              );
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: "Sequence of Runs per Store Branch",
            color: "#ffffff",
            font: { weight: "bold" },
          },
          grid: { color: "rgba(255,255,255,0.12)" },
          ticks: {
            color: "#e2e8f0",
            font: { size: 11, weight: "500" },
            stepSize: 1,
            callback: (v) => "Run " + v,
          },
        },
        y: {
          title: {
            display: true,
            text: "Target Output (y) - total_sales_amount",
            color: "#ffffff",
            font: { weight: "bold" },
          },
          grid: { color: "rgba(255,255,255,0.12)" },
          ticks: {
            color: "#e2e8f0",
            font: { size: 11, weight: "500" },
            callback: (v) => "₱" + Math.round(v).toLocaleString(),
          },
        },
      },
    },
  });
}

// STEP 2: Update UI State, Group Datasets
// source: "manual" | "csv"
function updateAnalytics(predictedValue, category, hour, detailedMeta = {}) {
  const source = detailedMeta.source || "manual";
  const label =
    source === "csv"
      ? `CSV #${analyticsState.forecasts.filter((f) => f.source === "csv").length + 1}`
      : "Run #" + (analyticsState.forecasts.length + 1);

  analyticsState.forecasts.push({
    label,
    value: predictedValue,
    category,
    hour,
    location: detailedMeta.location || "—",
    day: detailedMeta.day || "—",
    month: detailedMeta.month || "—",
    price: detailedMeta.price || 0,
    source,
  });

  analyticsState.catTotals[category] =
    (analyticsState.catTotals[category] || 0) + predictedValue;

  refreshDashboard();
}

// STEP 2b: Accept an array of results at once (CSV batch — single chart.update call)
function updateAnalyticsBatch(rows) {
  rows.forEach(({ predictedValue, category, hour, meta }) => {
    const source = "csv";
    const label = `CSV #${analyticsState.forecasts.filter((f) => f.source === "csv").length + 1}`;

    analyticsState.forecasts.push({
      label,
      value: predictedValue,
      category,
      hour,
      location: meta.location || "—",
      day: meta.day || "—",
      month: meta.month || "—",
      price: meta.price || 0,
      source,
    });

    analyticsState.catTotals[category] =
      (analyticsState.catTotals[category] || 0) + predictedValue;
  });

  refreshDashboard();
}

function refreshDashboard() {
  const forecasts = analyticsState.forecasts;
  if (!forecasts.length) return;

  const total = forecasts.reduce((s, f) => s + f.value, 0);
  const avg = total / forecasts.length;
  const topCat = Object.entries(analyticsState.catTotals).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const peakForecast = [...forecasts].sort((a, b) => b.value - a.value)[0];

  // KPI cards
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set(
    "stat-total",
    "₱" + total.toLocaleString("en-PH", { minimumFractionDigits: 2 }),
  );
  set("stat-total-sub", forecasts.length + " model run(s) recorded");
  set(
    "stat-avg",
    "₱" + avg.toLocaleString("en-PH", { minimumFractionDigits: 2 }),
  );
  set("stat-count-sub", forecasts.length + " total predictions (y)");
  set("stat-top-cat", topCat ? topCat[0] : "—");
  set(
    "stat-top-val",
    topCat
      ? "Total y: ₱" +
          topCat[1].toLocaleString("en-PH", { minimumFractionDigits: 2 })
      : "",
  );
  set("stat-peak-hour", peakForecast ? peakForecast.hour + ":00" : "—");
  set(
    "stat-peak-sub",
    peakForecast
      ? "Max y: ₱" +
          peakForecast.value.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
          })
      : "",
  );

  // Trend chart
  const chart = analyticsState.trendChart;
  if (chart) {
    const storeDatasets = {};
    const storeCounters = {};

    forecasts.forEach((f) => {
      const loc = f.location;
      const categoryColor = CAT_COLORS[f.category] || DEFAULT_COLOR;

      if (!storeDatasets[loc]) {
        storeCounters[loc] = 0;
        storeDatasets[loc] = {
          label: loc,
          data: [],
          rawObjects: [],
          borderColor: STORE_COLORS[loc] || DEFAULT_COLOR,
          borderWidth: 3.5,
          backgroundColor: "transparent",
          pointBackgroundColor: [],
          pointBorderColor: [],
          pointBorderWidth: 2,
          pointRadius: 7,
          pointHoverRadius: 9,
          pointHoverBorderWidth: 3,
          tension: 0.2,
        };
      }

      storeCounters[loc] += 1;
      storeDatasets[loc].data.push({ x: storeCounters[loc], y: f.value });
      storeDatasets[loc].pointBackgroundColor.push(categoryColor);
      // CSV rows get a distinct point border to distinguish them visually
      storeDatasets[loc].pointBorderColor.push(
        f.source === "csv" ? "#facc15" : "#ffffff",
      );
      storeDatasets[loc].rawObjects.push(f);
    });

    chart.data.datasets = Object.values(storeDatasets);
    chart.update();
  }

  const chartHint = document.getElementById("chart-hint");
  if (chartHint) {
    const csvCount = forecasts.filter((f) => f.source === "csv").length;
    const manualCount = forecasts.filter((f) => f.source === "manual").length;
    const parts = [];
    if (manualCount) parts.push(`${manualCount} manual`);
    if (csvCount) parts.push(`${csvCount} via CSV`);
    chartHint.textContent = `${forecasts.length} prediction(s) recorded (${parts.join(", ")})`;
  }

  // Category bars
  const catList = document.getElementById("cat-list");
  if (catList) {
    const sorted = Object.entries(analyticsState.catTotals).sort(
      (a, b) => b[1] - a[1],
    );
    const maxVal = sorted[0][1];
    catList.innerHTML = sorted
      .map(([cat, val]) => {
        const pct = Math.round((val / maxVal) * 100);
        const color = CAT_COLORS[cat] || DEFAULT_COLOR;
        return `<div class="cat-bar-item">
          <div class="cat-bar-name" style="font-weight:600;">${cat}</div>
          <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${color};box-shadow:0 0 4px ${color};"></div></div>
          <div class="cat-bar-val" style="font-weight:bold;color:#ffffff;">₱${val.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
        </div>`;
      })
      .join("");
  }
}

// Global: triggered by script.js after a successful manual prediction
window.showResult = function (value, formData) {
  const meta = document.getElementById("result-meta-list");
  if (meta && formData) {
    meta.innerHTML = `
      <div class="meta-row"><span>Store Location [X]</span><span style="color:#ffffff;font-weight:bold;">${formData.location || "—"}</span></div>
      <div class="meta-row"><span>Product Category [X]</span><span style="color:#ffffff;font-weight:bold;">${formData.category || "—"}</span></div>
      <div class="meta-row"><span>Day of Week [X]</span><span style="color:#ffffff;font-weight:bold;">${formData.day || "—"}</span></div>
      <div class="meta-row"><span>Month [X]</span><span style="color:#ffffff;font-weight:bold;">${formData.month || "—"}</span></div>
      <div class="meta-row"><span>Hour [X]</span><span style="color:#ffffff;font-weight:bold;">${formData.hour || "—"}</span></div>
      <div class="meta-row"><span>Unit Price [X]</span><span style="color:#ffffff;font-weight:bold;">₱${Number(formData.price || 0).toFixed(2)}</span></div>
    `;
  }

  const numVal = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const cat = document.getElementById("product_category").value;
  const hr = parseInt(document.getElementById("hour").value);

  if (!isNaN(numVal)) {
    updateAnalytics(numVal, cat, hr, { ...formData, source: "manual" });
  }
};

// Global: called by csv-upload.js after all batch rows are done
window.showBatchResults = function (batchRows) {
  if (!Array.isArray(batchRows) || !batchRows.length) return;
  updateAnalyticsBatch(batchRows);
};

// STEP 3: Excel Report Export (SheetJS)
function exportToExcel() {
  if (analyticsState.forecasts.length === 0) {
    alert("Please run at least one forecast prediction before exporting.");
    return;
  }

  const totalSales = analyticsState.forecasts.reduce(
    (sum, f) => sum + f.value,
    0,
  );
  const avgSales = totalSales / analyticsState.forecasts.length;
  const topCatArr = Object.entries(analyticsState.catTotals).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const peakF = [...analyticsState.forecasts].sort(
    (a, b) => b.value - a.value,
  )[0];

  const summaryData = [
    ["ML Pipeline Analytics Summary", "Value Metric"],
    ["Total Aggregated Sales [y Target]", totalSales],
    ["Average predicted_sales per Run [y Target]", avgSales],
    ["Top Category Feature [X Feature]", topCatArr ? topCatArr[0] : "N/A"],
    ["Peak Hour Feature [X Feature]", peakF ? `${peakF.hour}:00` : "N/A"],
  ];

  const categoryData = [
    ["Product Category [X Feature]", "Total Predicted Sales [y Target] (₱)"],
  ];
  Object.entries(analyticsState.catTotals).forEach(([cat, val]) => {
    categoryData.push([cat, val]);
  });

  const detailedData = [
    [
      "Forecast Reference ID",
      "Source",
      "Store Location [Input Feature X]",
      "Product Category [Input Feature X]",
      "Target Calendar Month [Input Feature X]",
      "Day of the Week [Input Feature X]",
      "Hour of Day [Input Feature X]",
      "Unit Basket Price [Input Feature X]",
      "Predicted total_sales_amount [Target Output y]",
    ],
  ];
  analyticsState.forecasts.forEach((f) => {
    detailedData.push([
      f.label,
      f.source === "csv" ? "CSV Batch" : "Manual Form",
      f.location,
      f.category,
      f.month,
      f.day,
      `${f.hour}:00`,
      f.price,
      f.value,
    ]);
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryData),
    "Model Target Overview",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(categoryData),
    "Category y-Breakdown",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(detailedData),
    "All Predictions (X→y)",
  );
  XLSX.writeFile(wb, "ML_Pipeline_X_y_Forecast_Report.xlsx");
}

// STEP 4: Graph PNG Export
function downloadChartAsImage() {
  const chartInstance = analyticsState.trendChart;
  if (!chartInstance || analyticsState.forecasts.length === 0) {
    alert(
      "Please run at least one forecast prediction to generate a graph before downloading.",
    );
    return;
  }
  const imageURI = chartInstance.toBase64Image();
  const a = document.createElement("a");
  a.href = imageURI;
  a.download = "ML_Pipeline_X_y_Trend_Graph.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initTrendChart();

  const exportBtn = document.getElementById("export-excel-btn");
  if (exportBtn) exportBtn.addEventListener("click", exportToExcel);

  const downloadGraphBtn = document.getElementById("download-graph-btn");
  if (downloadGraphBtn)
    downloadGraphBtn.addEventListener("click", downloadChartAsImage);
});
