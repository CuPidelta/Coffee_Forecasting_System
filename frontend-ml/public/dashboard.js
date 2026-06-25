const analyticsState = {
  forecasts: [],
  catTotals: {},
  trendChart: null,
};

// HIGH-CONTRAST VIBRANT COLORS FOR LINES (STORE BRANCHES)
const STORE_COLORS = {
  "Lower Manhattan": "#5c62f5", // Vibrant Electric Indigo
  "Hell's Kitchen": "#f59e0b", // High-Visibility Amber/Orange
  Astoria: "#10b981", // Bright Neon Emerald Green
};
const DEFAULT_COLOR = "#94a3b8";

// HIGH-CONTRAST NEON/BRIGHT COLORS FOR POINTS (PRODUCT CATEGORIES)
const CAT_COLORS = {
  Coffee: "#6366f1", // Vivid Indigo
  Tea: "#06b6d4", // Bright Cyan/Sky Blue
  Bakery: "#d946ef", // Vibrant Magenta/Pink
  Branded: "#3b82f6", // Crisp Royal Blue
  "Coffee beans": "#a855f7", // Neon Purple
  "Drinking Chocolate": "#f97316", // Flame Orange
  Flavours: "#ec4899", // Hot Pink
  "Loose Tea": "#84cc16", // Lime Green
  "Packaged Chocolate": "#14b8a6", // Bright Teal
};

// STEP 1: Initialization of Graph (Chart.js) - White Text Legend & Category Color-Matched Tooltips
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
            color: "#ffffff", // Pure white text para sa legend box labels
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

// STEP 2: Update UI State, Group Datasets (Connected Lines by Store, Point Node Colors by Category)
function updateAnalytics(predictedValue, category, hour, detailedMeta = {}) {
  const label = "Run #" + (analyticsState.forecasts.length + 1);

  analyticsState.forecasts.push({
    label,
    value: predictedValue,
    category,
    hour: hour,
    location: detailedMeta.location || "—",
    day: detailedMeta.day || "—",
    month: detailedMeta.month || "—",
    price: detailedMeta.price || 0,
  });

  analyticsState.catTotals[category] =
    (analyticsState.catTotals[category] || 0) + predictedValue;

  const total = analyticsState.forecasts.reduce((s, f) => s + f.value, 0);
  const avg = total / analyticsState.forecasts.length;
  const topCat = Object.entries(analyticsState.catTotals).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const peakForecast = [...analyticsState.forecasts].sort(
    (a, b) => b.value - a.value,
  )[0];

  // Update UI KPI Cards
  const statTotal = document.getElementById("stat-total");
  const statTotalSub = document.getElementById("stat-total-sub");
  const statAvg = document.getElementById("stat-avg");
  const statCountSub = document.getElementById("stat-count-sub");
  const statTopCat = document.getElementById("stat-top-cat");
  const statTopVal = document.getElementById("stat-top-val");
  const statPeakHour = document.getElementById("stat-peak-hour");
  const statPeakSub = document.getElementById("stat-peak-sub");

  if (statTotal)
    statTotal.textContent =
      "₱" + total.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  if (statTotalSub)
    statTotalSub.textContent =
      analyticsState.forecasts.length + " model run(s) recorded";
  if (statAvg)
    statAvg.textContent =
      "₱" + avg.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  if (statCountSub)
    statCountSub.textContent =
      analyticsState.forecasts.length + " total predictions (y)";
  if (statTopCat) statTopCat.textContent = topCat ? topCat[0] : "—";
  if (statTopVal)
    statTopVal.textContent = topCat
      ? "Total y: ₱" +
        topCat[1].toLocaleString("en-PH", { minimumFractionDigits: 2 })
      : "";
  if (statPeakHour)
    statPeakHour.textContent = peakForecast ? peakForecast.hour + ":00" : "—";
  if (statPeakSub)
    statPeakSub.textContent = peakForecast
      ? "Max y: ₱" +
        peakForecast.value.toLocaleString("en-PH", { minimumFractionDigits: 2 })
      : "";

  // Update Graph Engine (Linear Unbroken Point Linking Strategy)
  const chart = analyticsState.trendChart;
  if (chart) {
    const storeDatasets = {};
    const storeCounters = {};

    analyticsState.forecasts.forEach((f) => {
      const loc = f.location;
      const cat = f.category;
      const categoryColor = CAT_COLORS[cat] || DEFAULT_COLOR;

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

      storeDatasets[loc].data.push({
        x: storeCounters[loc],
        y: f.value,
      });

      storeDatasets[loc].pointBackgroundColor.push(categoryColor);
      storeDatasets[loc].pointBorderColor.push("#ffffff"); // Isolation contrast stroke

      storeDatasets[loc].rawObjects.push(f);
    });

    chart.data.datasets = Object.values(storeDatasets);
    chart.update();
  }

  const chartHint = document.getElementById("chart-hint");
  if (chartHint) {
    chartHint.textContent =
      analyticsState.forecasts.length + " target output values (y) recorded";
  }

  const legendEl = document.getElementById("trend-legend");
  if (legendEl) legendEl.innerHTML = "";

  // Update Category Progress bars list
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
        <div class="cat-bar-name" style="font-weight: 600;">${cat}</div>
        <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${color};box-shadow: 0 0 4px ${color};"></div></div>
        <div class="cat-bar-val" style="font-weight: bold; color: #ffffff;">₱${val.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
      </div>`;
      })
      .join("");
  }
}

// Global window event triggered upon a successful API submission from script.js
window.showResult = function (value, formData) {
  const meta = document.getElementById("result-meta-list");
  if (meta && formData) {
    meta.innerHTML = `
      <div class="meta-row"><span>Store Location [X]</span><span style="color:#ffffff; font-weight:bold;">${formData.location || "—"}</span></div>
      <div class="meta-row"><span>Product Category [X]</span><span style="color:#ffffff; font-weight:bold;">${formData.category || "—"}</span></div>
      <div class="meta-row"><span>Day of Week [X]</span><span style="color:#ffffff; font-weight:bold;">${formData.day || "—"}</span></div>
      <div class="meta-row"><span>Month [X]</span><span style="color:#ffffff; font-weight:bold;">${formData.month || "—"}</span></div>
      <div class="meta-row"><span>Hour [X]</span><span style="color:#ffffff; font-weight:bold;">${formData.hour || "—"}</span></div>
      <div class="meta-row"><span>Unit Price [X]</span><span style="color:#ffffff; font-weight:bold;">₱${Number(formData.price || 0).toFixed(2)}</span></div>
    `;
  }
  const numVal = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const cat = document.getElementById("product_category").value;
  const hr = parseInt(document.getElementById("hour").value);
  if (!isNaN(numVal)) updateAnalytics(numVal, cat, hr, formData);
};

// STEP 3: Excel Report Spreadsheet Generation (SheetJS XLSX)
function exportToExcel() {
  if (analyticsState.forecasts.length === 0) {
    alert(
      "Please run at least one forecast prediction before trying to export data.",
    );
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

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsCategory = XLSX.utils.aoa_to_sheet(categoryData);
  const wsDetailed = XLSX.utils.aoa_to_sheet(detailedData);

  XLSX.utils.book_append_sheet(wb, wsSummary, "Model Target Overview");
  XLSX.utils.book_append_sheet(wb, wsCategory, "Category y-Breakdown");
  XLSX.utils.book_append_sheet(wb, wsDetailed, "Configure Input Features (X)");

  XLSX.writeFile(wb, "ML_Pipeline_X_y_Forecast_Report.xlsx");
}

// STEP 4: Graph Canvas PNG Exporter Image Engine Logic
function downloadChartAsImage() {
  const chartInstance = analyticsState.trendChart;

  if (!chartInstance || analyticsState.forecasts.length === 0) {
    alert(
      "Please run at least one forecast prediction to generate a graph before downloading.",
    );
    return;
  }

  const imageURI = chartInstance.toBase64Image();
  const downloadLink = document.createElement("a");
  downloadLink.href = imageURI;
  downloadLink.download = "ML_Pipeline_X_y_Trend_Graph.png";

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// Event Listeners setup when webpage DOM loads fully
document.addEventListener("DOMContentLoaded", () => {
  initTrendChart();

  const exportBtn = document.getElementById("export-excel-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToExcel);
  }

  const downloadGraphBtn = document.getElementById("download-graph-btn");
  if (downloadGraphBtn) {
    downloadGraphBtn.addEventListener("click", downloadChartAsImage);
  }
});
