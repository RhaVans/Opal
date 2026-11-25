package com.shuukaku.recall;

import android.webkit.JavascriptInterface;

public final class TtsBridge {
    private final MainActivity activity;

    public TtsBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return activity.isJapaneseTtsReady();
    }

    @JavascriptInterface
    public void speak(String text, float rate) {
        activity.speakJapanese(text, rate);
    }

    @JavascriptInterface
    public void stop() {
        activity.stopTts();
    }
}
