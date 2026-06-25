const analyticsState = {
  forecasts: [],
  catTotals: {},
  trendChart: null,
};

// STEP 1: Inisyalisasyon ng Graph (Chart.js) na may kasamang Store Location sa tooltips
function initTrendChart() {
  const ctx = document.getElementById("trendChart");
  if (!ctx) return;
  analyticsState.trendChart = new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.95)",
          titleColor: "#e2e8f0",
          bodyColor: "rgba(226,232,240,0.7)",
          // Dito ipinapakita ang Store Location [X] at Predicted Value [y] sa mismong point
          callbacks: {
            label: (context) => {
              const rawData = context.dataset.rawObjects[context.dataIndex];
              if (rawData) {
                return [
                  ` Loc [X]: ${rawData.location}`,
                  ` Pred y: ₱${Number(rawData.value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                ];
              }
              return (
                " Predicted Target y: ₱" +
                Number(context.raw).toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })
              );
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Prediction Runs",
            color: "rgba(226,232,240,0.6)",
          },
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "rgba(226,232,240,0.4)", font: { size: 11 } },
        },
        y: {
          title: {
            display: true,
            text: "Target Output (y) - total_sales_amount",
            color: "rgba(226,232,240,0.6)",
          },
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "rgba(226,232,240,0.4)",
            font: { size: 11 },
            callback: (v) => "₱" + Math.round(v).toLocaleString(),
          },
        },
      },
    },
  });
}

const CAT_COLORS = {
  Coffee: "#6366f1",
  Tea: "#5dcaa5",
  Bakery: "#8b7bb8",
  Branded: "#818cf8",
  "Coffee beans": "#a5b4fc",
  "Drinking Chocolate": "#b87333",
  Flavours: "#e07b54",
  "Loose Tea": "#7dba8a",
  "Packaged Chocolate": "#9b7653",
};
const DEFAULT_COLOR = "#64748b";

// STEP 2: Pag-update ng UI State, Graph Datasets, at Progress Bars
function updateAnalytics(predictedValue, category, hour, detailedMeta = {}) {
  const label = "Run #" + (analyticsState.forecasts.length + 1);

  // I-save ang lahat ng impormasyon (X features at y target) para sa Excel at Tooltip
  analyticsState.forecasts.push({
    label,
    value: predictedValue, // target variable (y)
    category, // feature (X)
    hour: hour, // feature (X)
    location: detailedMeta.location || "—", // feature (X)
    day: detailedMeta.day || "—", // feature (X)
    month: detailedMeta.month || "—", // feature (X)
    price: detailedMeta.price || 0, // feature (X)
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

  // I-update ang mga KPI Cards sa Dashboard UI
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

  // I-update ang Line Graph Datasets kasama ang rawObjects metadata
  const chart = analyticsState.trendChart;
  if (chart) {
    chart.data.labels = analyticsState.forecasts.map((f) => f.label);

    const catDatasets = {};
    analyticsState.forecasts.forEach((f) => {
      if (!catDatasets[f.category]) {
        catDatasets[f.category] = {
          label: f.category,
          data: [],
          rawObjects: [], // Repository para sa metadata (doon kinukuha ang location)
          borderColor: CAT_COLORS[f.category] || DEFAULT_COLOR,
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
        };
      }
    });

    analyticsState.forecasts.forEach((f, i) => {
      Object.keys(catDatasets).forEach((cat) => {
        if (f.category === cat) {
          catDatasets[cat].data[i] = f.value;
          catDatasets[cat].rawObjects[i] = f;
        } else {
          catDatasets[cat].data[i] = null;
          catDatasets[cat].rawObjects[i] = null;
        }
      });
    });

    chart.data.datasets = Object.values(catDatasets);
    chart.update();
  }

  const chartHint = document.getElementById("chart-hint");
  if (chartHint) {
    chartHint.textContent =
      analyticsState.forecasts.length + " target output values (y) recorded";
  }

  // I-update ang Legend ng Chart
  const legendEl = document.getElementById("trend-legend");
  if (legendEl) {
    const activeCats = [
      ...new Set(analyticsState.forecasts.map((f) => f.category)),
    ];
    legendEl.innerHTML = activeCats
      .map(
        (cat) =>
          `<span class="leg-item"><span class="leg-dot" style="background:${CAT_COLORS[cat] || DEFAULT_COLOR}"></span>${cat}</span>`,
      )
      .join("");
  }

  // I-update ang Table/List Progress Bars para sa Product Category
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
        <div class="cat-bar-name">${cat}</div>
        <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="cat-bar-val">₱${val.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
      </div>`;
      })
      .join("");
  }
}

// Global window function na tinatawag ng script.js kapag nag-success ang API response
window.showResult = function (value, formData) {
  const meta = document.getElementById("result-meta-list");
  if (meta && formData) {
    meta.innerHTML = `
      <div class="meta-row"><span>Store Location [X]</span><span>${formData.location || "—"}</span></div>
      <div class="meta-row"><span>Product Category [X]</span><span>${formData.category || "—"}</span></div>
      <div class="meta-row"><span>Day of Week [X]</span><span>${formData.day || "—"}</span></div>
      <div class="meta-row"><span>Month [X]</span><span>${formData.month || "—"}</span></div>
      <div class="meta-row"><span>Hour [X]</span><span>${formData.hour || "—"}:00</span></div>
      <div class="meta-row"><span>Unit Price [X]</span><span>₱${Number(formData.price || 0).toFixed(2)}</span></div>
    `;
  }
  const numVal = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const cat = document.getElementById("product_category").value;
  const hr = parseInt(document.getElementById("hour").value);
  if (!isNaN(numVal)) updateAnalytics(numVal, cat, hr, formData);
};

// STEP 3: Excel Generation Engine gamit ang SheetJS (XLSX) - May Kasamang X at y Labels
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

  // Tab 1 Data: Overview Summary metrics (Inilagay ang X at y sa mga deskripsyon)
  const summaryData = [
    ["ML Pipeline Analytics Summary", "Value Metric"],
    ["Total Aggregated Sales [y Target]", totalSales],
    ["Average predicted_sales per Run [y Target]", avgSales],
    ["Top Category Feature [X Feature]", topCatArr ? topCatArr[0] : "N/A"],
    ["Peak Hour Feature [X Feature]", peakF ? `${peakF.hour}:00` : "N/A"],
  ];

  // Tab 2 Data: Category distribution ng target output (y)
  const categoryData = [
    ["Product Category [X Feature]", "Total Predicted Sales [y Target] (₱)"],
  ];
  Object.entries(analyticsState.catTotals).forEach(([cat, val]) => {
    categoryData.push([cat, val]);
  });

  // Tab 3 Data: Detalyadong matrix log ng X at y features (Nilagyan ang bawat column header ng [X] o [y])
  const detailedData = [
    [
      "Forecast Reference ID",
      "Store Location [X]",
      "Product Category [X]",
      "Month [X]",
      "Day of Week [X]",
      "Hour of Day [X]",
      "Unit Price [X]",
      "Predicted total_sales_amount [y]",
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

  // Paggawa ng workbook at mga worksheets
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsCategory = XLSX.utils.aoa_to_sheet(categoryData);
  const wsDetailed = XLSX.utils.aoa_to_sheet(detailedData);

  // Pag-append ng tabs sa Excel File
  XLSX.utils.book_append_sheet(wb, wsSummary, "Model Target Overview");
  XLSX.utils.book_append_sheet(wb, wsCategory, "Category y-Breakdown");
  XLSX.utils.book_append_sheet(wb, wsDetailed, "X and y Dataset Logs");

  // Pag-download ng File
  XLSX.writeFile(wb, "ML_Pipeline_X_y_Forecast_Report.xlsx");
}

// Event Listeners kapag tapos nang mag-load ang webpage DOM
document.addEventListener("DOMContentLoaded", () => {
  initTrendChart();

  const exportBtn = document.getElementById("export-excel-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToExcel);
  }
});
