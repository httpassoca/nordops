import data from './content/roadmap.json' with { type: 'json' };

const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function renderChips() {
  const root = $('#chips');
  root.innerHTML = '';
  for (const k of data.keywords) root.appendChild(el('span', { class: 'chip' }, [k]));
}

function renderWeeks() {
  const root = $('#weeksList');
  root.innerHTML = '';

  data.weeks.forEach((w, idx) => {
    const details = el('details', { class: 'acc', open: idx === 0 ? '' : null });

    const summary = el('summary', {}, [
      el('div', {}, [
        el('div', { class: 'title' }, [w.title]),
        el('div', { class: 'meta' }, [w.goal])
      ]),
      el('div', { class: 'badge alt' }, [`Week ${idx + 1}`])
    ]);

    const outcomes = el('ul', {}, w.outcomes.map((x) => el('li', {}, [x])));
    const quests = el('ul', {}, w.quests.map((x) => el('li', {}, [x])));

    const body = el('div', { class: 'body' }, [
      el('h4', {}, ['Outcomes']),
      outcomes,
      el('h4', {}, ['Quests']),
      quests
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

renderChips();
renderWeeks();
renderSkillTree();
renderInterviews();
renderChecklists();
