'use strict';

const FALLBACK_QUESTIONS = [
  'What is the smallest thing for which you are grateful?', 'Who has had the most positive impact on your life?',
  'If you could use a time machine, would you rather have one that only goes back in time or only goes forward?',
  "If you got a promotion, a job, a college acceptance, an accolade/award, or just generally accomplished something major, who is the first person you'd tell and how do you think they'd react?",
  'If you were an inanimate object, what would you be and why?', 'Where do you wish you had grown up?',
  'If you could be good at any profession without having to receive the accompanying education or trade experience, which would you choose?',
  "What is something you're terrible at but wish you could do well?", 'What is the quality you admire the most in the person you dislike the most?',
  'What was the most recent thing that made you cry?', 'What are the books/movies/games that never get old and always make you feel better when you get down?',
  'What is the most trivial thing about which you have a strong opinion?', 'If you could be any mythical creature, what would you be and why?',
  'If you’ve had more than one job, which job taught you the most?', 'If you could change one thing about yourself physically, what would you change?',
  'What single event or decision do you think most affected the rest of your life? Was there a turning point in your life?',
  "What is the one thing you've made that you're the most proud of?", 'Some historical figures have epithets attached to their names, like The Mad or The Wise. What would you like yours to be?',
  'What was the best year of your life? The worst?', "What one thing, whether it's something you did or something you made or something you caused to happen, would you like to be remembered by?",
  "What has been the biggest change of heart you've had? Have you ever started off on one side of an issue and wound up on the other? What influenced that change?",
  'What is your biggest non-academic, non work-related accomplishment?', 'What is your biggest academic or work-related accomplishment?',
  "What is something you've done/felt/seen/etc. that you wish you could experience again for the first time?", 'If you could erase one thing or event from your memory, what would you choose?',
  "Is there something about you that people assume because of your appearance or demeanour? What is a trait or preference you have that people don't expect you to have?",
  'If you were a character in a movie, book, or television show, what genre would you live in?', 'What is the hardest way you’ve learned an important lesson?',
  'What cliché do you think is bullshit? What cliché do you think holds truth?', 'What do you fear, despite having no real reason to do so? Basically, what is an irrational fear you have?',
  'Imagine that you could choose when and how you die. At what age would you like to die (no maximum here) and how would you like to go?',
  'What character archetype is closest to your personality?', 'What was the happiest moment of your life so far?', 'What is one childhood memory that you remember especially well?',
  'Is there a song/movie/food/etc. that strongly reminds you of someone whenever you experience it? Who does it remind you of?',
  'What is your ideal birthday? Not the date, but rather your ideal way to spend the day.',
  'Are there any smells that bring back memories for you? What are they, and what memories do they elicit?', "What is the closest you've ever come to dying?",
  'Do you have a personal mantra? If so, what is it?'
];

const $ = (selector, root = document) => root.querySelector(selector);
const state = { questions: [], records: [], active: 0, filter: 'all', query: '', session: null, saveTimer: 0, toastTimer: 0 };
const keyFor = id => `pressaux.interview.${id}`;

async function inlineTablet() {
  const text = await fetch('assets/sc1.A1_Newscaster_Tablet.svg').then(r => { if (!r.ok) throw Error(r.status); return r.text(); });
  $('#svgMount').innerHTML = text;
  const svg = $('#svgMount svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('focusable', 'false');
  // Illustrator embeds font declarations in the SVG; override them explicitly.
  svg.querySelectorAll('#UI text, #UI tspan').forEach(node =>
    node.style.setProperty('font-family', 'Automatron, monospace', 'important')
  );
}

function extractQuestions(svgText) {
  const xml = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (xml.querySelector('parsererror')) throw Error('Question SVG is invalid');
  const leaves = [...xml.querySelectorAll('tspan')].filter(node => !node.querySelector('tspan')).map((node, order) => ({
    x: parseFloat(node.getAttribute('x') || node.parentElement?.getAttribute('x') || 0),
    y: parseFloat(node.getAttribute('y') || node.parentElement?.getAttribute('y') || 0), text: node.textContent, order
  })).filter(part => Number.isFinite(part.y)).sort((a, b) => a.y - b.y || a.x - b.x || a.order - b.order);
  const result = [];
  for (const part of leaves) {
    const start = part.text.match(/^\s*(\d+)\.\s*/);
    if (start) result.push(part.text.slice(start[0].length));
    else if (result.length) result[result.length - 1] += part.text;
  }
  if (result.length !== 39) throw Error(`Expected 39 questions, received ${result.length}`);
  return result.map(q => q.replace(/\s+/g, ' ').trim());
}

function freshSession() { return { id: `session-${Date.now()}`, name: `SESSION ${String(Date.now()).slice(-3)}`, startedAt: Date.now(), updatedAt: Date.now() }; }
function loadSession() {
  const id = localStorage.getItem('pressaux.activeSession');
  let saved = id && JSON.parse(localStorage.getItem(keyFor(id)) || 'null');
  if (!saved || !Array.isArray(saved.records)) saved = { session: freshSession(), records: state.questions.map(() => ({ note: '', completed: false, favorite: false })) };
  state.session = saved.session; state.records = state.questions.map((_, i) => ({ note: '', completed: false, favorite: false, ...(saved.records[i] || {}) }));
  localStorage.setItem('pressaux.activeSession', state.session.id); save(true);
}
function setSaveStatus(label) { $('#saveState').textContent = label; $('#sideSave').textContent = label; }
function save(immediate = false) {
  clearTimeout(state.saveTimer); setSaveStatus(navigator.onLine ? (immediate ? 'SAVED' : 'SAVING') : 'OFFLINE');
  const commit = () => { state.session.updatedAt = Date.now(); localStorage.setItem(keyFor(state.session.id), JSON.stringify({ session: state.session, records: state.records })); setSaveStatus(navigator.onLine ? 'SAVED' : 'OFFLINE'); };
  if (immediate) commit(); else state.saveTimer = setTimeout(commit, 450);
}
function matches(i) { const r = state.records[i], q = state.questions[i]; const filter = state.filter === 'all' || (state.filter === 'pending' && !r.completed) || (state.filter === 'completed' && r.completed) || (state.filter === 'favorite' && r.favorite); return filter && `${q} ${r.note}`.toLowerCase().includes(state.query); }
function render() {
  const list = $('#questionList'); list.textContent = '';
  state.questions.forEach((question, i) => {
    if (!matches(i)) return;
    const r = state.records[i], article = document.createElement('article');
    article.className = `question-card${i === state.active ? ' active' : ''}${r.completed ? ' completed' : ''}`; article.dataset.index = i;
    article.innerHTML = `<div class="q-row"><span class="q-num">${String(i + 1).padStart(2, '0')}</span><span class="q-text" tabindex="0">${escapeHtml(question)}</span><button class="icon-btn complete" aria-label="${r.completed ? 'Marcar pendiente' : 'Marcar completada'}" aria-pressed="${r.completed}">OK</button><button class="icon-btn favorite" aria-label="${r.favorite ? 'Quitar favorita' : 'Marcar favorita'}" aria-pressed="${r.favorite}">FAV</button></div><div class="note-dot">${r.note ? 'NOTES STORED' : 'NO NOTES'}</div><label class="sr-only" for="note-${i}">Notas para pregunta ${i + 1}</label><textarea id="note-${i}" class="note-area" inputmode="none" virtualkeyboardpolicy="manual" placeholder="ENTER FIELD NOTES...">${escapeHtml(r.note)}</textarea>`;
    list.append(article);
  });
  const complete = state.records.filter(r => r.completed).length, progress = `${complete} / ${state.questions.length}`;
  $('#progress').textContent = $('#sideProgress').textContent = progress; $('#sessionName').textContent = state.session.name; $('#sideActive').textContent = `Q${String(state.active + 1).padStart(2, '0')}`;
}
function escapeHtml(value) { const d = document.createElement('div'); d.textContent = value; return d.innerHTML; }
function activate(i, focus = false) { if (i < 0 || i >= state.questions.length) return; state.active = i; render(); const card = $(`.question-card[data-index="${i}"]`); card?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); if (focus) $('.note-area', card)?.focus(); }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => el.classList.remove('show'), 1800); }
function download(ext, content, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = `${state.session.id}.${ext}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
function exportText() { download('txt', state.questions.map((q, i) => `${i + 1}. ${q}\n${state.records[i].note || '[No notes]'}${state.records[i].completed ? '\n[COMPLETED]' : ''}`).join('\n\n'), 'text/plain'); }

function requestAppFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen || root.webkitRequestFullScreen || root.msRequestFullscreen;
  if (!request) return;
  try {
    const result = request.call(root);
    if (result?.catch) result.catch(() => document.body.classList.add('fullscreen-pending'));
  } catch (_) {
    document.body.classList.add('fullscreen-pending');
  }
}

function syncFullscreenState() {
  document.body.classList.toggle('fullscreen-pending', !(document.fullscreenElement || document.webkitFullscreenElement));
}

function resumeVisualEffects() {
  if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Mobile browsers can suspend CSS animations while backgrounded. Reset their
  // timelines when the page becomes visible or its orientation changes.
  document.getAnimations?.().forEach(animation => {
    animation.currentTime = 0;
    animation.play();
  });
}

function bind() {
  // `click` has the broadest user-activation support for fullscreen. Capture mode
  // runs this before controls while preserving their normal click behavior.
  document.addEventListener('click', requestAppFullscreen, true);
  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('webkitfullscreenchange', syncFullscreenState);
  document.addEventListener('visibilitychange', resumeVisualEffects);
  addEventListener('pageshow', resumeVisualEffects);
  addEventListener('orientationchange', () => setTimeout(resumeVisualEffects, 120));
  $('#questionList').addEventListener('click', e => { const card = e.target.closest('.question-card'); if (!card) return; const i = +card.dataset.index; if (e.target.closest('.complete')) { state.records[i].completed = !state.records[i].completed; save(); render(); } else if (e.target.closest('.favorite')) { state.records[i].favorite = !state.records[i].favorite; save(); render(); } else activate(i, e.target.closest('.q-text')); });
  $('#questionList').addEventListener('input', e => { if (!e.target.matches('.note-area')) return; const i = +e.target.closest('.question-card').dataset.index; state.records[i].note = e.target.value; save(); $('.note-dot', e.target.closest('.question-card')).textContent = e.target.value ? 'NOTES STORED' : 'NO NOTES'; });
  $('#search').addEventListener('input', e => { state.query = e.target.value.trim().toLowerCase(); render(); });
  $('.filters').addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (!b) return; state.filter = b.dataset.filter; [...b.parentElement.children].forEach(x => x.classList.toggle('selected', x === b)); render(); });
  $('#newSession').onclick = () => { save(true); state.session = freshSession(); state.records = state.questions.map(() => ({ note: '', completed: false, favorite: false })); state.active = 0; localStorage.setItem('pressaux.activeSession', state.session.id); save(true); render(); toast('NEW SESSION CREATED'); };
  $('#deleteSession').onclick = () => $('#confirmDialog').showModal(); $('#confirmDelete').onclick = () => { localStorage.removeItem(keyFor(state.session.id)); state.session = freshSession(); state.records = state.questions.map(() => ({ note: '', completed: false, favorite: false })); localStorage.setItem('pressaux.activeSession', state.session.id); save(true); render(); toast('SESSION DELETED'); };
  $('#exportTxt').onclick = exportText; $('#exportJson').onclick = () => download('json', JSON.stringify({ ...state.session, questions: state.questions.map((question, i) => ({ number: i + 1, question, ...state.records[i] })) }, null, 2), 'application/json');
  $('#copyActive').onclick = async () => { await navigator.clipboard.writeText(`${state.active + 1}. ${state.questions[state.active]}\n${state.records[state.active].note}`); toast('QUESTION + NOTES COPIED'); };
  document.addEventListener('keydown', e => { const mod = e.ctrlKey || e.metaKey; if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); $('#search').focus(); } else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(true); toast('SESSION SAVED'); } else if (!e.target.matches('textarea,input')) { if (e.key === 'ArrowDown') { e.preventDefault(); activate(state.active + 1); } if (e.key === 'ArrowUp') { e.preventDefault(); activate(state.active - 1); } if (e.key === 'PageDown') { e.preventDefault(); activate(Math.min(38, state.active + 5)); } if (e.key === 'PageUp') { e.preventDefault(); activate(Math.max(0, state.active - 5)); } } });
  addEventListener('online', () => setSaveStatus('SAVED')); addEventListener('offline', () => setSaveStatus('OFFLINE')); addEventListener('beforeunload', () => save(true));
}
function tick() { const now = new Date(), seconds = Math.max(0, Math.floor((Date.now() - state.session.startedAt) / 1000)); const elapsed = [seconds / 3600, seconds / 60 % 60, seconds % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':'); $('#clock').textContent = now.toLocaleTimeString([], { hour12: false }); $('#clock').dateTime = now.toISOString(); $('#elapsed').textContent = $('#sideElapsed').textContent = elapsed; }

async function init() {
  try { await inlineTablet(); } catch (error) { console.error('Tablet SVG failed to load', error); }
  try { state.questions = extractQuestions(await fetch('assets/sc1.A1_Newscaster_QUESTIONLIST.svg').then(r => { if (!r.ok) throw Error(r.status); return r.text(); })); } catch (error) { console.warn('Using embedded question backup', error); state.questions = [...FALLBACK_QUESTIONS]; }
  loadSession(); bind(); render(); tick(); setInterval(tick, 1000);
}
init();
