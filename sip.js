let sips = JSON.parse(localStorage.getItem('sips')) || [];
let sipChart = null;

function addSIP() {
  const name     = document.getElementById('s-name').value     || 'Fund';
  const monthly  = parseFloat(document.getElementById('s-monthly').value)  || 0;
  const invested = parseFloat(document.getElementById('s-invested').value) || 0;
  const value    = parseFloat(document.getElementById('s-value').value)    || 0;
  const cagr     = parseFloat(document.getElementById('s-cagr').value)     || 12;
  const stepup   = parseFloat(document.getElementById('s-stepup').value)   || 0;

  if (!monthly) { alert('Enter a monthly SIP amount.'); return; }

  sips.push({ id: Date.now(), name, monthly, invested, value, cagr, stepup });
  localStorage.setItem('sips', JSON.stringify(sips));

  document.getElementById('s-name').value     = '';
  document.getElementById('s-monthly').value  = '';
  document.getElementById('s-invested').value = '0';
  document.getElementById('s-value').value    = '0';
  renderSIP();
}

function deleteSIP(id) {
  if (!confirm('Delete this fund?')) return;
  sips = sips.filter(s => s.id !== id);
  localStorage.setItem('sips', JSON.stringify(sips));
  renderSIP();
}

function projectCorpus(fund, years) {
  let corpus  = fund.value || 0;
  let monthly = fund.monthly;
  const mr    = fund.cagr / 100 / 12;
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) corpus = corpus * (1 + mr) + monthly;
    monthly *= (1 + fund.stepup / 100);
  }
  return Math.round(corpus);
}

function renderSIP() {
  const root         = document.getElementById('tab-sip');
  const totalMonthly = sips.reduce((s, f) => s + f.monthly,  0);
  const totalInvested = sips.reduce((s, f) => s + f.invested, 0);
  const totalValue    = sips.reduce((s, f) => s + f.value,    0);
  const totalGain     = totalValue - totalInvested;

  root.innerHTML = `
    <div class="card">
      <div class="card-title">Add a fund</div>
      <div class="row-line"><span>Fund name</span>
        <input id="s-name" type="text" placeholder="Nifty 50 Index" style="width:160px"></div>
      <div class="row-line"><span>Monthly SIP (₹)</span>
        <input id="s-monthly" type="number" placeholder="10,000" style="width:120px"></div>
      <div class="row-line"><span>Amount invested so far (₹)</span>
        <input id="s-invested" type="number" value="0" style="width:120px"></div>
      <div class="row-line"><span>Current value (₹)</span>
        <input id="s-value" type="number" value="0" style="width:120px"></div>
      <div class="row-line"><span>Expected CAGR (%)</span>
        <input id="s-cagr" type="number" value="12" step="0.5" style="width:80px"></div>
      <div class="row-line"><span>Annual step-up (%)</span>
        <input id="s-stepup" type="number" value="10" step="1" style="width:80px"></div>
      <button class="btn-green" onclick="addSIP()" style="margin-top:12px; width:100%">+ Add fund</button>
    </div>

    ${sips.length ? `
    <div class="metrics">
      <div class="metric"><div class="metric-label">Monthly SIP</div><div class="metric-val blue">${fmt(totalMonthly)}</div></div>
      <div class="metric"><div class="metric-label">Total invested</div><div class="metric-val">${fmt(totalInvested)}</div></div>
      <div class="metric"><div class="metric-label">Current value</div><div class="metric-val blue">${fmt(totalValue)}</div></div>
      <div class="metric"><div class="metric-label">Total gain</div><div class="metric-val ${totalGain >= 0 ? 'green' : 'red'}">${totalGain >= 0 ? '+' : ''}${fmt(totalGain)}</div></div>
    </div>

    <div class="card">
      <div class="card-title">20-year corpus projection — all funds</div>
      <div class="chart-wrap" style="height:240px">
        <canvas id="sip-line" role="img" aria-label="SIP corpus projection for all funds over 20 years"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Portfolio breakdown at year 20</div>
      <div class="chart-row" style="margin:0">
        <div style="height:200px; position:relative">
          <canvas id="sip-pie" role="img" aria-label="SIP portfolio share at 20 years"></canvas>
        </div>
        <div style="display:flex; flex-direction:column; justify-content:center; gap:8px; padding:8px">
          ${sips.map((f, i) => `
            <div style="display:flex; align-items:center; gap:8px">
              <span style="width:10px; height:10px; border-radius:50%; background:${CAT_COLORS[i % CAT_COLORS.length]}; flex-shrink:0"></span>
              <span style="font-size:12px; color:var(--muted)">${f.name}</span>
              <span style="font-size:12px; font-weight:600; margin-left:auto; color:var(--green2)">${fmt(projectCorpus(f, 20))}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>` : ''}

    ${sips.map((f, i) => {
      const gain    = f.value - f.invested;
      const gainPct = f.invested > 0 ? Math.round((gain / f.invested) * 100) : 0;
      const color   = CAT_COLORS[i % CAT_COLORS.length];
      return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px">
          <div>
            <div style="display:flex; align-items:center; gap:8px">
              <span style="width:12px; height:12px; border-radius:50%; background:${color}; display:inline-block"></span>
              <span style="font-size:16px; font-weight:700">${f.name}</span>
            </div>
            <div style="font-size:12px; color:var(--muted); margin-top:3px">${f.cagr}% CAGR · ${f.stepup}% step-up p.a.</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px">
            <div style="text-align:right">
              <div style="font-size:18px; font-weight:700; color:var(--blue2)">${fmt(f.monthly)}</div>
              <div style="font-size:11px; color:var(--muted)">/month</div>
            </div>
            <button class="btn-red" style="padding:5px 10px" onclick="deleteSIP(${f.id})">🗑</button>
          </div>
        </div>

        <div class="metrics" style="margin-bottom:14px">
          <div class="metric"><div class="metric-label">Invested</div><div class="metric-val" style="font-size:15px">${fmt(f.invested)}</div></div>
          <div class="metric"><div class="metric-label">Current value</div><div class="metric-val blue" style="font-size:15px">${fmt(f.value)}</div></div>
          <div class="metric"><div class="metric-label">Gain</div><div class="metric-val ${gain >= 0 ? 'green' : 'red'}" style="font-size:15px">${gain >= 0 ? '+' : ''}${fmt(gain)} (${gainPct}%)</div></div>
        </div>

        <div class="card-title">Projections (with ${f.stepup}% annual step-up)</div>
        <div class="metrics">
          <div class="metric" style="border-left:3px solid ${color}">
            <div class="metric-label">10 years</div>
            <div class="metric-val green" style="font-size:16px">${fmt(projectCorpus(f, 10))}</div>
          </div>
          <div class="metric" style="border-left:3px solid ${color}">
            <div class="metric-label">15 years</div>
            <div class="metric-val green" style="font-size:16px">${fmt(projectCorpus(f, 15))}</div>
          </div>
          <div class="metric" style="border-left:3px solid ${color}">
            <div class="metric-label">20 years</div>
            <div class="metric-val green" style="font-size:16px">${fmt(projectCorpus(f, 20))}</div>
          </div>
        </div>
      </div>`;
    }).join('')}

    ${!sips.length ? `
    <div class="card" style="text-align:center; color:var(--muted); padding:3rem">
      <div style="font-size:2rem; margin-bottom:12px">📈</div>
      <div style="font-size:15px">No funds added yet</div>
    </div>` : ''}
  `;

  if (sips.length) setTimeout(buildSipCharts, 50);
}

function buildSipCharts() {
  const years = Array.from({ length: 20 }, (_, i) => i + 1);

  // line chart
  const lCtx = document.getElementById('sip-line');
  if (lCtx) {
    const datasets = sips.map((f, i) => ({
      label: f.name,
      data:  years.map(y => projectCorpus(f, y)),
      borderColor: CAT_COLORS[i % CAT_COLORS.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.3,
      borderDash: i === 0 ? [] : [5, 3],
    }));

    if (sipChart) { sipChart.destroy(); sipChart = null; }
    sipChart = new Chart(lCtx, {
      type: 'line',
      data: { labels: years.map(y => 'Yr ' + y), datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8888a0', font: { size: 11 }, boxWidth: 10 } },
          tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) } }
        },
        scales: {
          x: { ticks: { color: '#555', font: { size: 10 } }, grid: { color: '#1e1e26' } },
          y: { ticks: { color: '#555', font: { size: 10 }, callback: v => fmt(v) }, grid: { color: '#1e1e26' } }
        }
      }
    });
  }

  // pie chart at year 20
  const pCtx = document.getElementById('sip-pie');
  if (pCtx) {
    new Chart(pCtx, {
      type: 'doughnut',
      data: {
        labels: sips.map(f => f.name),
        datasets: [{
          data: sips.map(f => projectCorpus(f, 20)),
          backgroundColor: sips.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]),
          borderColor: '#16161c',
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '55%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmt(c.raw) } }
        }
      }
    });
  }
}