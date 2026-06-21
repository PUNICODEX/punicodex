package com.punycodex.keyboard;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SwitchCompat;

public class KeyboardSettingsActivity extends AppCompatActivity {

    public static final String PREFS_NAME = "puny_keyboard_settings";
    public static final String PREF_AUTOCORRECT_ENABLED = "autocorrect_enabled";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(48, 64, 48, 64);
        layout.setBackgroundColor(0xFF0A0A0A);

        TextView title = new TextView(this);
        title.setText("PÚNYCODEX Keyboard");
        title.setTextColor(0xFFD4AF37);
        title.setTextSize(24);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("System keyboard for Unicode mythological names");
        subtitle.setTextColor(0xFFAAAAAA);
        subtitle.setTextSize(14);
        subtitle.setPadding(0, 0, 0, 48);
        layout.addView(subtitle);

        Button openAppBtn = new Button(this);
        openAppBtn.setText("Open PÚNYCODEX App");
        openAppBtn.setBackgroundColor(0xFFD4AF37);
        openAppBtn.setTextColor(0xFF0A0A0A);
        openAppBtn.setPadding(24, 24, 24, 24);
        openAppBtn.setOnClickListener(v -> {
            Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (intent != null) {
                startActivity(intent);
            }
        });
        layout.addView(openAppBtn);

        LinearLayout.MarginLayoutParams params = (LinearLayout.MarginLayoutParams) openAppBtn.getLayoutParams();
        params.setMargins(0, 0, 0, 24);
        openAppBtn.setLayoutParams(params);

        Button inputSettingsBtn = new Button(this);
        inputSettingsBtn.setText("Open Input Settings");
        inputSettingsBtn.setBackgroundColor(0xFF1A1A1A);
        inputSettingsBtn.setTextColor(0xFFD4AF37);
        inputSettingsBtn.setPadding(24, 24, 24, 24);
        inputSettingsBtn.setOnClickListener(v -> {
            Intent intent = new Intent(Settings.ACTION_INPUT_METHOD_SETTINGS);
            startActivity(intent);
        });
        layout.addView(inputSettingsBtn);

        LinearLayout toggleRow = new LinearLayout(this);
        toggleRow.setOrientation(LinearLayout.VERTICAL);
        toggleRow.setPadding(0, 48, 0, 0);
        layout.addView(toggleRow);

        TextView toggleLabel = new TextView(this);
        toggleLabel.setText("Auto-correct ASCII to Unicode");
        toggleLabel.setTextColor(0xFFFFFFFF);
        toggleLabel.setTextSize(16);
        toggleRow.addView(toggleLabel);

        TextView toggleDesc = new TextView(this);
        toggleDesc.setText("Type \"zeus\" then space to replace it with \"Zeús\". Turn off to keep ASCII.");
        toggleDesc.setTextColor(0xFFAAAAAA);
        toggleDesc.setTextSize(12);
        toggleDesc.setPadding(0, 4, 0, 16);
        toggleRow.addView(toggleDesc);

        SwitchCompat autocorrectSwitch = new SwitchCompat(this);
        autocorrectSwitch.setChecked(prefs.getBoolean(PREF_AUTOCORRECT_ENABLED, true));
        autocorrectSwitch.setTextColor(0xFFFFFFFF);
        autocorrectSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            prefs.edit().putBoolean(PREF_AUTOCORRECT_ENABLED, isChecked).apply();
        });
        toggleRow.addView(autocorrectSwitch);

        setContentView(layout);
    }
}
