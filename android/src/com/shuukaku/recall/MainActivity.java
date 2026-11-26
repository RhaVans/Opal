package com.shuukaku.recall;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {
    static final String APP_ORIGIN = "https://app.shuukaku.local";
    static final String APP_HOST = "app.shuukaku.local";
    private static final int REQ_FILE_IMPORT = 1001;
    private static final int REQ_FILE_EXPORT = 1002;
    private static final int MAX_RENDER_RECOVERIES = 2;

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private volatile boolean jaTtsAvailable = false;
    private int renderRecoveryCount = 0;

    private ValueCallback<Uri[]> filePathCallback;
    private String pendingExportJson;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, this);
        webView = createConfiguredWebView();
        setContentView(
                webView,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_ORIGIN + "/");
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @SuppressWarnings("deprecation")
    private WebView createConfiguredWebView() {
        WebView view = new WebView(this);
        view.setFitsSystemWindows(true);
        // Match AppTheme #E1DAFB so slow paint or errors never flash opaque white.
        view.setBackgroundColor(Color.parseColor("#E1DAFB"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            view.setForceDarkAllowed(false);
        }

        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= 33) {
            settings.setAlgorithmicDarkeningAllowed(false);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        view.addJavascriptInterface(new TtsBridge(this), "AndroidTTS");
        view.addJavascriptInterface(new BackupBridge(this), "AndroidBackup");
        view.setWebViewClient(new OfflineAssetClient(this, getAssets()));
        view.setWebChromeClient(new AppWebChromeClient(this));
        return view;
    }

    void handleRenderProcessGone(boolean didCrash) {
        if (webView != null) {
            ViewParent parent = webView.getParent();
            if (parent instanceof ViewGroup) {
                ((ViewGroup) parent).removeView(webView);
            }
            webView.destroy();
            webView = null;
        }

        if (renderRecoveryCount >= MAX_RENDER_RECOVERIES) {
            webView = createConfiguredWebView();
            setContentView(
                    webView,
                    new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));
            showRecoveryPage(
                    didCrash
                            ? "WebView renderer crashed repeatedly on this device."
                            : "WebView renderer was stopped by Android memory management.");
            return;
        }

        renderRecoveryCount += 1;
        webView = createConfiguredWebView();
        setContentView(
                webView,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
        // Fall back to static CSS backdrop after renderer termination (commonly WebGL/GPU).
        webView.loadUrl(APP_ORIGIN + "/?eco=1");
    }

    void handleMainFrameError(int errorCode, String description) {
        String safeDesc = description != null ? description : "Unknown error";
        showRecoveryPage("Load error (" + errorCode + "): " + safeDesc);
    }

    private void showRecoveryPage(String reason) {
        if (webView == null) return;
        String escapedReason =
                reason.replace("&", "&amp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;");
        String html =
                "<!doctype html><html><head><meta charset='utf-8'>"
                        + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                        + "<style>body{margin:0;padding:24px;font-family:sans-serif;background:#E1DAFB;color:#1D1D1F;display:flex;min-height:100vh;align-items:center;justify-content:center;box-sizing:border-box}"
                        + ".card{background:#fff;border-radius:24px;padding:24px;max-width:360px;width:100%;box-shadow:0 8px 24px rgba(0,0,0,.08)}"
                        + "h1{margin:0 0 8px;font-size:22px}p{margin:0 0 18px;font-size:14px;color:#5B5B62;line-height:1.5}"
                        + "a{display:inline-block;padding:12px 20px;border-radius:999px;background:#1D1D1F;color:#fff;text-decoration:none;font-weight:700;font-size:14px}</style>"
                        + "</head><body><div class='card'><h1>Opal could not display</h1><p>"
                        + escapedReason
                        + "</p><a href='"
                        + APP_ORIGIN
                        + "/?eco=1'>Retry (Eco Mode)</a></div></body></html>";
        webView.loadDataWithBaseURL(APP_ORIGIN + "/", html, "text/html", "utf-8", null);
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS && tts != null) {
            int res = tts.isLanguageAvailable(Locale.JAPAN);
            jaTtsAvailable = res >= TextToSpeech.LANG_AVAILABLE;
            if (jaTtsAvailable) {
                tts.setLanguage(Locale.JAPAN);
            }
            tts.setOnUtteranceProgressListener(new AppTtsListener(this));
            ttsReady = true;
        }
    }

    boolean isJapaneseTtsReady() {
        return ttsReady && jaTtsAvailable;
    }

    void speakJapanese(String text, float rate) {
        if (!ttsReady || tts == null || text == null || text.trim().isEmpty()) {
            notifyJsTtsEnded();
            return;
        }
        float clampedRate = Math.max(0.5f, Math.min(2.0f, rate));
        tts.setLanguage(Locale.JAPAN);
        tts.setSpeechRate(clampedRate);
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "shuukaku_tts");
    }

    void stopTts() {
        if (tts != null) {
            tts.stop();
        }
    }

    void notifyJsTtsEnded() {
        runOnUiThread(new UiDispatchTask(this, UiDispatchTask.ACTION_TTS_END, null));
    }

    void evaluateTtsEndJs() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "window.__onAndroidTTSEnd && window.__onAndroidTTSEnd();", null);
        }
    }

    boolean openImportChooser(ValueCallback<Uri[]> callback) {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
        }
        filePathCallback = callback;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain"});
        try {
            startActivityForResult(intent, REQ_FILE_IMPORT);
            return true;
        } catch (Exception e) {
            filePathCallback = null;
            return false;
        }
    }

    void requestExportBackup(String filename, String jsonContent) {
        pendingExportJson = jsonContent != null ? jsonContent : "{}";
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(
                Intent.EXTRA_TITLE,
                filename != null ? filename : "ssw-recall-backup.json");
        runOnUiThread(new UiDispatchTask(this, UiDispatchTask.ACTION_EXPORT_PICKER, intent));
    }

    void launchExportPicker(Intent intent) {
        try {
            startActivityForResult(intent, REQ_FILE_EXPORT);
        } catch (Exception e) {
            pendingExportJson = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE_IMPORT) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        } else if (requestCode == REQ_FILE_EXPORT) {
            if (resultCode == RESULT_OK
                    && data != null
                    && data.getData() != null
                    && pendingExportJson != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out != null) {
                        out.write(pendingExportJson.getBytes(StandardCharsets.UTF_8));
                        out.flush();
                    }
                } catch (IOException ignored) {
                }
            }
            pendingExportJson = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
