const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Safe localStorage helpers
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ---------- Greeting ----------
const h = new Date().getHours();
$('#greeting').textContent = h < 12 ? 'Good morning ☀️' : h < 18 ? 'Good afternoon 🌤️' : 'Good evening 🌙';

// ---------- Toast ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ---------- Theme ----------
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  store.set('theme', t);
}
setTheme(store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#themeBtn').addEventListener('click', () =>
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

// ---------- Timer ----------
const CIRC = 2 * Math.PI * 54;
let totalSec = 25 * 60, left = totalSec, timer = null;
let sessions = store.get('sessions:' + new Date().toDateString(), 0);
$('#sessions').textContent = sessions;

function render() {
  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  $('#time').textContent = `${m}:${s}`;
  $('#progress').style.strokeDashoffset = CIRC * (1 - left / totalSec);
  document.title = timer ? `${m}:${s} · Focus Desk` : 'Focus Desk';
}
function stop() {
  clearInterval(timer); timer = null;
  $('.timer-card').classList.remove('running');
  $('#startBtn').textContent = 'Start';
}
function tick() {
  left--;
  if (left <= 0) {
    left = 0; stop(); render();
    if (totalSec >= 15 * 60 || totalSec === 25 * 60) {
      sessions++;
      store.set('sessions:' + new Date().toDateString(), sessions);
      $('#sessions').textContent = sessions;
    }
    toast('⏰ Time is up! Nice work.');
    return;
  }
  render();
}
$('#startBtn').addEventListener('click', () => {
  if (timer) { stop(); render(); return; }
  if (left === 0) left = totalSec;
  timer = setInterval(tick, 1000);
  $('.timer-card').classList.add('running');
  $('#startBtn').textContent = 'Pause';
});
$('#resetBtn').addEventListener('click', () => { stop(); left = totalSec; render(); });
$$('.mode').forEach(b => b.addEventListener('click', () => {
  $$('.mode').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  stop();
  totalSec = left = +b.dataset.min * 60;
  render();
}));
render();

// ---------- Tasks ----------
let tasks = store.get('tasks', []);
let filter = 'all';

function saveTasks() { store.set('tasks', tasks); }

function renderTasks() {
  const list = $('#taskList');
  list.innerHTML = '';
  const shown = tasks.filter(t => filter === 'all' || (filter === 'done' ? t.done : !t.done));
  if (!shown.length) {
    list.innerHTML = '<li class="empty">Nothing here yet ✨</li>';
  }
  shown.forEach(t => {
    const li = document.createElement('li');
    li.className = t.done ? 'done' : '';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = t.done;
    cb.addEventListener('change', () => { t.done = cb.checked; saveTasks(); renderTasks(); });
    const sp = document.createElement('span');
    sp.textContent = t.text;           // textContent keeps user input safe
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '✕'; del.setAttribute('aria-label', 'Delete task');
    del.addEventListener('click', () => {
      li.classList.add('removing');
      setTimeout(() => { tasks = tasks.filter(x => x.id !== t.id); saveTasks(); renderTasks(); }, 230);
    });
    li.append(cb, sp, del);
    list.appendChild(li);
  });
  const doneN = tasks.filter(t => t.done).length;
  $('#count').textContent = `${tasks.length - doneN} left · ${doneN} done`;
  $('#bar').style.width = tasks.length ? (doneN / tasks.length * 100) + '%' : '0%';
}

$('#taskForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('#taskInput').value.trim();
  if (!text) return;
  tasks.unshift({ id: Date.now(), text, done: false });
  $('#taskInput').value = '';
  saveTasks(); renderTasks();
});
$$('.filter').forEach(b => b.addEventListener('click', () => {
  $$('.filter').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  filter = b.dataset.f;
  renderTasks();
}));
$('#clearDone').addEventListener('click', () => {
  const n = tasks.filter(t => t.done).length;
  tasks = tasks.filter(t => !t.done);
  saveTasks(); renderTasks();
  if (n) toast(`Cleared ${n} completed task${n > 1 ? 's' : ''}`);
});
renderTasks();

// ---------- Quotes ----------
const quotes = [
  'Small steps every day add up to big results.',
  'Focus on progress, not perfection.',
  'Start where you are. Use what you have. Do what you can.',
  'Done is better than perfect.',
  'One task at a time. One minute at a time.',
  'Discipline is choosing what you want most over what you want now.'
];
let qi = -1;
$('#quoteBtn').addEventListener('click', () => {
  const q = $('#quote');
  q.classList.add('fade');
  setTimeout(() => {
    let n; do { n = Math.floor(Math.random() * quotes.length); } while (n === qi);
    qi = n; q.textContent = quotes[n];
    q.classList.remove('fade');
  }, 250);
});

// Keyboard shortcut: press "/" to jump to the task box
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault(); $('#taskInput').focus();
  }
});
