let emis = JSON.parse(localStorage.getItem('emis')) || [];
let emiChart = null;

function addEMI() {
  const name      = document.getElementById('e-name').value      || 'Loan';
  const principal = parseFloat(document.getElementById('e-principal').value) || 0;
  const rate      = parseFloat(document.getElementById('e-rate').value)      || 0;
  const tenure    = parseInt(document.getElementById('e-tenure').value)      || 0;
  const paid      = parseInt(document.getElementById('e-paid').value)        || 0;

  if (!principal || !tenure) { alert('Enter at least principal and tenure.'); return; }

  const mr  = rate / 100 / 12;
  const emi = mr > 0
    ? Math.round(principal * (mr * Math.pow(1 + mr, tenure)) / (Math.pow(1 + mr, tenure) - 1))
    : Math.round(principal / tenure);

  emis.push({ id: Date.now(), name, principal, rate, tenure, paid, emi });
  localStorage.setItem('emis', JSON.stringify(emis));

  ['e-name','e-principal','e-rate','e-tenure'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('e-paid').value = '0';
  renderEMI();
}

function deleteEMI(id) {
  if (!confirm('Delete this loan?')) return;
  emis = emis.filter(e => e.id !== id);
  localStorage.setItem('emis', JSON.stringify(emis));
  renderEMI();
}

function updatePaid(id, val) {
  const e = emis.find(e => e.id === id);
  if (!e) return;
  e.paid = Math.min(e.tenure, Math.max(0, parseInt(val) || 0));
  localStorage.setItem('emis', JSON.stringify(emis));
  renderEMI();
}

function renderEMI() {
  const root = document.getElementById('tab-emi');
  const totalEMI      = emis.reduce((s, e) => s + e.emi, 0);
  const totalPrincipal = emis.reduce((s, e) => s + e.principal, 0);
  const totalInterest  = emis.reduce((s, e) => s + (e.emi * e.tenure - e.principal), 0);

  root.innerHTML = `
    <div class="card">
      <div class="card-title">Add a loan</div>
      <div class="row-line"><span>Loan name</span>
        <input id="e-name" type="text" placeholder="Home loan" style="width:160px"></div>
      <div class="row-line"><span>Principal (₹)</span>
        <input id="e-principal" type="number" placeholder="50,00,000" style="width:130px"></div>
      <div class="row-line"><span>Interest rate (% p.a.)</span>
        <input id="e-rate" type="number" placeholder="8.5" step="0.1" style="width:90px"></div>
      <div class="row-line"><span>Tenure (months)</span>
        <input id="e-tenure" type="number" placeholder="240" style="width:90px"></div>
      <div class="row-line"><span>Months already paid</span>
        <input id="e-paid" type="number" value="0" style="width:90px"></div>
      <button class="btn-green" onclick="addEMI()" style="margin-top:12px; width:100%">+ Add loan</button>
    </div>

    ${emis.length ? `
    <div class="metrics">
      <div class="metric"><div class="metric-label">Total EMI/mo</div><div class="metric-val red">${fmt(totalEMI)}</div></div>
      <div class="metric"><div class="metric-label">Total principal</div><div class="metric-val blue">${fmt(totalPrincipal)}</div></div>
      <div class="metric"><div class="metric-label">Total interest</div><div class="metric-val red">${fmt(totalInterest)}</div></div>
      <div class="metric"><div class="metric-label">Loans active</div><div class="metric-val">${emis.length}</div></div>
    </div>

    <div class="card">
      <div class="card-title">Amortization — ${emis[0].name}</div>
      <div class="chart-wrap" style="height:220px">
        <canvas id="emi-chart" role="img" aria-label="EMI principal vs interest breakdown over loan tenure"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Principal paid vs outstanding — all loans</div>
      <div class="chart-wrap" style="height:180px">
        <canvas id="emi-progress-chart" role="img" aria-label="EMI repayment progress for all loans"></canvas>
      </div>
    </div>` : ''}

    ${emis.map(e => {
      const mr          = e.rate / 100 / 12;
      const remain      = e.tenure - e.paid;
      const balFactor   = mr > 0
        ? (Math.pow(1+mr, e.tenure) - Math.pow(1+mr, e.paid)) / (Math.pow(1+mr, e.tenure) - 1)
        : Math.max(0, 1 - e.paid / e.tenure);
      const outstanding = Math.round(e.principal * balFactor);
      const paidAmt     = e.principal - outstanding;
      const progress    = Math.round((e.paid / e.tenure) * 100);
      const totalInt    = e.emi * e.tenure - e.principal;

      return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px">
          <div>
            <div style="font-size:16px; font-weight:700">${e.name}</div>
            <div style="font-size:12px; color:var(--muted); margin-top:3px">${e.rate}% p.a. · ${e.tenure} months total</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px">
            <div style="text-align:right">
              <div style="font-size:18px; font-weight:700; color:var(--red)">${fmt(e.emi)}</div>
              <div style="font-size:11px; color:var(--muted)">/month</div>
            </div>
            <button class="btn-red" style="padding:5px 10px" onclick="deleteEMI(${e.id})">🗑</button>
          </div>
        </div>

        <div class="metrics" style="margin-bottom:14px">
          <div class="metric"><div class="metric-label">Outstanding</div><div class="metric-val red" style="font-size:15px">${fmt(outstanding)}</div></div>
          <div class="metric"><div class="metric-label">Paid so far</div><div class="metric-val green" style="font-size:15px">${fmt(paidAmt)}</div></div>
          <div class="metric"><div class="metric-label">Time left</div><div class="metric-val" style="font-size:15px">${Math.floor(remain/12)}y ${remain%12}m</div></div>
          <div class="metric"><div class="metric-label">Total interest</div><div class="metric-val red" style="font-size:15px">${fmt(totalInt)}</div></div>
        </div>

        <div style="margin-bottom:6px; display:flex; justify-content:space-between; font-size:12px; color:var(--muted)">
          <span>Repayment progress</span><span style="color:var(--green2)">${progress}%</span>
        </div>
        <div class="bar-wrap" style="height:8px; margin-bottom:14px">
          <div class="bar-fill" style="width:${progress}%; height:8px; background:linear-gradient(90deg,var(--green),var(--green2))"></div>
        </div>

        <div style="display:flex; align-items:center; gap:8px">
          <span style="font-size:13px; color:var(--muted)">Update months paid:</span>
          <input type="number" value="${e.paid}" min="0" max="${e.tenure}" style="width:80px"
            onchange="updatePaid(${e.id}, this.value)">
          <span style="font-size:12px; color:var(--muted)">of ${e.tenure}</span>
        </div>
      </div>`;
    }).join('')}

    ${!emis.length ? `
    <div class="card" style="text-align:center; color:var(--muted); padding:3rem">
      <div style="font-size:2rem; margin-bottom:12px">🏦</div>
      <div style="font-size:15px">No loans added yet</div>
    </div>` : ''}
  `;

  if (emis.length) setTimeout(buildEmiCharts, 50);
}

function buildEmiCharts() {
  // amortization chart for first loan
  const e = emis[0];
  if (!e) return;
  const ctx = document.getElementById('emi-chart');
  if (!ctx) return;

  const mr = e.rate / 100 / 12;
  const prin = [], intr = [], labels = [];
  let bal = e.principal;

  for (let m = 1; m <= Math.min(e.tenure, 240); m++) {
    const intP  = Math.round(bal * mr);
    const prinP = Math.max(0, e.emi - intP);
    intr.push(intP);
    prin.push(prinP);
    bal = Math.max(0, bal - prinP);
    labels.push(m % 12 === 0 ? 'Yr ' + (m / 12) : '');
  }

  if (emiChart) { emiChart.destroy(); emiChart = null; }
  emiChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Principal', data: prin, backgroundColor: 'rgba(29,158,117,0.7)', borderWidth: 0, stack: 's' },
        { label: 'Interest',  data: intr, backgroundColor: 'rgba(216,90,48,0.65)', borderWidth: 0, stack: 's' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8888a0', font: { size: 11 }, boxWidth: 10 } },
        tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) } }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#555', font: { size: 9 } }, grid: { color: '#1e1e26' } },
        y: { stacked: true, ticks: { color: '#555', font: { size: 9 }, callback: v => '₹' + (v/1000) + 'K' }, grid: { color: '#1e1e26' } }
      }
    }
  });

  // progress bar chart for all loans
  const pCtx = document.getElementById('emi-progress-chart');
  if (!pCtx) return;

  const loanNames = emis.map(e => e.name);
  const paidAmts  = emis.map(e => {
    const mr = e.rate / 100 / 12;
    const bf = mr > 0 ? (Math.pow(1+mr,e.tenure)-Math.pow(1+mr,e.paid))/(Math.pow(1+mr,e.tenure)-1) : Math.max(0,1-e.paid/e.tenure);
    return Math.round(e.principal * (1 - bf));
  });
  const outstandingAmts = emis.map((e, i) => e.principal - paidAmts[i]);

  new Chart(pCtx, {
    type: 'bar',
    data: {
      labels: loanNames,
      datasets: [
        { label: 'Paid',        data: paidAmts,        backgroundColor: 'rgba(29,158,117,0.7)', borderRadius: 4, stack: 'l' },
        { label: 'Outstanding', data: outstandingAmts, backgroundColor: 'rgba(216,90,48,0.45)', borderRadius: 4, stack: 'l' },
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8888a0', font: { size: 11 }, boxWidth: 10 } },
        tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) } }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#555', font: { size: 10 }, callback: v => fmt(v) }, grid: { color: '#1e1e26' } },
        y: { stacked: true, ticks: { color: '#aaa', font: { size: 12 } }, grid: { display: false } }
      }
    }
  });
}