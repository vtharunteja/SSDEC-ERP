package com.ssdec.erp;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        
        // 1. Handle system bars manually to allow padding control
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // 2. Set Status Bar color to match theme (#0D1117)
        window.setStatusBarColor(Color.parseColor("#0D1117"));

        // 3. Force white icons (Light icons) on the dark background
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false); 
        }

        // 4. Keyboard & Bar Padding Fix
        View rootView = findViewById(android.R.id.content);
        rootView.setBackgroundColor(Color.parseColor("#0D1117"));
        
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, windowInsets) -> {
            int statusBarHeight = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
            int navBarHeight = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            int imeHeight = windowInsets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
            
            // Apply padding to keep content between bars and keyboard
            v.setPadding(0, statusBarHeight, 0, Math.max(navBarHeight, imeHeight));
            
            return WindowInsetsCompat.CONSUMED;
        });

        // 5. Set WebView background to match theme to avoid white flashes
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setBackgroundColor(Color.parseColor("#0D1117"));
        }
    }
}
