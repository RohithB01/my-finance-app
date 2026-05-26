const MN  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MNS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let logs = JSON.parse(localStorage.getItem('logs')) || [];
let expandedLog = null;
let logLineChart = null;

function saveMonth() {
  const inc        = incomeH + incomeW;
  const year       = parseInt(document.getElementById('log-year').value)  || new Date().getFullYear();
  const month      = parseInt(document.getElementById('log-month').value);
  const totalSpent = spent.reduce((a, b) => a + b, 0);
  const key        = year + '-' + month;

  const entry = {
    key, year, month, inc,
    spent: totalSpent,
    savings: inc - totalSpent,
    cats: cats.map((c, i) => ({
      name:   c.name,
      pct:    c.pct,
      budget: Math.round(inc * c.pct / 100),
      spent:  spent[i] || 0,
      color:  CAT_COLORS[i % CAT_COLORS.length],
    }))
  };

  const idx = logs.findIndex(l => l.key === key);
  if (idx >= 0) logs[idx] = entry; else logs.push(entry);
  logs.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  localStorage.setItem('logs', JSON.stringify(logs));

  spent = new Array(cats.length).fill(0);
  save();
  render();
  alert('✅ Saved ' + MN[month] + ' ' + year);
}

function toggleLog(key) {
  expandedLog = expandedLog === key ? null : key;
  renderLog();
}

function renderLog() {
  const root = document.getElementById('tab-log');

  if (!logs.length) {
    root.innerHTML = `
      <div class="card" style="text-align:center; color:var(--muted); padding:3rem">
        <div style="font-size:2rem; margin-bottom:12px">📅</div>
        <div style="font-size:15px; margin-bottom:6px">No months logged yet</div>
        <div style="font-size:13px">Fill the Budget tab and hit <b style="color:var(--green2)">Save this month</b></div>
      </div>`;
    return;
  }

  const totalInc   = logs.reduce((s, l) => s + l.inc, 0);
  const totalSpent = logs.reduce((s, l) => s + l.spent, 0);
  const totalSaved = logs.reduce((s, l) => s + l.savings, 0);
  const avgRate    = totalInc > 0 ? Math.round((totalSaved / totalInc) * 100) : 0;

  root.innerHTML = `
    <div class="metrics">
      <div class="metric"><div class="metric-label">Total earned</div><div class="metric-val blue">${fmt(totalInc)}</div></div>
      <div class="metric"><div class="metric-label">Total spent</div><div class="metric-val red">${fmt(totalSpent)}</div></div>
      <div class="metric"><div class="metric-label">Total saved</div><div class="metric-val green">${fmt(totalSaved)}</div></div>
      <div class="metric"><div class="metric-label">Avg savings rate</div><div class="metric-val ${avgRate >= 20 ? 'green' : 'red'}">${avgRate}%</div></div>
    </div>

    <div class="card">
      <div class="card-title">Income vs Spent vs Saved — all months</div>
      <div class="chart-wrap" style="height:220px">
        <canvas id="log-line" role="img" aria-label="Monthly income, spending and savings trend"></canvas>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
      <div style="font-size:13px; color:var(--muted)">${logs.length} month${logs.length !== 1 ? 's' : ''} logged</div>
      <button class="btn-red" onclick="if(confirm('Delete all logs?')){logs=[];localStorage.removeItem('logs');expandedLog=null;renderLog()}">
        🗑 Clear all
      </button>
    </div>

    ${[...logs].reverse().map(l => {
      const rate      = l.inc > 0 ? Math.round((l.savings / l.inc) * 100) : 0;
      const isExpanded = expandedLog === l.key;

      return `
      <div class="card">
        <div class="log-month-header" onclick="toggleLog('${l.key}')">
          <div style="display:flex; align-items:center; gap:10px">
            <span class="log-month-title">${MN[l.month]} ${l.year}</span>
            <span class="badge ${rate >= 30 ? 'badge-green' : rate >= 15 ? 'badge-blue' : 'badge-orange'}">${rate}% saved</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px">
            <span style="font-size:13px; color:var(--muted)">${fmt(l.inc)} earned · ${fmt(l.spent)} spent</span>
            <span style="color:var(--muted); font-size:16px">${isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>

        ${isExpanded ? `
        <div class="log-cat-detail">
          <div class="metrics" style="margin-bottom:1rem">
            <div class="metric"><div class="metric-label">Income</div><div class="metric-val blue" style="font-size:16px">${fmt(l.inc)}</div></div>
            <div class="metric"><div class="metric-label">Spent</div><div class="metric-val red" style="font-size:16px">${fmt(l.spent)}</div></div>
            <div class="metric"><div class="metric-label">Saved</div><div class="metric-val green" style="font-size:16px">${fmt(l.savings)}</div></div>
          </div>

          <div class="chart-row" style="margin-bottom:1rem">
            <div style="background:var(--bg3); border-radius:var(--radius); padding:12px">
              <div class="card-title">Allocation</div>
              <div style="height:180px; position:relative">
                <canvas id="pie-${l.key}" role="img" aria-label="Category allocation for ${MN[l.month]} ${l.year}"></canvas>
              </div>
            </div>
            <div style="background:var(--bg3); border-radius:var(--radius); padding:12px">
              <div class="card-title">Budget vs Spent</div>
              <div style="height:180px; position:relative">
                <canvas id="bar-${l.key}" role="img" aria-label="Budget vs spent for ${MN[l.month]} ${l.year}"></canvas>
              </div>
            </div>
          </div>

          <div class="card-title">Category breakdown</div>
          ${l.cats.map(c => {
            const over = c.spent > c.budget && c.budget > 0;
            const pct  = c.budget > 0 ? Math.min(100, Math.round(c.spent / c.budget * 100)) : 0;
            const rem  = c.budget - c.spent;
            return `
            <div class="log-cat-row">
              <span style="width:8px; height:8px; border-radius:50%; background:${c.color || '#1D9E75'}; flex-shrink:0; display:inline-block"></span>
              <span style="font-size:13px; min-width:130px; color:var(--text)">${c.name}</span>
              <span style="font-size:12px; color:var(--muted); min-width:40px">${c.pct}%</span>
              <span style="font-size:12px; color:var(--muted); min-width:72px; text-align:right">${fmt(c.budget)}</span>
              <div class="bar-wrap" style="min-width:60px">
                <div class="bar-fill" style="width:${pct}%; background:${over ? '#D85A30' : (c.color || '#1D9E75')}"></div>
              </div>
              <span style="font-size:12px; font-weight:600; min-width:80px; text-align:right; color:${over ? 'var(--red)' : 'var(--green2)'}">
                ${over ? '↑ ' + fmt(Math.abs(rem)) : fmt(rem) + ' left'}
              </span>
            </div>`;
          }).join('')}
          <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid var(--border)">
            <span style="font-size:13px; font-weight:600">Net saved</span>
            <span style="font-size:14px; font-weight:700; color:${l.savings >= 0 ? 'var(--green2)' : 'var(--red)'}">${fmt(l.savings)}</span>
          </div>
        </div>` : ''}
      </div>`;
    }).join('')}
  `;

  // draw log line chart
  setTimeout(() => {
    const ctx = document.getElementById('log-line');
    if (!ctx) return;
    const labels  = logs.map(l => MNS[l.month] + "'" + String(l.year).slice(2));
    const incData = logs.map(l => l.inc);
    const spData  = logs.map(l => l.spent);
    const svData  = logs.map(l => l.savings);

    if (logLineChart) {
      logLineChart.data.labels = labels;
      logLineChart.data.datasets[0].data = incData;
      logLineChart.data.datasets[1].data = spData;
      logLineChart.data.datasets[2].data = svData;
      logLineChart.update();
    } else {
      logLineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Income', data: incData, borderColor: '#5FA8F5', backgroundColor: 'rgba(95,168,245,0.08)', borderWidth: 2, pointRadius: 4, fill: true, tension: 0.3 },
            { label: 'Spent',  data: spData,  borderColor: '#D85A30', backgroundColor: 'rgba(216,90,48,0.08)',  borderWidth: 2, pointRadius: 4, fill: true, tension: 0.3 },
            { label: 'Saved',  data: svData,  borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.12)', borderWidth: 2, pointRadius: 4, fill: true, tension: 0.3, borderDash: [5,3] },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#8888a0', font: { size: 11 }, boxWidth: 10 } },
            tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) } }
          },
          scales: {
            x: { ticks: { color: '#555', font: { size: 10 } }, grid: { color: '#1e1e26' } },
            y: { ticks: { color: '#555', font: { size: 10 }, callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0) + 'K' : v) }, grid: { color: '#1e1e26' } }
          }
        }
      });
    }

    // draw per-month charts if expanded
    if (expandedLog) {
      const l = logs.find(x => x.key === expandedLog);
      if (!l) return;

      const pieCtx = document.getElementById('pie-' + l.key);
      const barCtx = document.getElementById('bar-' + l.key);

      if (pieCtx && !pieCtx._chartjs) {
        new Chart(pieCtx, {
          type: 'doughnut',
          data: {
            labels: l.cats.map(c => c.name.split(' ')[0]),
            datasets: [{ data: l.cats.map(c => c.budget), backgroundColor: l.cats.map(c => c.color || '#1D9E75'), borderColor: '#16161c', borderWidth: 2 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '60%',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + l.cats[c.dataIndex].name + ': ' + fmt(c.raw) } } }
          }
        });
      }

      if (barCtx && !barCtx._chartjs) {
        new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: l.cats.map(c => c.name.split(' ')[0]),
            datasets: [
              { label: 'Budget', data: l.cats.map(c => c.budget), backgroundColor: 'rgba(55,138,221,0.3)', borderColor: '#378ADD', borderWidth: 1, borderRadius: 3 },
              { label: 'Spent',  data: l.cats.map(c => c.spent),  backgroundColor: l.cats.map(c => c.spent > c.budget ? 'rgba(216,90,48,0.7)' : 'rgba(29,158,117,0.6)'), borderWidth: 0, borderRadius: 3 },
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) } } },
            scales: {
              x: { ticks: { color: '#555', font: { size: 9 }, maxRotation: 45 }, grid: { color: '#16161c' } },
              y: { ticks: { color: '#555', font: { size: 9 }, callback: v => '₹' + (v/1000) + 'K' }, grid: { color: '#1e1e26' } }
            }
          }
        });
      }
    }
  }, 50);
}