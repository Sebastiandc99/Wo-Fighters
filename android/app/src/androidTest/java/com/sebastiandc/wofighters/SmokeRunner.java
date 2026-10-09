package com.sebastiandc.wofighters;
import android.app.*;
import android.os.*;
import android.content.Intent;
import android.webkit.WebView;
import java.lang.reflect.Field;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

public class SmokeRunner extends Instrumentation {
    private WebView web;
    @Override public void onCreate(Bundle args) { super.onCreate(args);start(); }
    private String eval(String script) throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        runOnMainSync(()->web.evaluateJavascript(script,r->{value.set(r);done.countDown();}));
        if(!done.await(10,TimeUnit.SECONDS)) throw new AssertionError("JavaScript timeout");
        return value.get();
    }
    private void awaitTrue(String script) throws Exception {
        for(int n=0;n<120;n++){if("true".equals(eval(script)))return;Thread.sleep(250);}
        throw new AssertionError("Failed check: "+script+"; result="+eval(script));
    }
    @Override public void onStart() {
        Bundle report=new Bundle();
        try {
            Activity activity=startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            Field field=MainActivity.class.getDeclaredField("web");field.setAccessible(true);web=(WebView)field.get(activity);
            awaitTrue("!!window.WOHybrid && typeof startGame==='function' && !window.WOHybrid.online()");
            awaitTrue("Array.from(document.images).every(img=>img.complete&&img.naturalWidth>0)");
            if(!"true".equals(eval("(()=>{gameMode='solo';playerChoice='german';beginGame();return campaign.opponents.length===7})()")))throw new AssertionError("Offline tournament");
            if(!"true".equals(eval("(()=>{gameMode='versus';startGame('german','linares');return match.playerKind==='german'&&match.cpuKind==='linares'})()")))throw new AssertionError("Offline local match");
            eval("window.smokeAudio=false;fetch('assets/round-1.mp3').then(r=>r.arrayBuffer()).then(b=>{window.smokeAudio=b.byteLength>1000})");
            awaitTrue("window.smokeAudio");
            // Use the real native bridge and storage, without posting fabricated scores.
            if(!"true".equals(eval("(()=>{const old=WONative.read();const ok=WONative.write('{\"smoke\":\"durable\"}')&&WONative.read()==='{\"smoke\":\"durable\"}';WONative.write(old||'');return ok})()")))throw new AssertionError("Native signed storage");
            report.putString("stream","WO_SMOKE_SUCCESS: offline launch, all portraits, tournament, local match, audio bytes, Android Keystore persistent store\n");
            finish(Activity.RESULT_OK,report);
        } catch(Throwable error) {
            report.putString("stream","WO_SMOKE_FAILURE: "+error.toString()+"\n");
            finish(Activity.RESULT_CANCELED,report);
        }
    }
}
