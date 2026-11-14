package com.nugggets.linkrepeater;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.text.InputType;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    WebView web;
    EditText url, count;
    TextView status, logView;
    ScrollView logScroll;
    LinearLayout diag;
    SharedPreferences sp;
    final List<String> events = new ArrayList<>();
    final List<String> snaps = new ArrayList<>();
    String hookJs = "", snapJs = "";
    long lastUi = 0;

    Button button(String text, View.OnClickListener l, LinearLayout row) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(13);
        b.setOnClickListener(l);
        row.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        return b;
    }

    LinearLayout row() {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        return r;
    }

    @Override
    protected void onCreate(Bundle s) {
        super.onCreate(s);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        sp = getSharedPreferences("lr", 0);
        try {
            hookJs = readAsset("hook.js");
            snapJs = readAsset("snap.js");
        } catch (Exception e) { /* ignore */ }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        url = new EditText(this);
        url.setSingleLine(true);
        url.setHint("Адрес сайта");
        url.setText(sp.getString("url", "https://"));
        root.addView(url);

        LinearLayout r1 = row();
        button("Открыть", v -> openUrl(), r1);
        button("Лог", v -> toggleLog(), r1);
        button("⚙", v -> diag.setVisibility(diag.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE), r1);
        root.addView(r1);

        LinearLayout r2 = row();
        count = new EditText(this);
        count.setInputType(InputType.TYPE_CLASS_NUMBER);
        count.setHint("Сколько раз");
        count.setSingleLine(true);
        count.setText(sp.getString("count", "5"));
        r2.addView(count, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        button("Повторять", v -> startRepeat(), r2);
        button("Стоп", v -> stopRepeat(), r2);
        root.addView(r2);

        diag = row();
        button("Снимок", v -> web.evaluateJavascript(snapJs, null), diag);
        button("Очистить", v -> clearAll(), diag);
        button("Копия", v -> copyReport(), diag);
        button("Сохранить", v -> saveReport(), diag);
        button("Отправить", v -> shareReport(), diag);
        diag.setVisibility(View.GONE);
        root.addView(diag);

        status = new TextView(this);
        status.setPadding(24, 4, 24, 4);
        status.setTextSize(12);
        status.setText("Введите адрес сайта и нажмите «Открыть». Один раз сделайте всё вручную (ссылка → кнопки), дальше приложение повторит само.");
        root.addView(status);

        FrameLayout fl = new FrameLayout(this);
        web = new WebView(this);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setLoadWithOverviewMode(true);
        // обычный мобильный Chrome вместо маркеров WebView ("; wv", "Version/4.0")
        String ua = ws.getUserAgentString().replace("; wv", "").replace("Version/4.0 ", "");
        ws.setUserAgentString(ua);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView v, String u, Bitmap f) {
                addEv("[PAGE start] " + u);
                v.evaluateJavascript(hookJs, null);
            }

            @Override
            public void onPageFinished(WebView v, String u) {
                addEv("[PAGE done] " + u);
                v.evaluateJavascript(hookJs, null);
            }
        });
        fl.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        logView = new TextView(this);
        logView.setTextSize(11);
        logView.setTypeface(Typeface.MONOSPACE);
        logView.setTextIsSelectable(true);
        logView.setPadding(16, 8, 16, 8);
        logScroll = new ScrollView(this);
        logScroll.setBackgroundColor(0xFFFFFFFF);
        logScroll.addView(logView);
        logScroll.setVisibility(View.GONE);
        fl.addView(logScroll, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        root.addView(fl, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        String u = sp.getString("url", "");
        if (u.startsWith("http") && u.length() > 8) web.loadUrl(u);
    }

    void openUrl() {
        String u = url.getText().toString().trim();
        if (!u.startsWith("http")) u = "https://" + u;
        sp.edit().putString("url", u).apply();
        logScroll.setVisibility(View.GONE);
        web.loadUrl(u);
    }

    void startRepeat() {
        int n = 5;
        try { n = Integer.parseInt(count.getText().toString().trim()); } catch (Exception ignored) {}
        if (n < 1) n = 1;
        sp.edit().putString("count", String.valueOf(n)).apply();
        logScroll.setVisibility(View.GONE);
        setStatus("Запускаю повтор: " + n + " раз…");
        web.evaluateJavascript("window.__lrRepeat && window.__lrRepeat(" + n + ");", null);
    }

    void stopRepeat() {
        web.evaluateJavascript("window.__lrStop=true;", null);
        setStatus("Остановлено");
    }

    void clearAll() {
        synchronized (events) { events.clear(); }
        synchronized (snaps) { snaps.clear(); }
        setStatus("Очищено");
    }

    String ts() {
        return new SimpleDateFormat("HH:mm:ss", Locale.US).format(new Date());
    }

    void addEv(String s) {
        int n;
        synchronized (events) {
            if (events.size() < 3000) events.add(ts() + " " + s);
            n = events.size();
        }
        long now = System.currentTimeMillis();
        if (now - lastUi > 800 && s.startsWith("[PAGE")) {
            lastUi = now;
            setStatus("Событий записано: " + n);
        }
    }

    String buildReport() {
        StringBuilder sb = new StringBuilder();
        sb.append("Loop диагностика v3.0\n");
        sb.append("Время: ").append(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date())).append("\n");
        sb.append("URL: ").append(web.getUrl()).append("\n");
        sb.append("UA: ").append(web.getSettings().getUserAgentString()).append("\n\n");
        synchronized (snaps) {
            for (String x : snaps) sb.append(x).append("\n\n");
        }
        sb.append("=== СОБЫТИЯ ===\n");
        synchronized (events) {
            int from = Math.max(0, events.size() - 700);
            for (int i = from; i < events.size(); i++) sb.append(events.get(i)).append("\n");
        }
        return sb.toString();
    }

    void copyReport() {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        cm.setPrimaryClip(ClipData.newPlainText("loop", buildReport()));
        setStatus("Отчёт скопирован в буфер обмена");
    }

    void shareReport() {
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, buildReport());
        startActivity(Intent.createChooser(i, "Отправить отчёт"));
    }

    void saveReport() {
        String rep = buildReport();
        String name = "loop-report-" + new SimpleDateFormat("MMdd-HHmmss", Locale.US).format(new Date()) + ".txt";
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, "text/plain");
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                OutputStream os = getContentResolver().openOutputStream(u);
                os.write(rep.getBytes("UTF-8"));
                os.close();
                setStatus("Сохранено в Загрузки: " + name);
            } else {
                File f = new File(getExternalFilesDir(null), name);
                FileOutputStream fo = new FileOutputStream(f);
                fo.write(rep.getBytes("UTF-8"));
                fo.close();
                setStatus("Сохранено: " + f.getAbsolutePath());
            }
        } catch (Exception e) {
            setStatus("Ошибка сохранения: " + e);
        }
    }

    void toggleLog() {
        if (logScroll.getVisibility() == View.VISIBLE) {
            logScroll.setVisibility(View.GONE);
        } else {
            logView.setText(buildReport());
            logScroll.setVisibility(View.VISIBLE);
        }
    }

    String readAsset(String name) throws Exception {
        InputStream in = getAssets().open(name);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int r;
        while ((r = in.read(buf)) > 0) out.write(buf, 0, r);
        in.close();
        return out.toString("UTF-8");
    }

    void setStatus(final String m) {
        runOnUiThread(() -> status.setText(m));
    }

    class Bridge {
        @JavascriptInterface
        public void ev(String s) { addEv(s); }

        @JavascriptInterface
        public void learned(String s) { setStatus(s); }

        @JavascriptInterface
        public void prog(String s) { setStatus(s); }

        @JavascriptInterface
        public void snap(String s) {
            synchronized (snaps) {
                snaps.add("=== СНИМОК " + ts() + " ===\n" + s);
            }
            setStatus("Снимок получен (всего " + snaps.size() + ")");
        }
    }

    @Override
    public void onBackPressed() {
        if (logScroll.getVisibility() == View.VISIBLE) logScroll.setVisibility(View.GONE);
        else if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
