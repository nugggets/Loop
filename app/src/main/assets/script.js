(async function () {
  const C = window.__LR;
  window.__lrStop = false;
  const log = m => { try { Android.log(m); } catch (e) {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const q = s => { try { return s ? document.querySelector(s) : null; } catch (e) { return null; } };

  function findInput() {
    if (C.inputSel) return q(C.inputSel);
    const list = [...document.querySelectorAll(
      'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=password]):not([type=file]),textarea'
    )].filter(vis);
    return list.find(e => /url|link|ссыл/i.test((e.placeholder || '') + (e.name || '') + (e.id || ''))) || list[0];
  }

  function findButton(inp) {
    if (C.buttonSel) return q(C.buttonSel);
    let p = inp;
    for (let i = 0; i < 6 && p; i++) {
      p = p.parentElement;
      if (!p) break;
      const bs = [...p.querySelectorAll('button,input[type=submit],[role=button]')]
        .filter(vis).filter(x => !x.disabled);
      if (bs.length) {
        return bs.find(b => /send|submit|go|start|add|get|order|отправ|запуст|старт|получ|добав|заказ/i
          .test(b.innerText || b.value || '')) || bs[0];
      }
    }
    return null;
  }

  const TIMER_RE = /\b\d{1,2}:\d{2}(:\d{2})?\b|\b\d+\s*(s|sec|secs|seconds|с|сек|секунд)\b/i;
  function findTimer() {
    if (C.timerSel) { const e = q(C.timerSel); return vis(e) ? e : null; }
    const all = document.body.querySelectorAll('*');
    for (const e of all) {
      if (e.children.length) continue;
      if (!vis(e)) continue;
      const t = (e.textContent || '').trim();
      if (t.length > 40 || !t) continue;
      if (TIMER_RE.test(t)) return e;
    }
    return null;
  }
  function timerActive() {
    const e = findTimer();
    if (!e) return false;
    const t = (e.textContent || '').trim();
    const digits = t.replace(/\D/g, '');
    if (!digits || /^0+$/.test(digits)) return false;
    return true;
  }

  function setValue(el, val) {
    el.focus();
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function waitFor(cond, timeoutMs) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (window.__lrStop) return false;
      if (cond()) return true;
      await sleep(500);
    }
    return false;
  }

  for (let i = 1; i <= C.count; i++) {
    if (window.__lrStop) { log('Остановлено'); return; }

    // перед отправкой ждём, пока предыдущий таймер закончится
    await waitFor(() => !timerActive(), 3600000);

    const inp = findInput();
    if (!inp) { log('Не нашёл поле ввода. Укажите селектор в настройках'); return; }
    setValue(inp, C.link);
    await sleep(600);
    const btn = findButton(inp);
    if (!btn) { log('Не нашёл кнопку. Укажите селектор в настройках'); return; }
    btn.click();
    log('Отправлено ' + i + ' из ' + C.count);

    // ждём появления таймера (до 20 с), потом его окончания
    const appeared = await waitFor(timerActive, 20000);
    if (appeared) {
      log('Отправлено ' + i + ' из ' + C.count + ' — идёт таймер…');
      await waitFor(() => !timerActive(), 3600000);
    } else {
      log('Отправлено ' + i + ' из ' + C.count + ' — таймер не найден, пауза 10 с');
      await sleep(10000);
    }
    await sleep(1000);
  }
  log('Готово: выполнено ' + C.count + ' из ' + C.count);
})();
