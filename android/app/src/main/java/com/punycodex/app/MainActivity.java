package com.punycodex.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.punycodex.keyboard.PunyKeyboardPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PunyKeyboardPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
