(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IsSirasiCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_TASKS = 40;
  const MAX_MINUTES = 1440;
  function cleanText(value) { return String(value ?? '').trim(); }
  function validate(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: 'Önce en az bir iş eklemeliyim.' };
    if (raw.length > MAX_TASKS) return { ok: false, error: 'En fazla 40 iş ekleyebilirim.' };
    const tasks = [];
    const ids = new Set();
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i] || {};
      const id = cleanText(item.id).toUpperCase();
      const name = cleanText(item.name);
      const duration = Number(item.duration);
      const needs = Array.isArray(item.needs) ? item.needs.map(x => cleanText(x).toUpperCase()).filter(Boolean) : cleanText(item.needs).split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
      if (!/^[A-Z][A-Z0-9_-]{0,11}$/.test(id)) return { ok: false, error: (i + 1) + '. işin kısa kodu A-Z ile başlamalı ve 12 işareti geçmemeli.' };
      if (ids.has(id)) return { ok: false, error: id + ' kodunu iki kez kullandım.' };
      if (!name || name.length > 80) return { ok: false, error: id + ' işi için 1–80 harflik bir ad yazmalıyım.' };
      if (!Number.isInteger(duration) || duration < 1 || duration > MAX_MINUTES) return { ok: false, error: id + ' işinin süresi 1–1440 dakika olmalı.' };
      if (needs.length > MAX_TASKS || new Set(needs).size !== needs.length) return { ok: false, error: id + ' işinin önceki iş kodlarında tekrar var.' };
      ids.add(id);
      tasks.push({ id, name, duration, needs });
    }
    for (const task of tasks) {
      for (const need of task.needs) {
        if (need === task.id) return { ok: false, error: task.id + ' kendi kendisini bekleyemez.' };
        if (!ids.has(need)) return { ok: false, error: task.id + ' işinin beklediği ' + need + ' kodlu iş yok.' };
      }
    }
    return { ok: true, tasks };
  }
  function plan(raw) {
    const checked = validate(raw);
    if (!checked.ok) return checked;
    const tasks = checked.tasks;
    const byId = new Map(tasks.map(t => [t.id, t]));
    const state = new Map();
    const order = [];
    const stack = [];
    let cycle = null;
    function visit(id) {
      if (cycle) return;
      if (state.get(id) === 2) return;
      if (state.get(id) === 1) { const start = stack.indexOf(id); cycle = stack.slice(start).concat(id); return; }
      state.set(id, 1); stack.push(id);
      for (const dep of byId.get(id).needs) visit(dep);
      stack.pop(); state.set(id, 2); order.push(id);
    }
    for (const task of tasks) visit(task.id);
    if (cycle) return { ok: false, error: 'İşler birbirini bekliyor: ' + cycle.join(' → ') + '. Bir bağı kaldırmalıyım.', cycle };
    const scheduled = new Map();
    for (const id of order) {
      const task = byId.get(id);
      let start = 0;
      let previous = null;
      for (const dep of task.needs) {
        const d = scheduled.get(dep);
        if (d.end > start) { start = d.end; previous = dep; }
      }
      scheduled.set(id, { ...task, start, end: start + task.duration, previous });
    }
    const result = Array.from(scheduled.values()).sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
    const total = Math.max(...result.map(t => t.end));
    const work = result.reduce((sum, t) => sum + t.duration, 0);
    const last = result.filter(t => t.end === total).sort((a, b) => a.id.localeCompare(b.id))[0];
    const criticalPath = [];
    let cursor = last;
    while (cursor) { criticalPath.unshift(cursor.id); cursor = cursor.previous ? scheduled.get(cursor.previous) : null; }
    return { ok: true, tasks: result, total, work, saved: work - total, criticalPath,
      note: 'Süre hesabım, yeterli kişi ve araç varsa işleri aynı anda yapabileceğimi varsayar. Gerçek bitiş daha uzun olabilir.' };
  }
  function formatMinutes(n) {
    const h = Math.floor(n / 60), m = n % 60;
    return h ? h + ' sa' + (m ? ' ' + m + ' dk' : '') : m + ' dk';
  }
  function report(result) {
    if (!result?.ok) return '';
    const lines = ['İşSırası planım', 'En erken bitiş: ' + formatMinutes(result.total), 'Tek tek süre toplamı: ' + formatMinutes(result.work), 'Aynı anda yapılabilen süre farkı: ' + formatMinutes(result.saved), 'En uzun zorunlu yol: ' + result.criticalPath.join(' → '), '', 'İşlerim:'];
    result.tasks.forEach(t => lines.push(t.id + ' | ' + t.name + ' | ' + formatMinutes(t.start) + ' başlar, ' + formatMinutes(t.end) + ' biter | Önce: ' + (t.needs.join(', ') || 'yok')));
    lines.push('', result.note);
    return lines.join('\n');
  }
  return { MAX_TASKS, validate, plan, formatMinutes, report };
});
