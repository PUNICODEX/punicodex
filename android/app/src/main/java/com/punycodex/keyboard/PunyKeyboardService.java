package com.punycodex.keyboard;

import com.punycodex.app.BuildConfig;
import com.punycodex.app.R;
import android.content.Context;
import android.inputmethodservice.InputMethodService;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.content.res.Resources;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PunyKeyboardService extends InputMethodService {

    private static final long LONG_PRESS_DELAY = 280;
    private static final long DOUBLE_TAP_DELAY = 350; // increased from 260 for reliability
    private static final int POPUP_OFFSET_DP = 62;
    private static final int MAX_CATEGORY_ITEMS = 24;
    private static final int MIN_CATEGORY_PREFIX = 3;
    private static final int SUGGESTION_POOL_SIZE = 16;

    private static final Map<String, String[]> ACCENT_MAP = new HashMap<>();
    static {
        ACCENT_MAP.put("a", new String[]{"á","à","â","ä","ã","å","ā","ă","ą","α"});
        ACCENT_MAP.put("e", new String[]{"é","è","ê","ë","ē","ĕ","ė","ę","ε","η"});
        ACCENT_MAP.put("i", new String[]{"í","ì","î","ï","ī","ĭ","į","ı","ι"});
        ACCENT_MAP.put("o", new String[]{"ó","ò","ô","ö","õ","ō","ŏ","ø","ο","ω"});
        ACCENT_MAP.put("u", new String[]{"ú","ù","û","ü","ū","ŭ","ů","ų","υ"});
        ACCENT_MAP.put("y", new String[]{"ý","ÿ","ŷ","γ"});
        ACCENT_MAP.put("n", new String[]{"ñ","ń","ņ","ň","ν"});
        ACCENT_MAP.put("c", new String[]{"ç","ć","ĉ","ċ","č","χ"});
        ACCENT_MAP.put("s", new String[]{"ś","ŝ","ş","š","ß","σ"});
        ACCENT_MAP.put("z", new String[]{"ź","ż","ž","ζ"});
        ACCENT_MAP.put("d", new String[]{"đ","ď","ð","δ"});
        ACCENT_MAP.put("g", new String[]{"ğ","ĝ","ģ","ġ","γ"});
        ACCENT_MAP.put("l", new String[]{"ł","ľ","ĺ","ļ","λ"});
        ACCENT_MAP.put("r", new String[]{"ŕ","ř","ŗ","ρ"});
        ACCENT_MAP.put("t", new String[]{"ţ","ť","ŧ","τ","θ"});
        ACCENT_MAP.put("p", new String[]{"π","φ","ψ"});
        ACCENT_MAP.put("b", new String[]{"β"});
        ACCENT_MAP.put("x", new String[]{"ξ","χ"});
        ACCENT_MAP.put("k", new String[]{"κ"});
        ACCENT_MAP.put("m", new String[]{"μ"});
        ACCENT_MAP.put("w", new String[]{"ω"});
        ACCENT_MAP.put("A", new String[]{"Á","À","Â","Ä","Ã","Å","Ā","Α"});
        ACCENT_MAP.put("E", new String[]{"É","È","Ê","Ë","Ē","Ε","Η"});
        ACCENT_MAP.put("I", new String[]{"Í","Ì","Î","Ï","Ī","Ι"});
        ACCENT_MAP.put("O", new String[]{"Ó","Ò","Ô","Ö","Õ","Ō","Ø","Ο","Ω"});
        ACCENT_MAP.put("U", new String[]{"Ú","Ù","Û","Ü","Ū","Υ"});
        ACCENT_MAP.put("N", new String[]{"Ñ","Ν"});
        ACCENT_MAP.put("C", new String[]{"Ç","Ć","Ĉ","Č"});
        ACCENT_MAP.put("S", new String[]{"Ś","Ŝ","Ş","Š","Σ"});
        ACCENT_MAP.put("Z", new String[]{"Ź","Ż","Ž","Ζ"});
        ACCENT_MAP.put("D", new String[]{"Đ","Ď","Δ"});
        ACCENT_MAP.put("G", new String[]{"Ğ","Ĝ","Ģ","Γ"});
        ACCENT_MAP.put("L", new String[]{"Ł","Ľ","Ĺ","Ļ","Λ"});
        ACCENT_MAP.put("R", new String[]{"Ŕ","Ř","Ρ"});
        ACCENT_MAP.put("T", new String[]{"Ţ","Ť","Τ","Θ"});
        ACCENT_MAP.put("P", new String[]{"Π","Φ","Ψ"});
        ACCENT_MAP.put("B", new String[]{"Β"});
        ACCENT_MAP.put("X", new String[]{"Ξ","Χ"});
        ACCENT_MAP.put("K", new String[]{"Κ"});
        ACCENT_MAP.put("M", new String[]{"Μ"});
        ACCENT_MAP.put("W", new String[]{"Ω"});
    }

    private static final String[] LETTER_IDS = {
        "key_q","key_w","key_e","key_r","key_t","key_y","key_u","key_i","key_o","key_p",
        "key_a","key_s","key_d","key_f","key_g","key_h","key_j","key_k","key_l",
        "key_z","key_x","key_c","key_v","key_b","key_n","key_m"
    };

    private View keyboardView;
    private View symbolKeyboardView;
    private LinearLayout suggestionRow;
    private TextView typedWordView;
    private Button spaceBtn;
    private Button symSpaceBtn;
    private Button shiftBtn;
    private Button returnBtn;
    private Button symbolsBtn;

    private boolean lastEffectiveShiftState = false;
    private String lastSuggestionWord = null;
    private int lastSpaceWordLength = -1;
    private final Handler suggestionHandler = new Handler(Looper.getMainLooper());
    private Runnable pendingSuggestionRunnable;
    private View bottomSpacer;
    private View symBottomSpacer;
    private SuggestionEngine engine;
    private List<PaletteEntry> palette;
    private StringBuilder currentWord = new StringBuilder();

    private boolean isShifted = false;
    private boolean capsLock = false;
    private long lastShiftTap = 0;
    private boolean isSymbols = false;
    private EditorInfo currentEditorInfo;

    // Input-type awareness
    private boolean isPasswordField = false;
    private boolean isNumberField = false;
    private boolean shouldShowSuggestions = true;

    private final List<Button> letterButtons = new ArrayList<>();

    // Background IPC thread — all InputConnection calls off main thread
    private HandlerThread ipcThread;
    private Handler ipcHandler;

    // Rapid-key suppression
    private long lastKeyTime = 0;
    private static final long RAPID_KEY_THRESHOLD_MS = 80;

    private PopupWindow keyPopup;
    private TextView keyPopupText;
    private PopupWindow accentPopup;
    private Handler longPressHandler = new Handler(Looper.getMainLooper());
    private Runnable longPressRunnable;
    private Button activeKey;
    private boolean longPressFired = false;
    private boolean soundEnabled = true;

    // Performance: cached haptic effect
    private VibrationEffect cachedHapticLight;
    private VibrationEffect cachedHapticMedium;
    private VibrationEffect cachedHapticHeavy;

    // Performance: suggestion chip pool
    private final List<LinearLayout> chipPool = new ArrayList<>();
    private int chipPoolUsed = 0;

    // Word boundary pattern
    private static final Pattern WORD_PATTERN = Pattern.compile("[a-zA-Z]+$");

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            List<LexiconEntry> lexicon = LexiconLoader.loadLexicon(this);
            palette = LexiconLoader.loadPalette(this);
            engine = new SuggestionEngine(lexicon, palette);
            if (BuildConfig.DEBUG) {
                android.util.Log.d("PunyKeyboard", "Engine ready: " + lexicon.size() + " entries, " + palette.size() + " palette items");
            }
        } catch (Exception e) {
            android.util.Log.e("PunyKeyboard", "Failed to init engine", e);
            engine = new SuggestionEngine(new ArrayList<>(), new ArrayList<>());
            palette = new ArrayList<>();
        }
        soundEnabled = getSharedPreferences("puny_keyboard_prefs", Context.MODE_PRIVATE)
            .getBoolean("sound_enabled", true);

        // Pre-cache haptic effects
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            cachedHapticLight = VibrationEffect.createOneShot(8, VibrationEffect.DEFAULT_AMPLITUDE);
            cachedHapticMedium = VibrationEffect.createOneShot(10, VibrationEffect.DEFAULT_AMPLITUDE);
            cachedHapticHeavy = VibrationEffect.createOneShot(12, 128);
        }

        // Pre-build reusable suggestion chips
        for (int i = 0; i < SUGGESTION_POOL_SIZE; i++) {
            chipPool.add(createSuggestionChipView());
        }

        // Background IPC thread for all blocking InputConnection operations
        ipcThread = new HandlerThread("PunyKeyboardIPC");
        ipcThread.start();
        ipcHandler = new Handler(ipcThread.getLooper());

        // Pre-build reusable key popup
        keyPopupText = new TextView(this);
        keyPopupText.setTextSize(32);
        keyPopupText.setTextColor(0xFFFFFFFF);
        keyPopupText.setGravity(Gravity.CENTER);
        keyPopupText.setBackgroundResource(R.drawable.popup_bg);
        keyPopupText.setMinWidth(dp(56));
        keyPopupText.setMinHeight(dp(56));
        keyPopupText.setPadding(dp(12), dp(8), dp(12), dp(8));
        keyPopup = new PopupWindow(keyPopupText, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, false);
        keyPopup.setClippingEnabled(false);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (ipcThread != null) {
            ipcThread.quitSafely();
        }
    }

    @Override
    public View onCreateInputView() {
        try {
            // Inflate both keyboards; we toggle visibility between them in a FrameLayout
            FrameLayout root = new FrameLayout(this);

            keyboardView = LayoutInflater.from(this).inflate(R.layout.keyboard_view, root, false);
            symbolKeyboardView = LayoutInflater.from(this).inflate(R.layout.keyboard_view_symbols, root, false);

            root.addView(keyboardView);
            root.addView(symbolKeyboardView);
            symbolKeyboardView.setVisibility(View.GONE);

            suggestionRow = keyboardView.findViewById(R.id.suggestion_row);
            typedWordView = keyboardView.findViewById(R.id.typed_word);
            spaceBtn = keyboardView.findViewById(R.id.key_space);
            shiftBtn = keyboardView.findViewById(R.id.key_shift);
            returnBtn = keyboardView.findViewById(R.id.key_return);
            symbolsBtn = keyboardView.findViewById(R.id.key_symbols);
            bottomSpacer = keyboardView.findViewById(R.id.bottom_spacer);
            symBottomSpacer = symbolKeyboardView.findViewById(R.id.symbols_bottom_spacer);

            // Adjust bottom spacer to match system navigation bar / gesture area
            int navBarHeight = getNavigationBarHeight();
            if (bottomSpacer != null && navBarHeight > 0) {
                bottomSpacer.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, navBarHeight));
            }
            if (symBottomSpacer != null && navBarHeight > 0) {
                symBottomSpacer.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, navBarHeight));
            }

            setupKeys();
            setupSymbolKeys();
            return root;
        } catch (Exception e) {
            android.util.Log.e("PunyKeyboard", "Inflate failed, using fallback", e);
            return createFallbackKeyboardView();
        }
    }

    @Override
    public void onStartInput(EditorInfo info, boolean restarting) {
        super.onStartInput(info, restarting);
        if (info != null) {
            detectInputType(info);
        }
    }

    private void detectInputType(EditorInfo info) {
        int inputType = info.inputType;
        int variation = inputType & EditorInfo.TYPE_MASK_VARIATION;

        isPasswordField = variation == EditorInfo.TYPE_TEXT_VARIATION_PASSWORD
            || variation == EditorInfo.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            || variation == EditorInfo.TYPE_TEXT_VARIATION_WEB_PASSWORD;

        isNumberField = (inputType & EditorInfo.TYPE_MASK_CLASS) == EditorInfo.TYPE_CLASS_NUMBER
            || (inputType & EditorInfo.TYPE_MASK_CLASS) == EditorInfo.TYPE_CLASS_PHONE;

        // Disable suggestions in password fields (privacy) and number fields (not relevant)
        shouldShowSuggestions = !isPasswordField && !isNumberField;
    }

    @Override
    public void onStartInputView(EditorInfo info, boolean restarting) {
        super.onStartInputView(info, restarting);
        currentEditorInfo = info;
        dismissAllPopups();

        if (isNumberField) {
            // Switch to symbol keyboard for number/phone fields
            isSymbols = true;
            showSymbolKeyboard();
        } else {
            isSymbols = false;
            showLetterKeyboard();
        }

        if (!isPasswordField) {
            postSyncWordFromCursor(); // async — no blocking IPC on main thread
        } else {
            currentWord.setLength(0);
        }

        isShifted = false;
        capsLock = false;
        lastEffectiveShiftState = false;
        lastSuggestionWord = null;
        lastSpaceWordLength = -1;
        updateShiftVisual();
        updateKeyLabels();
        updateSuggestions();
        updateSpaceBar();
        updateReturnKey(info);
    }

    @Override
    public void onUpdateSelection(int oldSelStart, int oldSelEnd, int newSelStart, int newSelEnd, int candidatesStart, int candidatesEnd) {
        super.onUpdateSelection(oldSelStart, oldSelEnd, newSelStart, newSelEnd, candidatesStart, candidatesEnd);
        // Cursor moved externally — re-sync word from cursor on background thread
        if (newSelStart != oldSelStart || newSelEnd != oldSelEnd) {
            postSyncWordFromCursor();
        }
    }

    @Override
    public void onFinishInputView(boolean finishingInput) {
        super.onFinishInputView(finishingInput);
        dismissAllPopups();
    }

    private void setupKeys() {
        try {
            letterButtons.clear();
            for (String id : LETTER_IDS) {
                int resId = getResources().getIdentifier(id, "id", getPackageName());
                Button btn = keyboardView.findViewById(resId);
                if (btn != null) {
                    attachKeyTouchListener(btn);
                    letterButtons.add(btn);
                }
            }

            shiftBtn = keyboardView.findViewById(R.id.key_shift);
            if (shiftBtn != null) shiftBtn.setOnClickListener(v -> onShiftTap());

            Button backspaceBtn = keyboardView.findViewById(R.id.key_backspace);
            if (backspaceBtn != null) {
                backspaceBtn.setOnClickListener(v -> onBackspace());
                backspaceBtn.setOnLongClickListener(v -> { onLongBackspace(); return true; });
            }

            spaceBtn = keyboardView.findViewById(R.id.key_space);
            if (spaceBtn != null) attachSimpleTouchListener(spaceBtn, this::onSpace);

            returnBtn = keyboardView.findViewById(R.id.key_return);
            if (returnBtn != null) attachSimpleTouchListener(returnBtn, this::onReturn);

            symbolsBtn = keyboardView.findViewById(R.id.key_symbols);
            if (symbolsBtn != null) attachSimpleTouchListener(symbolsBtn, this::onSymbolsToggle);

            Button commaBtn = keyboardView.findViewById(R.id.key_comma);
            if (commaBtn != null) attachSimpleTouchListener(commaBtn, () -> onPunct(","));

            Button periodBtn = keyboardView.findViewById(R.id.key_period);
            if (periodBtn != null) attachSimpleTouchListener(periodBtn, () -> onPunct("."));

            Button questionBtn = keyboardView.findViewById(R.id.key_question);
            if (questionBtn != null) attachSimpleTouchListener(questionBtn, () -> onPunct("?"));
        } catch (Exception e) {
            android.util.Log.e("PunyKeyboard", "setupKeys failed", e);
        }
    }

    private void setupSymbolKeys() {
        try {
            String[] symbolIds = {
                "key_1","key_2","key_3","key_4","key_5","key_6","key_7","key_8","key_9","key_0",
                "key_excl","key_at","key_hash","key_dollar","key_percent","key_caret","key_amp","key_asterisk","key_lparen","key_rparen",
                "key_minus","key_underscore","key_equals","key_plus","key_lbracket","key_rbracket","key_lbrace","key_rbrace","key_pipe",
                "key_colon","key_semicolon","key_quote","key_apostrophe","key_slash","key_backslash","key_lt","key_gt"
            };
            for (String id : symbolIds) {
                int resId = getResources().getIdentifier(id, "id", getPackageName());
                Button btn = symbolKeyboardView.findViewById(resId);
                if (btn != null) {
                    btn.setOnClickListener(v -> onSymbolKey(btn.getText().toString()));
                }
            }

            Button symBackspace = symbolKeyboardView.findViewById(R.id.key_sym_backspace);
            if (symBackspace != null) {
                symBackspace.setOnClickListener(v -> onBackspace());
                symBackspace.setOnLongClickListener(v -> { onLongBackspace(); return true; });
            }

            symSpaceBtn = symbolKeyboardView.findViewById(R.id.key_sym_space);
            if (symSpaceBtn != null) attachSimpleTouchListener(symSpaceBtn, this::onSpace);

            Button symReturn = symbolKeyboardView.findViewById(R.id.key_sym_return);
            if (symReturn != null) attachSimpleTouchListener(symReturn, this::onReturn);

            Button symComma = symbolKeyboardView.findViewById(R.id.key_sym_comma);
            if (symComma != null) attachSimpleTouchListener(symComma, () -> onPunct(","));

            Button symPeriod = symbolKeyboardView.findViewById(R.id.key_sym_period);
            if (symPeriod != null) attachSimpleTouchListener(symPeriod, () -> onPunct("."));

            Button abcBtn = symbolKeyboardView.findViewById(R.id.key_abc);
            if (abcBtn != null) attachSimpleTouchListener(abcBtn, this::onSymbolsToggle);

            Button symShift = symbolKeyboardView.findViewById(R.id.key_sym_shift);
            if (symShift != null) attachSimpleTouchListener(symShift, this::onSymbolShift);
        } catch (Exception e) {
            android.util.Log.e("PunyKeyboard", "setupSymbolKeys failed", e);
        }
    }

    private void attachKeyTouchListener(Button btn) {
        btn.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    activeKey = btn;
                    longPressFired = false;
                    showKeyPopup(btn);
                    hapticLight();
                    playKeySound();
                    btn.setPressed(true);
                    longPressRunnable = () -> {
                        longPressFired = true;
                        hideKeyPopup();
                        showAccentPopup(btn);
                    };
                    longPressHandler.postDelayed(longPressRunnable, LONG_PRESS_DELAY);
                    return true;

                case MotionEvent.ACTION_UP:
                    longPressHandler.removeCallbacks(longPressRunnable);
                    btn.setPressed(false);
                    hideKeyPopup();
                    if (!longPressFired) {
                        String text = btn.getText().toString();
                        if (isShifted || capsLock) text = text.toUpperCase();
                        onKey(text);
                    }
                    activeKey = null;
                    return true;

                case MotionEvent.ACTION_CANCEL:
                    longPressHandler.removeCallbacks(longPressRunnable);
                    btn.setPressed(false);
                    hideKeyPopup();
                    dismissAccentPopup();
                    activeKey = null;
                    return true;
            }
            return false;
        });
    }

    private void attachSimpleTouchListener(Button btn, Runnable action) {
        btn.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    hapticLight();
                    playKeySound();
                    btn.setPressed(true);
                    return true;
                case MotionEvent.ACTION_UP:
                    btn.setPressed(false);
                    action.run();
                    return true;
                case MotionEvent.ACTION_CANCEL:
                    btn.setPressed(false);
                    return true;
            }
            return false;
        });
    }

    // ═══════════════════════════════════════════════
    // KEYBOARD MODE TOGGLE
    // ═══════════════════════════════════════════════

    private void showLetterKeyboard() {
        if (keyboardView != null) keyboardView.setVisibility(View.VISIBLE);
        if (symbolKeyboardView != null) symbolKeyboardView.setVisibility(View.GONE);
        isSymbols = false;
        if (symbolsBtn != null) symbolsBtn.setText("123");
    }

    private void showSymbolKeyboard() {
        if (keyboardView != null) keyboardView.setVisibility(View.GONE);
        if (symbolKeyboardView != null) symbolKeyboardView.setVisibility(View.VISIBLE);
        isSymbols = true;
    }

    private void onSymbolsToggle() {
        hapticMedium();
        playKeySound();
        if (isSymbols) {
            showLetterKeyboard();
        } else {
            showSymbolKeyboard();
        }
    }

    private void onSymbolShift() {
        hapticMedium();
        playKeySound();
        // Toggle between symbol pages if we add more later; for now just haptic feedback
    }

    private void onSymbolKey(String text) {
        hapticLight();
        playKeySound();
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        ic.commitText(text, 1);
        // Symbols break word context
        currentWord.setLength(0);
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    // ═══════════════════════════════════════════════
    // POPUPS (reusable, no allocation on hot path)
    // ═══════════════════════════════════════════════

    private void showKeyPopup(Button key) {
        String text = key.getText().toString();
        if (isShifted || capsLock) text = text.toUpperCase();
        keyPopupText.setText(text);

        int[] loc = new int[2];
        key.getLocationInWindow(loc);
        int popupX = loc[0] + key.getWidth() / 2 - dp(28);
        int popupY = loc[1] - dp(POPUP_OFFSET_DP);

        if (keyPopup.isShowing()) {
            keyPopup.update(popupX, popupY, -1, -1);
        } else {
            keyPopup.showAtLocation(keyboardView, Gravity.NO_GRAVITY, popupX, popupY);
        }
    }

    private void hideKeyPopup() {
        if (keyPopup.isShowing()) keyPopup.dismiss();
    }

    private void showAccentPopup(Button key) {
        dismissAllPopups();
        String base = key.getText().toString();
        if (isShifted || capsLock) base = base.toUpperCase();
        String[] accents = ACCENT_MAP.get(base);
        if (accents == null || accents.length == 0) return;

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setBackgroundResource(R.drawable.accent_popup_bg);
        container.setPadding(dp(8), dp(8), dp(8), dp(8));

        int cols = Math.min(5, accents.length);
        int rows = (int) Math.ceil((double) accents.length / cols);

        for (int r = 0; r < rows; r++) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            for (int c = 0; c < cols; c++) {
                int idx = r * cols + c;
                if (idx >= accents.length) break;
                String ch = accents[idx];

                TextView tv = new TextView(this);
                tv.setText(ch);
                tv.setTextSize(22);
                tv.setTextColor(0xFFD4AF37);
                tv.setGravity(Gravity.CENTER);
                tv.setBackgroundResource(R.drawable.accent_key_bg);
                tv.setMinWidth(dp(44));
                tv.setMinHeight(dp(44));
                tv.setPadding(dp(4), dp(4), dp(4), dp(4));

                LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(dp(48), dp(48));
                p.setMargins(dp(3), dp(3), dp(3), dp(3));
                tv.setLayoutParams(p);

                tv.setOnClickListener(v -> {
                    hapticMedium();
                    playKeySound();
                    lastKeyTime = System.currentTimeMillis();
                    InputConnection ic = getCurrentInputConnection();
                    if (ic != null) ic.commitText(ch, 1);
                    dismissAccentPopup();
                    postSyncWordFromCursor(); // async — no blocking IPC
                    debouncedUpdateSuggestions();
                    updateSpaceBar();
                });

                row.addView(tv);
            }
            container.addView(row);
        }

        accentPopup = new PopupWindow(container, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, false);
        accentPopup.setOutsideTouchable(true);
        accentPopup.setFocusable(false);
        accentPopup.setClippingEnabled(false);

        // Measure before positioning to get accurate width
        container.measure(
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        );

        int[] loc = new int[2];
        key.getLocationInWindow(loc);
        int popupX = loc[0] + key.getWidth() / 2 - container.getMeasuredWidth() / 2;
        int popupY = loc[1] - dp(POPUP_OFFSET_DP) - dp(20);

        accentPopup.showAtLocation(keyboardView, Gravity.NO_GRAVITY, popupX, popupY);
    }

    private void dismissAccentPopup() {
        if (accentPopup != null) {
            accentPopup.dismiss();
            accentPopup = null;
        }
    }

    // ═══════════════════════════════════════════════
    // CURSOR / WORD SYNC
    // ═══════════════════════════════════════════════

    /**
     * Sync word from cursor asynchronously via background IPC thread.
     * Call this instead of syncCurrentWordFromCursor() in hot paths.
     */
    private void postSyncWordFromCursor() {
        if (ipcHandler == null) return;
        ipcHandler.post(() -> {
            InputConnection ic = getCurrentInputConnection();
            StringBuilder temp = new StringBuilder();
            if (ic != null) {
                CharSequence before = ic.getTextBeforeCursor(50, 0);
                if (before != null) {
                    Matcher m = WORD_PATTERN.matcher(before.toString());
                    if (m.find()) {
                        temp.append(m.group());
                    }
                }
            }
            final String word = temp.toString();
            suggestionHandler.post(() -> {
                currentWord.setLength(0);
                currentWord.append(word);
            });
        });
    }

    /**
     * Synchronous word sync — safe to use only in one-time init paths
     * like onStartInputView where blocking briefly is acceptable.
     */
    private void syncCurrentWordFromCursor() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) {
            currentWord.setLength(0);
            return;
        }
        CharSequence before = ic.getTextBeforeCursor(50, 0);
        currentWord.setLength(0);
        if (before == null) return;
        String text = before.toString();
        Matcher m = WORD_PATTERN.matcher(text);
        if (m.find()) {
            currentWord.append(m.group());
        }
    }

    private String getTrailingWord(CharSequence beforeCursor) {
        if (beforeCursor == null) return "";
        String text = beforeCursor.toString();
        Matcher m = WORD_PATTERN.matcher(text);
        if (m.find()) return m.group();
        return "";
    }

    // ═══════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════

    private void onKey(String key) {
        lastKeyTime = System.currentTimeMillis();
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        ic.commitText(key, 1);
        currentWord.append(key);
        if (!capsLock) {
            isShifted = false;
            updateShiftVisual();
            updateKeyLabels();
        }
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    private void onPunct(String punct) {
        hapticMedium();
        playKeySound();
        lastKeyTime = System.currentTimeMillis();
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(punct, 1);
        currentWord.setLength(0);
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    private void onBackspace() {
        hapticMedium();
        playKeySound();
        lastKeyTime = System.currentTimeMillis();

        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            // Send KEYCODE_DEL event — lets the text field handle deletion natively
            // (including selected text) without blocking IPC
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DEL));
            ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DEL));
        }

        // Local word tracking — no blocking IPC
        if (currentWord.length() > 0) {
            currentWord.setLength(currentWord.length() - 1);
        }
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    private void onLongBackspace() {
        hapticHeavy();
        playKeySound();
        lastKeyTime = System.currentTimeMillis();

        final InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;

        // Run blocking IPC on background thread to avoid ANR
        ipcHandler.post(() -> {
            CharSequence before = ic.getTextBeforeCursor(100, 0);
            if (before == null || before.length() == 0) return;

            String text = before.toString();
            int deleteLen = 0;
            // Walk backwards to find word boundary (space or newline)
            for (int i = text.length() - 1; i >= 0; i--) {
                char c = text.charAt(i);
                if (c == ' ' || c == '\n') {
                    deleteLen = text.length() - i - 1;
                    break;
                }
                deleteLen = text.length() - i;
            }
            if (deleteLen > 0) {
                ic.deleteSurroundingText(deleteLen, 0);
            }

            // Post UI updates back to main thread
            suggestionHandler.post(() -> {
                currentWord.setLength(0);
                postSyncWordFromCursor();
                debouncedUpdateSuggestions();
                updateSpaceBar();
            });
        });
    }

    private void onSpace() {
        hapticLight();
        playKeySound();
        lastKeyTime = System.currentTimeMillis();
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(" ", 1);
        currentWord.setLength(0);
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    private void onReturn() {
        hapticHeavy();
        playKeySound();
        lastKeyTime = System.currentTimeMillis();
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            int action = EditorInfo.IME_ACTION_UNSPECIFIED;
            if (currentEditorInfo != null) {
                action = currentEditorInfo.actionId != 0
                    ? currentEditorInfo.actionId
                    : (currentEditorInfo.imeOptions & EditorInfo.IME_MASK_ACTION);
            }
            if (action != 0 && action != EditorInfo.IME_ACTION_UNSPECIFIED) {
                ic.performEditorAction(action);
            } else {
                ic.sendKeyEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_ENTER));
                ic.sendKeyEvent(new android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_ENTER));
            }
        }
        currentWord.setLength(0);
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    private void onShiftTap() {
        hapticMedium();
        playKeySound();
        long now = System.currentTimeMillis();
        if (now - lastShiftTap < DOUBLE_TAP_DELAY) {
            capsLock = !capsLock;
            isShifted = capsLock;
        } else {
            if (capsLock) {
                capsLock = false;
                isShifted = false;
            } else {
                isShifted = !isShifted;
            }
        }
        lastShiftTap = now;
        updateShiftVisual();
        updateKeyLabels();
    }

    private void updateShiftVisual() {
        if (shiftBtn == null) return;
        if (capsLock) {
            shiftBtn.setTextColor(0xFFD4AF37);
            shiftBtn.setText("⇪");
        } else if (isShifted) {
            shiftBtn.setTextColor(0xFFD4AF37);
            shiftBtn.setText("⇧");
        } else {
            shiftBtn.setTextColor(0xFFcccccc);
            shiftBtn.setText("⇧");
        }
    }

    private void updateKeyLabels() {
        boolean effective = isShifted || capsLock;
        if (effective == lastEffectiveShiftState) return;
        lastEffectiveShiftState = effective;
        for (Button btn : letterButtons) {
            Object tagObj = btn.getTag();
            if (tagObj == null) {
                // Store original lowercase text on first run
                btn.setTag(btn.getText().toString().toLowerCase());
                tagObj = btn.getTag();
            }
            String base = tagObj.toString();
            btn.setText(effective ? base.toUpperCase() : base);
        }
    }

    private void updateReturnKey(EditorInfo info) {
        if (returnBtn == null || info == null) return;
        int action = info.actionId != 0 ? info.actionId : (info.imeOptions & EditorInfo.IME_MASK_ACTION);
        switch (action) {
            case EditorInfo.IME_ACTION_DONE:
                returnBtn.setText("✓");
                break;
            case EditorInfo.IME_ACTION_SEARCH:
                returnBtn.setText("🔍");
                break;
            case EditorInfo.IME_ACTION_SEND:
                returnBtn.setText("→");
                break;
            case EditorInfo.IME_ACTION_GO:
                returnBtn.setText("→");
                break;
            case EditorInfo.IME_ACTION_NEXT:
                returnBtn.setText("→");
                break;
            default:
                returnBtn.setText("↵");
                break;
        }
    }

    // ═══════════════════════════════════════════════
    // SUGGESTIONS (pooled views, zero-allocation hot path)
    // ═══════════════════════════════════════════════

    private void debouncedUpdateSuggestions() {
        if (pendingSuggestionRunnable != null) {
            // Already scheduled; no need to reschedule
            return;
        }

        long now = System.currentTimeMillis();
        boolean rapid = (now - lastKeyTime) < RAPID_KEY_THRESHOLD_MS;

        pendingSuggestionRunnable = () -> {
            pendingSuggestionRunnable = null;
            updateSuggestions();
        };

        if (rapid) {
            // Delay suggestion update during rapid typing to keep input responsive
            suggestionHandler.postDelayed(pendingSuggestionRunnable, RAPID_KEY_THRESHOLD_MS);
        } else {
            // Sync to next vsync for zero-jank updates
            if (keyboardView != null) {
                keyboardView.postOnAnimation(pendingSuggestionRunnable);
            } else {
                suggestionHandler.post(pendingSuggestionRunnable);
            }
        }
    }

    private void updateSuggestions() {
        if (suggestionRow == null) return;
        if (!shouldShowSuggestions) {
            hideExcessChips();
            if (typedWordView != null) {
                typedWordView.setText("");
                typedWordView.setHint(isPasswordField ? "••••••" : "PÚNYCODEX");
            }
            return;
        }
        String word = currentWord.toString();
        if (word.equals(lastSuggestionWord)) return;
        lastSuggestionWord = word;
        chipPoolUsed = 0;

        if (typedWordView != null) {
            typedWordView.setText(word.length() > 0 ? word : "");
        }

        if (word.length() == 0) {
            hideExcessChips();
            if (typedWordView != null) typedWordView.setHint("PÚNYCODEX");
            return;
        }

        String lowerWord = word.toLowerCase();
        boolean hasResults = false;

        // 1. Category match takes priority
        String matchedCategory = engine.matchCategory(lowerWord);
        if (matchedCategory != null && lowerWord.length() >= MIN_CATEGORY_PREFIX) {
            List<PaletteEntry> catItems = engine.getCategoryItems(matchedCategory);
            if (!catItems.isEmpty()) {
                hasResults = true;
                addCategoryHeaderChip(matchedCategory, catItems.size());
                int limit = Math.min(catItems.size(), MAX_CATEGORY_ITEMS);
                for (int i = 0; i < limit; i++) {
                    PaletteEntry e = catItems.get(i);
                    bindSuggestionChip(getPooledChip(), e.character, e.name, e.character);
                }
            }
        }

        // 2. Lexicon exact + completions (only if no category match)
        if (matchedCategory == null) {
            LexiconEntry exact = engine.findExactMatch(lowerWord);
            if (exact != null) {
                hasResults = true;
                // Show ONE primary chip; long-press reveals scholarly variants (no ASCII)
                boolean hasVariants = hasScholarlyVariants(exact);
                bindPrimaryChip(getPooledChip(), exact, hasVariants);
            }

            List<LexiconEntry> completions = engine.getCompletions(lowerWord, 4);
            for (LexiconEntry entry : completions) {
                if (exact != null && entry.ascii.equals(exact.ascii)) continue;
                hasResults = true;
                // Completions show primary form; long-press reveals scholarly variants
                boolean hasVariants = hasScholarlyVariants(entry);
                bindPrimaryChip(getPooledChip(), entry, hasVariants);
            }

            List<PaletteEntry> paletteMatches = engine.searchPalette(palette, lowerWord);
            for (PaletteEntry entry : paletteMatches) {
                hasResults = true;
                bindSuggestionChip(getPooledChip(), entry.character, entry.name, entry.character);
            }
        }

        if (!hasResults && typedWordView != null) {
            typedWordView.setHint("No matches");
        }

        hideExcessChips();
    }

    private void showPaletteSuggestions() {
        if (suggestionRow == null) return;
        chipPoolUsed = 0;
        if (typedWordView != null) {
            typedWordView.setText("");
            typedWordView.setHint("Symbols");
        }
        for (PaletteEntry entry : palette.subList(0, Math.min(20, palette.size()))) {
            bindSuggestionChip(getPooledChip(), entry.character, entry.name, entry.character);
        }
        hideExcessChips();
    }

    private LinearLayout getPooledChip() {
        LinearLayout chip;
        if (chipPoolUsed < chipPool.size()) {
            chip = chipPool.get(chipPoolUsed);
            if (chip.getParent() == null) {
                suggestionRow.addView(chip);
            }
        } else {
            chip = createSuggestionChipView();
            chipPool.add(chip);
            suggestionRow.addView(chip);
        }
        chip.setVisibility(View.VISIBLE);
        chipPoolUsed++;
        return chip;
    }

    private void hideExcessChips() {
        for (int i = chipPoolUsed; i < chipPool.size(); i++) {
            LinearLayout chip = chipPool.get(i);
            if (chip.getParent() != null) {
                chip.setVisibility(View.GONE);
            }
        }
    }

    private LinearLayout createSuggestionChipView() {
        LinearLayout chip = new LinearLayout(this);
        chip.setOrientation(LinearLayout.VERTICAL);
        chip.setGravity(Gravity.CENTER);
        chip.setBackgroundResource(R.drawable.suggestion_bg);
        chip.setPadding(dp(14), dp(4), dp(14), dp(4));
        chip.setClickable(true);
        chip.setFocusable(true);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.MATCH_PARENT);
        params.setMargins(dp(4), dp(2), dp(4), dp(2));
        chip.setLayoutParams(params);

        TextView unicodeView = new TextView(this);
        unicodeView.setTextSize(18);
        unicodeView.setTextColor(0xFFD4AF37);
        unicodeView.setGravity(Gravity.CENTER);
        unicodeView.setIncludeFontPadding(false);
        unicodeView.setId(View.generateViewId());
        chip.addView(unicodeView);

        TextView subView = new TextView(this);
        subView.setTextSize(10);
        subView.setTextColor(0xFF888888);
        subView.setGravity(Gravity.CENTER);
        subView.setIncludeFontPadding(false);
        subView.setMaxLines(1);
        subView.setEllipsize(TextUtils.TruncateAt.END);
        subView.setMaxWidth(dp(80));
        subView.setId(View.generateViewId());
        chip.addView(subView);

        return chip;
    }

    private void bindSuggestionChip(LinearLayout chip, String unicode, String subtitle, String commitText) {
        TextView unicodeView = (TextView) chip.getChildAt(0);
        TextView subView = (TextView) chip.getChildAt(1);
        unicodeView.setText(unicode);
        unicodeView.setTextSize(18);
        unicodeView.setTextColor(0xFFD4AF37);
        subView.setText(subtitle);
        subView.setTextSize(10);
        subView.setTextColor(0xFF888888);
        chip.setClickable(true);
        chip.setBackgroundResource(R.drawable.suggestion_bg);

        chip.setOnClickListener(v -> {
            hapticMedium();
            playKeySound();
            commitSuggestion(commitText);
        });
    }

    private boolean hasScholarlyVariants(LexiconEntry entry) {
        if (entry.variants == null || entry.variants.isEmpty()) return false;
        for (LexiconEntry.Variant v : entry.variants) {
            if (!"ascii".equals(v.type)) return true;
        }
        return false;
    }

    private void bindPrimaryChip(LinearLayout chip, LexiconEntry entry, boolean hasVariants) {
        TextView unicodeView = (TextView) chip.getChildAt(0);
        TextView subView = (TextView) chip.getChildAt(1);
        unicodeView.setText(entry.unicode);
        unicodeView.setTextSize(18);
        unicodeView.setTextColor(0xFFE8C96A);
        String badge = entry.greek.isEmpty() ? "Primary" : entry.greek;
        if (hasVariants) badge += " ▼";
        subView.setText(badge);
        subView.setTextSize(10);
        subView.setTextColor(0xFFE8C96A);
        chip.setClickable(true);
        chip.setBackgroundResource(R.drawable.suggestion_bg);

        chip.setOnClickListener(v -> {
            hapticMedium();
            playKeySound();
            commitSuggestion(entry.unicode);
        });

        if (hasVariants) {
            chip.setOnLongClickListener(v -> {
                showVariantPopup(chip, entry);
                return true;
            });
        } else {
            chip.setOnLongClickListener(null);
        }
    }

    private PopupWindow variantPopup;

    private void showVariantPopup(View anchor, LexiconEntry entry) {
        dismissVariantPopup();
        dismissAccentPopup();

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setBackgroundResource(R.drawable.accent_popup_bg);
        container.setPadding(dp(8), dp(8), dp(8), dp(8));

        TextView title = new TextView(this);
        title.setText("Canonical Forms");
        title.setTextSize(12);
        title.setTextColor(0xFF888888);
        title.setPadding(dp(4), dp(2), dp(4), dp(6));
        container.addView(title);

        List<SuggestionEngine.Form> allForms = engine.getEntryForms(entry);
        for (SuggestionEngine.Form form : allForms) {
            if ("ascii".equals(form.type)) continue;

            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(dp(8), dp(8), dp(8), dp(8));

            TextView unicodeTv = new TextView(this);
            unicodeTv.setText(form.unicode);
            unicodeTv.setTextSize(18);

            TextView badgeTv = new TextView(this);
            badgeTv.setTextSize(10);
            badgeTv.setPadding(dp(8), 0, 0, 0);

            int color;
            String label;
            switch (form.type) {
                case "ideal":
                    color = 0xFFD4AF37;
                    label = "★ Ideal";
                    break;
                case "primary":
                    color = 0xFFE8C96A;
                    label = "Owned";
                    break;
                case "alt-stress":
                    color = 0xFFA08040;
                    label = "Attested";
                    break;
                case "macron-only":
                    color = 0xFF888888;
                    label = "Macron (LSJ)";
                    break;
                default:
                    color = 0xFF888888;
                    label = form.type;
            }
            unicodeTv.setTextColor(color);
            badgeTv.setTextColor(color);
            badgeTv.setText(label);

            row.addView(unicodeTv);
            row.addView(badgeTv);

            // Show scholarly note if available
            String note = null;
            for (LexiconEntry.Variant v : entry.variants) {
                if (v.unicode.equals(form.unicode) && v.note != null && !v.note.isEmpty()) {
                    note = v.note;
                    break;
                }
            }
            if (note != null) {
                TextView noteTv = new TextView(this);
                noteTv.setText(note);
                noteTv.setTextSize(9);
                noteTv.setTextColor(0xFF666666);
                noteTv.setPadding(dp(8), dp(2), 0, 0);
                noteTv.setMaxWidth(dp(200));
                noteTv.setEllipsize(TextUtils.TruncateAt.END);
                noteTv.setMaxLines(1);
                row.addView(noteTv);
            }

            row.setBackgroundResource(R.drawable.accent_key_bg);
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            rowParams.setMargins(0, 0, 0, dp(4));
            row.setLayoutParams(rowParams);

            row.setOnClickListener(v -> {
                hapticMedium();
                playKeySound();
                dismissVariantPopup();
                commitSuggestion(form.unicode);
            });

            container.addView(row);
        }

        variantPopup = new PopupWindow(container, ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, false);
        variantPopup.setOutsideTouchable(true);
        variantPopup.setFocusable(false);
        variantPopup.setClippingEnabled(false);

        container.measure(
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        );

        int[] loc = new int[2];
        anchor.getLocationInWindow(loc);
        int popupX = loc[0] + anchor.getWidth() / 2 - container.getMeasuredWidth() / 2;
        int popupY = loc[1] - container.getMeasuredHeight() - dp(8);

        // Prevent going off top of screen
        if (popupY < dp(20)) {
            popupY = loc[1] + anchor.getHeight() + dp(8);
        }

        variantPopup.showAtLocation(keyboardView, Gravity.NO_GRAVITY, popupX, popupY);
    }

    private void dismissVariantPopup() {
        if (variantPopup != null) {
            variantPopup.dismiss();
            variantPopup = null;
        }
    }

    private void dismissAllPopups() {
        hideKeyPopup();
        dismissAccentPopup();
        dismissVariantPopup();
    }

    private void commitSuggestion(String commitText) {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;

        // Safe replacement: verify the word at cursor matches our tracked word
        String tracked = currentWord.toString();
        if (tracked.length() > 0) {
            CharSequence before = ic.getTextBeforeCursor(tracked.length() + 2, 0);
            String actual = getTrailingWord(before);
            if (actual.equalsIgnoreCase(tracked)) {
                ic.deleteSurroundingText(actual.length(), 0);
            }
        }
        ic.commitText(commitText, 1);
        currentWord.setLength(0);
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    private void addCategoryHeaderChip(String categoryName, int count) {
        LinearLayout chip = getPooledChip();
        TextView unicodeView = (TextView) chip.getChildAt(0);
        TextView subView = (TextView) chip.getChildAt(1);

        String display = categoryName.substring(0, 1).toUpperCase() + categoryName.substring(1);
        unicodeView.setText(display);
        unicodeView.setTextColor(0xFF888888);
        unicodeView.setTextSize(13);
        subView.setText(count + " items");
        subView.setTextColor(0xFF666666);
        subView.setTextSize(9);
        chip.setBackgroundColor(0x00111111); // transparent background for header

        chip.setOnClickListener(null);
        chip.setClickable(false);
    }

    private void updateSpaceBar() {
        int len = currentWord.length();
        // Only update when crossing the empty/non-empty threshold to avoid layout thrashing
        boolean wasEmpty = lastSpaceWordLength == 0;
        boolean isEmpty = len == 0;
        if (len == lastSpaceWordLength || (wasEmpty && isEmpty)) return;
        lastSpaceWordLength = len;

        String label = isEmpty ? "" : currentWord.toString();
        int color = isEmpty ? 0xFF333333 : 0xFF888888;
        float size = isEmpty ? 22f : 14f;
        if (spaceBtn != null) {
            spaceBtn.setText(label);
            spaceBtn.setTextColor(color);
            spaceBtn.setTextSize(size);
        }
        if (symSpaceBtn != null) {
            symSpaceBtn.setText(label);
            symSpaceBtn.setTextColor(color);
            symSpaceBtn.setTextSize(size);
        }
    }

    // ═══════════════════════════════════════════════
    // FEEDBACK (cached, zero-allocation)
    // ═══════════════════════════════════════════════

    private void hapticLight() {
        Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (v == null || !v.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && cachedHapticLight != null) {
            v.vibrate(cachedHapticLight);
        } else {
            v.vibrate(8);
        }
    }

    private void hapticMedium() {
        Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (v == null || !v.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && cachedHapticMedium != null) {
            v.vibrate(cachedHapticMedium);
        } else {
            v.vibrate(10);
        }
    }

    private void hapticHeavy() {
        Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (v == null || !v.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && cachedHapticHeavy != null) {
            v.vibrate(cachedHapticHeavy);
        } else {
            v.vibrate(15);
        }
    }

    private void playKeySound() {
        if (!soundEnabled) return;
        AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (am != null) {
            am.playSoundEffect(AudioManager.FX_KEYPRESS_STANDARD, -1);
        }
    }

    private int dp(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    private int getNavigationBarHeight() {
        Resources res = getResources();
        int resourceId = res.getIdentifier("navigation_bar_height", "dimen", "android");
        if (resourceId > 0) {
            return res.getDimensionPixelSize(resourceId);
        }
        return dp(20); // fallback for gesture nav and edge cases
    }

    // ═══════════════════════════════════════════════
    // FALLBACK VIEW
    // ═══════════════════════════════════════════════

    private View createFallbackKeyboardView() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF080808);
        root.setPadding(dp(5), dp(6), dp(5), dp(8));

        suggestionRow = new LinearLayout(this);
        suggestionRow.setOrientation(LinearLayout.HORIZONTAL);
        suggestionRow.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));
        root.addView(suggestionRow);

        String[] rows = {"qwertyuiop", "asdfghjkl", "zxcvbnm"};
        for (String row : rows) {
            LinearLayout rowLayout = new LinearLayout(this);
            rowLayout.setOrientation(LinearLayout.HORIZONTAL);
            rowLayout.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(58)));
            rowLayout.setPadding(dp(2), 0, dp(2), 0);
            for (char c : row.toCharArray()) {
                Button btn = createFallbackKey(String.valueOf(c));
                btn.setOnClickListener(v -> onKey(btn.getText().toString()));
                rowLayout.addView(btn);
            }
            root.addView(rowLayout);
        }

        LinearLayout bottomRow = new LinearLayout(this);
        bottomRow.setOrientation(LinearLayout.HORIZONTAL);
        bottomRow.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(58)));
        bottomRow.setPadding(dp(2), 0, dp(2), 0);

        Button symBtn = createFallbackKey("123");
        symBtn.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.4f));
        symBtn.setOnClickListener(v -> onSymbolsToggle());
        bottomRow.addView(symBtn);

        Button comma = createFallbackKey(",");
        comma.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
        comma.setOnClickListener(v -> onPunct(","));
        bottomRow.addView(comma);

        Button space = createFallbackKey(" ");
        space.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 4.5f));
        space.setOnClickListener(v -> onSpace());
        bottomRow.addView(space);

        Button period = createFallbackKey(".");
        period.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
        period.setOnClickListener(v -> onPunct("."));
        bottomRow.addView(period);

        Button question = createFallbackKey("?");
        question.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
        question.setOnClickListener(v -> onPunct("?"));
        bottomRow.addView(question);

        Button retBtn = createFallbackKey("↵");
        retBtn.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.4f));
        retBtn.setOnClickListener(v -> onReturn());
        bottomRow.addView(retBtn);

        root.addView(bottomRow);
        return root;
    }

    private Button createFallbackKey(String text) {
        Button btn = new Button(this);
        btn.setText(text);
        btn.setTextColor(0xFFe0e0e0);
        btn.setTextSize(22);
        btn.setBackgroundColor(0xFF2a2a2a);
        btn.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1));
        btn.setPadding(0, 0, 0, 0);
        return btn;
    }
}
