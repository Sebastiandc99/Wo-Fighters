package com.sebastiandc.wofighters;

import android.app.Activity;
import android.os.Bundle;
import android.net.*;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.view.*;
import android.webkit.*;
import androidx.webkit.WebViewAssetLoader;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private WebView web;
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback networkCallback;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        setContentView(web);
        connectivity = (ConnectivityManager)getSystemService(Context.CONNECTIVITY_SERVICE);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(false);
        web.setWebChromeClient(new WebChromeClient());
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !ORIGIN.equals(request.getUrl().getScheme() + "://" + request.getUrl().getHost());
            }
            @Override public void onPageFinished(WebView view, String url) { notifyNetwork(); }
        });
        web.addJavascriptInterface(new DurableStore(), "WONative");
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network network) { notifyNetwork(); }
            @Override public void onLost(Network network) { notifyNetwork(); }
            @Override public void onCapabilitiesChanged(Network network, NetworkCapabilities caps) { notifyNetwork(); }
        };
        connectivity.registerDefaultNetworkCallback(networkCallback);
        immerse();
        web.loadUrl(ORIGIN + "/assets/www/index.html");
    }
    private void immerse() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    private boolean hasInternet() {
        Network network = connectivity.getActiveNetwork();
        NetworkCapabilities caps = network == null ? null : connectivity.getNetworkCapabilities(network);
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }
    private void notifyNetwork() {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window.WOHybrid && window.WOHybrid.connectionChanged()", null);
        });
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused); if (focused) immerse();
    }
    @Override protected void onPause() {
        web.evaluateJavascript("window.dispatchEvent(new Event('blur'))", null);
        web.onPause(); web.pauseTimers(); super.onPause();
    }
    @Override protected void onResume() {
        super.onResume(); if (web != null) { web.onResume(); web.resumeTimers(); notifyNetwork(); }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape'}))", null);
    }
    @Override protected void onDestroy() {
        if (networkCallback != null) connectivity.unregisterNetworkCallback(networkCallback);
        if (web != null) { web.removeJavascriptInterface("WONative"); web.destroy(); web = null; }
        super.onDestroy();
    }
    public final class DurableStore {
        private final SharedPreferences prefs = getSharedPreferences("wo_scores", Context.MODE_PRIVATE);
        private SecretKey key() throws Exception {
            KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
            if (!store.containsAlias("wo_scores_integrity")) {
                KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_HMAC_SHA256, "AndroidKeyStore");
                generator.init(new KeyGenParameterSpec.Builder("wo_scores_integrity",
                    KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY)
                    .setDigests(KeyProperties.DIGEST_SHA256).build());
                generator.generateKey();
            }
            return (SecretKey)store.getKey("wo_scores_integrity", null);
        }
        private byte[] digest(String value) throws Exception {
            Mac mac = Mac.getInstance("HmacSHA256"); mac.init(key());
            return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        }
        @JavascriptInterface public boolean online() { return hasInternet(); }
        @JavascriptInterface public synchronized String read() {
            try {
                String data = prefs.getString("data", "");
                String signature = prefs.getString("signature", "");
                if (data.isEmpty()) return "";
                return MessageDigest.isEqual(digest(data), Base64.decode(signature, Base64.NO_WRAP)) ? data : "";
            } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public synchronized boolean write(String data) {
            if (data == null || data.length() > 8_000_000) return false;
            try {
                return prefs.edit().putString("data", data)
                    .putString("signature", Base64.encodeToString(digest(data), Base64.NO_WRAP)).commit();
            } catch (Exception e) { return false; }
        }
    }
}
