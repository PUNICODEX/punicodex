package com.punicodex.keyboard;

import android.content.Context;
import android.content.res.AssetManager;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class LexiconLoader {

    public static List<LexiconEntry> loadLexicon(Context context) {
        List<LexiconEntry> entries = new ArrayList<>();
        try {
            AssetManager assets = context.getAssets();
            InputStream is = assets.open("shared/lexicon.json");
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int len;
            while ((len = is.read(buffer)) != -1) {
                baos.write(buffer, 0, len);
            }
            is.close();
            String json = baos.toString(StandardCharsets.UTF_8.name());
            JSONArray array = new JSONArray(json);
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                String ascii = obj.getString("ascii");

                List<LexiconEntry.Variant> variants = new ArrayList<>();
                JSONArray varArray = obj.optJSONArray("variants");
                if (varArray != null) {
                    for (int j = 0; j < varArray.length(); j++) {
                        JSONObject v = varArray.getJSONObject(j);
                        variants.add(new LexiconEntry.Variant(
                            v.optString("unicode", ""),
                            v.optString("type", "variant"),
                            v.optString("note", "")
                        ));
                    }
                }

                entries.add(new LexiconEntry(
                    ascii,
                    obj.getString("unicode"),
                    obj.optString("greek", ""),
                    obj.optString("pantheon", ""),
                    obj.optString("tier", ""),
                    obj.optString("id", ascii),
                    variants
                ));
            }
        } catch (Exception e) {
            android.util.Log.e("PunyKeyboard", "Failed to load lexicon", e);
        }
        return entries;
    }

    public static List<PaletteEntry> loadPalette(Context context) {
        List<PaletteEntry> entries = new ArrayList<>();
        try {
            AssetManager assets = context.getAssets();
            InputStream is = assets.open("shared/keyboard-palette.json");
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int len;
            while ((len = is.read(buffer)) != -1) {
                baos.write(buffer, 0, len);
            }
            is.close();
            String json = baos.toString(StandardCharsets.UTF_8.name());
            JSONArray array = new JSONArray(json);
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                entries.add(new PaletteEntry(
                    obj.getString("char"),
                    obj.getString("name"),
                    obj.optString("category", ""),
                    obj.optString("keywords", "")
                ));
            }
        } catch (Exception e) {
            android.util.Log.e("PunyKeyboard", "Failed to load palette", e);
        }
        return entries;
    }
}
