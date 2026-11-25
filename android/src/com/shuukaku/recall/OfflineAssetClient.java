package com.shuukaku.recall;

import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

final class OfflineAssetClient extends WebViewClient {
    private final AssetManager assets;

    OfflineAssetClient(AssetManager assets) {
        this.assets = assets;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if ("https".equalsIgnoreCase(uri.getScheme())
                && MainActivity.APP_HOST.equalsIgnoreCase(uri.getHost())) {
            return false;
        }
        return true;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!"https".equalsIgnoreCase(uri.getScheme())
                || !MainActivity.APP_HOST.equalsIgnoreCase(uri.getHost())) {
            return emptyResponse(403, "Forbidden");
        }

        String rawPath = uri.getPath();
        if (rawPath == null || rawPath.isEmpty() || "/".equals(rawPath)) {
            rawPath = "/index.html";
        }
        if (rawPath.contains("..")) {
            return emptyResponse(403, "Forbidden");
        }

        String rel = rawPath.startsWith("/") ? rawPath.substring(1) : rawPath;
        if (rel.endsWith("/")) {
            rel = rel + "index.html";
        }

        String[] candidates = new String[]{
                "www/" + rel,
                "www/" + rel + ".html",
                "www/" + rel + "/index.html",
                "www/index.html"
        };

        for (String candidate : candidates) {
            try {
                InputStream stream = assets.open(candidate);
                Map<String, String> headers = new HashMap<String, String>();
                headers.put("Cache-Control", "no-cache");
                headers.put("Access-Control-Allow-Origin", MainActivity.APP_ORIGIN);
                String mime = mimeForPath(candidate);
                String encoding = isBinaryMime(mime) ? null : "utf-8";
                return new WebResourceResponse(mime, encoding, 200, "OK", headers, stream);
            } catch (IOException ignored) {
            }
        }
        return emptyResponse(404, "Not Found");
    }

    private static WebResourceResponse emptyResponse(int code, String reason) {
        return new WebResourceResponse(
                "text/plain",
                "utf-8",
                code,
                reason,
                new HashMap<String, String>(),
                new ByteArrayInputStream(new byte[0]));
    }

    private static String mimeForPath(String p) {
        String lower = p.toLowerCase(Locale.US);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private static boolean isBinaryMime(String mime) {
        return mime.startsWith("font/") || (mime.startsWith("image/") && !mime.contains("svg"));
    }
}
