package com.punicodex.keyboard;

import java.util.ArrayList;
import java.util.List;

public class LexiconEntry {
    public final String ascii;
    public final String unicode;
    public final String greek;
    public final String pantheon;
    public final String tier;
    public final String id;
    public final List<Variant> variants;

    public static class Variant {
        public final String unicode;
        public final String type;
        public final String note;

        public Variant(String unicode, String type, String note) {
            this.unicode = unicode;
            this.type = type;
            this.note = note;
        }
    }

    public LexiconEntry(String ascii, String unicode, String greek, String pantheon, String tier, String id, List<Variant> variants) {
        this.ascii = ascii;
        this.unicode = unicode;
        this.greek = greek;
        this.pantheon = pantheon;
        this.tier = tier;
        this.id = id;
        this.variants = variants != null ? variants : new ArrayList<>();
    }

    /**
     * Returns variants sorted by philological preference:
     * ideal → alt-stress → macron-only → ascii
     * The primary unicode is inserted at the top if not already in variants.
     */
    public List<Variant> getSortedVariants() {
        List<Variant> result = new ArrayList<>();
        // Priority order
        String[] typeOrder = {"ideal", "alt-stress", "macron-only", "ascii"};

        // Check if primary unicode is already a variant
        boolean primaryIncluded = false;
        for (Variant v : variants) {
            if (v.unicode.equals(unicode)) {
                primaryIncluded = true;
                break;
            }
        }

        // Add primary unicode as a virtual variant if not explicitly listed
        if (!primaryIncluded) {
            result.add(new Variant(unicode, "primary", ""));
        }

        // Add explicit variants in priority order
        for (String type : typeOrder) {
            for (Variant v : variants) {
                if (type.equals(v.type)) {
                    result.add(v);
                }
            }
        }

        // Add any remaining variants not in the priority list
        for (Variant v : variants) {
            boolean alreadyAdded = false;
            for (Variant r : result) {
                if (r.unicode.equals(v.unicode)) {
                    alreadyAdded = true;
                    break;
                }
            }
            if (!alreadyAdded) {
                result.add(v);
            }
        }

        return result;
    }
}
