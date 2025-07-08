
<script>
Plotly.d3.csv("lstm_1_forecast.csv", function(err, rows) {
  const trace = {
    x: rows.map(row => row.Date),
    y: rows.map(row => parseFloat(row['h.1'])),
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: 'orange' },
    name: 'LSTM Forecast'
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
});
</script>

