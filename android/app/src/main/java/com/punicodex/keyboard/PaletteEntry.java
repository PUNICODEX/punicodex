package com.punicodex.keyboard;

public class PaletteEntry {
    public final String character;
    public final String code;
    public final String name;
    public final String category;
    public final String keywords;

    public PaletteEntry(String character, String code, String name, String category, String keywords) {
        this.character = character;
        this.code = code;
        this.name = name;
        this.category = category;
        this.keywords = keywords;
    }
}
