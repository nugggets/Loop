(function () {
  var A = window.Android;
  var out = [];
  function cut(s, n) {
    s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  function vis(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
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
  var TIMER_RE = /\b\d{1,2}:\d{2}(:\d{2})?\b|\b\d+\s*(s|sec|secs|seconds|min|с|сек|секунд|мин)\b/i;
  var TAB_RE = /comment|heart|like|коммент|сердц|лайк/i;

  out.push('URL: ' + location.href);
  out.push('TITLE: ' + document.title);
  out.push('VIEWPORT: ' + innerWidth + 'x' + innerHeight);

  var fr = [].slice.call(document.querySelectorAll('iframe'));
  out.push('\n-- IFRAME (' + fr.length + ') --');
  fr.slice(0, 10).forEach(function (f) { out.push(sel(f) + ' src=' + f.src); });

  var ins = [].slice.call(document.querySelectorAll('input,textarea,select')).filter(function (e) { return e.type !== 'hidden'; });
  out.push('\n-- ПОЛЯ ВВОДА (' + ins.length + ') --');
  ins.slice(0, 40).forEach(function (e) {
    out.push((vis(e) ? '[видно] ' : '[скрыто] ') + sel(e) + ' type=' + e.type + ' name=' + e.name + ' id=' + e.id +
      ' placeholder="' + cut(e.placeholder, 60) + '" value="' + (e.type === 'password' ? '***' : cut(e.value, 80)) + '"');
  });

  var bs = [].slice.call(document.querySelectorAll('button,input[type=submit],input[type=button],[role=button]'));
  out.push('\n-- КНОПКИ (' + bs.length + ') --');
  bs.slice(0, 60).forEach(function (b) {
    out.push((vis(b) ? '[видно]' : '[скрыто]') + (b.disabled ? '[disabled] ' : ' ') + sel(b) + ' text="' + cut(b.innerText || b.value, 60) + '"');
  });

  var tabs = [].slice.call(document.querySelectorAll('a,button,li,div,span,[role=tab]')).filter(function (e) {
    var t = cut(e.innerText, 60);
    return e.children.length <= 2 && t.length > 0 && t.length < 40 && TAB_RE.test(t);
  });
  out.push('\n-- ВКЛАДКИ / ПУНКТЫ МЕНЮ (Comments, Hearts…) (' + tabs.length + ') --');
  tabs.slice(0, 30).forEach(function (e) {
    out.push((vis(e) ? '[видно] ' : '[скрыто] ') + e.tagName.toLowerCase() + ' ' + sel(e) + ' text="' + cut(e.innerText, 40) + '"' + (e.href ? ' href=' + e.href : ''));
  });

  var timers = [];
  [].forEach.call(document.body.querySelectorAll('*'), function (e) {
    if (e.children.length || !vis(e)) return;
    var t = cut(e.textContent, 40);
    if (t && TIMER_RE.test(t)) timers.push(e);
  });
  out.push('\n-- ТАЙМЕР-КАНДИДАТЫ (' + timers.length + ') --');
  timers.slice(0, 20).forEach(function (e) {
    out.push(sel(e) + ' text="' + cut(e.textContent, 40) + '" html=' + cut(e.outerHTML, 200));
  });

  var fi = ins.filter(vis)[0];
  if (fi) {
    var p = fi;
    for (var i = 0; i < 3 && p.parentElement && p.parentElement !== document.body; i++) p = p.parentElement;
    out.push('\n-- HTML ВОКРУГ ПЕРВОГО ВИДИМОГО ПОЛЯ ВВОДА --');
    out.push(cut(p.outerHTML, 4000));
  }
  if (timers[0]) {
    var q = timers[0];
    for (var j = 0; j < 2 && q.parentElement && q.parentElement !== document.body; j++) q = q.parentElement;
    out.push('\n-- HTML ВОКРУГ ТАЙМЕРА --');
    out.push(cut(q.outerHTML, 3000));
  }

  out.push('\n-- ВИДИМЫЙ ТЕКСТ СТРАНИЦЫ (первые 1500 символов) --');
  out.push(cut(document.body.innerText, 1500));

  var sc = [].slice.call(document.scripts).map(function (s) { return s.src; }).filter(Boolean);
  out.push('\n-- SCRIPTS (' + sc.length + ') --');
  sc.slice(0, 20).forEach(function (s) { out.push(s); });

  try { out.push('\nlocalStorage keys: ' + Object.keys(localStorage).join(', ')); } catch (e) {}
  try { out.push('sessionStorage keys: ' + Object.keys(sessionStorage).join(', ')); } catch (e) {}
  out.push('cookie names: ' + document.cookie.split(';').map(function (x) { return x.split('=')[0].trim(); }).join(', '));

  try { A.snap(out.join('\n')); } catch (e) {}
})();
