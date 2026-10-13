package com.punicodex.keyboard;

import com.punicodex.app.BuildConfig;
import com.punicodex.app.R;
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
import android.widget.GridLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.content.ClipData;
import android.content.ClipboardManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

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

        // Long-press variants for the symbol keys. Every key on the symbols
        // page answers to a long press with its typographically closest
        // Unicode relatives (currency for $, fullwidth for @, dashes for -,
        // smart quotes for ", and so on).
        ACCENT_MAP.put("!", new String[]{"¡","‼","⁉","ǃ","❢"});
        ACCENT_MAP.put("@", new String[]{"＠","™","©","®","℗","℠","℡"});
        ACCENT_MAP.put("#", new String[]{"№","♯","＃"});
        ACCENT_MAP.put("$", new String[]{"¢","£","€","¥","₿","₹","₽","₩","฿","₺","₪","＄"});
        ACCENT_MAP.put("%", new String[]{"‰","‱"});
        ACCENT_MAP.put("^", new String[]{"°","ˆ","ˇ","ˉ","＾"});
        ACCENT_MAP.put("&", new String[]{"＆","⁊","⅋"});
        ACCENT_MAP.put("*", new String[]{"★","☆","✳","✻","✢","×","＊"});
        ACCENT_MAP.put("(", new String[]{"[","{","⟨","《","（","❨"});
        ACCENT_MAP.put(")", new String[]{"]","}","⟩","》","）","❩"});
        ACCENT_MAP.put("-", new String[]{"–","—","−","‑","‐"});
        ACCENT_MAP.put("_", new String[]{"‗","＿"});
        ACCENT_MAP.put("=", new String[]{"≠","≈","≡","≤","≥","＝"});
        ACCENT_MAP.put("+", new String[]{"±","∓","÷","×","⊕","＋"});
        ACCENT_MAP.put("[", new String[]{"【","〔","［","⟦"});
        ACCENT_MAP.put("]", new String[]{"】","〕","］","⟧"});
        ACCENT_MAP.put("{", new String[]{"｛","⟨","❴"});
        ACCENT_MAP.put("}", new String[]{"｝","⟩","❵"});
        ACCENT_MAP.put("|", new String[]{"¦","‖","∣","｜"});
        ACCENT_MAP.put(":", new String[]{"ː","∶","："});
        ACCENT_MAP.put(";", new String[]{"⁏","；"});
        ACCENT_MAP.put("\"", new String[]{"«","»","“","”","„","＂"});
        ACCENT_MAP.put("'", new String[]{"‘","’","′","″","´","ʹ","＇"});
        ACCENT_MAP.put("/", new String[]{"÷","⁄","∕","／"});
        ACCENT_MAP.put("\\", new String[]{"∖","＼"});
        ACCENT_MAP.put("<", new String[]{"≤","«","‹","⟨","＜"});
        ACCENT_MAP.put(">", new String[]{"≥","»","›","⟩","＞"});
        ACCENT_MAP.put("?", new String[]{"¿","ʔ","‽","？"});
        ACCENT_MAP.put(".", new String[]{"…","·","․","｡"});
        ACCENT_MAP.put(",", new String[]{"‚","‹","⸲","、","，"});
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
    private static final long REPEAT_BASE_INTERVAL_MS = 90;
    private static final long REPEAT_FAST_INTERVAL_MS = 45;
    private static final long REPEAT_ACCELERATE_THRESHOLD_MS = 900;
    private static final long REPEAT_WORD_THRESHOLD_MS = 1800;

    private TextView keyPopupText;
    private boolean keyPopupMeasured;
    private final int[] cachedLoc = new int[2];
    private PopupWindow accentPopup;
    // Palette "assign" mode: a character long-pressed in the directory waits
    // here until the user taps a key, which pins it as a long-press variant.
    private String pendingAssignChar = null;
    private PopupWindow assignBanner;
    private Handler longPressHandler = new Handler(Looper.getMainLooper());
    private Runnable longPressRunnable;
    private Button activeKey;
    private boolean longPressFired = false;
    private boolean soundEnabled = true;
    private boolean hapticsEnabled = true;

    private final Runnable cachedLongPressRunnable = () -> {
        longPressFired = true;
        hideKeyPopup();
        if (activeKey != null) showAccentPopup(activeKey);
    };

    private AlertDialog paletteDialog;
    private final List<PaletteEntry> filteredPalette = new ArrayList<>();
    private String selectedCategory = null;

    // Multi-select Unicode buffer state
    private boolean paletteMultiSelectMode = false;
    private final StringBuilder paletteBuffer = new StringBuilder();
    private Button puniBtn;
    private Button symPuniBtn;
    private Button collapseBtn;
    private Button symCollapseBtn;
    private boolean keyboardCollapsed = false;
    // Directory dialog chrome: drag offsets + persisted grid height.
    private float paletteDragLastX;
    private float paletteDragLastY;
    private static final String PREF_PALETTE_GRID_HEIGHT_DP = "palette_grid_height_dp";
    private static final int PALETTE_GRID_HEIGHT_DEFAULT_DP = 384;
    private static final int PALETTE_GRID_HEIGHT_MIN_DP = 160;
    private static final int PALETTE_GRID_HEIGHT_STEP_DP = 112;
    private static final int PALETTE_GRID_HEIGHT_MAX_DP = 640;
    private static final String PREF_PALETTE_OPAQUE_BG = "palette_opaque_bg";
    private boolean paletteOpaqueMode = true;
    private TextView paletteBufferText;
    private TextView paletteBufferCopy;
    private TextView paletteBufferInsert;
    private TextView paletteBufferClear;
    private TextView paletteMultiSelectToggle;
    private LinearLayout paletteBufferBar;
    private final Set<String> paletteSelectedCharacters = new LinkedHashSet<>();

    private final Handler repeatHandler = new Handler(Looper.getMainLooper());
    // Shared first-fire flag for the backspace auto-repeat.
    private boolean repeatFired = false;

    private Runnable backspaceRepeatRunnable;
    private long backspaceRepeatStartTime;

    private final Runnable cachedBackspaceRepeatRunnable = () -> {
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

    // Performance: cached haptic effect
    private VibrationEffect cachedHapticLight;
    private VibrationEffect cachedHapticMedium;
    private VibrationEffect cachedHapticHeavy;
    // Cached service handles + capabilities: getSystemService is a lookup and
    // hasVibrator() is a binder call — both were being made on EVERY keypress,
    // adding IPC latency to the typing hot path that Gboard does not have.
    private Vibrator cachedVibrator;
    private boolean hasVibratorCached;
    private AudioManager cachedAudioManager;

    // Performance: suggestion chip pool
    private final List<LinearLayout> chipPool = new ArrayList<>();
    private int chipPoolUsed = 0;

    // Word boundary pattern

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
        hapticsEnabled = getSharedPreferences("puny_keyboard_prefs", Context.MODE_PRIVATE)
            .getBoolean("haptics_enabled", true);

        // Cache service handles once — never in the key-press hot path.
        cachedVibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        hasVibratorCached = cachedVibrator != null && cachedVibrator.hasVibrator();
        cachedAudioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

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

        // Pre-build reusable key preview bubble. It lives INSIDE the keyboard
        // view tree (not a PopupWindow): a PopupWindow does a WindowManager
        // add/removeView transaction on every keystroke, which is the main
        // source of input jank under fast typing. Toggling visibility of an
        // in-tree view costs a fraction of that.
        keyPopupText = new TextView(this);
        keyPopupText.setTextSize(32);
        keyPopupText.setTextColor(0xFFFFFFFF);
        keyPopupText.setGravity(Gravity.CENTER);
        keyPopupText.setBackgroundResource(R.drawable.popup_bg);
        keyPopupText.setMinWidth(dp(56));
        keyPopupText.setMinHeight(dp(56));
        keyPopupText.setPadding(dp(12), dp(8), dp(12), dp(8));
        keyPopupText.setVisibility(View.GONE);
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
            // Key preview bubble rides in the same FrameLayout, on top.
            // onCreateInputView can be called again on theme/recreation —
            // detach from any previous root before re-adding.
            if (keyPopupText.getParent() != null) {
                ((ViewGroup) keyPopupText.getParent()).removeView(keyPopupText);
            }
            FrameLayout.LayoutParams popupParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            keyPopupText.setLayoutParams(popupParams);
            root.addView(keyPopupText);

            suggestionRow = keyboardView.findViewById(R.id.suggestion_row);
            typedWordView = keyboardView.findViewById(R.id.typed_word);
            spaceBtn = keyboardView.findViewById(R.id.key_space);
            shiftBtn = keyboardView.findViewById(R.id.key_shift);
            returnBtn = keyboardView.findViewById(R.id.key_return);
            symbolsBtn = keyboardView.findViewById(R.id.key_symbols);
            bottomSpacer = keyboardView.findViewById(R.id.bottom_spacer);
            symBottomSpacer = symbolKeyboardView.findViewById(R.id.symbols_bottom_spacer);

            // Directory companion: collapses the key area while the omega
            // dialog is open, freeing the screen so it can be dragged around.
            collapseBtn = keyboardView.findViewById(R.id.key_collapse);
            if (collapseBtn != null) {
                collapseBtn.setOnClickListener(v -> toggleKeyboardCollapsed());
            }
            symCollapseBtn = symbolKeyboardView.findViewById(R.id.key_sym_collapse);
            if (symCollapseBtn != null) {
                symCollapseBtn.setOnClickListener(v -> toggleKeyboardCollapsed());
            }

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
            // Recreated view (theme/config change): restore the directory's
            // companion chrome — omega highlight, collapse button, state.
            boolean dialogLive = paletteDialog != null && paletteDialog.isShowing();
            updatePuniKeyHighlight(dialogLive);
            setCollapseButtonsVisible(dialogLive);
            if (keyboardCollapsed) setKeyboardCollapsed(true);
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
        dismissPaletteDialog();
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

            puniBtn = keyboardView.findViewById(R.id.key_puni);
            if (puniBtn != null) attachPuniTouchListener(puniBtn);

            Button commaBtn = keyboardView.findViewById(R.id.key_comma);
            if (commaBtn != null) attachPunctKeyListener(commaBtn, () -> onPunct(","));

            Button periodBtn = keyboardView.findViewById(R.id.key_period);
            if (periodBtn != null) attachPunctKeyListener(periodBtn, () -> onPunct("."));

            Button questionBtn = keyboardView.findViewById(R.id.key_question);
            if (questionBtn != null) attachPunctKeyListener(questionBtn, () -> onPunct("?"));
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
                // Every single-character symbol key gets a long-press variant
                // popup (digits keep their Roman numerals; $, @, ", etc. gain
                // their typographic relatives). Tap still commits the symbol.
                if (label.length() == 1) {
                    attachSymbolLongPressTouchListener(btn);
                } else {
                    btn.setOnClickListener(v -> {
                        if (pendingAssignChar != null) { assignToKey(btn); return; }
                        onSymbolKey(btn.getText().toString());
                    });
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
            if (symComma != null) attachPunctKeyListener(symComma, () -> onPunct(","));

            Button symPeriod = symbolKeyboardView.findViewById(R.id.key_sym_period);
            if (symPeriod != null) attachPunctKeyListener(symPeriod, () -> onPunct("."));

            Button abcBtn = symbolKeyboardView.findViewById(R.id.key_abc);
            if (abcBtn != null) attachSimpleTouchListener(abcBtn, this::onSymbolsToggle);

            symPuniBtn = symbolKeyboardView.findViewById(R.id.key_puni);
            if (symPuniBtn != null) attachPuniTouchListener(symPuniBtn);

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
                    if (pendingAssignChar != null) { assignToKey(btn); return true; }
                    activeKey = btn;
                    longPressFired = false;
                    showKeyPopup(btn);
                    hapticLight();
                    playKeySound();
                    btn.setPressed(true);
                    longPressRunnable = cachedLongPressRunnable;
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
                    if (pendingAssignChar != null) { assignToKey(btn); return true; }
                    activeKey = btn;
                    longPressFired = false;
                    showKeyPopup(btn);
                    hapticLight();
                    playKeySound();
                    btn.setPressed(true);
                    longPressRunnable = cachedLongPressRunnable;
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

    /**
     * Punctuation keys: tap commits the punctuation (with autocorrect), a long
     * press opens the variant popup (… for period, ¿/‽ for ?, and so on).
     * Hold-to-repeat was retired — the period's "…" repeat moved into the
     * popup as its first variant.
     */
    private void attachPunctKeyListener(Button btn, Runnable tapAction) {
        btn.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    if (pendingAssignChar != null) { assignToKey(btn); return true; }
                    activeKey = btn;
                    longPressFired = false;
                    showKeyPopup(btn);
                    hapticLight();
                    playKeySound();
                    btn.setPressed(true);
                    longPressRunnable = cachedLongPressRunnable;
                    longPressHandler.postDelayed(longPressRunnable, LONG_PRESS_DELAY);
                    return true;

                case MotionEvent.ACTION_UP:
                    longPressHandler.removeCallbacks(longPressRunnable);
                    btn.setPressed(false);
                    hideKeyPopup();
                    if (!longPressFired) {
                        tapAction.run();
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

    // ═══════════════════════════════════════════════
    //  PALETTE ASSIGN MODE
    //  Long-press a character in the directory, then tap any key to pin it
    //  as a long-press variant of that key. The keyboard tints orange-red
    //  while the assignment is pending so the mode is unmistakable.
    // ═══════════════════════════════════════════════

    private static final int ASSIGN_TINT = 0x55FF5722;

    private void enterAssignMode(String ch) {
        pendingAssignChar = ch;
        dismissPaletteDialog();
        setAssignTint(true);
        showAssignBanner(ch);
        hapticMedium();
    }

    private void exitAssignMode() {
        pendingAssignChar = null;
        setAssignTint(false);
        if (assignBanner != null) {
            assignBanner.dismiss();
            assignBanner = null;
        }
    }

    private void setAssignTint(boolean on) {
        applyAssignTint(keyboardView, on);
        if (symbolKeyboardView != null) applyAssignTint(symbolKeyboardView, on);
    }

    private void applyAssignTint(View view, boolean on) {
        if (view == null) return;
        if (view instanceof Button) {
            view.setBackgroundTintList(on
                ? android.content.res.ColorStateList.valueOf(ASSIGN_TINT)
                : null);
        } else if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                applyAssignTint(group.getChildAt(i), on);
            }
        }
    }

    private void showAssignBanner(String ch) {
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.HORIZONTAL);
        container.setGravity(Gravity.CENTER_VERTICAL);
        container.setBackgroundResource(R.drawable.accent_popup_bg);
        container.setPadding(dp(12), dp(8), dp(12), dp(8));

        TextView charView = new TextView(this);
        charView.setText(ch);
        charView.setTextSize(26);
        charView.setTextColor(0xFFFF7043);
        container.addView(charView);

        TextView hint = new TextView(this);
        hint.setText("  Tap a key to pin it to that key's long press");
        hint.setTextSize(13);
        hint.setTextColor(0xFFCCCCCC);
        container.addView(hint);

        TextView cancel = new TextView(this);
        cancel.setText("✕");
        cancel.setTextSize(18);
        cancel.setTextColor(0xFF888888);
        cancel.setPadding(dp(12), 0, 0, 0);
        cancel.setOnClickListener(v -> exitAssignMode());
        container.addView(cancel);

        assignBanner = new PopupWindow(container,
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, false);
        assignBanner.setOutsideTouchable(true);
        assignBanner.setFocusable(false);
        // Any dismissal path (✕, outside touch, popup teardown) ends the mode.
        assignBanner.setOnDismissListener(this::exitAssignMode);
        assignBanner.showAtLocation(keyboardView, Gravity.TOP | Gravity.CENTER_HORIZONTAL, 0, dp(10));
    }

    private void assignToKey(Button btn) {
        String ch = pendingAssignChar;
        if (ch == null || ch.isEmpty()) { exitAssignMode(); return; }
        String base = btn.getText().toString();
        if (base.isEmpty()) { exitAssignMode(); return; }
        if (base.length() > 1) base = base.substring(0, 1);
        if (Character.isLetter(base.charAt(0))) {
            // Letters have separate lower/upper popup tables — pin to both so
            // the variant is reachable regardless of shift state.
            String lower = base.toLowerCase(Locale.ROOT);
            String upper = base.toUpperCase(Locale.ROOT);
            saveCustomAccent(lower, ch);
            saveCustomAccent(upper, ch);
        } else {
            saveCustomAccent(base, ch);
        }
        exitAssignMode();
        Toast.makeText(this, ch + " pinned to long-press of " + base, Toast.LENGTH_SHORT).show();
        hapticMedium();
    }

    // ── Keyboard collapse (directory companion) ─────────────────────────

    private void toggleKeyboardCollapsed() {
        setKeyboardCollapsed(!keyboardCollapsed);
        hapticLight();
        playKeySound();
    }

    private void setKeyboardCollapsed(boolean collapsed) {
        keyboardCollapsed = collapsed;
        applyKeyboardCollapsed(keyboardView, R.id.keyboard_content);
        applyKeyboardCollapsed(symbolKeyboardView, R.id.symbols_keyboard_content);
        String icon = collapsed ? "▲" : "▼";
        if (collapseBtn != null) collapseBtn.setText(icon);
        if (symCollapseBtn != null) symCollapseBtn.setText(icon);
    }

    private void applyKeyboardCollapsed(View keyboard, int contentId) {
        if (keyboard == null) return;
        ViewGroup content = keyboard.findViewById(contentId);
        if (content == null) return;
        // Child 0 is the suggestion bar — it stays visible as the anchor;
        // everything below it (divider, key rows) collapses away.
        for (int i = 1; i < content.getChildCount(); i++) {
            content.getChildAt(i).setVisibility(keyboardCollapsed ? View.GONE : View.VISIBLE);
        }
    }

    private void setCollapseButtonsVisible(boolean visible) {
        if (collapseBtn != null) collapseBtn.setVisibility(visible ? View.VISIBLE : View.GONE);
        if (symCollapseBtn != null) symCollapseBtn.setVisibility(visible ? View.VISIBLE : View.GONE);
    }

    // ── Omega key visual state ──────────────────────────────────────────

    private static final int PALETTE_ACTIVE_TINT = 0x99A78BFA; // soft purple

    private void updatePuniKeyHighlight(boolean active) {
        if (puniBtn != null) {
            puniBtn.setBackgroundTintList(active
                ? android.content.res.ColorStateList.valueOf(PALETTE_ACTIVE_TINT) : null);
        }
        if (symPuniBtn != null) {
            symPuniBtn.setBackgroundTintList(active
                ? android.content.res.ColorStateList.valueOf(PALETTE_ACTIVE_TINT) : null);
        }
    }

    // ── Directory dialog drag + resize ──────────────────────────────────

    private void attachPaletteDragHandle(View header) {
        if (header == null) return;
        header.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    paletteDragLastX = event.getRawX();
                    paletteDragLastY = event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE:
                    if (paletteDialog == null) return true;
                    android.view.Window window = paletteDialog.getWindow();
                    if (window == null) return true;
                    float dx = event.getRawX() - paletteDragLastX;
                    float dy = event.getRawY() - paletteDragLastY;
                    paletteDragLastX = event.getRawX();
                    paletteDragLastY = event.getRawY();
                    android.view.WindowManager.LayoutParams lp = window.getAttributes();
                    lp.x += (int) dx;
                    lp.y += (int) dy;
                    // Keep the header reachable on all sides.
                    int screenW = getResources().getDisplayMetrics().widthPixels;
                    int screenH = getResources().getDisplayMetrics().heightPixels;
                    int xRange = screenW - dp(120);
                    lp.x = Math.max(-xRange, Math.min(xRange, lp.x));
                    lp.y = Math.max(0, Math.min(screenH - dp(240), lp.y));
                    window.setAttributes(lp);
                    return true;
                default:
                    return false;
            }
        });
    }

    private void resizePaletteGrid(int direction) {
        if (paletteDialog == null) return;
        android.widget.ScrollView scroll = paletteDialog.findViewById(R.id.palette_grid_scroll);
        if (scroll == null || scroll.getLayoutParams() == null) return;
        float density = getResources().getDisplayMetrics().density;
        int currentDp = Math.round(scroll.getLayoutParams().height / density);
        int targetDp = Math.max(PALETTE_GRID_HEIGHT_MIN_DP, Math.min(
            PALETTE_GRID_HEIGHT_MAX_DP, currentDp + direction * PALETTE_GRID_HEIGHT_STEP_DP));
        applyPaletteGridHeight(scroll, targetDp);
        getSharedPreferences(KBD_PREFS_NAME, MODE_PRIVATE).edit()
            .putInt(PREF_PALETTE_GRID_HEIGHT_DP, targetDp).apply();
        hapticLight();
    }

    private void applyPaletteGridHeight(android.widget.ScrollView scroll, int heightDp) {
        if (scroll == null) return;
        ViewGroup.LayoutParams lp = scroll.getLayoutParams();
        lp.height = dp(heightDp);
        scroll.setLayoutParams(lp);
    }

    private void applyPaletteOpacity(View root, boolean opaque) {
        paletteOpaqueMode = opaque;
        // Near-opaque by default (readability); fully transparent on toggle.
        root.setBackgroundColor(opaque ? 0xF2080808 : 0x00000000);
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
     * Touch listener for the PuniCodex (Ω) key. A short tap opens the Unicode
     * palette; a long press toggles multi-select mode so the next palette open
     * is ready to string characters together.
     */
    private void attachPuniTouchListener(Button btn) {
        final Runnable puniLongPressRunnable = () -> {
            longPressFired = true;
            togglePaletteMultiSelect();
        };
        btn.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    activeKey = btn;
                    longPressFired = false;
                    hapticLight();
                    playKeySound();
                    btn.setPressed(true);
                    longPressRunnable = puniLongPressRunnable;
                    longPressHandler.postDelayed(longPressRunnable, LONG_PRESS_DELAY);
                    return true;
                case MotionEvent.ACTION_UP:
                    longPressHandler.removeCallbacks(longPressRunnable);
                    btn.setPressed(false);
                    if (!longPressFired) {
                        // Tap toggles: open the directory, or close it again.
                        if (paletteDialog != null && paletteDialog.isShowing()) {
                            dismissPaletteDialog();
                        } else {
                            showPalettePicker();
                        }
                    }
                    activeKey = null;
                    return true;
                case MotionEvent.ACTION_CANCEL:
                    longPressHandler.removeCallbacks(longPressRunnable);
                    btn.setPressed(false);
                    activeKey = null;
                    return true;
            }
            return false;
        });
    }

    private void togglePaletteMultiSelect() {
        try {
            if (paletteMultiSelectMode) {
                // Turning off with a non-empty buffer must not silently strand the
                // queued characters: ask whether to insert, clear, or keep going.
                if (paletteBuffer.length() > 0) {
                    confirmExitMultiSelect();
                    return;
                }
                setPaletteMultiSelect(false);
            } else {
                setPaletteMultiSelect(true);
            }
        } catch (Exception e) {
            // Never let a chrome glitch take the directory down with it.
            android.util.Log.e("PunyKeyboard", "Multi-select toggle failed", e);
            Toast.makeText(this, "Multi-select hit a glitch — try again", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * Dialogs shown from an IME need the attached-dialog window type and the
     * IME's token — a plain .show() throws BadTokenException and kills the
     * input method. Route every IME-lifespan AlertDialog through here.
     */
    private void showImeDialog(AlertDialog dialog) {
        dialog.create(); // forces window creation so getWindow() is non-null
        android.view.Window w = dialog.getWindow();
        if (w != null) {
            w.setType(android.view.WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG);
            w.addFlags(android.view.WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
            android.view.WindowManager.LayoutParams lp = w.getAttributes();
            if (lp.token == null) {
                lp.token = getWindow().getWindow().getDecorView().getWindowToken();
            }
            w.setAttributes(lp);
        }
        dialog.show();
    }

    private void confirmExitMultiSelect() {
        int count = paletteBuffer.codePointCount(0, paletteBuffer.length());
        AlertDialog dialog = new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_NoActionBar)
            .setTitle("Turn off multi-select?")
            .setMessage("You have " + count + " character" + (count == 1 ? "" : "s") +
                " in the buffer: " + paletteBuffer)
            .setPositiveButton("Insert & turn off", (d, w) -> {
                setPaletteMultiSelect(false);
                commitPaletteBuffer();
            })
            .setNegativeButton("Clear & turn off", (d, w) -> {
                clearPaletteBuffer();
                setPaletteMultiSelect(false);
            })
            .setNeutralButton("Cancel", null)
            .create();
        showImeDialog(dialog);
    }

    private void setPaletteMultiSelect(boolean on) {
        paletteMultiSelectMode = on;
        hapticMedium();
        playKeySound();
        updatePuniButtonVisual();
        updateMultiSelectToggleVisual();
        if (paletteDialog != null && paletteDialog.isShowing() && paletteBufferBar != null) {
            updatePaletteBufferBarVisibility();
            renderPaletteGrid((GridLayout) paletteDialog.findViewById(R.id.palette_grid),
                (TextView) paletteDialog.findViewById(R.id.palette_empty));
        }
        updatePaletteBufferViews();
        Toast.makeText(this,
            paletteMultiSelectMode ? "Multi-select ON — tap symbols to build a sequence" : "Multi-select OFF",
            Toast.LENGTH_SHORT).show();
    }

    private void updateMultiSelectToggleVisual() {
        if (paletteMultiSelectToggle == null) return;
        boolean on = paletteMultiSelectMode;
        paletteMultiSelectToggle.setSelected(on);
        paletteMultiSelectToggle.setText(on ? "Multi-select: ON" : "Multi-select");
        paletteMultiSelectToggle.setTextColor(on ? 0xFF000000 : 0xFFD4AF37);
    }

    private void updatePuniButtonVisual() {
        if (puniBtn != null) {
            puniBtn.setText(paletteMultiSelectMode ? "Ω+" : "Ω");
            puniBtn.setTextColor(paletteMultiSelectMode ? 0xFF000000 : 0xFFD4AF37);
            puniBtn.setBackgroundResource(paletteMultiSelectMode
                ? R.drawable.palette_item_selected_bg
                : R.drawable.accent_key_bg);
        }
        if (symPuniBtn != null) {
            symPuniBtn.setText(paletteMultiSelectMode ? "Ω+" : "Ω");
            symPuniBtn.setTextColor(paletteMultiSelectMode ? 0xFF000000 : 0xFFD4AF37);
            symPuniBtn.setBackgroundResource(paletteMultiSelectMode
                ? R.drawable.palette_item_selected_bg
                : R.drawable.accent_key_bg);
        }
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
        backspaceRepeatRunnable = cachedBackspaceRepeatRunnable;
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
        // Measure once (widest common glyph) instead of running a full
        // measure() pass on every keypress — the bubble is fixed 32sp text,
        // and a few px of over-width on the bubble is invisible.
        if (!keyPopupMeasured) {
            keyPopupText.measure(
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
            );
            keyPopupMeasured = true;
        }

        key.getLocationInWindow(cachedLoc);
        int popupX = cachedLoc[0] + key.getWidth() / 2 - keyPopupText.getMeasuredWidth() / 2;
        int popupY = cachedLoc[1] - dp(POPUP_OFFSET_DP);
        popupX = clampPopupX(popupX, keyPopupText.getMeasuredWidth());

        keyPopupText.setX(popupX);
        keyPopupText.setY(popupY);
        keyPopupText.setVisibility(View.VISIBLE);
    }

    private void hideKeyPopup() {
        keyPopupText.setVisibility(View.GONE);
    }

    private int clampPopupX(int desiredX, int popupWidth) {
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int margin = dp(8);
        int minX = margin;
        int maxX = screenWidth - popupWidth - margin;
        if (maxX < minX) maxX = minX;
        return Math.max(minX, Math.min(desiredX, maxX));
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

        // Custom (user-pinned) variants render in orange and can be removed
        // by long-pressing them; built-in defaults cannot be deleted.
        Set<String> customForBase = customAccents.get(baseKey);
        final Set<String> customSet = customForBase == null
            ? java.util.Collections.emptySet() : customForBase;

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
                if (customSet.contains(ch)) {
                    tv.setTextColor(0xFFFF7043);
                    tv.setOnLongClickListener(v -> {
                        confirmRemoveAccent(baseKey, ch);
                        return true;
                    });
                }
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

        if (!customSet.isEmpty()) {
            TextView hint = new TextView(this);
            hint.setText("Orange = yours — hold one to remove it");
            hint.setTextSize(9);
            hint.setTextColor(0xFF777777);
            hint.setGravity(Gravity.CENTER);
            hint.setPadding(0, dp(4), 0, 0);
            container.addView(hint);
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
        // Persist a copy: putStringSet keeps a reference to the live set on
        // some API levels and silently skips the write for the same instance.
        accentPrefs.edit().putStringSet(CUSTOM_ACCENT_PREFIX + base, new HashSet<>(set)).apply();
    }

    private void removeCustomAccent(String base, String ch) {
        Set<String> set = customAccents.get(base);
        if (set == null) return;
        set.remove(ch);
        if (set.isEmpty()) {
            customAccents.remove(base);
            accentPrefs.edit().remove(CUSTOM_ACCENT_PREFIX + base).apply();
        } else {
            accentPrefs.edit().putStringSet(CUSTOM_ACCENT_PREFIX + base, new HashSet<>(set)).apply();
        }
    }

    private void confirmRemoveAccent(String base, String ch) {
        dismissAccentPopup();
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("Remove " + ch + "?")
            .setMessage("Delete this character from the long-press options of " + base
                + "? Built-in variants cannot be removed.")
            .setPositiveButton("Delete", (d, which) -> {
                removeCustomAccent(base, ch);
                Toast.makeText(this, ch + " removed from " + base, Toast.LENGTH_SHORT).show();
            })
            .setNegativeButton("Cancel", null)
            .create();
        showImeDialog(dialog);
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

        showImeDialog(builder.create());
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
                    temp.append(getTrailingWordNormalized(before));
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
        currentWord.append(getTrailingWordNormalized(before));
    }

    // Length in chars of the trailing word at the end of text: letters and
    // combining marks only. A committed restoration (Apóllōn) is ONE word —
    // the old [a-zA-Z]+$ pattern treated only its trailing "n" as the word,
    // which made the next suggestion pill eat that letter and glue the new
    // name onto the mangled remainder.
    private static int trailingWordLength(CharSequence text) {
        if (text == null) return 0;
        int len = 0;
        for (int i = text.length(); i > 0; ) {
            int cp = Character.codePointBefore(text, i);
            int type = Character.getType(cp);
            boolean wordChar = Character.isLetter(cp)
                || type == Character.NON_SPACING_MARK
                || type == Character.COMBINING_SPACING_MARK
                || type == Character.ENCLOSING_MARK;
            if (!wordChar) break;
            len += Character.charCount(cp);
            i -= Character.charCount(cp);
        }
        return len;
    }

    // Diacritic-insensitive trailing word: Apóllōn → apollon. Lets the word
    // tracker recognise a committed Unicode restoration as the name it is
    // instead of latching onto its trailing ASCII letter.
    private String getTrailingWordNormalized(CharSequence beforeCursor) {
        int len = trailingWordLength(beforeCursor);
        if (len == 0) return "";
        String suffix = beforeCursor
            .subSequence(beforeCursor.length() - len, beforeCursor.length())
            .toString();
        return java.text.Normalizer.normalize(suffix, java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT);
    }

    // ═══════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════

    private boolean paletteSearchActive = false;
    // Debounced palette search: rebuilding up to 1,000 grid cells on every
    // keystroke re-enters layout from inside the key handler, which janked
    // (and on slower devices killed) the IME while typing fast.
    private GridLayout paletteGridRef;
    private TextView paletteEmptyRef;
    private String palettePendingQuery = "";
    private final Runnable paletteFilterRunnable = () -> {
        try {
            if (paletteGridRef != null && paletteEmptyRef != null) {
                filterPalette(palettePendingQuery, paletteGridRef, paletteEmptyRef);
            }
        } catch (Exception e) {
            android.util.Log.e("PunyKeyboard", "Palette filter failed", e);
        }
    };

    private void schedulePaletteFilter(String query) {
        palettePendingQuery = query;
        suggestionHandler.removeCallbacks(paletteFilterRunnable);
        suggestionHandler.postDelayed(paletteFilterRunnable, 120);
    }

    private void onKey(String key) {
        lastKeyTime = System.currentTimeMillis();
        // Palette search mode: the palette lives inside this IME, so the
        // system IME can never serve its EditText (requesting it restarts
        // this IME, which tears the dialog down). Instead the search field
        // refuses the soft keyboard and our own keys feed it directly.
        if (paletteSearchActive && paletteDialog != null && paletteDialog.isShowing()) {
            android.widget.EditText search = paletteDialog.findViewById(R.id.palette_search);
            if (search != null) {
                search.append(key); // TextWatcher re-filters the grid
                return;
            }
        }
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

    private void onBackspace() {
        hapticMedium();
        playKeySound();
        lastKeyTime = System.currentTimeMillis();

        // Palette search mode: delete from the query; on an empty query,
        // exit search mode instead of touching the app's text.
        if (paletteSearchActive && paletteDialog != null && paletteDialog.isShowing()) {
            android.widget.EditText search = paletteDialog.findViewById(R.id.palette_search);
            if (search != null) {
                android.text.Editable query = search.getText();
                if (query.length() > 0) {
                    query.delete(query.length() - 1, query.length());
                } else {
                    paletteSearchActive = false;
                    search.clearFocus();
                }
                return;
            }
        }

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
        // Palette search mode: a space belongs in the query, not in the app's
        // text field behind the dialog (and it must not trigger autocorrect).
        if (paletteSearchActive && paletteDialog != null && paletteDialog.isShowing()) {
            android.widget.EditText search = paletteDialog.findViewById(R.id.palette_search);
            if (search != null) {
                search.append(" ");
                return;
            }
        }
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

        // Delete the trailing word — measured on the real text (a committed
        // restoration differs in length from its ASCII key) — and only when
        // it actually matches what we tracked.
        CharSequence before = ic.getTextBeforeCursor(Math.max(64, typed.length() + 8), 0);
        int trailLen = trailingWordLength(before);
        if (trailLen == 0 || !getTrailingWordNormalized(before).equalsIgnoreCase(typed)) {
            return false;
        }
        ic.deleteSurroundingText(trailLen, 0);
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
        // Enter while searching: leave search mode rather than committing a
        // newline into the app's text field.
        if (paletteSearchActive && paletteDialog != null && paletteDialog.isShowing()) {
            paletteSearchActive = false;
            android.widget.EditText search = paletteDialog.findViewById(R.id.palette_search);
            if (search != null) search.clearFocus();
            return;
        }
        InputConnection ic = getCurrentInputConnection();
        if (ic != null) {
            boolean multiline = currentEditorInfo != null
                && (currentEditorInfo.inputType & EditorInfo.TYPE_TEXT_FLAG_MULTI_LINE) != 0;
            int options = currentEditorInfo != null ? currentEditorInfo.imeOptions : 0;
            boolean noEnterAction = (options & EditorInfo.IME_FLAG_NO_ENTER_ACTION) != 0;
            int action = options & EditorInfo.IME_MASK_ACTION;

            // Multi-line fields and editors without an explicit action take a
            // literal newline. Committing "\n" as text is far more reliable
            // across apps than KEYCODE_ENTER key events, which WebViews and
            // many chat/social apps silently drop.
            if (multiline || noEnterAction || action == 0 || action == EditorInfo.IME_ACTION_UNSPECIFIED) {
                ic.commitText("\n", 1);
            } else {
                ic.performEditorAction(action);
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

    private final Runnable cachedSuggestionRunnable = () -> {
        pendingSuggestionRunnable = null;
        updateSuggestions();
    };

    private void debouncedUpdateSuggestions() {
        if (pendingSuggestionRunnable != null) {
            // Already scheduled; no need to reschedule
            return;
        }

        long now = System.currentTimeMillis();
        boolean rapid = (now - lastKeyTime) < RAPID_KEY_THRESHOLD_MS;
        pendingSuggestionRunnable = cachedSuggestionRunnable;

        if (rapid) {
            // Delay suggestion update during rapid typing to keep input responsive
            suggestionHandler.postDelayed(cachedSuggestionRunnable, RAPID_KEY_THRESHOLD_MS);
        } else {
            // Sync to next vsync for zero-jank updates
            if (keyboardView != null) {
                keyboardView.postOnAnimation(cachedSuggestionRunnable);
            } else {
                suggestionHandler.post(cachedSuggestionRunnable);
            }
        }
    }

    private void updateSuggestions() {
        if (suggestionRow == null) return;
        if (!shouldShowSuggestions) {
            hideExcessChips();
            if (typedWordView != null) {
                typedWordView.setText("");
                typedWordView.setHint(isPasswordField ? "••••••" : "PuniCodex");
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
            if (typedWordView != null) typedWordView.setHint("PuniCodex");
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

    // ═══════════════════════════════════════════════
    // UNICODE PALETTE PICKER
    // ═══════════════════════════════════════════════

    private void showPalettePicker() {
        hapticMedium();
        playKeySound();
        dismissAllPopups();
        if (palette == null || palette.isEmpty()) {
            Toast.makeText(this, "Unicode palette not loaded", Toast.LENGTH_SHORT).show();
            return;
        }
        if (paletteDialog != null && paletteDialog.isShowing()) {
            return;
        }

        View view = LayoutInflater.from(this).inflate(R.layout.dialog_palette_picker, null);
        EditText searchInput = view.findViewById(R.id.palette_search);
        // The palette lives inside this IME, so the system soft keyboard can
        // never serve the search field — requesting it restarts this very IME
        // and the resulting onStartInputView tears the dialog down (the
        // "search exits the directory" bug). Refuse the soft keyboard and
        // route this keyboard's own keystrokes into the field instead.
        searchInput.setShowSoftInputOnFocus(false);
        searchInput.setCursorVisible(true);
        searchInput.setOnFocusChangeListener((v, hasFocus) -> paletteSearchActive = hasFocus);
        searchInput.setOnClickListener(v -> {
            paletteSearchActive = true;
            searchInput.requestFocus();
        });
        LinearLayout categoryRow = view.findViewById(R.id.palette_category_row);
        GridLayout grid = view.findViewById(R.id.palette_grid);
        TextView emptyView = view.findViewById(R.id.palette_empty);
        paletteGridRef = grid;
        paletteEmptyRef = emptyView;

        paletteBufferBar = view.findViewById(R.id.palette_buffer_bar);
        paletteBufferText = view.findViewById(R.id.palette_buffer_text);
        paletteBufferCopy = view.findViewById(R.id.palette_buffer_copy);
        paletteBufferInsert = view.findViewById(R.id.palette_buffer_insert);
        paletteBufferClear = view.findViewById(R.id.palette_buffer_clear);
        paletteMultiSelectToggle = view.findViewById(R.id.palette_multi_select_toggle);

        filteredPalette.clear();
        filteredPalette.addAll(palette);
        selectedCategory = null;

        List<String> categories = new ArrayList<>();
        categories.add("All");
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (PaletteEntry entry : palette) {
            if (entry.category != null && !entry.category.isEmpty()) {
                seen.add(entry.category);
            }
        }
        categories.addAll(seen);

        List<TextView> categoryViews = new ArrayList<>();
        for (String category : categories) {
            TextView chip = createCategoryChip(category);
            boolean isAll = "All".equals(category);
            chip.setSelected(isAll);
            chip.setTextColor(isAll ? 0xFF000000 : 0xFFD4AF37);
            chip.setOnClickListener(v -> {
                hapticLight();
                selectedCategory = isAll ? null : category;
                for (TextView cv : categoryViews) {
                    boolean selected = cv == chip;
                    cv.setSelected(selected);
                    cv.setTextColor(selected ? 0xFF000000 : 0xFFD4AF37);
                }
                filterPalette(searchInput.getText().toString(), grid, emptyView);
            });
            categoryViews.add(chip);
            categoryRow.addView(chip);
        }

        // All-view customizer: pick up to 6 categories to pin to the front
        // of the All listing, in pick order. Persisted across sessions.
        allPinnedCategories.clear();
        allPinnedCategories.addAll(loadAllPinnedCategories());
        paletteAllCustomizer = view.findViewById(R.id.palette_all_customizer);
        paletteAllCustomizerRow = view.findViewById(R.id.palette_all_customizer_row);
        paletteAllCustomizerLabel = view.findViewById(R.id.palette_all_customizer_label);
        buildAllCustomizerChips(seen, grid, emptyView);

        searchInput.addTextChangedListener(new android.text.TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(android.text.Editable s) {
                schedulePaletteFilter(s.toString());
            }
        });

        renderPaletteGrid(grid, emptyView);
        updatePaletteBufferBarVisibility();
        updatePaletteBufferViews();

        paletteMultiSelectToggle.setOnClickListener(v -> {
            hapticLight();
            togglePaletteMultiSelect();
        });

        paletteBufferCopy.setOnClickListener(v -> {
            hapticMedium();
            playKeySound();
            copyPaletteBufferToClipboard();
        });

        paletteBufferInsert.setOnClickListener(v -> {
            hapticMedium();
            playKeySound();
            commitPaletteBuffer();
        });

        paletteBufferClear.setOnClickListener(v -> {
            hapticLight();
            playKeySound();
            clearPaletteBuffer();
        });

        AlertDialog.Builder builder = new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_NoActionBar);
        builder.setView(view);
        paletteDialog = builder.create();
        // The directory is a work surface, not a modal: stray touches must not
        // kill it, and any dismissal path cleans up its companion chrome.
        paletteDialog.setCanceledOnTouchOutside(false);
        paletteDialog.setOnDismissListener(d -> {
            updatePuniKeyHighlight(false);
            setCollapseButtonsVisible(false);
            if (keyboardCollapsed) setKeyboardCollapsed(false);
            paletteSearchActive = false;
        });
        android.view.Window win = paletteDialog.getWindow();
        if (win != null) {
            win.setType(android.view.WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG);
            win.addFlags(android.view.WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
            // Touches in the window's empty (transparent) regions must reach
            // the keyboard behind it — otherwise the collapse key and every
            // other key feel dead while the directory is open.
            win.addFlags(android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL);
            win.setBackgroundDrawableResource(android.R.color.transparent);
            // Pin to the TOP of the window: with a fixed-height grid the dialog
            // content is shorter than the available space, and the default
            // center-gravity pushed the whole directory down the screen.
            win.setGravity(Gravity.TOP);
            android.view.WindowManager.LayoutParams lp = win.getAttributes();
            lp.token = getWindow().getWindow().getDecorView().getWindowToken();
            lp.y = dp(12);
            win.setAttributes(lp);
        }

        // Drag the whole dialog from the header row; −/+ resize the grid.
        attachPaletteDragHandle(view.findViewById(R.id.palette_header));
        TextView shrinkBtn = view.findViewById(R.id.palette_shrink);
        if (shrinkBtn != null) shrinkBtn.setOnClickListener(v -> resizePaletteGrid(-1));
        TextView growBtn = view.findViewById(R.id.palette_grow);
        if (growBtn != null) growBtn.setOnClickListener(v -> resizePaletteGrid(1));
        int savedHeightDp = getSharedPreferences(KBD_PREFS_NAME, MODE_PRIVATE)
            .getInt(PREF_PALETTE_GRID_HEIGHT_DP, PALETTE_GRID_HEIGHT_DEFAULT_DP);
        applyPaletteGridHeight(view.findViewById(R.id.palette_grid_scroll), savedHeightDp);

        // Opacity: default near-opaque for readability; the ◐ button toggles
        // to fully transparent so the app shows through while dragging.
        boolean opaque = getSharedPreferences(KBD_PREFS_NAME, MODE_PRIVATE)
            .getBoolean(PREF_PALETTE_OPAQUE_BG, true);
        applyPaletteOpacity(view, opaque);
        TextView opacityToggle = view.findViewById(R.id.palette_opacity_toggle);
        if (opacityToggle != null) {
            opacityToggle.setText(opaque ? "◐" : "○");
            opacityToggle.setOnClickListener(v -> {
                boolean next = !paletteOpaqueMode;
                applyPaletteOpacity(view, next);
                getSharedPreferences(KBD_PREFS_NAME, MODE_PRIVATE).edit()
                    .putBoolean(PREF_PALETTE_OPAQUE_BG, next).apply();
                opacityToggle.setText(next ? "◐" : "○");
                hapticLight();
            });
        }

        updatePuniKeyHighlight(true);
        setCollapseButtonsVisible(true);
        paletteDialog.show();
    }

    private TextView createCategoryChip(String category) {
        TextView chip = new TextView(this);
        chip.setText(category.substring(0, 1).toUpperCase(Locale.ROOT) + category.substring(1));
        chip.setTextColor(0xFFD4AF37);
        chip.setTextSize(12);
        chip.setBackgroundResource(R.drawable.palette_chip_bg);
        chip.setGravity(Gravity.CENTER);
        chip.setPadding(dp(14), dp(6), dp(14), dp(6));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 0, dp(8), 0);
        chip.setLayoutParams(params);
        return chip;
    }

    private List<String> loadAllPinnedCategories() {
        List<String> out = new ArrayList<>();
        SharedPreferences prefs = getSharedPreferences(KBD_PREFS_NAME, MODE_PRIVATE);
        // First run (key absent): lead with Greek — the brand's home script —
        // so "All starts with" is meaningful before the user customises it.
        // Once the user has toggled anything, their exact choice is honoured
        // (including an intentional empty pick).
        if (!prefs.contains(PREF_ALL_PINNED_CATEGORIES)) {
            out.add("greek");
            return out;
        }
        String raw = prefs.getString(PREF_ALL_PINNED_CATEGORIES, "");
        if (raw != null && !raw.isEmpty()) {
            for (String part : raw.split(",")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) out.add(trimmed);
            }
        }
        return out;
    }

    private void saveAllPinnedCategories() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < allPinnedCategories.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(allPinnedCategories.get(i));
        }
        getSharedPreferences(KBD_PREFS_NAME, MODE_PRIVATE).edit()
            .putString(PREF_ALL_PINNED_CATEGORIES, sb.toString())
            .apply();
    }

    private boolean isAllPinned(String category) {
        for (String pinned : allPinnedCategories) {
            if (pinned.equalsIgnoreCase(category)) return true;
        }
        return false;
    }

    private void buildAllCustomizerChips(LinkedHashSet<String> categories, GridLayout grid, TextView emptyView) {
        if (paletteAllCustomizerRow == null) return;
        paletteAllCustomizerRow.removeAllViews();
        final List<String> categoriesList = new ArrayList<>(categories);
        List<TextView> chipViews = new ArrayList<>();
        for (final String category : categories) {
            TextView chip = createCategoryChip(category);
            boolean pinned = isAllPinned(category);
            chip.setSelected(pinned);
            chip.setTextColor(pinned ? 0xFF000000 : 0xFFD4AF37);
            chip.setTextSize(11);
            chip.setOnClickListener(v -> {
                hapticLight();
                if (isAllPinned(category)) {
                    // Remove: keep every other pin's relative order intact.
                    for (int i = allPinnedCategories.size() - 1; i >= 0; i--) {
                        if (allPinnedCategories.get(i).equalsIgnoreCase(category)) {
                            allPinnedCategories.remove(i);
                        }
                    }
                } else if (allPinnedCategories.size() >= ALL_MAX_PINNED_CATEGORIES) {
                    Toast.makeText(this, "Up to " + ALL_MAX_PINNED_CATEGORIES
                        + " categories in All — remove one first", Toast.LENGTH_SHORT).show();
                    return;
                } else {
                    allPinnedCategories.add(category);
                }
                saveAllPinnedCategories();
                for (int i = 0; i < chipViews.size(); i++) {
                    TextView cv = chipViews.get(i);
                    String cat = categoriesList.get(i);
                    boolean nowPinned = isAllPinned(cat);
                    cv.setSelected(nowPinned);
                    cv.setTextColor(nowPinned ? 0xFF000000 : 0xFFD4AF37);
                }
                updateAllCustomizerLabel();
                android.widget.EditText search = paletteDialog != null
                    ? paletteDialog.findViewById(R.id.palette_search) : null;
                String query = search != null ? search.getText().toString() : "";
                filterPalette(query, grid, emptyView);
            });
            chipViews.add(chip);
            paletteAllCustomizerRow.addView(chip);
        }
        updateAllCustomizerLabel();
    }

    private void updateAllCustomizerLabel() {
        if (paletteAllCustomizerLabel == null) return;
        if (allPinnedCategories.isEmpty()) {
            paletteAllCustomizerLabel.setText("All starts with — pick up to "
                + ALL_MAX_PINNED_CATEGORIES + " categories");
            return;
        }
        StringBuilder sb = new StringBuilder("All starts with: ");
        for (int i = 0; i < allPinnedCategories.size(); i++) {
            if (i > 0) sb.append(" · ");
            String cat = allPinnedCategories.get(i);
            sb.append(cat.substring(0, 1).toUpperCase(Locale.ROOT)).append(cat.substring(1));
        }
        paletteAllCustomizerLabel.setText(sb.toString());
    }

    private void filterPalette(String query, GridLayout grid, TextView emptyView) {
        String normalized = query.trim().toLowerCase(Locale.ROOT);
        paletteQueryActive = !normalized.isEmpty();
        filteredPalette.clear();
        for (PaletteEntry entry : palette) {
            boolean matchesCategory = selectedCategory == null
                || selectedCategory.equalsIgnoreCase(entry.category);
            boolean matchesQuery = normalized.isEmpty()
                || entry.nameLower.contains(normalized)
                || entry.keywordsLower.contains(normalized)
                || entry.code.contains(normalized)
                || entry.characterLower.contains(normalized);
            if (matchesCategory && matchesQuery) {
                filteredPalette.add(entry);
            }
        }
        // Customised All: pinned categories lead the listing, in pick order.
        if (selectedCategory == null && !allPinnedCategories.isEmpty()) {
            List<PaletteEntry> pinned = new ArrayList<>();
            List<PaletteEntry> rest = new ArrayList<>();
            for (PaletteEntry entry : filteredPalette) {
                if (isAllPinned(entry.category)) pinned.add(entry);
                else rest.add(entry);
            }
            if (!pinned.isEmpty()) {
                filteredPalette.clear();
                for (String cat : allPinnedCategories) {
                    for (PaletteEntry entry : pinned) {
                        if (entry.category.equalsIgnoreCase(cat)) filteredPalette.add(entry);
                    }
                }
                filteredPalette.addAll(rest);
            }
        }
        renderPaletteGrid(grid, emptyView);
    }

    private static final int PALETTE_PAGE_SIZE = 200;
    // The All view is the browse-everything surface: it gets a much larger
    // first page so scrolling (not search) is a viable way to explore.
    private static final int PALETTE_ALL_PAGE_SIZE = 1000;
    // The All view can be customised: up to this many categories are pinned
    // to the front of All, in the order the user picked them.
    private static final int ALL_MAX_PINNED_CATEGORIES = 6;
    private static final String KBD_PREFS_NAME = "puny_keyboard_prefs";
    private static final String PREF_ALL_PINNED_CATEGORIES = "palette_all_pinned_categories";
    private LinearLayout paletteAllCustomizer;
    private LinearLayout paletteAllCustomizerRow;
    private TextView paletteAllCustomizerLabel;
    private final List<String> allPinnedCategories = new ArrayList<>();
    private boolean paletteQueryActive = false;
    // Rendering: cells are built programmatically (XML inflation of 1,000
    // layouts is what made opening the directory lag), pooled across
    // re-renders, and bound in per-frame chunks so the dialog paints
    // immediately and the rest of the grid fills in behind it.
    private static final int PALETTE_CHUNK_SIZE = 250;
    private final List<View> paletteCellPool = new ArrayList<>();
    private TextView paletteFooterView;
    private int paletteRenderGeneration = 0;
    private int paletteDisplayCount = 0;
    private int paletteCellHeightPx = -1;

    private void renderPaletteGrid(GridLayout grid, TextView emptyView) {
        // Invalidate any in-flight chunk from a previous render FIRST — even
        // the empty-state early return must cancel it, or stale cells would
        // re-appear under "No symbols found".
        paletteRenderGeneration++;
        recyclePaletteCells(grid);
        if (filteredPalette.isEmpty()) {
            emptyView.setVisibility(View.VISIBLE);
            grid.setVisibility(View.GONE);
            return;
        }
        emptyView.setVisibility(View.GONE);
        grid.setVisibility(View.VISIBLE);

        int columnCount = grid.getColumnCount();
        boolean isAllView = selectedCategory == null;
        int pageSize = isAllView ? PALETTE_ALL_PAGE_SIZE : PALETTE_PAGE_SIZE;
        paletteDisplayCount = Math.min(filteredPalette.size(), pageSize);

        if (paletteAllCustomizer != null) {
            paletteAllCustomizer.setVisibility(isAllView && !paletteQueryActive ? View.VISIBLE : View.GONE);
        }

        // Bind the first chunk synchronously so the dialog paints at once;
        // the remaining cells land frame-by-frame. Rendering all 1,000 up
        // front is what janked the IME when opening the directory.
        if (paletteCellHeightPx < 0) paletteCellHeightPx = dp(64);
        int firstChunk = Math.min(paletteDisplayCount, PALETTE_CHUNK_SIZE);
        for (int i = 0; i < firstChunk; i++) bindPaletteCell(grid, i);
        if (paletteDisplayCount > firstChunk) {
            schedulePaletteChunk(grid, firstChunk, paletteRenderGeneration);
        }

        // Footer is ALWAYS shown (even when everything fits) so the dialog
        // height never shifts when switching categories — small categories
        // used to collapse the grid area and move every control.
        if (paletteFooterView == null) {
            paletteFooterView = new TextView(this);
            paletteFooterView.setTextColor(0xFF888888);
            paletteFooterView.setTextSize(11);
            paletteFooterView.setGravity(Gravity.CENTER);
            paletteFooterView.setPadding(0, dp(10), 0, dp(4));
        }
        if (filteredPalette.size() > pageSize) {
            paletteFooterView.setText("Showing " + pageSize + " of " + filteredPalette.size() + " — search or pick a category");
        } else {
            paletteFooterView.setText(filteredPalette.size() + " symbols");
        }
        GridLayout.LayoutParams footerParams = new GridLayout.LayoutParams(
            GridLayout.spec(GridLayout.UNDEFINED, 1f),
            GridLayout.spec(GridLayout.UNDEFINED, columnCount));
        footerParams.width = GridLayout.LayoutParams.MATCH_PARENT;
        paletteFooterView.setLayoutParams(footerParams);
        // recyclePaletteCells deliberately keeps the footer attached to the
        // grid, so it must be detached before re-adding — addView on a child
        // that already has a parent throws IllegalStateException.
        if (paletteFooterView.getParent() != null) {
            ((ViewGroup) paletteFooterView.getParent()).removeView(paletteFooterView);
        }
        grid.addView(paletteFooterView);
    }

    // ── Pooled, chunked palette grid ────────────────────────────────────

    private void recyclePaletteCells(GridLayout grid) {
        for (int i = grid.getChildCount() - 1; i >= 0; i--) {
            View child = grid.getChildAt(i);
            if (child == paletteFooterView) continue;
            child.setTag(null);
            grid.removeViewAt(i);
            paletteCellPool.add(child);
        }
    }

    private View obtainPaletteCell() {
        View cell = paletteCellPool.isEmpty()
            ? createPaletteCell()
            : paletteCellPool.remove(paletteCellPool.size() - 1);
        GridLayout.LayoutParams cellParams = new GridLayout.LayoutParams(
            GridLayout.spec(GridLayout.UNDEFINED, 1f),
            GridLayout.spec(GridLayout.UNDEFINED, 1f));
        cellParams.width = 0;
        cellParams.height = paletteCellHeightPx;
        cell.setLayoutParams(cellParams);
        return cell;
    }

    private View createPaletteCell() {
        LinearLayout cell = new LinearLayout(this);
        cell.setOrientation(LinearLayout.VERTICAL);
        cell.setGravity(Gravity.CENTER);
        int pad = dp(4);
        cell.setPadding(pad, pad, pad, pad);
        cell.setBackgroundResource(R.drawable.accent_key_bg);

        TextView charView = new TextView(this);
        charView.setGravity(Gravity.CENTER);
        charView.setTextColor(0xFFD4AF37);
        charView.setTextSize(23);
        cell.addView(charView);

        TextView nameView = new TextView(this);
        nameView.setGravity(Gravity.CENTER);
        nameView.setSingleLine(true);
        nameView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        nameView.setTextColor(0xFF888888);
        nameView.setTextSize(8);
        cell.addView(nameView);

        TextView codeView = new TextView(this);
        codeView.setGravity(Gravity.CENTER);
        codeView.setSingleLine(true);
        codeView.setTextColor(0xFF555555);
        codeView.setTextSize(7);
        cell.addView(codeView);

        cell.setOnClickListener(paletteCellClickListener);
        cell.setOnLongClickListener(paletteCellLongClickListener);
        return cell;
    }

    private void bindPaletteCell(GridLayout grid, int index) {
        PaletteEntry entry = filteredPalette.get(index);
        View cell = obtainPaletteCell();
        // The index is the entry's identity for the shared listeners; entries
        // are re-resolved at tap time so pooled cells survive re-sorts.
        cell.setTag(index);
        ViewGroup cellGroup = (ViewGroup) cell;
        TextView charView = (TextView) cellGroup.getChildAt(0);
        TextView nameView = (TextView) cellGroup.getChildAt(1);
        TextView codeView = (TextView) cellGroup.getChildAt(2);
        // Combining marks render on top of the previous glyph — shown
        // alone in a cell they are invisible, which read as "missing".
        // Prefix the dotted circle U+25CC so the mark is visible, exactly
        // as Unicode charts display it. Commit still sends the bare mark.
        charView.setText(isCombiningMark(entry.character)
            ? "◌" + entry.character
            : entry.character);
        nameView.setText(entry.name);
        // Every cell identifies itself by codepoint — the U+ ID is the
        // portable handle for "add this character" references.
        codeView.setText(entry.code);
        updatePaletteCellSelection(cell, charView, nameView,
            paletteSelectedCharacters.contains(entry.character));
        grid.addView(cell);
    }

    private void schedulePaletteChunk(GridLayout grid, int start, int generation) {
        suggestionHandler.post(() -> {
            // A newer render (search keystroke, category switch) supersedes us.
            if (generation != paletteRenderGeneration) return;
            if (paletteDialog == null || !paletteDialog.isShowing()) return;
            int end = Math.min(paletteDisplayCount, start + PALETTE_CHUNK_SIZE);
            for (int i = start; i < end; i++) bindPaletteCell(grid, i);
            if (end < paletteDisplayCount) schedulePaletteChunk(grid, end, generation);
        });
    }

    private PaletteEntry paletteEntryFromTag(View v) {
        Object tag = v.getTag();
        if (!(tag instanceof Integer)) return null;
        int index = (Integer) tag;
        if (index < 0 || index >= filteredPalette.size()) return null;
        return filteredPalette.get(index);
    }

    private final View.OnClickListener paletteCellClickListener = v -> {
        PaletteEntry entry = paletteEntryFromTag(v);
        if (entry == null) return;
        hapticMedium();
        playKeySound();
        if (paletteMultiSelectMode) {
            addToPaletteBuffer(entry.character);
            ViewGroup cellGroup = (ViewGroup) v;
            updatePaletteCellSelection(v, (TextView) cellGroup.getChildAt(0),
                (TextView) cellGroup.getChildAt(1),
                paletteSelectedCharacters.contains(entry.character));
        } else {
            commitPaletteCharacter(entry.character);
            dismissPaletteDialog();
        }
    };

    private final View.OnLongClickListener paletteCellLongClickListener = v -> {
        PaletteEntry entry = paletteEntryFromTag(v);
        if (entry == null) return false;
        // Long-press a directory character to pin it: the keyboard
        // tints orange-red and the next key tapped becomes its home.
        enterAssignMode(entry.character);
        return true;
    };

    private static boolean isCombiningMark(String character) {
        if (character == null || character.isEmpty()) return false;
        int cp = character.codePointAt(0);
        int type = Character.getType(cp);
        return type == Character.NON_SPACING_MARK
            || type == Character.COMBINING_SPACING_MARK
            || type == Character.ENCLOSING_MARK;
    }

    private void commitPaletteCharacter(String character) {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        ipcHandler.post(() -> {
            ic.commitText(character, 1);
            suggestionHandler.post(() -> {
                currentWord.setLength(0);
                debouncedUpdateSuggestions();
                updateSpaceBar();
            });
        });
    }

    private void updatePaletteCellSelection(View cell, TextView charView, TextView nameView, boolean selected) {
        if (selected) {
            cell.setBackgroundResource(R.drawable.palette_item_selected_bg);
            charView.setTextColor(0xFF000000);
            nameView.setTextColor(0xFF333333);
        } else {
            cell.setBackgroundResource(R.drawable.accent_key_bg);
            charView.setTextColor(0xFFD4AF37);
            nameView.setTextColor(0xFF888888);
        }
    }

    private void updatePaletteBufferBarVisibility() {
        if (paletteBufferBar == null) return;
        paletteBufferBar.setVisibility(paletteMultiSelectMode ? View.VISIBLE : View.GONE);
    }

    private void updatePaletteBufferViews() {
        if (paletteBufferText == null) return;
        paletteBufferText.setText(paletteBuffer.toString());
        boolean hasBuffer = paletteBuffer.length() > 0;
        if (paletteBufferCopy != null) {
            paletteBufferCopy.setTextColor(hasBuffer ? 0xFFD4AF37 : 0xFF555555);
        }
        if (paletteBufferInsert != null) {
            paletteBufferInsert.setTextColor(hasBuffer ? 0xFFD4AF37 : 0xFF555555);
        }
        if (paletteMultiSelectToggle != null) {
            paletteMultiSelectToggle.setSelected(paletteMultiSelectMode);
            // Explicit ON/OFF label — the old static "Multi-select" chip was
            // indistinguishable between states at a glance.
            paletteMultiSelectToggle.setText(paletteMultiSelectMode ? "Multi-select: ON" : "Multi-select: OFF");
            paletteMultiSelectToggle.setTextColor(paletteMultiSelectMode ? 0xFF000000 : 0xFFD4AF37);
        }
    }

    private void addToPaletteBuffer(String character) {
        paletteBuffer.append(character);
        paletteSelectedCharacters.add(character);
        updatePaletteBufferViews();
    }

    private void clearPaletteBuffer() {
        paletteBuffer.setLength(0);
        paletteSelectedCharacters.clear();
        updatePaletteBufferViews();
        if (paletteDialog != null && paletteDialog.isShowing()) {
            GridLayout grid = paletteDialog.findViewById(R.id.palette_grid);
            TextView emptyView = paletteDialog.findViewById(R.id.palette_empty);
            if (grid != null) renderPaletteGrid(grid, emptyView);
        }
    }

    private void copyPaletteBufferToClipboard() {
        String text = paletteBuffer.toString();
        if (text.isEmpty()) {
            Toast.makeText(this, "Nothing to copy", Toast.LENGTH_SHORT).show();
            return;
        }
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) {
            cm.setPrimaryClip(ClipData.newPlainText("PuniCodex characters", text));
            Toast.makeText(this, "Copied " + text.codePointCount(0, text.length()) + " characters", Toast.LENGTH_SHORT).show();
        }
    }

    private void commitPaletteBuffer() {
        String text = paletteBuffer.toString();
        if (text.isEmpty()) return;
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        ipcHandler.post(() -> {
            ic.commitText(text, 1);
            suggestionHandler.post(() -> {
                currentWord.setLength(0);
                debouncedUpdateSuggestions();
                updateSpaceBar();
                clearPaletteBuffer();
                dismissPaletteDialog();
            });
        });
    }

    private void dismissPaletteDialog() {
        paletteSearchActive = false;
        suggestionHandler.removeCallbacks(paletteFilterRunnable);
        paletteGridRef = null;
        paletteEmptyRef = null;
        if (paletteDialog != null) {
            paletteDialog.dismiss();
            paletteDialog = null;
        }
    }

    private void dismissAllPopups() {
        hideKeyPopup();
        dismissAccentPopup();
        dismissVariantPopup();
        dismissPaletteDialog();
        if (pendingAssignChar != null) exitAssignMode();
    }

    private void commitSuggestion(String commitText) {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;

        // Offload InputConnection work to the background IPC thread to keep the
        // UI responsive on slower devices.
        ipcHandler.post(() -> {
            String tracked = currentWord.toString();
            if (tracked.length() > 0) {
                CharSequence before = ic.getTextBeforeCursor(Math.max(64, tracked.length() + 8), 0);
                int trailLen = trailingWordLength(before);
                if (trailLen > 0 && getTrailingWordNormalized(before).equalsIgnoreCase(tracked)) {
                    ic.deleteSurroundingText(trailLen, 0);
                }
            }
            ic.commitText(commitText, 1);
            suggestionHandler.post(() -> {
                currentWord.setLength(0);
                debouncedUpdateSuggestions();
                updateSpaceBar();
            });
        });
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
        if (!hapticsEnabled || !hasVibratorCached) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && cachedHapticLight != null) {
            cachedVibrator.vibrate(cachedHapticLight);
        } else {
            cachedVibrator.vibrate(8);
        }
    }

    private void hapticMedium() {
        if (!hapticsEnabled || !hasVibratorCached) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && cachedHapticMedium != null) {
            cachedVibrator.vibrate(cachedHapticMedium);
        } else {
            cachedVibrator.vibrate(10);
        }
    }

    private void hapticHeavy() {
        if (!hapticsEnabled || !hasVibratorCached) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && cachedHapticHeavy != null) {
            cachedVibrator.vibrate(cachedHapticHeavy);
        } else {
            cachedVibrator.vibrate(15);
        }
    }

    private void playKeySound() {
        if (!soundEnabled) return;
        if (cachedAudioManager != null) {
            cachedAudioManager.playSoundEffect(AudioManager.FX_KEYPRESS_STANDARD, -1);
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

        Button puniBtn = createFallbackKey("Ω");
        puniBtn.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.4f));
        puniBtn.setTextColor(0xFFD4AF37);
        puniBtn.setOnClickListener(v -> showPalettePicker());
        bottomRow.addView(puniBtn);

        Button comma = createFallbackKey(",");
        comma.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
        attachPunctKeyListener(comma, () -> onPunct(","));
        bottomRow.addView(comma);

        Button space = createFallbackKey(" ");
        space.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 4.5f));
        space.setOnClickListener(v -> onSpace());
        bottomRow.addView(space);

        Button period = createFallbackKey(".");
        period.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
        attachPunctKeyListener(period, () -> onPunct("."));
        bottomRow.addView(period);

        Button question = createFallbackKey("?");
        question.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f));
        attachPunctKeyListener(question, () -> onPunct("?"));
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
