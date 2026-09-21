#!/usr/bin/env python3
"""
Local OVS Queue & Slice Automation Layer (for Mininet on Linux/WSL)
------------------------------------------------------------------
Continuously reconciles OVS bridges and provisions QoS queues according to slices.yaml.
"""

import argparse
import json
import logging
import subprocess
import time
from dataclasses import dataclass, field
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("automation-layer")

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

def load_config(path: str) -> Config:
    with open(path) as f:
        raw = yaml.safe_load(f)
    slices = [Slice(**s) for s in raw["slices"]]
    return Config(
        default_max_rate=raw.get("default_max_rate", 100_000_000),
        slices=slices,
        apply_to_ports=raw.get("apply_to_ports", "*"),
    )

def run(cmd: str) -> str:
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{result.stderr.strip()}")
    return result.stdout.strip()

def main():
    parser = argparse.ArgumentParser(description="Local OVS Slice Automation")
    parser.add_argument("--config", default="slices.yaml", help="Path to slices.yaml")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
        log.info(f"Loaded config with {len(cfg.slices)} slices")
        bridges = run("ovs-vsctl list-br").splitlines()
        log.info(f"Detected bridges: {bridges}")
    except Exception as e:
        log.warning(f"Note: {e}")

if __name__ == "__main__":
    main()
