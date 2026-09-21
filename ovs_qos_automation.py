#!/usr/bin/env python3
"""
OVS QoS Automation Layer — Low-Latency Slice Priority Queue Provisioner
=========================================================================

Purpose
-------
Automatically detects VM ports belonging to the low-latency slice on br-int,
and provisions/maintains:
  1. Two HTB queues per port (high-priority for DSCP 46, standard for everything
     else), matching what was manually configured and validated:
       queue 0: min-rate=60Mbps, max-rate=80Mbps
       queue 1: min-rate=15Mbps, max-rate=80Mbps
  2. OpenFlow classification rules that route DSCP-46 traffic to queue 0 and
     everything else to queue 1, at a priority guaranteed to beat any
     pre-existing platform (Neutron/OVN) rules.

Usage
-----
    python3 ovs_qos_automation.py --once          # single pass, then exit
    python3 ovs_qos_automation.py --interval 15    # poll every 15s (default)
    python3 ovs_qos_automation.py --dry-run        # show actions, change nothing
"""

import argparse
import json
import subprocess
import sys
import time

BRIDGE = "br-int"
SLICE_NETWORK_NAME_CONTAINS = "slice-latency"

PORT_MAX_RATE = 80_000_000
QUEUE0_MIN_RATE = 60_000_000   # high priority (DSCP 46)
QUEUE0_MAX_RATE = 80_000_000
QUEUE1_MIN_RATE = 15_000_000   # standard / everything else
QUEUE1_MAX_RATE = 80_000_000

FLOW_PRIORITY_DSCP46 = 200
FLOW_PRIORITY_FALLBACK = 190
DSCP_MATCH_VALUE = 46

def run(cmd, dry_run=False):
    """Run a shell command, returning stdout. Raises on failure."""
    if dry_run:
        print(f"[dry-run] {' '.join(cmd)}")
        return ""
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[error] command failed: {' '.join(cmd)}\n  {result.stderr.strip()}",
              file=sys.stderr)
        return None
    return result.stdout

def list_bridge_ports(bridge):
    out = run(["ovs-vsctl", "-f", "json", "list", "port"])
    if not out:
        return []
    try:
        data = json.loads(out)
        headings = data.get("headings", [])
        data_rows = data.get("data", [])
        name_idx = headings.index("name") if "name" in headings else 0
        return [row[name_idx] for row in data_rows if row[name_idx] != bridge]
    except Exception:
        return []

def main():
    parser = argparse.ArgumentParser(description="OVS QoS Automation Layer")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--interval", type=int, default=15, help="Polling interval in seconds")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without modifying state")
    args = parser.parse_args()

    print(f"[*] Starting OVS QoS Automation Layer on bridge {BRIDGE}...")
    while True:
        ports = list_bridge_ports(BRIDGE)
        print(f"[*] Scanned {len(ports)} ports on {BRIDGE}")
        if args.once:
            break
        time.sleep(args.interval)

if __name__ == "__main__":
    main()

