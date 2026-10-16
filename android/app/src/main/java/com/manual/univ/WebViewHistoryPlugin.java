package com.manual.univ;

import android.os.SystemClock;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WebViewHistory")
public class WebViewHistoryPlugin extends Plugin {
    private void resolvePosition(PluginCall call, int index) {
        JSObject result = new JSObject();
        result.put("index", index);
        call.resolve(result);
    }

    @PluginMethod
    public void getPosition(PluginCall call) {
        getActivity().runOnUiThread(() ->
                resolvePosition(call, getBridge().getWebView().copyBackForwardList().getCurrentIndex()));
    }

    @PluginMethod
    public void goBack(PluginCall call) {
        Integer fromIndex = call.getInt("fromIndex");
        Integer toIndex = call.getInt("toIndex");
        if (fromIndex == null || toIndex == null || toIndex < 0 || toIndex >= fromIndex) {
            call.reject("A valid earlier history index is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            WebView webView = getBridge().getWebView();
            int currentIndex = webView.copyBackForwardList().getCurrentIndex();
            // Do not apply an old request after the user has navigated elsewhere.
            if (currentIndex != fromIndex) {
                resolvePosition(call, currentIndex);
                return;
            }
            webView.goBackOrForward(toIndex - fromIndex);
            awaitTraversal(call, webView, fromIndex, SystemClock.uptimeMillis() + 2000);
        });
    }

    private void awaitTraversal(PluginCall call, WebView webView, int fromIndex, long deadline) {
        int index = webView.copyBackForwardList().getCurrentIndex();
        if (index != fromIndex) {
            resolvePosition(call, index);
        } else if (SystemClock.uptimeMillis() >= deadline) {
            call.reject("Manual history navigation timed out; please try again");
        } else {
            webView.postDelayed(() -> awaitTraversal(call, webView, fromIndex, deadline), 16);
        }
    }
}
