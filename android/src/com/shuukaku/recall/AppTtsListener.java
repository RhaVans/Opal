package com.shuukaku.recall;

import android.speech.tts.UtteranceProgressListener;

final class AppTtsListener extends UtteranceProgressListener {
    private final MainActivity activity;

    AppTtsListener(MainActivity activity) {
        this.activity = activity;
    }

    @Override
    public void onStart(String utteranceId) {}

    @Override
    public void onDone(String utteranceId) {
        activity.notifyJsTtsEnded();
    }

    @Override
    @Deprecated
    public void onError(String utteranceId) {
        activity.notifyJsTtsEnded();
    }

    @Override
    public void onError(String utteranceId, int errorCode) {
        activity.notifyJsTtsEnded();
    }
}
