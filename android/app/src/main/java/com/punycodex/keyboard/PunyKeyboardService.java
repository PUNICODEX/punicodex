package com.punycodex.keyboard;

import com.punycodex.app.BuildConfig;
import com.punycodex.app.R;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
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
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
        // Curated long-press defaults: 5–10 common scholarly/typographic forms
        // for every A–Z letter. Vowels get the classic diacritics; consonants
        // get the most useful precomposed forms plus a few combining-mark
        // options for letters that lack precomposed accents. Anything else can
        // be added per-letter with the "+" button.
        ACCENT_MAP.put("a", new String[]{"á","à","â","ä","ã","å","ā","ă","ǎ"});
        ACCENT_MAP.put("b", new String[]{"ḃ","ḅ","ḇ","ƀ","β"});
        ACCENT_MAP.put("c", new String[]{"ç","ć","ĉ","č","ċ","ḉ"});
        ACCENT_MAP.put("d", new String[]{"đ","ď","ð","ḍ","ḏ","ḑ"});
        ACCENT_MAP.put("e", new String[]{"é","è","ê","ë","ē","ĕ","ė","ę","ə"});
        ACCENT_MAP.put("f", new String[]{"ḟ","ƒ","f\u0301","f\u0300","f\u0302","f\u0308","f\u0304"});
        ACCENT_MAP.put("g", new String[]{"ğ","ĝ","ģ","ġ","ǵ","ḡ"});
        ACCENT_MAP.put("h", new String[]{"ĥ","ḥ","ḫ","ẖ","ħ","ɦ"});
        ACCENT_MAP.put("i", new String[]{"í","ì","î","ï","ī","ĭ","į","ı","ǐ"});
        ACCENT_MAP.put("j", new String[]{"ĵ","ɉ","j\u0301","j\u0300","j\u0302"});
        ACCENT_MAP.put("k", new String[]{"ḱ","ḳ","ḵ","ƙ","k\u0301"});
        ACCENT_MAP.put("l", new String[]{"ł","ľ","ĺ","ļ","ḷ","ŀ"});
        ACCENT_MAP.put("m", new String[]{"ḿ","ṁ","ṃ","ɱ","m\u0301"});
        ACCENT_MAP.put("n", new String[]{"ñ","ń","ņ","ň","ṇ","ṉ"});
        ACCENT_MAP.put("o", new String[]{"ó","ò","ô","ö","õ","ō","ŏ","ø","ǒ"});
        ACCENT_MAP.put("p", new String[]{"ṕ","ṗ","ƥ","ᵽ","p\u0301"});
        ACCENT_MAP.put("q", new String[]{"ʠ","q\u0301","q\u0300","q\u0302","q\u0308"});
        ACCENT_MAP.put("r", new String[]{"ŕ","ř","ŗ","ṛ","ṙ","ṟ"});
        ACCENT_MAP.put("s", new String[]{"ś","ŝ","ş","š","ṣ","ß","ṡ"});
        ACCENT_MAP.put("t", new String[]{"ţ","ť","ṭ","þ","ṯ","ṱ"});
        ACCENT_MAP.put("u", new String[]{"ú","ù","û","ü","ū","ŭ","ů","ų","ǔ"});
        ACCENT_MAP.put("v", new String[]{"ṽ","ṿ","v\u0301","v\u0300","v\u0302"});
        ACCENT_MAP.put("w", new String[]{"ẃ","ẁ","ŵ","ẅ","ẇ","ẉ"});
        ACCENT_MAP.put("x", new String[]{"ẋ","ẍ","x\u0301","x\u0300","x\u0302"});
        ACCENT_MAP.put("y", new String[]{"ý","ỳ","ŷ","ÿ","ỹ","ẏ"});
        ACCENT_MAP.put("z", new String[]{"ź","ẑ","ż","ž","ẓ","ẕ"});

        ACCENT_MAP.put("A", new String[]{"Á","À","Â","Ä","Ã","Å","Ā","Ă","Ǎ"});
        ACCENT_MAP.put("B", new String[]{"Ḃ","Ḅ","Ḇ","Ƀ","Β"});
        ACCENT_MAP.put("C", new String[]{"Ç","Ć","Ĉ","Č","Ċ","Ḉ"});
        ACCENT_MAP.put("D", new String[]{"Đ","Ď","Ð","Ḍ","Ḏ","Ḑ"});
        ACCENT_MAP.put("E", new String[]{"É","È","Ê","Ë","Ē","Ĕ","Ė","Ę","Ə"});
        ACCENT_MAP.put("F", new String[]{"Ḟ","Ƒ","F\u0301","F\u0300","F\u0302","F\u0308","F\u0304"});
        ACCENT_MAP.put("G", new String[]{"Ğ","Ĝ","Ģ","Ġ","Ǵ","Ḡ"});
        ACCENT_MAP.put("H", new String[]{"Ĥ","Ḥ","Ḫ","H\u0331","Ħ","H\u0301"});
        ACCENT_MAP.put("I", new String[]{"Í","Ì","Î","Ï","Ī","Ĭ","Į","I","Ǐ"});
        ACCENT_MAP.put("J", new String[]{"Ĵ","J\u0332","J\u0301","J\u0300","J\u0302"});
        ACCENT_MAP.put("K", new String[]{"Ḱ","Ḳ","Ḵ","Ƙ","K\u0301"});
        ACCENT_MAP.put("L", new String[]{"Ł","Ľ","Ĺ","Ļ","Ḷ","Ŀ"});
        ACCENT_MAP.put("M", new String[]{"Ḿ","Ṁ","Ṃ","M\u0301","M\u0304"});
        ACCENT_MAP.put("N", new String[]{"Ñ","Ń","Ņ","Ň","Ṇ","Ṉ"});
        ACCENT_MAP.put("O", new String[]{"Ó","Ò","Ô","Ö","Õ","Ō","Ŏ","Ø","Ǒ"});
        ACCENT_MAP.put("P", new String[]{"Ṕ","Ṗ","Ƥ","P\u0301","P\u0304"});
        ACCENT_MAP.put("Q", new String[]{"Q\u0301","Q\u0300","Q\u0302","Q\u0308","ʠ"});
        ACCENT_MAP.put("R", new String[]{"Ŕ","Ř","Ŗ","Ṛ","Ṙ","Ṟ"});
        ACCENT_MAP.put("S", new String[]{"Ś","Ŝ","Ş","Š","Ṣ","Σ","Ṡ"});
        ACCENT_MAP.put("T", new String[]{"Ţ","Ť","Ṭ","Þ","Ṯ","Ṱ"});
        ACCENT_MAP.put("U", new String[]{"Ú","Ù","Û","Ü","Ū","Ŭ","Ů","Ų","Ǔ"});
        ACCENT_MAP.put("V", new String[]{"Ṽ","Ṿ","V\u0301","V\u0300","V\u0302"});
        ACCENT_MAP.put("W", new String[]{"Ẃ","Ẁ","Ŵ","Ẅ","Ẇ","Ẉ"});
        ACCENT_MAP.put("X", new String[]{"Ẋ","Ẍ","X\u0301","X\u0300","X\u0302"});
        ACCENT_MAP.put("Y", new String[]{"Ý","Ỳ","Ŷ","Ÿ","Ỹ","Ẏ"});
        ACCENT_MAP.put("Z", new String[]{"Ź","Ẑ","Ż","Ž","Ẓ","Ẕ"});

        // Roman numerals on long-press of the digit keys. 1–9 give the
        // precomposed forms; 0 holds the positional building blocks (Ⅹ, Ⅼ, Ⅽ,
        // Ⅾ, Ⅿ and their lowercase variants) so any Roman numeral can be built
        // by combining the symbols.
        ACCENT_MAP.put("1", new String[]{"Ⅰ","ⅰ"});
        ACCENT_MAP.put("2", new String[]{"Ⅱ","ⅱ"});
        ACCENT_MAP.put("3", new String[]{"Ⅲ","ⅲ"});
        ACCENT_MAP.put("4", new String[]{"Ⅳ","ⅳ"});
        ACCENT_MAP.put("5", new String[]{"Ⅴ","ⅴ"});
        ACCENT_MAP.put("6", new String[]{"Ⅵ","ⅵ"});
        ACCENT_MAP.put("7", new String[]{"Ⅶ","ⅶ"});
        ACCENT_MAP.put("8", new String[]{"Ⅷ","ⅷ"});
        ACCENT_MAP.put("9", new String[]{"Ⅸ","ⅸ"});
        ACCENT_MAP.put("0", new String[]{"Ⅹ","ⅹ","Ⅼ","ⅼ","Ⅽ","ⅽ","Ⅾ","ⅾ","Ⅿ","ⅿ"});
    }

    private static final String[] LETTER_IDS = {
        "key_q","key_w","key_e","key_r","key_t","key_y","key_u","key_i","key_o","key_p",
        "key_a","key_s","key_d","key_f","key_g","key_h","key_j","key_k","key_l",
        "key_z","key_x","key_c","key_v","key_b","key_n","key_m"
    };

    private static final String ACCENT_PREFS_NAME = "puny_keyboard_accents";
    private static final String CUSTOM_ACCENT_PREFIX = "custom_accents_";
    private static final String SETTINGS_PREFS_NAME = "puny_keyboard_settings";
    private static final String PREF_AUTOCORRECT_ENABLED = "autocorrect_enabled";

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

    // User-defined long-press accents, persisted across sessions
    private SharedPreferences accentPrefs;
    private final Map<String, Set<String>> customAccents = new HashMap<>();

    // Background IPC thread — all InputConnection calls off main thread
    private HandlerThread ipcThread;
    private Handler ipcHandler;

    // Rapid-key suppression
    private long lastKeyTime = 0;
    private static final long RAPID_KEY_THRESHOLD_MS = 80;

    private static final long REPEAT_INITIAL_DELAY_MS = 300;
    private static final long REPEAT_INTERVAL_MS = 80;
    private static final long REPEAT_BASE_INTERVAL_MS = 90;
    private static final long REPEAT_FAST_INTERVAL_MS = 45;
    private static final long REPEAT_ACCELERATE_THRESHOLD_MS = 900;
    private static final long REPEAT_WORD_THRESHOLD_MS = 1800;

    private PopupWindow keyPopup;
    private TextView keyPopupText;
    private PopupWindow accentPopup;
    private Handler longPressHandler = new Handler(Looper.getMainLooper());
    private Runnable longPressRunnable;
    private Button activeKey;
    private boolean longPressFired = false;
    private boolean soundEnabled = true;

    private final Handler repeatHandler = new Handler(Looper.getMainLooper());
    private Runnable repeatRunnable;
    private Runnable currentRepeatAction;
    private boolean repeatFired = false;

    private Runnable backspaceRepeatRunnable;
    private long backspaceRepeatStartTime;

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

        accentPrefs = getSharedPreferences(ACCENT_PREFS_NAME, Context.MODE_PRIVATE);
        loadCustomAccents();

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
                attachBackspaceTouchListener(backspaceBtn);
            }

            spaceBtn = keyboardView.findViewById(R.id.key_space);
            if (spaceBtn != null) attachSimpleTouchListener(spaceBtn, this::onSpace);

            returnBtn = keyboardView.findViewById(R.id.key_return);
            if (returnBtn != null) attachSimpleTouchListener(returnBtn, this::onReturn);

            symbolsBtn = keyboardView.findViewById(R.id.key_symbols);
            if (symbolsBtn != null) attachSimpleTouchListener(symbolsBtn, this::onSymbolsToggle);

            Button commaBtn = keyboardView.findViewById(R.id.key_comma);
            if (commaBtn != null) attachRepeatingTouchListener(commaBtn, () -> onPunct(","), this::onRepeatComma);

            Button periodBtn = keyboardView.findViewById(R.id.key_period);
            if (periodBtn != null) attachRepeatingTouchListener(periodBtn, () -> onPunct("."), this::onRepeatPeriod);

            Button questionBtn = keyboardView.findViewById(R.id.key_question);
            if (questionBtn != null) attachRepeatingTouchListener(questionBtn, () -> onPunct("?"), this::onRepeatQuestion);
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
                if (btn == null) continue;
                String label = btn.getText().toString();
                // Digit keys get long-press Roman-numeral popups; everything else
                // is a plain symbol key.
                if (label.length() == 1 && Character.isDigit(label.charAt(0))) {
                    attachSymbolLongPressTouchListener(btn);
                } else {
                    btn.setOnClickListener(v -> onSymbolKey(btn.getText().toString()));
                }
            }

            Button symBackspace = symbolKeyboardView.findViewById(R.id.key_sym_backspace);
            if (symBackspace != null) {
                attachBackspaceTouchListener(symBackspace);
            }

            symSpaceBtn = symbolKeyboardView.findViewById(R.id.key_sym_space);
            if (symSpaceBtn != null) attachSimpleTouchListener(symSpaceBtn, this::onSpace);

            Button symReturn = symbolKeyboardView.findViewById(R.id.key_sym_return);
            if (symReturn != null) attachSimpleTouchListener(symReturn, this::onReturn);

            Button symComma = symbolKeyboardView.findViewById(R.id.key_sym_comma);
            if (symComma != null) attachRepeatingTouchListener(symComma, () -> onPunct(","), this::onRepeatComma);

            Button symPeriod = symbolKeyboardView.findViewById(R.id.key_sym_period);
            if (symPeriod != null) attachRepeatingTouchListener(symPeriod, () -> onPunct("."), this::onRepeatPeriod);

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

    private void attachSymbolLongPressTouchListener(Button btn) {
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
                        onSymbolKey(btn.getText().toString());
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

    /**
     * Touch listener that treats a quick tap as a single action and a held press
     * as an auto-repeating action. This gives native key-repeat behavior for
     * backspace (delete whole words) and punctuation such as period (ellipsis).
     */
    private void attachRepeatingTouchListener(Button btn, Runnable tapAction, Runnable repeatAction) {
        btn.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    btn.setPressed(true);
                    startRepeat(repeatAction);
                    return true;
                case MotionEvent.ACTION_UP:
                    btn.setPressed(false);
                    stopRepeat();
                    if (!repeatFired) {
                        tapAction.run();
                    } else {
                        postSyncWordFromCursor();
                        debouncedUpdateSuggestions();
                        updateSpaceBar();
                    }
                    return true;
                case MotionEvent.ACTION_CANCEL:
                    btn.setPressed(false);
                    stopRepeat();
                    return true;
            }
            return false;
        });
    }

    private void startRepeat(Runnable action) {
        stopRepeat();
        currentRepeatAction = action;
        repeatFired = false;
        repeatRunnable = () -> {
            if (!repeatFired) {
                repeatFired = true;
                hapticLight();
            }
            if (currentRepeatAction != null) {
                currentRepeatAction.run();
            }
            if (repeatRunnable != null) {
                repeatHandler.postDelayed(repeatRunnable, REPEAT_INTERVAL_MS);
            }
        };
        repeatHandler.postDelayed(repeatRunnable, REPEAT_INITIAL_DELAY_MS);
    }

    private void stopRepeat() {
        if (repeatRunnable != null) {
            repeatHandler.removeCallbacks(repeatRunnable);
            repeatRunnable = null;
        }
        currentRepeatAction = null;
    }

    /**
     * Dedicated backspace touch listener with staged repeat:
     *   1. Tap → single character delete.
     *   2. Hold > 300 ms → repeat single-character deletes every 90 ms.
     *   3. Hold > 900 ms → accelerate to 45 ms.
     *   4. Hold > 1800 ms → delete whole words each tick.
     */
    private void attachBackspaceTouchListener(Button btn) {
        btn.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    btn.setPressed(true);
                    startBackspaceRepeat();
                    return true;
                case MotionEvent.ACTION_UP:
                    btn.setPressed(false);
                    stopBackspaceRepeat();
                    if (!repeatFired) {
                        onBackspace();
                    } else {
                        postSyncWordFromCursor();
                        debouncedUpdateSuggestions();
                        updateSpaceBar();
                    }
                    return true;
                case MotionEvent.ACTION_CANCEL:
                    btn.setPressed(false);
                    stopBackspaceRepeat();
                    return true;
            }
            return false;
        });
    }

    private void startBackspaceRepeat() {
        stopBackspaceRepeat();
        repeatFired = false;
        backspaceRepeatStartTime = System.currentTimeMillis();
        backspaceRepeatRunnable = () -> {
            if (!repeatFired) {
                repeatFired = true;
                hapticLight();
            }
            long elapsed = System.currentTimeMillis() - backspaceRepeatStartTime;
            if (elapsed >= REPEAT_WORD_THRESHOLD_MS) {
                deleteWordBeforeCursor();
            } else {
                deleteSingleCharBeforeCursor();
            }
            long nextDelay = elapsed >= REPEAT_ACCELERATE_THRESHOLD_MS
                ? REPEAT_FAST_INTERVAL_MS
                : REPEAT_BASE_INTERVAL_MS;
            if (backspaceRepeatRunnable != null) {
                repeatHandler.postDelayed(backspaceRepeatRunnable, nextDelay);
            }
        };
        repeatHandler.postDelayed(backspaceRepeatRunnable, REPEAT_INITIAL_DELAY_MS);
    }

    private void stopBackspaceRepeat() {
        if (backspaceRepeatRunnable != null) {
            repeatHandler.removeCallbacks(backspaceRepeatRunnable);
            backspaceRepeatRunnable = null;
        }
    }

    private void deleteSingleCharBeforeCursor() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DEL));
        ic.sendKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DEL));
        if (currentWord.length() > 0) {
            currentWord.setLength(currentWord.length() - 1);
        }
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
        keyPopupText.measure(
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        );

        int[] loc = new int[2];
        key.getLocationInWindow(loc);
        int popupX = loc[0] + key.getWidth() / 2 - keyPopupText.getMeasuredWidth() / 2;
        int popupY = loc[1] - dp(POPUP_OFFSET_DP);
        popupX = clampPopupX(popupX, keyPopupText.getMeasuredWidth());

        if (keyPopup.isShowing()) {
            keyPopup.update(popupX, popupY, -1, -1);
        } else {
            keyPopup.showAtLocation(keyboardView, Gravity.NO_GRAVITY, popupX, popupY);
        }
    }

    private int clampPopupX(int desiredX, int popupWidth) {
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int margin = dp(8);
        int minX = margin;
        int maxX = screenWidth - popupWidth - margin;
        if (maxX < minX) maxX = minX;
        return Math.max(minX, Math.min(desiredX, maxX));
    }

    private void hideKeyPopup() {
        if (keyPopup.isShowing()) keyPopup.dismiss();
    }

    private void showAccentPopup(Button key) {
        dismissAllPopups();
        String base = key.getText().toString();
        if (isShifted || capsLock) base = base.toUpperCase();
        final String baseKey = base;
        String[] accents = getAccentsForBase(baseKey);
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

                TextView tv = createAccentTextView(ch, () -> {
                    hapticMedium();
                    playKeySound();
                    lastKeyTime = System.currentTimeMillis();
                    InputConnection ic = getCurrentInputConnection();
                    if (ic != null) ic.commitText(ch, 1);
                    dismissAccentPopup();
                    postSyncWordFromCursor();
                    debouncedUpdateSuggestions();
                    updateSpaceBar();
                });
                row.addView(tv);
            }
            container.addView(row);
        }

        // "+" row to add a custom character to this base letter
        LinearLayout addRow = new LinearLayout(this);
        addRow.setOrientation(LinearLayout.HORIZONTAL);
        addRow.setGravity(Gravity.CENTER);
        TextView addTv = createAccentTextView("+", () -> {
            dismissAccentPopup();
            showAddAccentDialog(baseKey);
        });
        addTv.setTextColor(0xFF888888);
        LinearLayout.LayoutParams addParams = (LinearLayout.LayoutParams) addTv.getLayoutParams();
        addParams.width = dp(48) * Math.min(5, accents.length) + dp(6) * (Math.min(5, accents.length) - 1);
        addTv.setLayoutParams(addParams);
        addRow.addView(addTv);
        container.addView(addRow);

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
        popupX = clampPopupX(popupX, container.getMeasuredWidth());

        accentPopup.showAtLocation(keyboardView, Gravity.NO_GRAVITY, popupX, popupY);
    }

    private TextView createAccentTextView(String text, Runnable onClick) {
        TextView tv = new TextView(this);
        tv.setText(text);
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
        tv.setOnClickListener(v -> onClick.run());
        return tv;
    }

    private String[] getAccentsForBase(String base) {
        String[] defaults = ACCENT_MAP.get(base);
        Set<String> merged = new LinkedHashSet<>();
        if (defaults != null) {
            for (String ch : defaults) merged.add(ch);
        }
        Set<String> custom = customAccents.get(base);
        if (custom != null) {
            for (String ch : custom) merged.add(ch);
        }
        return merged.isEmpty() ? null : merged.toArray(new String[0]);
    }

    private void loadCustomAccents() {
        customAccents.clear();
        for (String key : accentPrefs.getAll().keySet()) {
            if (!key.startsWith(CUSTOM_ACCENT_PREFIX)) continue;
            String base = key.substring(CUSTOM_ACCENT_PREFIX.length());
            Set<String> set = accentPrefs.getStringSet(key, new HashSet<>());
            customAccents.put(base, new HashSet<>(set));
        }
    }

    private void saveCustomAccent(String base, String ch) {
        Set<String> set = customAccents.computeIfAbsent(base, k -> new HashSet<>());
        set.add(ch);
        accentPrefs.edit().putStringSet(CUSTOM_ACCENT_PREFIX + base, set).apply();
    }

    private void showAddAccentDialog(String base) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Add character to " + base);

        final EditText input = new EditText(this);
        input.setHint("U+1E43 or ṃ");
        input.setInputType(android.text.InputType.TYPE_CLASS_TEXT);
        builder.setView(input);

        builder.setPositiveButton("Add", (dialog, which) -> {
            String raw = input.getText().toString().trim();
            String ch = parseSingleChar(raw);
            if (ch == null) {
                Toast.makeText(this, "Enter one Unicode character or U+XXXX", Toast.LENGTH_SHORT).show();
                return;
            }
            saveCustomAccent(base, ch);
            Toast.makeText(this, "Added " + ch + " to " + base, Toast.LENGTH_SHORT).show();
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());

        AlertDialog dialog = builder.create();
        android.view.Window win = dialog.getWindow();
        if (win != null) {
            win.setType(android.view.WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG);
            win.addFlags(android.view.WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
            android.view.WindowManager.LayoutParams lp = win.getAttributes();
            lp.token = getWindow().getWindow().getDecorView().getWindowToken();
            win.setAttributes(lp);
        }
        dialog.show();
    }

    private String parseSingleChar(String raw) {
        if (raw.isEmpty()) return null;
        int cp;
        if (raw.toLowerCase().startsWith("u+")) {
            try {
                cp = Integer.parseInt(raw.substring(2), 16);
            } catch (NumberFormatException e) {
                return null;
            }
        } else if (raw.startsWith("0x") || raw.startsWith("0X")) {
            try {
                cp = Integer.parseInt(raw.substring(2), 16);
            } catch (NumberFormatException e) {
                return null;
            }
        } else if (raw.codePointCount(0, raw.length()) == 1) {
            cp = raw.codePointAt(0);
        } else {
            try {
                cp = Integer.parseInt(raw);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (cp <= 0 || cp > 0x10ffff) return null;
        if (Character.isISOControl(cp) || Character.isWhitespace(cp)) return null;
        return new String(Character.toChars(cp));
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
        if (maybeAutoCorrectWord(punct)) {
            debouncedUpdateSuggestions();
            updateSpaceBar();
            return;
        }
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(punct, 1);
        currentWord.setLength(0);
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    private void onRepeatPeriod() {
        commitRepeatText("…");
    }

    private void onRepeatComma() {
        commitRepeatText(",");
    }

    private void onRepeatQuestion() {
        commitRepeatText("?");
    }

    private void commitRepeatText(String text) {
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(text, 1);
        currentWord.setLength(0);
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

    private void deleteWordBeforeCursor() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        CharSequence before = ic.getTextBeforeCursor(100, 0);
        if (before == null || before.length() == 0) return;

        String text = before.toString();
        int len = text.length();
        int i = len - 1;
        while (i >= 0 && Character.isLetterOrDigit(text.charAt(i))) {
            i--;
        }
        int deleteLen = len - i - 1;
        if (deleteLen > 0) {
            ic.deleteSurroundingText(deleteLen, 0);
        } else {
            // No word character directly before cursor; delete one char so a
            // held backspace keeps making progress through spaces/punctuation.
            ic.deleteSurroundingText(1, 0);
        }
    }

    private void onSpace() {
        hapticLight();
        playKeySound();
        lastKeyTime = System.currentTimeMillis();
        if (maybeAutoCorrectWord(" ")) {
            debouncedUpdateSuggestions();
            updateSpaceBar();
            return;
        }
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) ic.commitText(" ", 1);
        currentWord.setLength(0);
        debouncedUpdateSuggestions();
        updateSpaceBar();
    }

    /**
     * If the current word exactly matches a lexicon entry, replace the typed
     * word with its canonical Unicode form and then commit the separator.
     * This gives the keyboard native-style autocorrect behavior.
     */
    private boolean isAutoCorrectEnabled() {
        return getSharedPreferences(SETTINGS_PREFS_NAME, MODE_PRIVATE)
            .getBoolean(PREF_AUTOCORRECT_ENABLED, true);
    }

    private boolean maybeAutoCorrectWord(String separator) {
        if (!isAutoCorrectEnabled() || engine == null || currentWord.length() == 0) return false;
        String typed = currentWord.toString().trim();
        if (typed.isEmpty()) return false;
        LexiconEntry exact = engine.findExactMatch(typed.toLowerCase());
        if (exact == null) return false;

        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return false;

        // Delete the typed ASCII word and replace it with the Unicode restoration.
        ic.deleteSurroundingText(typed.length(), 0);
        ic.commitText(exact.unicode, 1);
        if (separator != null && !separator.isEmpty()) {
            ic.commitText(separator, 1);
        }
        currentWord.setLength(0);
        return true;
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

            List<LexiconEntry> completions = engine.getCompletions(lowerWord, 6);
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
        chip.setClipChildren(false);
        chip.setClipToPadding(false);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.MATCH_PARENT);
        params.setMargins(dp(4), dp(2), dp(4), dp(2));
        chip.setLayoutParams(params);

        TextView unicodeView = new TextView(this);
        unicodeView.setTextSize(18);
        unicodeView.setTextColor(0xFFD4AF37);
        unicodeView.setGravity(Gravity.CENTER);
        unicodeView.setIncludeFontPadding(true);
        unicodeView.setMinHeight(dp(30));
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
        int formCount = engine.getEntryForms(entry).size();
        String badge = "Verified · " + formCount + (formCount == 1 ? " form" : " forms");
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
                case "ascii":
                    color = 0xFF888888;
                    label = "ASCII";
                    break;
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
        attachRepeatingTouchListener(comma, () -> onPunct(","), this::onRepeatComma);
        bottomRow.addView(comma);

        Button space = createFallbackKey(" ");
        space.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 4.5f));
        space.setOnClickListener(v -> onSpace());
        bottomRow.addView(space);

        Button period = createFallbackKey(".");
        period.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
        attachRepeatingTouchListener(period, () -> onPunct("."), this::onRepeatPeriod);
        bottomRow.addView(period);

        Button question = createFallbackKey("?");
        question.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
        attachRepeatingTouchListener(question, () -> onPunct("?"), this::onRepeatQuestion);
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
