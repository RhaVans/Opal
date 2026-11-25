package com.shuukaku.recall;

import android.webkit.JavascriptInterface;

public final class BackupBridge {
    private final MainActivity activity;

    public BackupBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void saveBackup(String filename, String jsonContent) {
        activity.requestExportBackup(filename, jsonContent);
    }
}
