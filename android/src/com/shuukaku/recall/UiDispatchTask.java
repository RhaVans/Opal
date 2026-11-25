package com.shuukaku.recall;

import android.content.Intent;

final class UiDispatchTask implements Runnable {
    static final int ACTION_TTS_END = 1;
    static final int ACTION_EXPORT_PICKER = 2;

    private final MainActivity activity;
    private final int action;
    private final Intent intent;

    UiDispatchTask(MainActivity activity, int action, Intent intent) {
        this.activity = activity;
        this.action = action;
        this.intent = intent;
    }

    @Override
    public void run() {
        if (action == ACTION_TTS_END) {
            activity.evaluateTtsEndJs();
        } else if (action == ACTION_EXPORT_PICKER && intent != null) {
            activity.launchExportPicker(intent);
        }
    }
}
