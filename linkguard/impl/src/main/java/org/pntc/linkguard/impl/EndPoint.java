/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

/** A switch port, e.g. node "openflow:1", port "2". */
record Endpoint(String node, String port) {

    /** Parses "openflow:1:2"; returns null for non-numeric ports such as LOCAL. */
    static Endpoint parse(String connectorId) {
        if (connectorId == null) {
            return null;
        }
        int idx = connectorId.lastIndexOf(':');
        if (idx <= 0 || idx == connectorId.length() - 1) {
            return null;
        }
        String port = connectorId.substring(idx + 1);
        for (int i = 0; i < port.length(); i++) {
            if (!Character.isDigit(port.charAt(i))) {
                return null;
            }
        }
        return new Endpoint(connectorId.substring(0, idx), port);
    }

    /** openflow:1:2 */
    String key() {
        return node + ":" + port;
    }

    /** openflow:1-port-2 (format the dashboard's unlock button parses). */
    String source() {
        return node + "-port-" + port;
    }

    @Override
    public String toString() {
        return key();
    }
}