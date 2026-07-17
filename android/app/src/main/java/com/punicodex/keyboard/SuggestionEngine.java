package com.punicodex.keyboard;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SuggestionEngine {

    public static class TrieNode {
        public final Map<Character, TrieNode> children = new HashMap<>();
        public boolean isEnd = false;
        public LexiconEntry entry = null;
    }

    private final TrieNode root;
    private final Map<String, List<PaletteEntry>> categoryIndex = new HashMap<>();
    private final List<String> categoryNames = new ArrayList<>();

    public SuggestionEngine(List<LexiconEntry> lexicon, List<PaletteEntry> palette) {
        this.root = buildTrie(lexicon);
        buildCategoryIndex(palette);
    }

    private TrieNode buildTrie(List<LexiconEntry> lexicon) {
        TrieNode r = new TrieNode();
        for (LexiconEntry entry : lexicon) {
            String ascii = entry.ascii.toLowerCase();
            TrieNode node = r;
            for (char c : ascii.toCharArray()) {
                node = node.children.computeIfAbsent(c, k -> new TrieNode());
            }
            node.isEnd = true;
            node.entry = entry;
        }
        return r;
    }

    private void buildCategoryIndex(List<PaletteEntry> palette) {
        for (PaletteEntry entry : palette) {
            String cat = entry.category.toLowerCase();
            if (cat.isEmpty()) continue;
            categoryIndex.computeIfAbsent(cat, k -> new ArrayList<>()).add(entry);
        }
        categoryNames.addAll(categoryIndex.keySet());
    }

    public LexiconEntry findExactMatch(String query) {
        TrieNode node = root;
        for (char c : query.toLowerCase().toCharArray()) {
            node = node.children.get(c);
            if (node == null) return null;
        }
        return node.isEnd ? node.entry : null;
    }

    public List<LexiconEntry> getCompletions(String prefix, int maxResults) {
        List<LexiconEntry> results = new ArrayList<>();
        TrieNode node = root;
        for (char c : prefix.toLowerCase().toCharArray()) {
            node = node.children.get(c);
            if (node == null) return results;
        }
        collectAll(node, results, maxResults);
        return results;
    }

    private void collectAll(TrieNode node, List<LexiconEntry> results, int max) {
        if (results.size() >= max) return;
        if (node.isEnd && node.entry != null) results.add(node.entry);
        for (TrieNode child : node.children.values()) {
            collectAll(child, results, max);
            if (results.size() >= max) return;
        }
    }

    public List<PaletteEntry> searchPalette(List<PaletteEntry> palette, String query) {
        List<PaletteEntry> results = new ArrayList<>();
        String q = query.toLowerCase();
        for (PaletteEntry entry : palette) {
            if (entry.keywords.toLowerCase().contains(q) ||
                entry.name.toLowerCase().contains(q)) {
                results.add(entry);
                if (results.size() >= 6) break;
            }
        }
        return results;
    }

    public List<PaletteEntry> getCategoryItems(String categoryName) {
        return categoryIndex.getOrDefault(categoryName.toLowerCase(), new ArrayList<>());
    }

    public String matchCategory(String query) {
        String q = query.toLowerCase();
        if (categoryIndex.containsKey(q)) return q;
        for (String name : categoryNames) {
            if (name.startsWith(q)) return name;
        }
        return null;
    }

    public boolean hasCategory(String name) {
        return categoryIndex.containsKey(name.toLowerCase());
    }

    /** Return all displayable forms of an entry: ASCII, primary unicode + variants, sorted by preference. */
    public List<Form> getEntryForms(LexiconEntry entry) {
        List<Form> forms = new ArrayList<>();
        forms.add(new Form(entry.ascii, entry.greek, "ascii"));
        forms.add(new Form(entry.unicode, entry.greek, "primary"));
        for (LexiconEntry.Variant v : entry.getSortedVariants()) {
            if (!v.unicode.equals(entry.unicode)) {
                forms.add(new Form(v.unicode, entry.greek, v.type));
            }
        }
        return forms;
    }

    public static class Form {
        public final String unicode;
        public final String greek;
        public final String type;
        public Form(String unicode, String greek, String type) {
            this.unicode = unicode;
            this.greek = greek;
            this.type = type;
        }
    }
}
