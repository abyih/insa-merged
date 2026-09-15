"""
Local OVS Queue & Slice Automation Layer (for Mininet on WSL)
------------------------------------------------------------------
Everything runs in the same Linux environment as your switches, so no
SSH / remote registry is needed. This just watches `ovs-vsctl list-br`
for new bridges and configures queues + slice flows the moment they
appear.

Requirements:
    pip install pyyaml
    (ovs-vsctl / ovs-ofctl must be on PATH — comes with openvswitch-switch)

Run (needs root, since ovs-vsctl talks to a root-owned socket):
    sudo python3 automation_layer_local.py --config slices.yaml
"""

import argparse
import hashlib
import json
import logging
import subprocess
import time
from dataclasses import dataclass, field

import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("automation-layer")


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass
class Slice:
    name: str
    queue_id: int
    min_rate: int
    match: dict


@dataclass
class Config:
    default_max_rate: int
    slices: list
    apply_to_ports: str
    switch_overrides: dict = field(default_factory=dict)


def load_config(path: str) -> Config:
    with open(path) as f:
        raw = yaml.safe_load(f)
    slices = [Slice(**s) for s in raw["slices"]]
    overrides = {o["switch_id"]: o for o in (raw.get("switch_overrides") or [])}
    return Config(
        default_max_rate=raw["default_max_rate"],
        slices=slices,
        apply_to_ports=raw.get("apply_to_ports", "*"),
        switch_overrides=overrides,
    )


# ---------------------------------------------------------------------------
# Local command runner
# ---------------------------------------------------------------------------

def run(cmd: str) -> str:
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{result.stderr.strip()}")
    return result.stdout.strip()


# ---------------------------------------------------------------------------
# Bridge watcher — the "detection" mechanism, purely local now
# ---------------------------------------------------------------------------

class BridgeWatcher:
    """
    Continuous reconciliation, not one-shot configuration. Every cycle we
    look at *every* currently-existing bridge and hand it to the
    reconciler — whether it's brand new, been around for a while, or just
    came back after losing its OVSDB rows / flow table (vswitchd restart,
    `mn -c` + rebuild, bridge recreated after a migration, etc). This is
    what makes queue + flow config survive restarts: we don't rely on
    "detected once" ever meaning "configured forever."
    """

    def __init__(self, reconcile_bridge):
        self.seen_before = set()      # only used for nicer "new switch" logging
        self.reconcile_bridge = reconcile_bridge

    def _current_bridges(self):
        out = run("ovs-vsctl list-br")
        return {b for b in out.splitlines() if b}

    def poll_loop(self, interval=2):
        while True:
            try:
                current = self._current_bridges()
                for bridge in current:
                    if bridge not in self.seen_before:
                        log.info("New switch/bridge detected: %s", bridge)
                    self.reconcile_bridge(bridge)
                self.seen_before = current
            except RuntimeError as e:
                log.warning("Poll failed: %s", e)
            time.sleep(interval)


# ---------------------------------------------------------------------------
# Queue + slice-flow configurator — same logic, but local exec instead of SSH
# ---------------------------------------------------------------------------

class QueueConfigurator:
    def __init__(self, cfg: Config):
        self.cfg = cfg

    def _desired_hash(self, max_rate: int) -> str:
        """
        Fingerprint of 'what this port's queue config should look like'.
        Stored on the QoS row itself (external-ids), so on the next
        reconcile pass we can tell 'already correct' apart from
        'missing' or 'stale' without re-creating anything unnecessarily.
        """
        payload = {
            "max_rate": max_rate,
            "slices": [(s.queue_id, s.min_rate) for s in self.cfg.slices],
        }
        return hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:12]

    def reconcile_bridge(self, bridge: str):
        override = self.cfg.switch_overrides.get(bridge, {})
        max_rate = override.get("max_rate", self.cfg.default_max_rate)
        port_filter = override.get("apply_to_ports", self.cfg.apply_to_ports)

        ports = run(f"ovs-vsctl list-ports {bridge}").splitlines()
        target_ports = [p for p in ports if p and (port_filter == "*" or p.startswith(port_filter))]

        if not target_ports:
            log.debug("%s has no ports yet — will retry on next poll", bridge)
            return

        for port in target_ports:
            self._reconcile_queues(port, max_rate)
            # add-flow is inherently idempotent (same match+table = replace,
            # not duplicate), so re-running this every cycle is safe and is
            # exactly what makes flows survive a vswitchd flow-table wipe.
            self._apply_slice_flows(bridge, port)

    def _current_qos_hash(self, port: str) -> str | None:
        qos_uuid = run(f"ovs-vsctl --if-exists get port {port} qos").strip('"')
        if not qos_uuid or qos_uuid == "[]":
            return None
        raw = run(f"ovs-vsctl --if-exists get qos {qos_uuid} external-ids:automation-hash")
        return raw.strip('"') or None

    def _reconcile_queues(self, port, max_rate):
        desired = self._desired_hash(max_rate)
        current = self._current_qos_hash(port)

        if current == desired:
            log.debug("Port %s already at desired queue config — skipping", port)
            return

        if current is None:
            log.info("Port %s has no queue config (lost or never applied) — applying", port)
        else:
            log.info("Port %s queue config is stale (%s -> %s) — reapplying", port, current, desired)

        # Detach any old QoS first so we don't leak orphaned rows every cycle.
        run(f"ovs-vsctl --if-exists clear port {port} qos")

        cmds = []
        queue_refs = []
        for s in self.cfg.slices:
            cmds.append(
                f"--id=@q{s.queue_id} create queue "
                f"other-config:min-rate={s.min_rate} "
                f"other-config:max-rate={max_rate} -- "
            )
            queue_refs.append((s.queue_id, f"@q{s.queue_id}"))

        queue_map = ",".join(f"{qid}={ref}" for qid, ref in queue_refs)
        full_cmd = (
            "ovs-vsctl -- " + "".join(cmds) +
            f"--id=@qos create qos type=linux-htb "
            f"other-config:max-rate={max_rate} "
            f"external-ids:automation-hash={desired} "
            f"queues={queue_map} -- "
            f"set port {port} qos=@qos"
        )
        run(full_cmd)
        log.info("Applied queue config to port %s (hash=%s)", port, desired)

    def _apply_slice_flows(self, bridge, port):
        for s in self.cfg.slices:
            if s.match.get("type") != "vlan":
                continue
            vlan_id = s.match["vlan_id"]
            flow = f"dl_vlan={vlan_id},in_port={port},actions=set_queue:{s.queue_id},normal"
            run(f"ovs-ofctl add-flow {bridge} '{flow}'")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--interval", type=float, default=2.0)
    args = parser.parse_args()

    cfg = load_config(args.config)
    configurator = QueueConfigurator(cfg)
    watcher = BridgeWatcher(reconcile_bridge=configurator.reconcile_bridge)
    watcher.poll_loop(interval=args.interval)


if __name__ == "__main__":
    main()
