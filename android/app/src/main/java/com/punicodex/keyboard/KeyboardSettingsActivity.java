package com.punicodex.keyboard;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

/**
 * Settings screen for the PuniCodex keyboard, opened from the system
 * Input Method settings (declared as android:settingsActivity in res/xml/method.xml).
 *
 * Programmatic UI in the brand dark/gold style. Runs on Theme.AppCompat —
 * AppCompatDelegate hard-crashes on non-AppCompat themes at setContentView.
 * Handles edge-to-edge insets (targetSdk 35 draws behind system bars on
 * Android 15+).
 */
public class KeyboardSettingsActivity extends AppCompatActivity {

    public static final String PREFS_NAME = "puny_keyboard_settings";
    public static final String PREF_AUTOCORRECT_ENABLED = "autocorrect_enabled";

    // Service-side prefs (PunyKeyboardService reads these files/keys).
    private static final String SERVICE_PREFS = "puny_keyboard_prefs";
    private static final String PREF_SOUND_ENABLED = "sound_enabled";
    private static final String PREF_HAPTICS_ENABLED = "haptics_enabled";
    private static final String STATS_PREFS = "puny_keyboard_stats";

    private static final int COLOR_BG = 0xFF0A0A0A;
    private static final int COLOR_GOLD = 0xFFD4AF37;
    private static final int COLOR_TEXT = 0xFFEDEDED;
    private static final int COLOR_SUBTLE = 0xFF9A9A9A;
    private static final int COLOR_CARD = 0xFF141414;
    private static final int COLOR_DIVIDER = 0xFF242424;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences servicePrefs = getSharedPreferences(SERVICE_PREFS, MODE_PRIVATE);
        SharedPreferences autocorrectPrefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences statsPrefs = getSharedPreferences(STATS_PREFS, MODE_PRIVATE);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(COLOR_BG);
        scroll.setVerticalScrollBarEnabled(false);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(root, new ScrollView.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        final int side = dp(20);
        final int topPad = dp(20);
        final int bottomPad = dp(32);
        root.setPadding(side, topPad, side, bottomPad);
        // Edge-to-edge: on Android 15+ the window draws behind the status and
        // navigation bars, so content must pad by the system-bar insets.
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            androidx.core.graphics.Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(side, topPad + bars.top, side, bottomPad + bars.bottom);
            return insets;
        });

        // ── Header ────────────────────────────────────────────────────────
        TextView title = text("PuniCodex Keyboard", 26, COLOR_GOLD, true);
        title.setPadding(0, dp(8), 0, 0);
        root.addView(title, matchWrap());
        TextView subtitle = text("System keyboard for Unicode mythological names", 14, COLOR_SUBTLE, false);
        subtitle.setPadding(0, dp(4), 0, 0);
        root.addView(subtitle, matchWrap());

        // ── Typing ────────────────────────────────────────────────────────
        sectionLabel(root, "TYPING");
        addSwitch(root, autocorrectPrefs, PREF_AUTOCORRECT_ENABLED, true,
            "Auto-correct to Unicode",
            "Type \"zeus\" then space to get \"Zeús\". Off keeps your ASCII.");
        divider(root);
        addSwitch(root, servicePrefs, PREF_SOUND_ENABLED, true,
            "Keypress sound",
            "Standard tap sound while typing.");
        divider(root);
        addSwitch(root, servicePrefs, PREF_HAPTICS_ENABLED, true,
            "Vibrate on keypress",
            "Haptic feedback on every tap.");

        // ── Your typing ───────────────────────────────────────────────────
        sectionLabel(root, "YOUR TYPING");
        int total = statsPrefs.getInt("total_completions", 0);
        String favorite = statsPrefs.getString("favorite_char", "—");
        statRow(root, "Completions used", String.valueOf(total));
        divider(root);
        statRow(root, "Favorite character", favorite);

        // ── More ──────────────────────────────────────────────────────────
        sectionLabel(root, "MORE");
        addAction(root, "Open PuniCodex app", () -> {
            Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (intent != null) startActivity(intent);
        });
        divider(root);
        addAction(root, "Switch to PuniCodex keyboard", () -> {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (imm != null) imm.showInputMethodPicker();
        });
        divider(root);
        addAction(root, "Privacy policy", () -> {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://punicodex.com/privacy"));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        });
        TextView privacyHint = text("Zero keylogging. Zero trackers. Everything stays on your device.", 12, COLOR_SUBTLE, false);
        privacyHint.setPadding(0, dp(10), 0, 0);
        privacyHint.setGravity(Gravity.CENTER);
        root.addView(privacyHint, matchWrap());

        setContentView(scroll);
    }

    // ── UI builders ───────────────────────────────────────────────────────

    private void sectionLabel(LinearLayout root, String label) {
        TextView tv = text(label, 12, COLOR_GOLD, true);
        tv.setPadding(0, dp(24), 0, dp(8));
        tv.setLetterSpacing(0.12f);
        root.addView(tv, matchWrap());
    }

    private void addSwitch(LinearLayout root, SharedPreferences prefs, String key,
                           boolean defValue, String title, String description) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(16), dp(10), dp(12), dp(10));
        row.setBackgroundColor(COLOR_CARD);

        LinearLayout textCol = new LinearLayout(this);
        textCol.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams textColParams = new LinearLayout.LayoutParams(
            0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        textCol.setLayoutParams(textColParams);
        textCol.addView(text(title, 16, COLOR_TEXT, true), matchWrap());
        TextView desc = text(description, 13, COLOR_SUBTLE, false);
        desc.setPadding(0, dp(2), 0, 0);
        textCol.addView(desc, matchWrap());
        row.addView(textCol);

        SwitchCompat sw = new SwitchCompat(this);
        sw.setChecked(prefs.getBoolean(key, defValue));
        sw.setOnCheckedChangeListener((buttonView, isChecked) ->
            prefs.edit().putBoolean(key, isChecked).apply());
        row.addView(sw);

        root.addView(row, matchWrap());
    }

    private void statRow(LinearLayout root, String label, String value) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(16), dp(14), dp(16), dp(14));
        row.setBackgroundColor(COLOR_CARD);

        TextView name = text(label, 15, COLOR_TEXT, false);
        row.addView(name, new LinearLayout.LayoutParams(
            0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        TextView val = text(value, 18, COLOR_GOLD, true);
        row.addView(val);

        root.addView(row, matchWrap());
    }

    private void addAction(LinearLayout root, String label, Runnable action) {
        TextView tv = text(label, 16, COLOR_TEXT, true);
        tv.setPadding(dp(16), dp(16), dp(16), dp(16));
        tv.setBackgroundColor(COLOR_CARD);
        tv.setOnClickListener(v -> {
            v.post(action::run);
        });
        root.addView(tv, matchWrap());
    }

    private void divider(LinearLayout root) {
        View line = new View(this);
        line.setBackgroundColor(COLOR_DIVIDER);
        root.addView(line, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 1));
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView tv = new TextView(this);
        tv.setText(value);
        tv.setTextSize(sp);
        tv.setTextColor(color);
        if (bold) tv.setTypeface(Typeface.DEFAULT_BOLD);
        return tv;
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density + 0.5f);
    }
}
