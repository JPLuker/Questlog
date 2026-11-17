package com.jpluker.questlog;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Quest Log is a web UI (assets/www) in a WebView. This activity only hosts it and gives it
 * what a page can't do on its own: save to a file, export and import backups, receive text
 * shared from other apps, copy to the clipboard and play haptics.
 * No network access and no permissions.
 */
public class MainActivity extends Activity {

    private static final String DATA_FILE = "questlog.json";
    private static final int REQUEST_EXPORT = 1;
    private static final int REQUEST_IMPORT = 2;
    private static final int MAX_IMPORT_BYTES = 8 * 1024 * 1024;

    private WebView webView;
    private String pendingExport;
    private String pendingShare;   // JSON {subject, text} from a share that started the app
    private boolean pageReady;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setBackgroundColor(0xFF0C0D14);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(false);
        s.setAllowFileAccess(false);          // assets still load; nothing else on the device does
        s.setAllowContentAccess(false);
        s.setDatabaseEnabled(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // the app never navigates away from its own page
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
            }
        });
        pendingShare = shareFrom(getIntent());
        webView.addJavascriptInterface(new Bridge(), "Android");
        setContentView(webView);
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        webView.evaluateJavascript("(window.onBack && window.onBack()) ? 'y' : 'n'", value -> {
            if (!"\"y\"".equals(value)) MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String share = shareFrom(intent);
        if (share == null) return;
        // The page asks for a pending share when it starts; if it's already running, hand it over now.
        if (pageReady) callJs("onShared", "(" + share + ").subject, (" + share + ").text");
        else pendingShare = share;
    }

    /** Text shared to Quest Log from another app, as JSON, or null if this intent isn't a share. */
    private static String shareFrom(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return null;
        String type = intent.getType();
        if (type == null || !type.startsWith("text/")) return null;
        CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (text == null && subject == null) return null;
        try {
            JSONObject o = new JSONObject();
            o.put("subject", subject == null ? "" : clip(subject, 1000));
            o.put("text", text == null ? "" : clip(text.toString(), 20000));
            return o.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private static String clip(String s, int max) { return s.length() > max ? s.substring(0, max) : s; }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    // ---------------------------------------------------------------- storage

    private File dataFile() { return new File(getFilesDir(), DATA_FILE); }

    private synchronized String readData() {
        File f = dataFile();
        if (!f.exists()) return null;
        try (InputStream in = new FileInputStream(f)) {
            return new String(readAll(in, Integer.MAX_VALUE), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    /** Write to a temp file, then rename, so a crash mid-write never leaves half a save. */
    private synchronized boolean writeData(String json) {
        File tmp = new File(getFilesDir(), DATA_FILE + ".tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        } catch (Exception e) {
            tmp.delete();
            return false;
        }
        return tmp.renameTo(dataFile());
    }

    private static byte[] readAll(InputStream in, int limit) throws Exception {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[16384];
        int n;
        while ((n = in.read(chunk)) != -1) {
            buf.write(chunk, 0, n);
            if (buf.size() > limit) throw new Exception("too large");
        }
        return buf.toByteArray();
    }

    // ---------------------------------------------------------------- backup

    private void callJs(String function, String arg) {
        runOnUiThread(() -> webView.evaluateJavascript(
                "window." + function + " && window." + function + "(" + arg + ")", null));
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Uri uri = (resultCode == RESULT_OK && data != null) ? data.getData() : null;

        if (requestCode == REQUEST_EXPORT) {
            String json = pendingExport;
            pendingExport = null;
            if (uri == null || json == null) return; // cancelled
            boolean ok;
            try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                ok = true;
            } catch (Exception e) {
                ok = false;
            }
            callJs("onBackupExported", ok ? "true" : "false");
        } else if (requestCode == REQUEST_IMPORT) {
            if (uri == null) return; // cancelled
            String text;
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                text = new String(readAll(in, MAX_IMPORT_BYTES), StandardCharsets.UTF_8);
            } catch (Exception e) {
                text = null;
            }
            callJs("onBackupImported", text == null ? "null" : JSONObject.quote(text));
        }
    }

    /** Methods the page can call as window.Android.*. Runs on a WebView thread. */
    private class Bridge {
        @JavascriptInterface
        public String load() { return readData(); }

        /** A share that started the app, once; null after that. */
        @JavascriptInterface
        public String takeShared() {
            String s = pendingShare;
            pendingShare = null;
            return s;
        }

        @JavascriptInterface
        public void copy(String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (cm != null && text != null) cm.setPrimaryClip(ClipData.newPlainText("Quest Log", text));
            });
        }

        /** Haptic tap through the view: follows the phone's touch-feedback setting, needs no permission. */
        @JavascriptInterface
        public void haptic(String kind) {
            runOnUiThread(() -> {
                int c = HapticFeedbackConstants.VIRTUAL_KEY;
                if ("confirm".equals(kind)) {
                    c = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.LONG_PRESS;
                }
                webView.performHapticFeedback(c);
            });
        }

        @JavascriptInterface
        public boolean save(String json) { return json != null && writeData(json); }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void exportBackup(String json, String fileName) {
            runOnUiThread(() -> {
                pendingExport = json;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("application/json");
                i.putExtra(Intent.EXTRA_TITLE, fileName);
                startActivityForResult(i, REQUEST_EXPORT);
            });
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void importBackup() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                startActivityForResult(i, REQUEST_IMPORT);
            });
        }
    }
}
