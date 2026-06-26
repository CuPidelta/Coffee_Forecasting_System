(function () {
  "use strict";

  const REQUIRED_COLS = [
    "store_location",
    "product_category",
    "day_of_week",
    "month",
    "hour",
    "unit_price",
  ];

  const DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const MONTH_NAMES = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let parsedRows = [];
  let batchResults = [];

  const dropZone = document.getElementById("csv-drop-zone");
  const fileInput = document.getElementById("csvFileInput");
  const fileInfo = document.getElementById("csv-file-info");
  const fileNameEl = document.getElementById("csv-file-name");
  const rowCountEl = document.getElementById("csv-row-count");
  const clearBtn = document.getElementById("csv-clear-btn");
  const predictBtn = document.getElementById("csv-predict-btn");
  const csvBtnText = predictBtn?.querySelector(".csv-btn-text");
  const csvBtnLoader = predictBtn?.querySelector(".csv-btn-loader");
  const templateBtn = document.getElementById("csv-template-btn");
  const exportBatchBtn = document.getElementById("csv-export-btn");
  const errorBox = document.getElementById("csv-error-box");
  const errorMsg = document.getElementById("csv-error-msg");
  const progressWrap = document.getElementById("csv-progress-wrap");
  const progressBar = document.getElementById("csv-progress-bar");
  const progressLabel = document.getElementById("csv-progress-label");
  const resultsWrap = document.getElementById("csv-results-wrap");
  const tableWrap = document.getElementById("csv-results-table-wrap");

  if (!dropZone) return;

  // Drag-and-drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", (e) => {
    if (!dropZone.contains(e.relatedTarget))
      dropZone.classList.remove("drag-over");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) processFile(fileInput.files[0]);
  });

  clearBtn?.addEventListener("click", resetUpload);

  function processFile(file) {
    hideError();
    resetResults();
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showError("Only .csv files are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target.result, file.name);
    reader.onerror = () =>
      showError("Could not read the file. Please try again.");
    reader.readAsText(file);
  }

  function parseCSV(text, filename) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      showError("CSV is empty or has no data rows.");
      return;
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
    if (missing.length) {
      showError(
        `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
      );
      return;
    }

    parsedRows = lines
      .slice(1)
      .filter((l) => l.trim())
      .map((line, idx) => {
        const vals = line.split(",").map((v) => v.trim());
        const row = { _lineNum: idx + 2 };
        headers.forEach((h, i) => (row[h] = vals[i] ?? ""));
        return row;
      });

    if (!parsedRows.length) {
      showError("CSV has headers but no data rows.");
      return;
    }

    fileInfo.style.display = "flex";
    fileNameEl.textContent = filename;
    rowCountEl.textContent = `${parsedRows.length} row${parsedRows.length !== 1 ? "s" : ""}`;
    predictBtn.disabled = false;
  }

  predictBtn?.addEventListener("click", runBatch);

  async function runBatch() {
    if (!parsedRows.length) return;
    setBatchLoading(true);
    hideError();
    resetResults();
    batchResults = [];

    const total = parsedRows.length;
    progressWrap.style.display = "flex";
    updateProgress(0, total);

    for (let i = 0; i < total; i++) {
      const result = await predictRow(parsedRows[i]);
      batchResults.push(result);
      updateProgress(i + 1, total);
    }

    // Push all successes to dashboard in ONE batch call → single chart.update()
    const successRows = batchResults
      .filter((r) => r.success)
      .map((r) => {
        const dayNum = parseInt(r.day_of_week);
        const monthNum = parseInt(r.month);
        return {
          predictedValue: r.predicted,
          category: r.product_category,
          hour: parseInt(r.hour),
          meta: {
            location: r.store_location,
            category: r.product_category,
            day: DAY_NAMES[dayNum] ?? r.day_of_week,
            month: MONTH_NAMES[monthNum] ?? r.month,
            hour: r.hour,
            price: parseFloat(r.unit_price),
            source: "csv",
          },
        };
      });

    if (successRows.length && typeof window.showBatchResults === "function") {
      window.showBatchResults(successRows);
    }

    renderResultsTable(batchResults);
    setBatchLoading(false);
  }

  async function predictRow(row) {
    const payload = {
      store_location: row.store_location,
      product_category: row.product_category,
      day_of_week: parseInt(row.day_of_week),
      month: parseInt(row.month),
      hour: parseInt(row.hour),
      unit_price: parseFloat(row.unit_price),
    };
    try {
      const res = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success)
        return {
          ...row,
          success: true,
          predicted: parseFloat(data.predicted_sales),
        };
      return { ...row, success: false, error: data.message || "Server error" };
    } catch (err) {
      return {
        ...row,
        success: false,
        error: err.message || "Connection failed",
      };
    }
  }

  function renderResultsTable(results) {
    if (!results.length) return;
    const successCount = results.filter((r) => r.success).length;
    const totalPredicted = results
      .filter((r) => r.success)
      .reduce((s, r) => s + r.predicted, 0);

    const summaryBar = `<div class="csv-summary-bar">
      <div class="csv-summary-item">Rows: <strong>${results.length}</strong></div>
      <div class="csv-summary-item">Successful: <strong>${successCount}</strong></div>
      <div class="csv-summary-item">Failed: <strong>${results.length - successCount}</strong></div>
      <div class="csv-summary-item">Total predicted (y): <strong>₱${totalPredicted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
    </div>`;

    const thead = `<tr><th>#</th><th>Store Location</th><th>Category</th><th>Day</th><th>Month</th><th>Hour</th><th>Unit Price</th><th>Predicted (y)</th></tr>`;

    const tbody = results
      .map((r, i) => {
        const dayLabel = DAY_NAMES[parseInt(r.day_of_week)] ?? r.day_of_week;
        const monthLabel = MONTH_NAMES[parseInt(r.month)] ?? r.month;
        const predCell = r.success
          ? `<td class="td-predicted">₱${r.predicted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>`
          : `<td class="td-error"><i class="ti ti-alert-triangle"></i> ${r.error}</td>`;
        return `<tr>
        <td class="td-row-num">${i + 1}</td>
        <td>${r.store_location}</td><td>${r.product_category}</td>
        <td>${dayLabel}</td><td>${monthLabel}</td><td>${r.hour}:00</td>
        <td>₱${parseFloat(r.unit_price).toFixed(2)}</td>${predCell}
      </tr>`;
      })
      .join("");

    tableWrap.innerHTML =
      summaryBar +
      `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
    resultsWrap.style.display = "block";
  }

  exportBatchBtn?.addEventListener("click", () => {
    if (!batchResults.length) return;
    const rows = [
      [
        "#",
        "Store Location",
        "Product Category",
        "Day of Week",
        "Month",
        "Hour",
        "Unit Price (₱)",
        "Predicted Sales (₱)",
        "Status",
      ],
    ];
    batchResults.forEach((r, i) => {
      rows.push([
        i + 1,
        r.store_location,
        r.product_category,
        DAY_NAMES[parseInt(r.day_of_week)] ?? r.day_of_week,
        MONTH_NAMES[parseInt(r.month)] ?? r.month,
        `${r.hour}:00`,
        parseFloat(r.unit_price),
        r.success ? r.predicted : "—",
        r.success ? "OK" : r.error,
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Batch Predictions");
    XLSX.writeFile(wb, "Batch_Forecast_Results.xlsx");
  });

  templateBtn?.addEventListener("click", () => {
    const header = REQUIRED_COLS.join(",");
    const samples = [
      "Lower Manhattan,Coffee,0,1,8,4.50",
      "Hell's Kitchen,Tea,3,6,14,3.25",
      "Astoria,Bakery,5,3,10,3.50",
      "Lower Manhattan,Branded,2,11,9,15.00",
      "Hell's Kitchen,Drinking Chocolate,4,7,16,4.00",
    ].join("\n");
    const blob = new Blob([header + "\n" + samples], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "forecast_batch_template.csv",
    });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  function setBatchLoading(loading) {
    if (!predictBtn || !csvBtnText || !csvBtnLoader) return;
    predictBtn.disabled = loading;
    csvBtnText.hidden = loading;
    csvBtnLoader.hidden = !loading;
    if (!loading) progressWrap.style.display = "none";
  }

  function updateProgress(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressBar.style.width = pct + "%";
    progressLabel.textContent = `${done} / ${total}`;
  }

  function showError(msg) {
    errorBox.style.display = "flex";
    errorMsg.textContent = msg;
    parsedRows = [];
    predictBtn.disabled = true;
    fileInfo.style.display = "none";
  }

  function hideError() {
    errorBox.style.display = "none";
    errorMsg.textContent = "";
  }
  function resetResults() {
    resultsWrap.style.display = "none";
    tableWrap.innerHTML = "";
    batchResults = [];
  }
  function resetUpload() {
    parsedRows = [];
    fileInput.value = "";
    fileInfo.style.display = "none";
    predictBtn.disabled = true;
    hideError();
    resetResults();
    progressWrap.style.display = "none";
  }
})();
