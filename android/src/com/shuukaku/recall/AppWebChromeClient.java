package com.shuukaku.recall;

import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

final class AppWebChromeClient extends WebChromeClient {
    private final MainActivity activity;

    AppWebChromeClient(MainActivity activity) {
        this.activity = activity;
    }

    @Override
    public boolean onShowFileChooser(
            WebView view,
            ValueCallback<Uri[]> filePathCallback,
            FileChooserParams fileChooserParams) {
        return activity.openImportChooser(filePathCallback);
    }
}
