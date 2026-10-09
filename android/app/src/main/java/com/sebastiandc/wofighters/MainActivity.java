package com.sebastiandc.wofighters;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.webkit.*;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;

public class MainActivity extends Activity {
    private WebView web;
    private ConnectivityManager connectivity;
    private volatile boolean foreground = false;
    private static final String HOST = "appassets.androidplatform.net";
    private boolean connected() {
        if (connectivity == null) return false;
        NetworkCapabilities caps = connectivity.getNetworkCapabilities(connectivity.getActiveNetwork());
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }
    private final ConnectivityManager.NetworkCallback callback = new ConnectivityManager.NetworkCallback() {
        @Override public void onAvailable(Network n) { notifyNetwork(); }
        @Override public void onLost(Network n) { notifyNetwork(); }
        @Override public void onCapabilitiesChanged(Network n, NetworkCapabilities c) { notifyNetwork(); }
    };
    public final class NetworkBridge {
        @JavascriptInterface public boolean isOnline() { return connected(); }
        @JavascriptInterface public int getVersionCode() { return 2; }
        @JavascriptInterface public String getVersionName() { return "1.1.0"; }
        @JavascriptInterface public void openUpdateUrl(String url) {
            if (url == null || !url.matches("https://paidalaojrkplnkucmwl\\.supabase\\.co/storage/v1/object/public/wo-apk-updates/WO-Fighters-[0-9]+\\.[0-9]+\\.[0-9]+\\.apk")) return;
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch (android.content.ActivityNotFoundException ignored) {
                    new AlertDialog.Builder(MainActivity.this).setMessage("No hay un navegador disponible para descargar la actualización.").setPositiveButton("OK", null).show();
                }
            });
        }
    }
    private void notifyNetwork() {
        runOnUiThread(() -> { if (web != null && foreground) web.evaluateJavascript(
            "window.dispatchEvent(new Event(" + (connected() ? "'online'" : "'offline'") + "));", null); });
    }
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams p = getWindow().getAttributes();
            p.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(p);
        }
        connectivity = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        web = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new NetworkBridge(), "WoNative");
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if ("https".equals(request.getUrl().getScheme()) && HOST.equals(request.getUrl().getHost())) {
                    WebResourceResponse result = loader.shouldInterceptRequest(request.getUrl());
                    return result != null ? result : new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
                }
                return null;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !("https".equals(request.getUrl().getScheme()) && HOST.equals(request.getUrl().getHost()));
            }
            @Override public void onPageFinished(WebView view, String url) { notifyNetwork(); }
        });
        web.setWebChromeClient(new WebChromeClient());
        setContentView(web);
        immersive();
        connectivity.registerDefaultNetworkCallback(callback);
        web.loadUrl("https://" + HOST + "/assets/index.html");
    }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }
    @Override protected void onResume() {
        super.onResume(); foreground = true;
        if (web != null) { web.onResume(); web.resumeTimers(); web.evaluateJavascript("window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('pageshow'));", null); notifyNetwork(); }
    }
    @Override protected void onPause() {
        foreground = false;
        if (web != null) {
            web.evaluateJavascript("window.dispatchEvent(new Event('blur')); detachGameAudio(); if(audioCtx)audioCtx.suspend().catch(()=>{});", value -> {
                if (web != null && !foreground) { web.onPause(); web.pauseTimers(); }
            });
        }
        super.onPause();
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.dispatchEvent(new Event('blur'));", null);
        new AlertDialog.Builder(this).setMessage("¿Cerrar WO Fighters?")
            .setPositiveButton("CERRAR", (d,w) -> finish()).setNegativeButton("SEGUIR", (d,w) -> immersive()).show();
    }
    @Override protected void onDestroy() {
        try { connectivity.unregisterNetworkCallback(callback); } catch (Exception ignored) {}
        if (web != null) { web.removeJavascriptInterface("WoNative"); web.destroy(); web = null; }
        super.onDestroy();
    }
}

