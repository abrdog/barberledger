let myChart = null;

// ─── ТЕМА ────────────────────────────────────────────────
const THEME = {
  crimson: '#c00040',   // иконка — cashbox, commission, in pocket
  net: '#d0d0d0',       // net — светлый нейтральный
  muted: '#555',
  blue: '#3b82f6'
};

// ─── НАВИГАЦИЯ ───────────────────────────────────────────
function showTab(id, btn) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  btn?.classList.add('active');
  if (id === 'analytics') renderChart();
  if (id === 'history') loadHistory();
}

// ─── РАСЧЁТ И СОХРАНЕНИЕ ─────────────────────────────────
async function runCalculation() {
  let sum = parseFloat(document.getElementById('sum').value) || 0;
  let hours = parseFloat(document.getElementById('hours').value) || 0;
  const bonus = parseFloat(document.getElementById('bonus').value) || 0;

  if (sum === 0 && hours === 0) {
    hours = 38.5;
  } else if (hours <= 0) {
    return alert('Please enter hours, or 0 / 0 for Vacation');
  }

  const BASE_RATE = 16.60;
  const TAX_KEEP = 0.7729;

  const basePay = hours * BASE_RATE;
  const commission = Math.max(0, (sum - basePay * 2) * 0.4);
  const brutOfficial = basePay + commission;
  const net = brutOfficial * TAX_KEEP;
  const hourlyRate = (brutOfficial + (bonus / TAX_KEEP)) / hours;

  const { error } = await supabaseClient.from('peon').insert([{
    sum, hours, bonus,
    brut: brutOfficial,
    net,
    hourly_rate: hourlyRate,
    com: commission
  }]);

  if (error) return alert('Ошибка: ' + error.message);

  ['sum', 'hours', 'bonus'].forEach(id => document.getElementById(id).value = '');
  showTab('history', document.querySelectorAll('.nav-btn')[1]);
}

// ─── ИСТОРИЯ ─────────────────────────────────────────────
async function loadHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  const { data, error } = await supabaseClient
    .from('peon')
    .select('*')
    .order('id', { ascending: false })
    .limit(20);

  if (error || !data) return;

  list.innerHTML = data.map(item => {
    const date = new Date(item.created_at).toLocaleDateString('en-CA', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const inPocket = (item.net + item.bonus).toFixed(2);
    const rate = item.hourly_rate.toFixed(2);
    const com = (item.com || 0).toFixed(2);

    return `
      <div class="history-item">
        <div class="h-header">
          <div class="h-net-main" style="color:${THEME.net}">${item.net.toFixed(2)} $</div>
          <div class="h-date">${date}</div>
        </div>
        <div class="h-grid">
          <div>
            <div class="h-col-title">In Pocket</div>
            <div class="h-val" style="color:${THEME.crimson}">${inPocket}</div>
            <div class="h-val" style="font-size:.75rem;color:${THEME.muted};font-weight:400">${rate} /h</div>
          </div>
          <div>
            <div class="h-col-title">Cashbox</div>
            <div class="h-val" style="color:${THEME.crimson}">${item.sum}</div>
            <div class="h-val" style="font-size:.75rem;color:${THEME.muted};font-weight:400">${com} $</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── ГРАФИК ──────────────────────────────────────────────
async function renderChart() {
  const { data } = await supabaseClient
    .from('peon')
    .select('created_at, net, bonus')
    .order('id', { ascending: false })
    .limit(10);

  if (!data?.length) return;

  const ctx = document.getElementById('balanceChart').getContext('2d');
  myChart?.destroy();

  const rev = [...data].reverse();
  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rev.map(d => new Date(d.created_at).toLocaleDateString()),
      datasets: [
        {
          label: 'Net',
          data: rev.map(d => d.net),
          borderColor: THEME.crimson,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4
        },
        {
          label: 'Tips',
          data: rev.map(d => d.bonus),
          borderColor: THEME.blue,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: true }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ─── БУДИЛЬНИК ДЛЯ SUPABASE (+1 В ДРУГУЮ ТАБЛИЦУ) ─────────
async function sendPingVisit() {
  try {
    // 1. Получаем текущее число из таблицы site_pings
    const { data, error: selectError } = await window.supabaseClient
      .from('site_pings')
      .select('counter')
      .eq('id', 1)
      .single();

    if (selectError) throw selectError;

    const newCount = (data?.counter || 0) + 1;

    // 2. Инкрементируем строчку с id=1
    await window.supabaseClient
      .from('site_pings')
      .update({ counter: newCount })
      .eq('id', 1);

    console.log(`[Keep-Alive] Проект активен. Заходов в систему: ${newCount}`);
  } catch (err) {
    // Тихо пишем в консоль, чтобы не алертить пользователю в интерфейс
    console.warn('Keep-Alive ping failed:', err.message);
  }
}

// ─── СТАРТ ───────────────────────────────────────────────
window.onload = function () {
  loadHistory();     // Загружаем историю для интерфейса
  sendPingVisit();   // Будим базу данных в фоне
};