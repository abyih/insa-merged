/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import java.util.LinkedHashMap;
import java.util.Map;

/** Just enough JSON for one-record-per-line flat string objects. */
final class Json {
    private Json() {
    }

    static String esc(String s) {
        if (s == null) {
            return "";
        }
        StringBuilder b = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                default -> {
                    if (c < 0x20) {
                        b.append(String.format("\\u%04x", (int) c));
                    } else {
                        b.append(c);
                    }
                }
            }
        }
        return b.toString();
    }

    static String flat(Map<String, String> m) {
        StringBuilder b = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> e : m.entrySet()) {
            if (!first) {
                b.append(',');
            }
            first = false;
            b.append('"').append(esc(e.getKey())).append("\":\"").append(esc(e.getValue())).append('"');
        }
        return b.append('}').toString();
    }

    static Map<String, String> parseFlat(String line) {
        Map<String, String> out = new LinkedHashMap<>();
        int i = 0;
        int n = line.length();
        while (i < n) {
            int ks = line.indexOf('"', i);
            if (ks < 0) {
                break;
            }
            StringBuilder k = new StringBuilder();
            int p = readString(line, ks, k);
            int colon = line.indexOf(':', p);
            if (colon < 0) {
                break;
            }
            int vs = colon + 1;
            while (vs < n && line.charAt(vs) == ' ') {
                vs++;
            }
            if (vs >= n || line.charAt(vs) != '"') {
                i = vs + 1;
                continue;
            }
            StringBuilder v = new StringBuilder();
            i = readString(line, vs, v);
            out.put(k.toString(), v.toString());
        }
        return out;
    }

    /** Reads a JSON string starting at the opening quote; returns index after the closing quote. */
    private static int readString(String s, int quote, StringBuilder out) {
        int i = quote + 1;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '"') {
                return i + 1;
            }
            if (c == '\\' && i + 1 < s.length()) {
                char nx = s.charAt(i + 1);
                switch (nx) {
                    case 'n' -> out.append('\n');
                    case 'r' -> out.append('\r');
                    case 't' -> out.append('\t');
                    case 'u' -> {
                        if (i + 5 < s.length()) {
                            out.append((char) Integer.parseInt(s.substring(i + 2, i + 6), 16));
                            i += 4;
                        }
                    }
                    default -> out.append(nx);
                }
                i += 2;
                continue;
            }
            out.append(c);
            i++;
        }
        return i;
    }
}