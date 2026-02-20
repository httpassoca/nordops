import data from './content/roadmap.json' with { type: 'json' };

const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset' && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = String(dv);
    } else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

const STORAGE_KEY = 'nordops_progress_v1';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function saveProgress(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

let progress = loadProgress();

function taskId(wi, di, ti) {
  return `w${wi + 1}-d${di + 1}-t${ti + 1}`;
}

function renderChips() {
  const root = $('#chips');
  root.innerHTML = '';
  for (const k of data.keywords) root.appendChild(el('span', { class: 'chip' }, [k]));
}

function weekProgress(wi) {
  const w = data.weeks[wi];
  const days = Array.isArray(w.days) ? w.days : [];
  let total = 0;
  let done = 0;
  days.forEach((d, di) => {
    const tasks = Array.isArray(d.tasks) ? d.tasks : [];
    tasks.forEach((_, ti) => {
      total++;
      if (progress[taskId(wi, di, ti)]) done++;
    });
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function renderTree() {
  const root = $('#treeRoot');
  root.innerHTML = '';

  const top = el('ul', { class: 'tree' });

  data.weeks.forEach((w, wi) => {
    const wp = weekProgress(wi);

    const weekDetails = el('details', { class: 'acc', open: wi === 0 ? '' : null });
    const weekSummary = el('summary', {}, [
      el('div', {}, [
        el('div', { class: 'title' }, [w.title]),
        el('div', { class: 'meta' }, [w.goal])
      ]),
      el('div', { class: 'progress' }, [
        el('span', {}, [`${wp.done}/${wp.total}`]),
        el('span', { class: 'bar', title: `${wp.pct}%` }, [el('i', { style: `width:${wp.pct}%` })])
      ])
    ]);

    const weekBody = el('div', { class: 'body' });

    (w.days || []).forEach((d, di) => {
      const tasks = Array.isArray(d.tasks) ? d.tasks : [];
      const done = tasks.reduce((acc, _t, ti) => acc + (progress[taskId(wi, di, ti)] ? 1 : 0), 0);
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

      const dayDetails = el('details', { class: 'acc' });
      const daySummary = el('summary', {}, [
        el('div', {}, [
          el('div', { class: 'title' }, [d.title]),
          el('div', { class: 'meta' }, [d.focus ? `Focus: ${d.focus}` : ''])
        ]),
        el('div', { class: 'progress' }, [
          el('span', {}, [`${done}/${tasks.length}`]),
          el('span', { class: 'bar', title: `${pct}%` }, [el('i', { style: `width:${pct}%` })])
        ])
      ]);

      const taskUl = el('ul', { class: 'tasklist' });
      tasks.forEach((task, ti) => {
        const text = typeof task === 'string' ? task : task.text;
        const what = typeof task === 'string' ? [] : (task.what || []);
        const decisions = typeof task === 'string' ? [] : (task.decisions || []);
        const doneWhen = typeof task === 'string' ? [] : (task.doneWhen || []);
        const avoid = typeof task === 'string' ? [] : (task.avoid || []);

        const id = taskId(wi, di, ti);
        const checked = !!progress[id];

        const input = el('input', {
          type: 'checkbox',
          checked: checked ? '' : null,
          onchange: (ev) => {
            progress[id] = ev.target.checked;
            if (!ev.target.checked) delete progress[id];
            saveProgress(progress);
            renderTree();
            renderWeeks();
          }
        });

        const label = el('label', {}, [
          input,
          el('div', { class: 't' }, [text])
        ]);

        const li = el('li', { class: `task ${checked ? 'done' : ''}` }, [label]);

        if (what.length || decisions.length || doneWhen.length || avoid.length) {
          const more = el('details', { class: 'acc', style: 'margin-top:.45rem' }, [
            el('summary', {}, [
              el('div', { class: 'title' }, ['How to do it']),
              el('div', { class: 'meta' }, ['Plain-language guidance (Console/CLI aware)'])
            ]),
            el('div', { class: 'body' }, [
              what.length ? el('h4', {}, ['What to do']) : null,
              what.length ? el('ul', {}, what.map((x) => el('li', {}, [x]))) : null,

              decisions.length ? el('h4', {}, ['Decisions']) : null,
              decisions.length ? el('ul', {}, decisions.map((x) => el('li', {}, [x]))) : null,

              doneWhen.length ? el('h4', {}, ['Done when']) : null,
              doneWhen.length ? el('ul', {}, doneWhen.map((x) => el('li', {}, [x]))) : null,

              avoid.length ? el('h4', {}, ['Avoid']) : null,
              avoid.length ? el('ul', {}, avoid.map((x) => el('li', {}, [x]))) : null
            ])
          ]);
          li.appendChild(more);
        }

        taskUl.appendChild(li);
      });

      dayDetails.appendChild(daySummary);
      dayDetails.appendChild(el('div', { class: 'body' }, [taskUl]));
      weekBody.appendChild(dayDetails);
    });

    weekDetails.appendChild(weekSummary);
    weekDetails.appendChild(weekBody);

    top.appendChild(el('li', {}, [weekDetails]));
  });

  root.appendChild(top);
}

function renderWeeks() {
  const root = $('#weeksList');
  root.innerHTML = '';

  data.weeks.forEach((w, wi) => {
    const wp = weekProgress(wi);

    const details = el('details', { class: 'acc', open: wi === 0 ? '' : null });

    const summary = el('summary', {}, [
      el('div', {}, [
        el('div', { class: 'title' }, [w.title]),
        el('div', { class: 'meta' }, [w.goal])
      ]),
      el('div', { class: 'progress' }, [
        el('span', {}, [`${wp.done}/${wp.total}`]),
        el('span', { class: 'bar', title: `${wp.pct}%` }, [el('i', { style: `width:${wp.pct}%` })])
      ])
    ]);

    const outcomes = el('ul', {}, (w.outcomes || []).map((x) => el('li', {}, [x])));

    const dayBlocks = (w.days || []).map((d, di) => {
      const dayTitle = el('div', { class: 'day-head' }, [
        el('div', {}, [el('strong', {}, [d.title])]),
        el('div', { class: 'day-meta' }, [d.focus ? `Focus: ${d.focus}` : ''])
      ]);

      const ul = el('ul', { class: 'tasklist' });
      (d.tasks || []).forEach((text, ti) => {
        const id = taskId(wi, di, ti);
        const checked = !!progress[id];

        const input = el('input', {
          type: 'checkbox',
          checked: checked ? '' : null,
          onchange: (ev) => {
            progress[id] = ev.target.checked;
            if (!ev.target.checked) delete progress[id];
            saveProgress(progress);
            // re-render progress bars + tree
            renderTree();
            renderWeeks();
          }
        });

        const label = el('label', {}, [
          input,
          el('div', { class: 't' }, [text])
        ]);

        const item = el('li', { class: `task ${checked ? 'done' : ''}` }, [label]);
        ul.appendChild(item);
      });

      return el('div', {}, [dayTitle, ul]);
    });

    const body = el('div', { class: 'body' }, [
      el('h4', {}, ['Outcomes (end of week)']),
      outcomes,
      el('h4', {}, ['Daily checklist']),
      ...dayBlocks
    ]);

    details.appendChild(summary);
    details.appendChild(body);
    root.appendChild(details);
  });
}

function renderSkillTree() {
  const root = $('#skilltree');
  root.innerHTML = '';
  data.skillTree.forEach((s) => {
    root.appendChild(el('li', {}, [
      el('strong', {}, [s.name]),
      ` — ${s.why}`
    ]));
  });
}

function renderInterviews() {
  const root = $('#interviewGrid');
  root.innerHTML = '';
  for (const [k, items] of Object.entries(data.interviews)) {
    root.appendChild(
      el('div', { class: 'kbox' }, [
        el('h3', {}, [k]),
        el('ul', {}, items.map((x) => el('li', {}, [x])))
      ])
    );
  }
}

function renderChecklists() {
  const root = $('#checklistGrid');
  root.innerHTML = '';
  for (const [k, items] of Object.entries(data.checklists)) {
    root.appendChild(
      el('div', { class: 'kbox' }, [
        el('h3', {}, [k]),
        el('ul', {}, items.map((x) => el('li', {}, [x])))
      ])
    );
  }
}

function setAllDetails(open) {
  document.querySelectorAll('details.acc').forEach((d) => {
    d.open = !!open;
  });
}

$('#expandAll')?.addEventListener('click', () => setAllDetails(true));
$('#collapseAll')?.addEventListener('click', () => setAllDetails(false));
$('#resetProgress')?.addEventListener('click', () => {
  if (!confirm('Reset all progress?')) return;
  progress = {};
  saveProgress(progress);
  renderTree();
  renderWeeks();
});

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function addAnchoredHeadings() {
  const headings = document.querySelectorAll('main h2, main h3');
  const used = new Set(Array.from(document.querySelectorAll('[id]')).map((n) => n.id));

  headings.forEach((h) => {
    if (h.querySelector('a.anchor')) return;

    const text = h.textContent || '';
    let id = h.id || slugify(text);
    if (!id) return;

    // ensure unique
    let base = id;
    let i = 2;
    while (used.has(id)) {
      if (h.id === id) break;
      id = `${base}-${i++}`;
    }

    h.id = id;
    used.add(id);

    const a = document.createElement('a');
    a.className = 'anchor';
    a.href = `#${id}`;
    a.setAttribute('aria-label', `Link to: ${text.trim()}`);
    a.textContent = '#';
    h.appendChild(a);
  });
}

function flattenDays() {
  const out = [];
  data.weeks.forEach((w, wi) => {
    (w.days || []).forEach((d, di) => {
      out.push({ w, d, wi, di });
    });
  });
  return out;
}

function dayProgress(wi, di) {
  const w = data.weeks[wi];
  const d = w?.days?.[di];
  const tasks = Array.isArray(d?.tasks) ? d.tasks : [];
  let total = tasks.length;
  let done = 0;
  tasks.forEach((_t, ti) => {
    if (progress[taskId(wi, di, ti)]) done++;
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function renderDailyPage() {
  const flat = flattenDays();
  const cal = $('#calendar');
  const dayTitle = $('#dayTitle');
  const dayMeta = $('#dayMeta');
  const dayBody = $('#dayBody');
  if (!cal || !dayTitle || !dayMeta || !dayBody) return;

  const url = new URL(window.location.href);
  const initial = Number(url.searchParams.get('day') || '1');
  let selectedIndex = Number.isFinite(initial) ? Math.max(1, Math.min(flat.length, initial)) : 1;

  function selectDay(n) {
    selectedIndex = n;
    url.searchParams.set('day', String(n));
    window.history.replaceState({}, '', url);
    draw();
  }

  function draw() {
    cal.innerHTML = '';

    flat.forEach(({ w, d, wi, di }, idx) => {
      const dayNum = idx + 1;
      const dp = dayProgress(wi, di);
      const pressed = dayNum === selectedIndex;

      const btn = el('button', {
        type: 'button',
        class: 'cal-btn',
        'aria-pressed': pressed ? 'true' : 'false',
        onclick: () => selectDay(dayNum)
      }, [
        el('div', { class: 'n' }, [`Day ${dayNum}`]),
        el('div', { class: 't' }, [d.title || w.title]),
        el('div', { class: 'p' }, [
          el('span', { class: `cal-dot ${dp.pct === 100 ? 'done' : ''}`, 'aria-hidden': 'true' }),
          el('span', {}, [`${dp.done}/${dp.total}`])
        ])
      ]);

      cal.appendChild(btn);
    });

    const chosen = flat[selectedIndex - 1];
    if (!chosen) return;

    const { w, d, wi, di } = chosen;
    dayTitle.textContent = `Day ${selectedIndex} — ${d.title}`;
    dayMeta.textContent = d.focus ? `Focus: ${d.focus}` : '4h/day';

    const tasks = Array.isArray(d.tasks) ? d.tasks : [];
    const list = el('ul', { class: 'tasklist' });

    tasks.forEach((task, ti) => {
      const text = typeof task === 'string' ? task : task.text;
      const what = typeof task === 'string' ? [] : (task.what || []);
      const decisions = typeof task === 'string' ? [] : (task.decisions || []);
      const doneWhen = typeof task === 'string' ? [] : (task.doneWhen || []);
      const avoid = typeof task === 'string' ? [] : (task.avoid || []);

      const id = taskId(wi, di, ti);
      const checked = !!progress[id];

      const input = el('input', {
        type: 'checkbox',
        checked: checked ? '' : null,
        onchange: (ev) => {
          progress[id] = ev.target.checked;
          if (!ev.target.checked) delete progress[id];
          saveProgress(progress);
          renderDailyPage();
        }
      });

      const label = el('label', {}, [
        input,
        el('div', { class: 't' }, [text])
      ]);

      const li = el('li', { class: `task ${checked ? 'done' : ''}` }, [label]);

      const hasMore = what.length || decisions.length || doneWhen.length || avoid.length;
      if (hasMore) {
        li.appendChild(
          el('details', { class: 'acc', style: 'margin-top:.45rem' }, [
            el('summary', {}, [
              el('div', { class: 'title' }, ['How to do it']),
              el('div', { class: 'meta' }, ['Console and CLI guidance (no code dump)'])
            ]),
            el('div', { class: 'body' }, [
              what.length ? el('h4', {}, ['What to do']) : null,
              what.length ? el('ul', {}, what.map((x) => el('li', {}, [x]))) : null,
              decisions.length ? el('h4', {}, ['Decisions']) : null,
              decisions.length ? el('ul', {}, decisions.map((x) => el('li', {}, [x]))) : null,
              doneWhen.length ? el('h4', {}, ['Done when']) : null,
              doneWhen.length ? el('ul', {}, doneWhen.map((x) => el('li', {}, [x]))) : null,
              avoid.length ? el('h4', {}, ['Avoid']) : null,
              avoid.length ? el('ul', {}, avoid.map((x) => el('li', {}, [x]))) : null
            ])
          ])
        );
      }

      list.appendChild(li);
    });

    dayBody.innerHTML = '';
    dayBody.appendChild(list);
  }

  draw();
}

function renderRoadmapPage() {
  if (!$('#treeRoot')) return;
  renderTree();
}

const page = document.body?.dataset?.page || '';

$('#resetProgress')?.addEventListener('click', () => {
  if (!confirm('Reset all progress?')) return;
  progress = {};
  saveProgress(progress);
  if (page === 'daily') renderDailyPage();
  else {
    renderTree();
    renderWeeks();
  }
});

if (page === 'daily') {
  renderDailyPage();
} else if (page === 'roadmap') {
  renderRoadmapPage();
} else {
  renderChips();
  renderTree();
  renderWeeks();
  renderSkillTree();
  renderInterviews();
  renderChecklists();
}

addAnchoredHeadings();
