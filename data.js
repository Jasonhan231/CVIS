const modelFiles = {
  GARCH: "gm_t_fore_1.csv",
  EGARCH: "egm_t_fore_1.csv",
  GJR: "GJR_t_fore_1.csv",
  TARCH: "tgm_t_fore_1.csv",
  LSTM: "lstm_1_forecast.csv",
  LSTM_SENTIMENT: "lstm_2_forecast.csv"
};

let allModelData = {}; // Holds all model data
let actualData = [];   // All actual data

function loadCSV(file, callback) {
  Plotly.d3.csv(file, function(err, rows) {
    if (err) return alert("Error loading " + file);
    const data = rows.map(r => ({
      date: r.Date,
      value: parseFloat(r['h.1'] || r['IVX'])
    }));
    callback(data);
  });
}

function preloadAllData(callback) {
  const modelNames = Object.keys(modelFiles);
  let loaded = 0;

  
  loadCSV("bitvol_actual.csv", function(data) {
    actualData = data;
    // Each model
    modelNames.forEach(name => {
      loadCSV(modelFiles[name], function(modelData) {
        allModelData[name] = modelData;
        loaded++;
        if (loaded === modelNames.length) {
          callback();
        }
      });
    });
  });
}

function getWeights() {
  return {
    GARCH: parseInt(document.getElementById("GARCH").value) / 100,
    EGARCH: parseInt(document.getElementById("EGARCH").value) / 100,
    GJR: parseInt(document.getElementById("GJR").value) / 100,
    TARCH: parseInt(document.getElementById("TARCH").value) / 100,
    LSTM: parseInt(document.getElementById("LSTM").value) / 100,
    LSTM_SENTIMENT: parseInt(document.getElementById("LSTM_SENTIMENT").value) / 100
  };
}

function generateCustomForecast(weights) {
  
  const modelMap = {};
  for (let model in allModelData) {
    modelMap[model] = new Map();
    allModelData[model].forEach(entry => {
      if (entry.date && !isNaN(entry.value)) {
        modelMap[model].set(entry.date, entry.value);
      }
    });
  }

  
  const commonDates = [...modelMap["GARCH"].keys()].filter(date =>
    Object.keys(weights).every(model => modelMap[model].has(date))
  );

  
  const x = [];
  const y = [];

  for (let date of commonDates) {
    let sum = 0;
    for (let model in weights) {
      const val = modelMap[model].get(date);
      sum += weights[model] * val;
    }
    x.push(date);
    y.push(sum);
  }

  return {
    x: x,
    y: y,
    name: "Custom Forecast",
    type: "scatter",
    line: { color: "orange" }
  };
}





