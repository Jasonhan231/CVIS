function updateSliderValue(id) {
  const value = document.getElementById(id).value;
  document.getElementById(id + "_value").textContent = value + "%";
}
function drawMainChart() {
  const layout = {
    title: "Volatility Forecast",
    paper_bgcolor: "#111",
    plot_bgcolor: "#111",
    font: { color: "#fff" },
    xaxis: { title: "Date" },
    yaxis: { title: "Volatility" }
  };

  const modelCheckboxes = document.getElementById("modelCheckboxes");
  modelCheckboxes.innerHTML = '<label><input type="checkbox" id="selectAllModels" checked> All</label><br>';

  const traces = Object.keys(allModelData).map(model => {
    const checkbox = document.createElement("label");
    checkbox.innerHTML = `<input type="checkbox" class="modelCheckbox" data-model="${model}" checked> ${model}`;
    modelCheckboxes.appendChild(checkbox);
    modelCheckboxes.appendChild(document.createElement("br"));

    return {
      x: allModelData[model].map(d => d.date),
      y: allModelData[model].map(d => d.value),
      name: model,
      type: "scatter",
      line: { width: 1 }
    };
  });

  traces.unshift({
    x: actualData.map(d => d.date),
    y: actualData.map(d => d.value),
    name: "Actual",
    type: "scatter",
    line: { color: "white", width: 2 }
  });

  Plotly.newPlot("chart", traces, layout).then(gd => {
    gd.on('plotly_click', function(data) {
      const clickedDate = data.points[0].x;
      updatePerformanceTables(clickedDate);
    });
    gd.on('plotly_relayout', function(eventData) {
    const x0 = eventData['xaxis.range[0]'];
    const x1 = eventData['xaxis.range[1]'];
    if (!x0 || !x1) return;

    const allY = [];

    traces.forEach(trace => {
      for (let i = 0; i < trace.x.length; i++) {
        const date = trace.x[i];
        if (new Date(date) >= new Date(x0) && new Date(date) <= new Date(x1)) {
          allY.push(trace.y[i]);
        }
      }
    });

    if (allY.length > 0) {
      const minY = Math.min(...allY);
      const maxY = Math.max(...allY);
      Plotly.relayout("chart", {
        'yaxis.range': [minY - 0.5, maxY + 0.5]
      });
    }
  });
  
  });
    // monitor checkbox changes to update the chart
  document.querySelectorAll(".modelCheckbox").forEach(cb => {
    cb.addEventListener("change", () => {
      const selectedModels = Array.from(document.querySelectorAll(".modelCheckbox"))
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.model);

      const newTraces = [];

      // Actual IVX
      newTraces.push({
        x: actualData.map(d => d.date),
        y: actualData.map(d => d.value),
        name: "Actual",
        type: "scatter",
        line: { color: "white", width: 2 }
      });

      
      selectedModels.forEach(model => {
        newTraces.push({
          x: allModelData[model].map(d => d.date),
          y: allModelData[model].map(d => d.value),
          name: model,
          type: "scatter",
          line: { width: 1 }
        });
      });

      Plotly.react("chart", newTraces,layout);
    });
  });

  
  const selectAll = document.getElementById("selectAllModels");
  selectAll.addEventListener("change", () => {
    const checked = selectAll.checked;
    document.querySelectorAll(".modelCheckbox").forEach(cb => {
      cb.checked = checked;
    });

    
    const event = new Event("change");
    document.querySelector(".modelCheckbox").dispatchEvent(event);
  });

}

function updatePlot() {
  const weights = getWeights();
  const customTrace = generateCustomForecast(weights);
  Plotly.d3.select('#chart').node()._fullData.forEach((t, i) => {
      if (t.name === "Custom Forecast") {
        Plotly.deleteTraces("chart", i);  
      }
    });

  Plotly.addTraces("chart", customTrace); 
  
}


function rmspe(actual, predicted) {
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== 0) {
      const error = (actual[i] - predicted[i]) / actual[i];
      sum += error * error;
    }
  }
  return Math.sqrt(sum / actual.length);
}

function calculateModelPerformance(startDate) {
  const periods = [1, 7, 30];
  const startIndex = actualData.findIndex(d => d.date === startDate);
  if (startIndex === -1) return null;

  const performance = {};

  
  const periodDates = {};
  for (const p of periods) {
    const dates = actualData.slice(startIndex, startIndex + p).map(d => d.date);
    if (dates.length < p) continue; 
    periodDates[p] = dates;
  }

  for (const model in allModelData) {
    performance[model] = {};

    for (const p of periods) {
      const dates = periodDates[p];
      if (!dates) {
        performance[model][`RMSPE_${p}`] = NaN;
        continue;
      }

      
      const predSlice = dates.map(date => {
        const found = allModelData[model].find(d => d.date === date);
        return found ? found.value : null;
      });

      const actualSlice = dates.map(date => {
        const found = actualData.find(d => d.date === date);
        return found ? found.value : null;
      });

      
      if (predSlice.includes(null) || actualSlice.includes(null)) {
        console.warn(` Skipping ${model} for period ${p} due to insufficient data`);
        performance[model][`RMSPE_${p}`] = NaN;
        continue;
      }

      const error = rmspe(actualSlice, predSlice);
      performance[model][`RMSPE_${p}`] = error;
      console.log(` Model: ${model}, Period: ${p}, RMSPE: ${error}`);
    }
  }

  return performance;
}



function updatePerformanceTables(startDate) {
  const perf = calculateModelPerformance(startDate);
  if (!perf) return;

  const periods = [1, 7, 30];
  const weights = getWeights();

  const startIndex = actualData.findIndex(d => d.date === startDate);
  const customPred = actualData.map((_, i) => {
    if (i < startIndex) return null;
    let val = 0;
    for (const model in allModelData) {
      val += (weights[model] || 0) * (allModelData[model][i]?.value || 0);
    }
    return { date: actualData[i].date, value: val };
  });

  perf["CUSTOM"] = {};
  for (const p of periods) {
    const actualSlice = actualData.slice(startIndex, startIndex + p).map(d => d.value);
    const predSlice = customPred.slice(startIndex, startIndex + p).map(d => d.value);
    perf["CUSTOM"][`RMSPE_${p}`] = rmspe(actualSlice, predSlice);
  }

  periods.forEach(p => {
    let minModel = "N/A";
    let minVal = Infinity;
    for (const model in perf) {
      if (model === "CUSTOM") continue;  // Skip custom model for best model comparison
      const val = perf[model][`RMSPE_${p}`];
      if (val < minVal && !isNaN(val)) {
        minModel = model;
        minVal = val;
      }
    }

    document.querySelector(`#best_model_${p}`).textContent = minModel;
    document.querySelector(`#best_rmspe_${p}`).textContent = minVal.toFixed(4);

    const customVal = perf["CUSTOM"][`RMSPE_${p}`];
    const improvement = ((minVal - customVal) / minVal) * 100;
    document.querySelector(`#custom_rmspe_${p}`).textContent = customVal.toFixed(4);
    document.querySelector(`#custom_improve_${p}`).textContent = 
      isNaN(improvement) ? "N/A" : `${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`;
  });
}

preloadAllData(() => {
  drawMainChart();
});