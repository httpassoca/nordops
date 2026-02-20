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

  const top = el('ul', { class: 'tree', role: 'tree' });

  data.weeks.forEach((w, wi) => {
    const wp = weekProgress(wi);

    const weekLi = el('li', { role: 'treeitem' });
    weekLi.appendChild(
      el('div', { class: 'node' }, [
        el('div', {}, [
          el('div', { class: 'name' }, [w.title]),
          el('div', { class: 'small' }, [w.goal])
        ]),
        el('span', { class: 'pill', title: `${wp.pct}% complete` }, [`${wp.done}/${wp.total} · ${wp.pct}%`])
      ])
    );

    const daysUl = el('ul', { role: 'group' });
    (w.days || []).forEach((d, di) => {
      const tasks = Array.isArray(d.tasks) ? d.tasks : [];
      const done = tasks.reduce((acc, _t, ti) => acc + (progress[taskId(wi, di, ti)] ? 1 : 0), 0);
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

      const dayLi = el('li', { role: 'treeitem' });
      dayLi.appendChild(
        el('div', { class: 'node' }, [
          el('div', {}, [
            el('div', { class: 'name' }, [d.title]),
            el('div', { class: 'small' }, [d.focus ? `Focus: ${d.focus}` : ''])
          ]),
          el('span', { class: 'pill', title: `${pct}% complete` }, [`${done}/${tasks.length}`])
        ])
      );

      const taskUl = el('ul', { role: 'group' });
      tasks.forEach((t, ti) => {
        const id = taskId(wi, di, ti);
        const checked = !!progress[id];
        taskUl.appendChild(
          el('li', { role: 'treeitem' }, [
            el('div', { class: 'node' }, [
              el('div', { class: 'small' }, [checked ? `✓ ${t}` : t]),
              el('span', { class: 'pill' }, [checked ? 'done' : 'todo'])
            ])
          ])
        );
      });

      dayLi.appendChild(taskUl);
      daysUl.appendChild(dayLi);
    });

    weekLi.appendChild(daysUl);
    top.appendChild(weekLi);
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

renderChips();
renderTree();
renderWeeks();
renderSkillTree();
renderInterviews();
renderChecklists();
