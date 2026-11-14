(function () {
  if (window.__lrHooked) return;
  window.__lrHooked = true;
  var A = window.Android;
  if (!A) return;

  function ev(s) {
    try { if (s.length > 450) s = s.slice(0, 450) + '…'; A.ev(s); } catch (e) {}
  }
  function mask(s) {
    if (typeof s !== 'string') return s;
    s = s.replace(/("[^"]*(?:pass|token|auth|secret|key)[^"]*"\s*:\s*)"[^"]*"/gi, '$1"***"');
    s = s.replace(/([?&;][^=&]*(?:pass|token|auth|secret|key)[^=&]*=)[^&\s]*/gi, '$1***');
    return s;
  }
  function sel(el) {
    if (!el || el.nodeType !== 1) return '';
    var parts = [], n = el;
    for (var i = 0; n && n.nodeType === 1 && i < 5; i++) {
      var p = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(p + '#' + n.id); break; }
      var c = (typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      if (c) p += '.' + c;
      var par = n.parentElement;
      if (par) {
        var sib = [].filter.call(par.children, function (x) { return x.tagName === n.tagName; });
        if (sib.length > 1) p += ':nth-of-type(' + (sib.indexOf(n) + 1) + ')';
      }
      parts.unshift(p);
      n = par;
    }
    return parts.join(' > ');
  }
  function one(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }

  // ---- сеть: fetch
  var of = window.fetch;
  if (of) {
    window.fetch = function (input, init) {
      var m = (init && init.method) || (input && input.method) || 'GET';
      var u = typeof input === 'string' ? input : ((input && input.url) || String(input));
      var b = init && typeof init.body === 'string' ? init.body : '';
      var t0 = Date.now();
      return of.apply(this, arguments).then(function (r) {
        try {
          var ct = r.headers.get('content-type') || '';
          if (/json|text|html/i.test(ct)) {
            r.clone().text().then(function (tx) {
              ev('[NET fetch] ' + m + ' ' + mask(u) + ' body=' + mask(one(b, 300)) + ' -> ' + r.status + ' (' + (Date.now() - t0) + 'ms) resp=' + mask(one(tx, 300)));
            }).catch(function () {});
          } else {
            ev('[NET fetch] ' + m + ' ' + mask(u) + ' -> ' + r.status + ' ' + ct);
          }
        } catch (e) {}
        return r;
      }, function (err) {
        ev('[NET fetch] ' + m + ' ' + mask(u) + ' ERROR ' + err);
        throw err;
      });
    };
  }

  // ---- сеть: XHR
  var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) {
    this.__m = m; this.__u = u;
    return XO.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (b) {
    var x = this, t0 = Date.now(), bs = typeof b === 'string' ? b : '';
    x.addEventListener('loadend', function () {
      var r = '';
      try { if (!x.responseType || x.responseType === 'text') r = one(x.responseText, 300); } catch (e) {}
      ev('[NET xhr] ' + x.__m + ' ' + mask(String(x.__u)) + ' body=' + mask(one(bs, 300)) + ' -> ' + x.status + ' (' + (Date.now() - t0) + 'ms) resp=' + mask(r));
    });
    return XS.apply(this, arguments);
  };

  // ---- действия пользователя
  document.addEventListener('click', function (e) {
    var t = e.target;
    ev('[CLICK] ' + sel(t) + ' text="' + one(t.innerText || t.value || '', 60) + '"');
  }, true);
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || !t.tagName) return;
    var v = (t.type === 'password') ? '***' : one(t.value, 200);
    ev('[INPUT] ' + sel(t) + ' value="' + mask(v) + '"');
  }, true);
  document.addEventListener('submit', function (e) { ev('[SUBMIT] ' + sel(e.target)); }, true);

  // ---- изменения на странице (таймер, появление и исчезновение блоков)
  var seen = new WeakMap(), total = 0;
  function startMO() {
    var mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (total > 1500) return;
        var m = list[i];
        if (m.type === 'characterData') {
          var el = m.target.parentElement;
          if (!el) continue;
          var c = (seen.get(el) || 0) + 1;
          seen.set(el, c);
          if (c > 6 && c % 10) continue;
          total++;
          ev('[TEXT] ' + sel(el) + ' "' + one(m.oldValue, 60) + '" -> "' + one(m.target.data, 60) + '" (#' + c + ')');
        } else if (m.type === 'childList') {
          var k;
          for (k = 0; k < m.addedNodes.length; k++) {
            var n = m.addedNodes[k];
            if (n.nodeType === 3) {
              var pe = m.target;
              var c2 = (seen.get(pe) || 0) + 1;
              seen.set(pe, c2);
              if (c2 > 6 && c2 % 10) continue;
              total++;
              ev('[TEXT] ' + sel(pe) + ' -> "' + one(n.data, 60) + '" (#' + c2 + ')');
            } else if (n.nodeType === 1) {
              var tx = one(n.innerText, 80);
              if (!tx && !n.id) continue;
              total++;
              ev('[ADD] ' + sel(n) + ' "' + tx + '"');
            }
          }
          for (k = 0; k < m.removedNodes.length; k++) {
            var r = m.removedNodes[k];
            if (r.nodeType !== 1) continue;
            var rt = one(r.innerText || r.textContent, 80);
            if (!rt && !r.id) continue;
            total++;
            ev('[DEL] ' + sel(r) + ' "' + rt + '"');
          }
        } else if (m.type === 'attributes') {
          total++;
          var t = m.target;
          ev('[ATTR] ' + sel(t) + ' ' + m.attributeName + '=' + t.getAttribute(m.attributeName));
        }
      }
    });
    mo.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, characterDataOldValue: true,
      attributes: true, attributeFilter: ['disabled', 'hidden', 'aria-disabled']
    });
  }
  if (document.documentElement) startMO();
  else document.addEventListener('DOMContentLoaded', startMO);
})();

// ================= Обучение по первому ручному разу + повтор =================
(function () {
  if (window.__lrLearnInit) return;
  window.__lrLearnInit = true;
  var A = window.Android;
  if (!A) return;
  var LS = '__lr_learn';
  var learn = null;
  try { learn = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
  var rec = null;

  function one(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }
  function vis(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function say(m) { try { A.prog(m); A.ev('[LOOP] ' + m); } catch (e) {} }
  function save() { try { localStorage.setItem(LS, JSON.stringify(learn)); } catch (e) {} }
  function sel(el) {
    if (!el || el.nodeType !== 1) return '';
    var parts = [], n = el;
    for (var i = 0; n && n.nodeType === 1 && i < 5; i++) {
      var p = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(p + '#' + n.id); break; }
      var c = (typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      if (c) p += '.' + c;
      var par = n.parentElement;
      if (par) {
        var sib = [].filter.call(par.children, function (x) { return x.tagName === n.tagName; });
        if (sib.length > 1) p += ':nth-of-type(' + (sib.indexOf(n) + 1) + ')';
      }
      parts.unshift(p);
      n = par;
    }
    return parts.join(' > ');
  }
  function q(s) { try { return s ? document.querySelector(s) : null; } catch (e) { return null; } }
  function summary() {
    return 'Запомнил: поле «' + one(learn.inp.ph || learn.inp.name || learn.inp.sel, 30) +
      '», нажатий: ' + learn.steps.length + ' (' + learn.steps.map(function (s) { return one(s.text, 20); }).join(' → ') +
      '), ссылка: ' + one(learn.val, 50) + '. Теперь можно нажать «Повторять».';
  }

  var BTN_SEL = 'button,input[type=submit],input[type=button],[role=button],a.btn,.btn';
  var TEXT_TYPES = /^(text|url|search|)$/i;
  function isTextInput(t) {
    return !!t && ((t.tagName === 'INPUT' && TEXT_TYPES.test(t.type || '')) || t.tagName === 'TEXTAREA');
  }

  // --- запоминаем, что человек сделал вручную: ссылка -> нажатия кнопок
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!isTextInput(t)) return;
    var v = String(t.value || '');
    if (!v) return;
    if (!rec || rec.el !== t || rec.steps.length > 0) rec = { el: t, steps: [], t: 0 };
    rec.val = v;
    rec.t = Date.now();
  }, true);

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest(BTN_SEL) : null;
    if (!b || !rec || !rec.val) return;
    if (Date.now() - rec.t > 90000) return;
    rec.t = Date.now();
    rec.steps.push({ sel: sel(b), text: one(b.innerText || b.value, 40) });
    learn = {
      inp: { sel: sel(rec.el), ph: rec.el.placeholder || '', name: rec.el.name || '', type: rec.el.type || 'text', id: rec.el.id || '' },
      val: rec.val,
      steps: rec.steps.slice()
    };
    save();
    try { A.learned(summary()); } catch (e2) {}
  }, true);

  // --- поиск элементов
  function setValue(el, val) {
    el.focus();
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function findInput() {
    var d = learn.inp, e = q(d.sel);
    if (e && vis(e) && isTextInput(e)) return e;
    var list = [].slice.call(document.querySelectorAll('input,textarea')).filter(function (x) { return vis(x) && isTextInput(x); });
    return list.filter(function (x) {
      return (d.id && x.id === d.id) || (d.name && x.name === d.name) || (d.ph && x.placeholder === d.ph);
    })[0] || null;
  }
  function findBtn(s) {
    var t = (s.text || '').toLowerCase();
    var e = q(s.sel);
    if (e && vis(e) && !e.disabled && (!t || one(e.innerText || e.value, 40).toLowerCase() === t)) return e;
    var list = [].slice.call(document.querySelectorAll(BTN_SEL)).filter(function (x) { return vis(x) && !x.disabled; });
    return list.filter(function (x) { return one(x.innerText || x.value, 40).toLowerCase() === t; })[0] || null;
  }

  // --- таймер: активен, если текст с цифрами недавно менялся
  var TIMER_RE = /\b\d{1,2}:\d{2}(:\d{2})?\b|\b\d+\s*(s|sec|secs|second|seconds|min|mins|minute|minutes|с|сек|секунд|секунды|мин|минут|минуты)\b/i;
  var tmap = new Map();
  function timerTick() {
    var now = Date.now(), act = false, seen = new Set();
    [].forEach.call(document.body.querySelectorAll('*'), function (e) {
      if (e.children.length || !vis(e)) return;
      var t = one(e.textContent, 90);
      if (!t || t.length > 80 || !TIMER_RE.test(t)) return;
      seen.add(e);
      var r = tmap.get(e);
      if (!r) { r = { t: t, c: now }; tmap.set(e, r); }
      else if (r.t !== t) { r.t = t; r.c = now; }
      if (now - r.c < 6000 && /[1-9]/.test(t)) act = true;
    });
    tmap.forEach(function (v, k) { if (!seen.has(k)) tmap.delete(k); });
    return act;
  }

  window.__lrStop = false;
  async function waitFor(cond, ms) {
    var t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (window.__lrStop) return false;
      if (cond()) return true;
      await sleep(500);
    }
    return false;
  }

  // --- повтор
  window.__lrRepeat = async function (n) {
    if (!learn || !learn.steps || !learn.steps.length) {
      say('Сначала один раз сделайте всё вручную на сайте: вставьте ссылку и нажмите нужные кнопки');
      return;
    }
    window.__lrStop = false;
    for (var i = 1; i <= n; i++) {
      if (window.__lrStop) { say('Остановлено'); return; }
      say('Повтор ' + i + ' из ' + n + ': жду окончания таймера…');
      await waitFor(function () { return !timerTick(); }, 3600000);
      if (window.__lrStop) { say('Остановлено'); return; }

      var inp = null;
      var okInp = await waitFor(function () { inp = findInput(); return !!inp; }, 180000);
      if (!okInp) {
        if (window.__lrStop) { say('Остановлено'); return; }
        say('Не нашёл поле ввода. Если сайт просит капчу или открыл другую страницу, пройдите это и нажмите «Повторять» снова');
        return;
      }
      setValue(inp, learn.val);
      await sleep(800);

      for (var k = 0; k < learn.steps.length; k++) {
        var st = learn.steps[k], b = null;
        var okB = await waitFor(function () { b = findBtn(st); return !!b; }, 30000);
        if (!okB) {
          if (window.__lrStop) { say('Остановлено'); return; }
          say('Не нашёл кнопку «' + st.text + '» (шаг ' + (k + 1) + '). Нажмите «Лог» и пришлите отчёт');
          return;
        }
        b.click();
        say('Повтор ' + i + ' из ' + n + ': нажал «' + st.text + '»');
        await sleep(1500);
      }

      say('Повтор ' + i + ' из ' + n + ': жду таймер…');
      var appeared = await waitFor(timerTick, 25000);
      if (appeared) await waitFor(function () { return !timerTick(); }, 3600000);
      else await sleep(8000);
    }
    say('Готово: выполнено повторов: ' + n);
  };

  if (learn && learn.steps && learn.steps.length) { try { A.learned(summary()); } catch (e) {} }
})();
