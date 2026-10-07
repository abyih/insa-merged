/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Every confirmed anomaly is (1) kept in memory, (2) appended as one JSON line to disk so it survives
 * restarts (Section 6.4), (3) mirrored into the operational datastore for RESTCONF/dashboard, and
 * (4) pushed to the Node gateway webhook the instant it happens (Section 4.4).
 */
final class AnomalyStore {
    private static final Logger LOG = LoggerFactory.getLogger(AnomalyStore.class);

    record Entry(String id, String attackType, String severity, String source, String details,
                 String action, String reason, String state, String detectedAt) {
    }

    private final FlowManager flows;
    private final Path file = Path.of(System.getProperty("karaf.data", "data"), "linkguard", "anomalies.jsonl");
    private final URI webhook = URI.create(
        System.getProperty("linkguard.webhook", "http://localhost:5000/api/security/webhook"));
    private final HttpClient http = HttpClient.newHttpClient();
    private final Deque<Entry> recent = new ArrayDeque<>();
    private final AtomicLong seq = new AtomicLong();

    AnomalyStore(FlowManager flows) {
        this.flows = flows;
    }

    Entry record(String type, String severity, String source, String details,
                 String action, String reason, String state) {
        Entry e = new Entry("a-" + System.currentTimeMillis() + "-" + seq.incrementAndGet(),
            type, severity, source, details, action, reason, state, Instant.now().toString());
        String evicted = null;
        synchronized (recent) {
            recent.addFirst(e);
            if (recent.size() > Settings.MAX_ANOMALIES) {
                evicted = recent.removeLast().id();
            }
        }
        LOG.warn("LINK-GUARD ANOMALY [{}] {} on {} — {}", severity, type, source, details);
        flows.writeAnomaly(e);
        if (evicted != null) {
            flows.deleteAnomaly(evicted);
        }
        append(e);
        notifyWebhook(e);
        return e;
    }

    /** Re-populates memory and the datastore from disk on startup. */
    void loadFromDisk() {
        try {
            if (!Files.exists(file)) {
                return;
            }
            List<String> lines = Files.readAllLines(file);
            int start = Math.max(0, lines.size() - Settings.MAX_ANOMALIES);
            for (int i = start; i < lines.size(); i++) {
                Map<String, String> m = Json.parseFlat(lines.get(i));
                if (!m.containsKey("id")) {
                    continue;
                }
                Entry e = new Entry(m.get("id"), m.getOrDefault("attackType", "UNKNOWN"),
                    m.getOrDefault("severity", "HIGH"), m.getOrDefault("source", ""),
                    m.getOrDefault("details", ""), m.getOrDefault("action", ""),
                    m.getOrDefault("reason", ""), m.getOrDefault("state", ""),
                    m.getOrDefault("detectedAt", Instant.now().toString()));
                synchronized (recent) {
                    recent.addFirst(e);
                }
                flows.writeAnomaly(e);
            }
            LOG.info("LINK-GUARD: restored {} anomalies from {}", recent.size(), file);
        } catch (IOException | RuntimeException ex) {
            LOG.warn("LINK-GUARD: could not read persisted anomaly log {}", file, ex);
        }
    }

    void clear() {
        synchronized (recent) {
            recent.clear();
        }
        try {
            if (Files.exists(file)) {
                Files.move(file, file.resolveSibling("anomalies-" + System.currentTimeMillis() + ".bak"),
                    StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            LOG.warn("LINK-GUARD: could not archive anomaly log", ex);
        }
    }

    private void append(Entry e) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("id", e.id());
        m.put("attackType", e.attackType());
        m.put("severity", e.severity());
        m.put("source", e.source());
        m.put("details", e.details());
        m.put("action", e.action());
        m.put("reason", e.reason());
        m.put("state", e.state());
        m.put("detectedAt", e.detectedAt());
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, Json.flat(m) + "\n", StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException ex) {
            LOG.warn("LINK-GUARD: could not persist anomaly {}", e.id(), ex);
        }
    }

    private void notifyWebhook(Entry e) {
        String body = "{\"id\":\"" + Json.esc(e.id()) + "\",\"attackType\":\"" + Json.esc(e.attackType())
            + "\",\"severity\":\"" + Json.esc(e.severity()) + "\",\"source\":\"" + Json.esc(e.source())
            + "\",\"details\":\"" + Json.esc(e.details()) + "\",\"detectedAt\":\"" + Json.esc(e.detectedAt())
            + "\",\"mitigation\":{\"action\":\"" + Json.esc(e.action()) + "\",\"reason\":\""
            + Json.esc(e.reason()) + "\",\"state\":\"" + Json.esc(e.state()) + "\"}}";
        HttpRequest req = HttpRequest.newBuilder(webhook).timeout(Duration.ofSeconds(3))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        http.sendAsync(req, HttpResponse.BodyHandlers.discarding()).exceptionally(t -> {
            LOG.debug("LINK-GUARD: webhook not delivered ({})", t.toString());
            return null;
        });
    }
}