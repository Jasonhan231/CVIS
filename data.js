
const trace = {
  x: ['2025-06-01', '2025-06-02', '2025-06-03', '2025-06-04', '2025-06-05'],
  y: [45.1, 44.3, 43.2, 42.0, 42.8],
  type: 'scatter',
  mode: 'lines+markers',
  line: { color: 'lime' },
  name: 'DVOL'
};

const layout = {
  plot_bgcolor: '#111',
  paper_bgcolor: '#111',
  font: { color: '#fff' },
  title: 'BTC DVOL (Volatility Index)',
  xaxis: { title: 'Date' },
  yaxis: { title: 'Volatility' }
};

Plotly.newPlot('chart', [trace], layout);
