// Load all data from Supabase on login
window.loadAllData = async function() {
  if (!window.currentUser) return;
  const uid = window.currentUser.id;
  const { db } = await import('./supabase.js');

  // Load categories
  const { data: catData } = await db.from('categories')
    .select('*').eq('user_id', uid).order('sort_order');
  if (catData && catData.length) {
    cats = catData.map(c => ({ id: c.id, name: c.name, pct: c.pct }));
    spent = new Array(cats.length).fill(0);
  }

  // Load incomes from localStorage still (small values)
  incomeH = parseFloat(localStorage.getItem('incH')) || 60000;
  incomeW = parseFloat(localStorage.getItem('incW')) || 40000;

  // Load EMIs
  const { data: emiData } = await db.from('emis').select('*').eq('user_id', uid);
  if (emiData) emis = emiData.map(e => ({
    id: e.id, name: e.name, principal: e.principal,
    rate: e.rate, tenure: e.tenure, paid: e.paid, emi: e.emi
  }));

  // Load SIPs
  const { data: sipData } = await db.from('sips').select('*').eq('user_id', uid);
  if (sipData) sips = sipData.map(s => ({
    id: s.id, name: s.name, monthly: s.monthly,
    invested: s.invested, value: s.current_value,
    cagr: s.cagr, stepup: s.stepup
  }));

  render();
};

// ── Shared data ──────────────────────────────────────────────
const DEFAULT_CATS = [
  { name: 'SIP / investments',  pct: 30 },
  { name: 'Rent',               pct: 15 },
  { name: 'EMI',                pct: 10 },
  { name: 'Food + groceries',   pct: 12 },
  { name: 'Transport',          pct:  6 },
  { name: 'Utilities',          pct:  4 },
  { name: 'Health + insurance', pct:  5 },
  { name: 'Lifestyle',          pct:  8 },
  { name: 'Emergency savings',  pct:  6 },
  { name: 'Personal growth',    pct:  4 },
];

const CAT_COLORS = [
  '#1D9E75','#378ADD','#D85A30','#7F77DD',
  '#BA7517','#5DCAA5','#5FA8F5','#f06292',
  '#80cbc4','#aed581'
];

let cats    = JSON.parse(localStorage.getItem('cats'))  || DEFAULT_CATS.map(c => ({...c}));
let spent   = JSON.parse(localStorage.getItem('spent')) || new Array(cats.length).fill(0);
let incomeH = parseFloat(localStorage.getItem('incH'))  || 60000;
let incomeW = parseFloat(localStorage.getItem('incW'))  || 40000;

function save() {
  localStorage.setItem('cats',  JSON.stringify(cats));
  localStorage.setItem('spent', JSON.stringify(spent));
  localStorage.setItem('incH',  incomeH);
  localStorage.setItem('incW',  incomeW);
}

function fmt(n) {
  n = Math.round(n);
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(2)   + ' L';
  return '₹' + n.toLocaleString('en-IN');
}

// ── Budget chart ──────────────────────────────────────────────
let budgetPieChart = null;

function updateBudgetChart() {
  const inc = incomeH + incomeW;
  const labels = cats.map(c => c.name);
  const data   = cats.map(c => Math.round(inc * c.pct / 100));
  const spentData = cats.map((c, i) => spent[i] || 0);

  const ctx = document.getElementById('budget-pie');
  if (!ctx) return;

  if (budgetPieChart) {
    budgetPieChart.data.labels = labels;
    budgetPieChart.data.datasets[0].data = data;
    budgetPieChart.update();
    return;
  }

  budgetPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CAT_COLORS,
        borderColor: '#16161c',
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            color: '#8888a0',
            font: { size: 11 },
            boxWidth: 10,
            padding: 10,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' (' + cats[ctx.dataIndex].pct + '%)'
          }
        }
      }
    }
  });
}

// ── Render budget tab ─────────────────────────────────────────
function render() {
  const inc        = incomeH + incomeW;
  const totalSpent = spent.reduce((a, b) => a + b, 0);
  const savedAmt   = inc - totalSpent;
  const saveRate   = inc > 0 ? Math.round((savedAmt / inc) * 100) : 0;
  const totalPct   = cats.reduce((s, c) => s + c.pct, 0);
  const pctColor   = Math.abs(totalPct - 100) < 1 ? 'color:var(--green2)' : 'color:var(--red)';

  document.getElementById('tab-budget').innerHTML = `

    <div class="card">
      <div class="card-title">Income this month</div>
      <div class="row-line">
        <span>Husband (₹)</span>
        <input type="number" value="${incomeH}" style="width:130px"
          onchange="incomeH=+this.value; save(); render()">
      </div>
      <div class="row-line">
        <span>Wife (₹)</span>
        <input type="number" value="${incomeW}" style="width:130px"
          onchange="incomeW=+this.value; save(); render()">
      </div>
    </div>

    <div class="metrics">
      <div class="metric"><div class="metric-label">Total income</div><div class="metric-val blue">${fmt(inc)}</div></div>
      <div class="metric"><div class="metric-label">Total spent</div><div class="metric-val red">${fmt(totalSpent)}</div></div>
      <div class="metric"><div class="metric-label">Saved</div><div class="metric-val green">${fmt(savedAmt)}</div></div>
      <div class="metric"><div class="metric-label">Savings rate</div><div class="metric-val ${saveRate >= 20 ? 'green' : 'red'}">${saveRate}%</div></div>
    </div>

    <div class="chart-row">
      <div class="card" style="margin:0">
        <div class="card-title">Budget split</div>
        <div class="chart-wrap" style="height:220px">
          <canvas id="budget-pie" role="img" aria-label="Budget allocation pie chart"></canvas>
        </div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-title">Spent vs budget</div>
        <div class="chart-wrap" style="height:220px">
          <canvas id="budget-bar" role="img" aria-label="Spent vs budget bar chart"></canvas>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
        <div class="card-title" style="margin:0">Category allocations
          <span style="margin-left:8px; font-size:12px; ${pctColor}">(${totalPct}% total)</span>
        </div>
        <button class="btn-small" onclick="cats=DEFAULT_CATS.map(c=>({...c})); spent=new Array(cats.length).fill(0); save(); render()">Reset</button>
      </div>
      ${cats.map((c, i) => {
        const budget = Math.round(inc * c.pct / 100);
        const sp     = spent[i] || 0;
        const over   = sp > budget && budget > 0;
        const pct    = budget > 0 ? Math.min(100, Math.round(sp / budget * 100)) : 0;
        const rem    = budget - sp;
        return `
        <div class="cat-row">
          <div class="cat-top">
            <div style="display:flex; align-items:center; gap:8px">
              <span style="width:10px; height:10px; border-radius:50%; background:${CAT_COLORS[i % CAT_COLORS.length]}; display:inline-block; flex-shrink:0"></span>
              <span class="cat-name">${c.name}</span>
            </div>
            <div class="cat-controls">
              <input type="number" class="pct-input" value="${c.pct}" min="0" max="100"
                onchange="cats[${i}].pct=+this.value; save(); render()">
              <span>%</span>
              <span class="budget-amt">${fmt(budget)}</span>
            </div>
          </div>
          <div class="cat-bottom">
            <span class="spent-label">spent</span>
            <input type="number" class="spent-input" value="${sp}" placeholder="0"
              onchange="spent[${i}]=+this.value; save(); render()">
            <div class="bar-wrap">
              <div class="bar-fill" style="width:${pct}%; background:${over ? '#D85A30' : CAT_COLORS[i % CAT_COLORS.length]}"></div>
            </div>
            <span class="badge ${over ? 'badge-red' : 'badge-green'}">
              ${over ? '↑ ' + fmt(Math.abs(rem)) : fmt(rem) + ' left'}
            </span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="card">
      <div class="card-title">Save this month to log</div>
      <div class="row-line">
        <span>Year</span>
        <input type="number" id="log-year" value="${new Date().getFullYear()}" style="width:100px">
      </div>
      <div class="row-line">
        <span>Month</span>
        <select id="log-month">
          ${['January','February','March','April','May','June','July','August','September','October','November','December']
            .map((m, i) => `<option value="${i}" ${i === new Date().getMonth() ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <button class="btn-green" onclick="saveMonth()" style="margin-top:12px; width:100%">
        💾 Save this month
      </button>
    </div>
  `;

  updateBudgetChart();
  updateBudgetBarChart();
}

// ── Spent vs budget bar chart ─────────────────────────────────
let budgetBarChart = null;

function updateBudgetBarChart() {
  const inc    = incomeH + incomeW;
  const labels = cats.map(c => c.name.split(' ')[0]);
  const budgets = cats.map(c => Math.round(inc * c.pct / 100));
  const spends  = cats.map((c, i) => spent[i] || 0);
  const ctx = document.getElementById('budget-bar');
  if (!ctx) return;

  if (budgetBarChart) {
    budgetBarChart.data.datasets[0].data = budgets;
    budgetBarChart.data.datasets[1].data = spends;
    budgetBarChart.update();
    return;
  }

  budgetBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Budget', data: budgets, backgroundColor: 'rgba(55,138,221,0.3)', borderColor: '#378ADD', borderWidth: 1, borderRadius: 4 },
        { label: 'Spent',  data: spends,  backgroundColor: 'rgba(29,158,117,0.6)', borderColor: '#1D9E75', borderWidth: 1, borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.raw) } }
      },
      scales: {
        x: { ticks: { color: '#555', font: { size: 9 }, maxRotation: 45 }, grid: { color: '#1e1e26' } },
        y: { ticks: { color: '#555', font: { size: 10 }, callback: v => '₹' + (v/1000) + 'K' }, grid: { color: '#1e1e26' } }
      }
    }
  });
}

// ── Tab switcher ──────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', ['budget','log','emi','sip'][i] === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + name);
  });
  if (name === 'log') renderLog();
  if (name === 'emi') renderEMI();
  if (name === 'sip') renderSIP();
}

render();