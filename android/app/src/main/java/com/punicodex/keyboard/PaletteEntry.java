package com.punicodex.keyboard;

import java.util.Locale;

public class PaletteEntry {
    public final String character;
    public final String code;
    public final String name;
    public final String category;
    public final String keywords;
    // Precomputed lowercase search forms: the palette filter runs on every
    // keystroke against thousands of entries — lowercasing long keyword
    // strings in the loop is what made search janky.
    public final String characterLower;
    public final String nameLower;
    public final String keywordsLower;

    public PaletteEntry(String character, String code, String name, String category, String keywords) {
        this.character = character;
        this.code = code;
        this.name = name;
        this.category = category;
        this.keywords = keywords;
        this.characterLower = character.toLowerCase(Locale.ROOT);
        this.nameLower = name.toLowerCase(Locale.ROOT);
        this.keywordsLower = keywords.toLowerCase(Locale.ROOT);
    }
}
