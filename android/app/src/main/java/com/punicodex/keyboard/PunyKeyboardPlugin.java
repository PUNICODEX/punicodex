package com.punicodex.keyboard;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.util.Log;
import android.view.inputmethod.InputMethodManager;

import com.punicodex.app.R;

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
        boolean enabled = false;
        boolean selected = false;
        try {
            // Must NOT read Settings.Secure.ENABLED_INPUT_METHODS directly:
            // it throws SecurityException on targetSdk 34+ and the uncaught
            // exception on the CapacitorPlugins thread kills the whole app.
            // InputMethodManager.getEnabledInputMethodList() is the public API
            // for exactly this check.
            InputMethodManager imm = (InputMethodManager) ctx.getSystemService(Context.INPUT_METHOD_SERVICE);
            String packageName = ctx.getPackageName();
            // Readable without permissions (unlike ENABLED_INPUT_METHODS).
            String defaultId = Settings.Secure.getString(ctx.getContentResolver(), Settings.Secure.DEFAULT_INPUT_METHOD);
            if (imm != null) {
                for (android.view.inputmethod.InputMethodInfo info : imm.getEnabledInputMethodList()) {
                    if (packageName.equals(info.getPackageName())) {
                        enabled = true;
                        selected = defaultId != null && defaultId.equals(info.getId());
                        break;
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to check keyboard status", e);
        }

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        ret.put("selected", selected);
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

    /**
     * Large-form-factor flag (sw840dp: tablets, Chromebooks, desktop windows).
     * The web app hides the keyboard tab and IME-specific surfaces there —
     * a soft keyboard is meaningless on a physical-keyboard device.
     */
    @PluginMethod
    public void getFormFactor(PluginCall call) {
        boolean large = getContext().getResources().getBoolean(R.bool.punicodex_large_form_factor);
        JSObject ret = new JSObject();
        ret.put("largeFormFactor", large);
        call.resolve(ret);
    }

    /**
     * Open a URL in the system browser. The Capacitor webview sandbox only
     * serves mobile/, so in-app links to punicodex.com (temple pages etc.)
     * must go out to a real browser instead of loading inside the webview.
     * Scheme-restricted to http/https; never throws into the bridge.
     */
    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
            call.reject("invalid_url");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to open URL: " + url, e);
            call.reject("open_failed");
        }
    }
}
