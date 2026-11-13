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
