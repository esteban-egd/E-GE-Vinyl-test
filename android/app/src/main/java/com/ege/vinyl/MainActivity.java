package com.ege.vinyl;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            WebView webView = null;
            if (this.getBridge() != null) {
                webView = this.getBridge().getWebView();
            }
            if (webView == null) {
                webView = (WebView) findViewById(com.getcapacitor.android.R.id.webview);
            }
            if (webView != null) {
                WebSettings webSettings = webView.getSettings();
                webSettings.setJavaScriptEnabled(true);
                webSettings.setDomStorageEnabled(true);
                webSettings.setDatabaseEnabled(true);
                webSettings.setAllowFileAccess(true);
                webSettings.setAllowContentAccess(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
