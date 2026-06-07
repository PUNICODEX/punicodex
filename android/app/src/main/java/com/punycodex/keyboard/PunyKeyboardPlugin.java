package com.punycodex.keyboard;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.util.Log;
import android.view.inputmethod.InputMethodManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PunyKeyboard")
public class PunyKeyboardPlugin extends Plugin {

    private static final String TAG = "PunyKeyboardPlugin";

    @PluginMethod
    public void isKeyboardEnabled(PluginCall call) {
        Log.d(TAG, "isKeyboardEnabled called");
        Context ctx = getContext();
        InputMethodManager imm = (InputMethodManager) ctx.getSystemService(Context.INPUT_METHOD_SERVICE);
        String packageName = ctx.getPackageName();
        boolean enabled = false;

        if (imm != null) {
            String enabledInputMethods = Settings.Secure.getString(
                ctx.getContentResolver(),
                Settings.Secure.ENABLED_INPUT_METHODS
            );
            if (enabledInputMethods != null) {
                enabled = enabledInputMethods.contains(packageName);
            }
        }

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void openKeyboardSettings(PluginCall call) {
        Log.d(TAG, "openKeyboardSettings called");
        Intent intent = new Intent(Settings.ACTION_INPUT_METHOD_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void showInputMethodPicker(PluginCall call) {
        Log.d(TAG, "showInputMethodPicker called");
        Context ctx = getContext();
        InputMethodManager imm = (InputMethodManager) ctx.getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) {
            imm.showInputMethodPicker();
        }
        call.resolve();
    }

    @PluginMethod
    public void getKeyboardStats(PluginCall call) {
        Context ctx = getContext();
        android.content.SharedPreferences prefs = ctx.getSharedPreferences("puny_keyboard_stats", Context.MODE_PRIVATE);

        JSObject ret = new JSObject();
        ret.put("totalCompletions", prefs.getInt("total_completions", 0));
        ret.put("favoriteChar", prefs.getString("favorite_char", "—"));
        call.resolve(ret);
    }
}
