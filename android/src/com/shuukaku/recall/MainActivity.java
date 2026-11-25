package com.shuukaku.recall;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.KeyEvent;
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

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private volatile boolean jaTtsAvailable = false;

    private ValueCallback<Uri[]> filePathCallback;
    private String pendingExportJson;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setFitsSystemWindows(true);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        tts = new TextToSpeech(this, this);

        webView.addJavascriptInterface(new TtsBridge(this), "AndroidTTS");
        webView.addJavascriptInterface(new BackupBridge(this), "AndroidBackup");
        webView.setWebViewClient(new OfflineAssetClient(getAssets()));
        webView.setWebChromeClient(new AppWebChromeClient(this));

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(APP_ORIGIN + "/");
        }
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
