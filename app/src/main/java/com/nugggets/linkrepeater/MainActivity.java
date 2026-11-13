package com.nugggets.linkrepeater;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.Bundle;
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
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {
    WebView web;
    EditText site, link, count, inSel, btnSel, tmSel;
    TextView status;
    LinearLayout panel;
    ScrollView scroll;
    SharedPreferences sp;

    EditText field(String hint, String key, String def) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setSingleLine(true);
        e.setText(sp.getString(key, def));
        panel.addView(e);
        return e;
    }

    Button button(String text, View.OnClickListener l, LinearLayout row) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setOnClickListener(l);
        row.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        return b;
    }

    @Override
    protected void onCreate(Bundle s) {
        super.onCreate(s);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        sp = getSharedPreferences("lr", 0);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(24, 8, 24, 8);
        site = field("Адрес сайта (https://...)", "site", "https://");
        link = field("Ссылка, которую вводить", "link", "");
        count = field("Сколько раз повторить", "count", "5");
        inSel = field("CSS-селектор поля (необязательно)", "inSel", "");
        btnSel = field("CSS-селектор кнопки (необязательно)", "btnSel", "");
        tmSel = field("CSS-селектор таймера (необязательно)", "tmSel", "");

        scroll = new ScrollView(this);
        scroll.addView(panel);
        root.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        button("Открыть", v -> { save(); web.loadUrl(fixUrl(site.getText().toString())); scroll.setVisibility(View.GONE); }, row);
        button("Старт", v -> start(), row);
        button("Стоп", v -> stop(), row);
        button("⚙", v -> scroll.setVisibility(scroll.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE), row);
        root.addView(row);

        status = new TextView(this);
        status.setPadding(24, 4, 24, 4);
        status.setText("Откройте сайт, зайдите во вкладку Comments Hearts и нажмите Старт");
        root.addView(status);

        web = new WebView(this);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setLoadWithOverviewMode(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(), "Android");
        root.addView(web, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 2f));

        setContentView(root);

        String u = sp.getString("site", "");
        if (u.startsWith("http") && u.length() > 8) web.loadUrl(u);
    }

    String fixUrl(String u) {
        u = u.trim();
        if (!u.startsWith("http")) u = "https://" + u;
        return u;
    }

    void save() {
        sp.edit()
                .putString("site", site.getText().toString())
                .putString("link", link.getText().toString())
                .putString("count", count.getText().toString())
                .putString("inSel", inSel.getText().toString())
                .putString("btnSel", btnSel.getText().toString())
                .putString("tmSel", tmSel.getText().toString())
                .apply();
    }

    void start() {
        save();
        String l = link.getText().toString().trim();
        if (l.isEmpty()) { setStatus("Введите ссылку в настройках (⚙)"); return; }
        int n = 5;
        try { n = Integer.parseInt(count.getText().toString().trim()); } catch (Exception ignored) {}
        try {
            JSONObject c = new JSONObject();
            c.put("link", l);
            c.put("count", n);
            c.put("inputSel", inSel.getText().toString().trim());
            c.put("buttonSel", btnSel.getText().toString().trim());
            c.put("timerSel", tmSel.getText().toString().trim());
            String js = "window.__LR=" + c.toString() + ";" + readAsset("script.js");
            scroll.setVisibility(View.GONE);
            web.evaluateJavascript(js, null);
            setStatus("Запущено…");
        } catch (Exception e) {
            setStatus("Ошибка: " + e.getMessage());
        }
    }

    void stop() {
        web.evaluateJavascript("window.__lrStop=true;", null);
        setStatus("Остановлено");
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
        public void log(String m) { setStatus(m); }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
