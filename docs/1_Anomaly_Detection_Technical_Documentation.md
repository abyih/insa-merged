# Anomaly Detection — Technical Documentation

## Isolation Forest (IF), Random Forest (RF), and Hybrid Method

> **Project**: INSA SDN Dashboard **Subsystem**: Anomaly Detection Engine

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)  
2. [Environment Setup](#2-environment-setup)  
3. [Datasets](#3-datasets)  
4. [Isolation Forest (IF) — Online Unsupervised Detection](#4-isolation-forest-if--online-unsupervised-detection)  
5. [Random Forest (RF) — Offline Supervised Classification](#5-random-forest-rf--offline-supervised-classification)  
6. [Multi-Class Random Forest — Advanced Attack Classification](#6-multi-class-random-forest--advanced-attack-classification)  
7. [Hybrid Method — Dual-Engine Detection](#7-hybrid-method--dual-engine-detection)  
8. [Challenges and Solutions](#8-challenges-and-solutions)  
9. [Limitations](#9-limitations)

---

## 1\. Overview & Architecture

The anomaly detection system is a **dual-engine pipeline** designed for SDN network traffic analysis with the **OpenDaylight (ODL)** controller. It comprises two fully independent detection modes and a hybrid operational mode that runs both simultaneously:

| Engine | Algorithm | Learning Type | Feature Source | Purpose |
| :---- | :---- | :---- | :---- | :---- |
| **Online IF** | Isolation Forest | Unsupervised, Online | ODL Flow Table Telemetry (5 features) | Real-time production monitoring |
| **Offline RF** | Random Forest | Supervised, Offline | Kaggle/InSDN Dataset (6 or 8 features) | Benchmark classification & multi-class attack typing |
| **Hybrid** | IF \+ RF combined | Both | Both pipelines in parallel | Comprehensive dual-perspective detection |

### Module Breakdown

The anomaly subsystem is organized into **10 modules** inside the `anomaly/` directory:

| Module | File | Responsibility |
| :---- | :---- | :---- |
| 1 | `config.py` | Global configuration (thresholds, baseline size, contamination) |
| 2 | `features.py` | Feature extraction (FlowTableExtractor for IF, PortConnectorExtractor for RF) |
| 3 | `baseline.py` | Baseline collection, drift validation, contamination handling |
| 4 | `model.py` | Isolation Forest wrapper (training \+ percentile thresholding) |
| 5 | `state_machine.py` | Per-switch detection state machine (NORMAL → SUSPICIOUS → ATTACK) |
| 6 | `coordinator.py` | Network-wide severity aggregation (NORMAL → TARGETED → ELEVATED → CRITICAL) |
| 7 | `evaluator.py` | Synthetic attack injection and metric tracking (TP/TN/FP/FN/F1) |
| 8 | `detector.py` | Main IF pipeline Flask server (port 5003\) |
| 9 | `rf_detector.py` | RF pipeline Flask server (port 5002\) |
| 10 | `mitigation.py` | ODL flow-rule based mitigation (drop rules) |

## 2\. Environment Setup

### Prerequisites

| Software | Version | Purpose |
| :---- | :---- | :---- |
| **Operating System** | Linux (Ubuntu 26.04 LTS) | Operating System |
| **Python** | ≥ 3.12 | Anomaly detection backend |
| **uv** | Latest | Python package manager (replaces pip/venv) |
| **Node.js** | ≥ 20.x (tested with v26.7.0) | Frontend & backend servers |
| **npm** | ≥ 10.x (tested with 11.19.0) | Node dependency management |
| **OpenDaylight** | 0.23.1 or compatible | SDN Controller (flow telemetry & flow control) |
| **Mininet** | 2.3.x | Network emulation |
| **Open vSwitch** | 2.17+ | Virtual switch layer |

### Step 1 — Clone the Project

```sh
git clone https://github.com/abyih/insa-merged.git
cd insa-merged
```

### Step 2 — Install Node.js Dependencies

```sh
npm install
```

### Step 3 — Install Python Dependencies (Anomaly Module)

```sh
cd anomaly
# Install UV, if not installed
curl -LsSf https://astral.sh/uv/install.sh | sh
```

&nbsp;

```sh
# Create virtual environment and install dependencies
uv sync
```

### Step 4 — Start the Detection Services

#### Option A: Start all services at once (recommended)

```sh
npm run all:services
```

#### Option B: Start individually

\# Terminal 1 — Online IF Detector (port 5003\)

```sh
npm run anomaly:if
```

\# Terminal 2 — Offline RF Detector (port 5002\)

```sh
npm run anomaly:rf
```

\# Terminal 3 — Backend (port 5000\)

```sh
npm run server
```

\# Terminal 4 — Frontend (port 5173\)

```sh
npm run dev
```

### Available npm Scripts

| Script | Command | Services Started |
| :---- | :---- | :---- |
| `npm run services` | `concurrently` | DevStack server, RF detector, IF detector, Intent service |
| `npm run services:basic` | `concurrently` | DevStack server, Intent service, RF detector |
| `npm run anomaly:if` | `cd anomaly && uv run python detector.py` | Online IF detector only (port 5003\) |
| `npm run anomaly:rf` | `cd anomaly && uv run python rf_detector.py` | Offline RF detector only (port 5002\) |
| `npm run all:services` | `concurrently` | All services \+ Vite frontend |
| `npm run dev` | `vite` | Frontend dev server only (port 5173\) |

## 3\. Datasets

### InSDN Dataset (Used for Multi-Class RF Training)

Located in `datasets/`:

| File | Size | Content |
| :---- | :---- | :---- |
| `Normal_data.csv` | \~33 MB | Benign network traffic (CICFlowMeter format) |
| `OVS.csv` | \~55 MB | Open vSwitch attack traffic |
| `metasploitable-2.csv` | \~52 MB | Metasploitable 2 attack traffic |

### SDN Dataset (Used for Binary IF/RF Training)

| File | Size | Content |
| :---- | :---- | :---- |
| `dataset_sdn.csv` | \~12 MB | Binary-labeled SDN flow data (Kaggle format, label=0/1) |

### CICFlowMeter Feature Mapping

The InSDN dataset uses 84 CICFlowMeter features. These are mapped to 8 SDN-compatible features in `train_multiclass.py`:

| CICFlowMeter Column | → SDN Feature |
| :---- | :---- |
| `Pkt Size Avg` | → `avg_pkt_size` |
| `Flow Byts/s` | → `bytes_per_sec` |
| `Flow Pkts/s` | → `packets_per_sec` |
| `Subflow Fwd Pkts` \+ `Bwd Pkts` | → `active_flow_count` |
| `Flow Duration` (μs → sec) | → `flow_duration` |
| `Fwd Pkt Len Mean` | → `avg_bytes_per_flow` |
| `TotLen Fwd` / `TotLen Bwd` | → `tx_rx_byte_ratio` |
| `Pkt Len Var` | → `packet_size_variance` |

---

## 4\. Isolation Forest (IF) — Online Unsupervised Detection

### How It Works

The IF detector operates as a **per-switch, online unsupervised anomaly detector**. It learns the "normal" traffic baseline from live OpenDaylight (ODL) flow statistics and then scores subsequent traffic samples against this learned baseline.

#### Phase 1 — Feature Extraction (`features.py` — `FlowTableExtractor`)

The `FlowTableExtractor` parses the flow table inventory response and computes 5 **delta-based** features per polling interval:

Features (5):

```
1. avg_pkt_size   = Δbytes / Δpackets
2. bytes_per_second  = Δbytes / poll_interval (15s)
3. packet_count      = Δpackets (this interval)
4. active_flow_count = current number of flows in the table
5. asymmetry         = 1.0 (constant placeholder — flow-level statistics have no tx/rx split)
```

**ODL Telemetry Ingestion Format** — Telemetry is fetched directly from the OpenDaylight (ODL) RESTCONF API (`opendaylight-inventory:nodes?content=nonconfig`). The extractor parses the standard flow inventory JSON structure to extract per-flow statistics (`packet-count`, `byte-count`, duration `second` and `nanosecond`).

The extractor maintains an internal snapshot per switch. On each poll, it computes the **delta** (difference) between the current and previous aggregate counters. The first poll for each switch is always skipped because the delta is not meaningful without a previous snapshot.

**All-Zero Stats Guard**: If OpenDaylight returns `packet-count = 0` and `byte-count = 0` while a previous snapshot exists, the extractor returns `None` (skip) rather than computing a misleading zero-delta. This prevents false feature vectors from stale or incomplete controller responses.

**Counter Reset Handling**: Counter resets (e.g., switch restart) are handled by treating `current < previous` as `current` (assuming a fresh counter from zero).

#### Phase 2 — Baseline Collection (`baseline.py`)

The baseline collects **100 feature vectors** (configurable via `CFG.baseline_samples`) during normal network operation:

1. **COLLECTING**: Accumulates samples one-by-one from each polling cycle  
2. **Drift Validation**: Once 100 samples are collected, the baseline is split into two halves (first 50, last 50). Features are normalized to zero-mean, unit-variance. The L2 norm between the two half-means is computed as a **drift metric**  
3. **State Transitions**:  
   - `drift ≤ 1.0` → **CLEAN** — Baseline is stable, proceed to training  
   - `drift > 1.0` AND `attempts < 3` → **CONTAMINATED** — Baseline is noisy, clear and restart  
   - `drift > 1.0` AND `attempts ≥ 3` → **DEGRADED** — Accept noisy baseline with higher contamination (0.15 instead of 0.10)

Baseline States:

```textproto
  COLLECTING   → Accumulating samples
  CLEAN        → Drift ≤ threshold, ready for training
  CONTAMINATED → Drift > threshold, retry (clear & restart)
  DEGRADED     → Exceeded max attempts, train anyway with contamination=0.15
```

#### Phase 3 — Model Training (`model.py`)

Once the baseline is validated, an `IsolationForest` from scikit-learn is trained:

```py
IsolationForest(
    n_estimators=100,
    contamination=0.10,  # or 0.15 for DEGRADED baselines
    random_state=42,
)
```

Thresholds are derived from the baseline scores:

- **Soft threshold**: 1st percentile of baseline IF scores  
- **Hard threshold**: 0.1th percentile of baseline IF scores

These percentile-based thresholds mean: any score below the soft threshold is considered a soft anomaly, and any score below the hard threshold is a hard anomaly.

#### Phase 4 — Online Detection & State Machine (`state_machine.py`)

Each polling cycle produces a new feature vector, which is scored by the trained IF:

&nbsp;

```py
raw_score = model.decision_function(vector)  # Higher = more normal
soft_anomaly = raw_score < soft_threshold
hard_anomaly = raw_score < hard_threshold
```

The **state machine** prevents single false-positive spikes from escalating:

State Transitions:

```textproto
  NORMAL → SUSPICIOUS       (any soft anomaly)
  NORMAL → FAST_SUSPICIOUS  (any hard anomaly)
  SUSPICIOUS → ATTACK       (10 consecutive soft anomalies)
  FAST_SUSPICIOUS → ATTACK  (3 consecutive hard anomalies)
  ATTACK → NORMAL           (4 consecutive normal polls)
  SUSPICIOUS → NORMAL       (normal poll)
  FAST_SUSPICIOUS → NORMAL  (normal poll)
```

After model training completes, the state machine enters either `TRAINED` (for `CLEAN` baselines) or `DEGRADED` (for baselines that exceeded the maximum retry attempts).

#### Phase 5 — Network Coordinator (`coordinator.py`)

The coordinator aggregates per-switch states into a network-wide severity:

| Attacking Switches | Severity |
| :---- | :---- |
| 0 | **NORMAL** |
| 1 | **TARGETED** |
| 2 to minority | **ELEVATED** |
| ≥ majority | **CRITICAL** |

#### Phase 6 — Mitigation (`mitigation.py`)

When an attack is confirmed, automated mitigation can install switch-wide drop rules in OpenDaylight:

\# Priority 3000 drop rule — blocks ALL traffic on the switch

```py
flow_body = {
    "id": "anomaly-block-openflow:1-<timestamp>",
    "table_id": 0,
    "priority": 3000,
    "cookie": 0xDEADBEEF,
    "match": {},          # empty match = all traffic
    "instructions": [{ "apply-actions": [{ "drop-action": {} }] }]
}
```

\# Installed via ODL RESTCONF PUT to:

\# http://localhost:8181/rests/data/opendaylight-inventory:nodes/node=\<switch\_id\>/

\#   flow-node-inventory:table=0/flow=\<flow\_id\>

The mitigation module communicates with ODL via its RESTCONF API using HTTP Basic Auth (`admin:admin`). Session-based rollback allows removing all installed drop rules in one operation via `rollback_session()`, which iterates over a module-level `installed_rules` list and sends DELETE requests for each rule.

### Configuration Reference (`config.py`)

All configurable parameters are centralized in a `SimpleNamespace` object:

| Parameter | Default | Description |
| :---- | :---- | :---- |
| `baseline_samples` | 100 | Number of feature vectors to collect before training |
| `poll_interval_seconds` | 15 | Seconds between polling cycles |
| `fast_attack_polls` | 3 | Consecutive hard anomalies before ATTACK state |
| `slow_attack_polls` | 10 | Consecutive soft anomalies before ATTACK state |
| `attack_recovery_polls` | 4 | Consecutive normal polls to leave ATTACK state |
| `soft_threshold_percentile` | 1.0 | 1st percentile of baseline scores for soft threshold |
| `hard_threshold_percentile` | 0.1 | 0.1th percentile of baseline scores for hard threshold |
| `variance_floor` | 1e-6 | Minimum feature variance for normalization |
| `baseline_drift_threshold` | 1.0 | Maximum L2 drift between baseline halves |
| `max_baseline_attempts` | 3 | Maximum baseline retries before DEGRADED |
| `contamination` | 0.10 | IF contamination parameter for CLEAN baselines |
| `contamination_degraded` | 0.15 | IF contamination parameter for DEGRADED baselines |
| `n_estimators` | 100 | Number of trees in the Isolation Forest |
| `random_state` | 42 | Random seed for reproducibility |
| `evaluation_mode` | False | Enable synthetic attack injection |

### API Endpoints (IF Detector — Port 5003\)

| Method | Endpoint | Description |
| :---- | :---- | :---- |
| `POST` | `/detect` | Submit raw OpenDaylight flow data for detection |
| `GET` | `/health` | Configuration and coordinator summary |
| `GET` | `/status` | Per-switch state and model info |
| `GET` | `/state` | Current detection state for all switches |
| `GET` | `/analyze` | Alias for `/state` (supports GET and POST) |
| `POST` | `/reset` | Reset one or all switch detectors (optionally reconfigure baseline samples) |
| `POST` | `/baseline/configure` | Configure baseline sample count (5–500) |
| `POST` | `/alerts/clear` | Clear alert state (stub) |
| `POST` | `/rf-scores` | RF score ingestion (stub) |
| `POST` | `/auto-block/trigger` | Auto-block trigger (stub) |
| `POST` | `/eval/start` | Start synthetic attack injection |
| `GET` | `/eval/metrics` | Get TP/TN/FP/FN and F1 metrics |
| `POST` | `/eval/reset` | Reset evaluation metrics |
| `POST` | `/mitigation/block` | Install switch-wide drop rule on ODL |
| `POST` | `/mitigation/rollback` | Remove all installed blocks |
| `GET` | `/mitigation/status` | List active block rules and count |

---

## 5\. Random Forest (RF) — Offline Supervised Classification

### How It Works

The RF detector is a strictly offline, pre-trained classifier. It loads a serialized Random Forest model from a `.pkl` file and scores incoming feature vectors against it. No online learning or baseline collection occurs.

### Internal Architecture

The RF detector (`rf_detector.py`) is structured around five internal classes:

| Class | Purpose |
| :---- | :---- |
| `DetectorState` | Thread-safe container for the loaded RF model, scaler, feature order, label mode, and class metadata |
| `AdaptiveThreshold` | Configurable zone boundary manager; maps probabilities to benign, suspicious, attack, or high\_confidence\_attack |
| `MetricsTracker` | Thread-safe counter for NORMAL, SUSPICIOUS, and ATTACK classification events |
| `RecentEvents` | Thread-safe ring buffer (`deque(maxlen=200)`) storing recent detection events for the frontend real-time feed |
| `DecisionEngine` | Final decision logic combining RF probability and zone classification into an actionable state |

### Binary RF Training (`train_classifier.py`)

```sh
cd anomaly
uv run python train_classifier.py --data ../dataset_sdn.csv
```

**Feature Engineering (6 features)**:

```py
FEATURES = [
    "avg_pkt_size",          # bytecount / (pktcount + ε)
    "total_duration_sec",    # dur + dur_nsec / 1e9
    "bytes_per_sec",         # bytecount / (total_dur + ε)
    "tx_rx_byte_asymmetry",  # |tx_bytes - rx_bytes| / (tx_bytes + rx_bytes + ε)
    "pktcount",              # raw packet count
    "tx_bytes",              # transmitted bytes
]
```

**Preprocessing Pipeline**:

- **Log1p Transform**: Applied to `avg_pkt_size`, `bytes_per_sec`, `pktcount`, `tx_bytes` (high-magnitude, right-skewed features)  
- **RobustScaler**: Fitted on benign-only training samples (resistant to outliers)  
- **Train/Test Split**: 70/30 stratified split with `random_state=42`

**Model Configuration**:

&nbsp;

```py
RandomForestClassifier(
    n_estimators=300,
    min_samples_leaf=5,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
```

**Output**: `pretrained_clf.pkl` — Contains model, scaler, feature order, and log feature list.

### RF Scoring Pipeline (`rf_detector.py`)

1. Convert input JSON to 6-element feature vector  
2. **Flood Override Check**: If `bytes_per_sec > 250,000` or `pktcount > 50,000`, bypass model and compute probability directly from traffic volume using the formula: `prob = min(0.50 + (bps / 2,000,000) + (pkt / 400,000), 0.99)`. This ensures extreme volumetric attacks receive high probabilities even if the model underestimates them.  
3. Apply `log1p` transform on designated features  
4. Scale with the pre-fitted `RobustScaler`  
5. `predict_proba()` → Extract attack class probability  
6. Map to attack zone:

| Probability | Zone |
| :---- | :---- |
| \< 0.40 | `benign` |
| 0.40–0.69 | `suspicious` |
| 0.70–0.84 | `attack` |
| ≥ 0.85 | `high_confidence_attack` |

### Adaptive Threshold Engine

The RF detector includes an adaptive threshold system that allows the UI to adjust zone boundaries at runtime via `/thresholds` endpoints. The configurable boundaries are:

| Parameter | Default | Purpose |
| :---- | :---- | :---- |
| `RF_BENIGN_MAX` | 0.40 | Upper bound for benign zone |
| `RF_SUSPICIOUS_MAX` | 0.69 | Upper bound for suspicious zone |
| `RF_ATTACK_MIN` | 0.70 | Lower bound for attack zone |
| `RF_HIGH_CONF` | 0.85 | Lower bound for high-confidence attack |
| `threshold` | 0.50 | General adaptive threshold |

### Decision Engine

The `DecisionEngine` class maps RF output to a final actionable state:

&nbsp;

```
IF attack_prob ≥ RF_HIGH_CONF (0.85) → ATTACK
IF is_attack (zone = attack/high_conf) → ATTACK
IF attack_prob ≥ RF_BENIGN_MAX (0.40) → SUSPICIOUS
ELSE → NORMAL
```

### Recent Events Ring Buffer

A `deque(maxlen=200)` stores the last 200 detection events for frontend real-time feeds. Each event includes `state`, `attack_prob`, `rf_zone`, `is_attack`, `attack_type`, `reason`, `src_ip`, `dst_ip`, `protocol`, `switch`, `pktcount`, `bytecount`, `pktrate`, and timestamps. Events are assigned monotonically increasing IDs for efficient incremental polling via the `since` parameter.

### Model Loading (`load_rf()`)

The RF detector searches for model files in this priority order:

&nbsp;

```py
PKL_PATHS = [
    "pretrained_multiclass_rf.pkl",   # 1st — Multi-class (8 features)
    "pretrained_kdd_rf.pkl",          # 2nd — KDD-retrained binary
    "pretrained_clf.pkl",             # 3rd — Legacy binary (6 features)
]
```

**Flexible PKL Bundle Extraction**: Different training scripts produce `.pkl` bundles with different internal structures. The loader first tries the `pipeline` key (for scikit-learn Pipeline objects), then falls back to the `model` key. If a scaler is present but lacks a `transform` method, it is discarded with a warning. Multi-class models additionally extract `class_names`, `label_encoder`, and `normal_index` for class-aware scoring.

### API Endpoints (RF Detector — Port 5002\)

| Method | Endpoint | Description |
| :---- | :---- | :---- |
| `POST` | `/detect` | Score a feature vector |
| `GET` | `/health` | Model status, label mode, and class names |
| `GET` | `/metrics` | Classification statistics (counts and percentages) |
| `POST` | `/metrics/label` | Label a metric (stub for future feedback loop) |
| `POST` | `/metrics/reset` | Reset classification counters |
| `GET` | `/thresholds` | Current zone boundaries |
| `POST` | `/thresholds` | Update zone boundaries at runtime |
| `GET` | `/recent` | Recent detection events (supports `?since=<id>&limit=<n>` for incremental polling) |
| `POST` | `/recent/clear` | Clear the recent events ring buffer |
| `GET` | `/stats` | Aggregated stats with threat level, protocol breakdown, and attack type breakdown |

## 6\. Multi-Class Random Forest — Advanced Attack Classification

### Training (`train_multiclass.py`)

```sh
cd anomaly
uv run python train_multiclass.py --data ../datasets/
```

This script maps 84 CICFlowMeter features from the InSDN dataset down to **8 SDN-compatible features**:

```py
FEATURES = [
    "avg_pkt_size",          # Average packet size
    "bytes_per_sec",         # Byte rate
    "packets_per_sec",       # Packet rate
    "active_flow_count",     # Number of active subflows
    "flow_duration",         # Flow duration in seconds
    "avg_bytes_per_flow",    # Average bytes per subflow
    "tx_rx_byte_ratio",      # Forward/backward byte ratio
    "packet_size_variance",  # Packet size variance
]
```

**Label Consolidation** (granular InSDN labels → broader categories):

| InSDN Label | → Consolidated |
| :---- | :---- |
| `Normal` | → `Normal` |
| `DoS` | → `DoS` |
| `DDoS` | → `DDoS` |
| `Probe` | → `Probe` |
| `BFA` | → `Brute_Force` |
| `Web-Attack` | → `Web_Attack` |
| `BOTNET` | → `Botnet` |
| `U2R` | → `Exploitation` |

**Model Configuration**:

&nbsp;

```py
RandomForestClassifier(
    n_estimators=500,        # More trees for multi-class
    min_samples_leaf=5,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
```

**Output**: `pretrained_multiclass_rf.pkl` — Contains model, scaler, LabelEncoder, class names, and training statistics.

### Multi-Class Scoring (`rf_detector.py`)

When a multi-class model is loaded, the `_score_multiclass()` function:

1. Builds a feature vector from the 8 feature names  
2. Derives missing features from raw input fields (`pktcount`, `bytecount`, `dur`, `flows`, `tx_bytes`, `rx_bytes`, `pktrate`) using the following derivation formulas:  
   - `avg_pkt_size = bytecount / pktcount` (if `pktcount > 0`)  
   - `bytes_per_sec = bytecount / dur` (if `dur > 0`, else `pktrate × avg_pkt_size`)  
   - `packets_per_sec = pktcount / dur` (if `dur > 0`, else `pktrate`)  
   - `active_flow_count = flows` (minimum 1\)  
   - `flow_duration = dur` (if `dur > 0`, else 15.0 seconds default)  
   - `avg_bytes_per_flow = bytecount / flows` (if `flows > 0`)  
   - `tx_rx_byte_ratio = tx_bytes / (rx_bytes + 1e-9)` (epsilon prevents division by zero)  
   - `packet_size_variance = passed directly` (0.0 default)  
3. Applies `log1p` \+ `RobustScaler`  
4. `predict()` → Predicted class index  
5. `predict_proba()` → Per-class probability distribution  
6. Maps back to class name using `LabelEncoder.inverse_transform()`  
7. Computes `attack_prob = 1 - P(Normal)` for backward compatibility with the binary scoring pipeline

Response includes:

&nbsp;

```json
{
  "attack_type": "DDoS",
  "attack_confidence": 0.92,
  "class_probabilities": {
    "Normal": 0.03, "DoS": 0.01, "DDoS": 0.92,
    "Probe": 0.02, "Brute_Force": 0.01, "Web_Attack": 0.01
  },
  "label_mode": "multiclass"
}
```

---

## 7\. Hybrid Method — Dual-Engine Detection

### Concept

The hybrid method runs both the IF and RF engines simultaneously on the same SDN data. This is achieved at two levels:

#### Server-Level Parallelism

Both Flask servers run as independent processes on separate ports:

- **IF Detector** on port `5003`  
- **RF Detector** on port `5002`  
- The `npm run services` command starts both with `concurrently`

#### Feature-Level Dual Extraction

Inside the IF detector's `SwitchDetector.process()` method (`detector.py`), after computing the IF features, it also **extracts RF features** from the same raw controller telemetry via the `_resp_with_rf()` helper:

&nbsp;

```py
def _resp_with_rf(self, phase, fv, raw_telemetry, **kwargs):
    result = { "phase": phase, "features": dict(zip(FLOW_TABLE_FEATURES, fv.values)) }
    # Also extract RF features via PortConnectorExtractor
    try:
        rf_fv = self.rf_extractor.extract(raw_telemetry, self.switch_id)
        if rf_fv is not None:
            rf_feature_names = ["avg_pkt_size", "total_duration_sec", "bytes_per_sec", "pktcount", "tx_bytes"]
            result["rf_features"] = dict(zip(rf_feature_names, rf_fv.values))
    except Exception:
        pass  # RF extraction failure does not block IF detection
    return result
```

This means every IF detection response also includes `rf_features`, enabling the frontend to forward these features to the RF detector for a second opinion. The RF extraction is wrapped in a try/except block to ensure that RF extraction failures do not interfere with the primary IF detection pipeline.

### PortConnectorExtractor — 8-Feature RF Pipeline (`features.py`)

The `PortConnectorExtractor` extracts 8 features from controller telemetry for the multi-class RF model:

| \# | Feature | Source | Computation |
| :---- | :---- | :---- | :---- |
| 1 | `avg_pkt_size` | Flow table deltas | Δbytes / Δpackets |
| 2 | `bytes_per_sec` | Flow table deltas | Δbytes / poll\_interval |
| 3 | `packets_per_sec` | Flow table deltas | Δpackets / poll\_interval |
| 4 | `active_flow_count` | Flow table | Current number of flows (minimum 1\) |
| 5 | `flow_duration` | Flow statistics | Average flow duration from controller flow statistics (`duration.second + duration.nanosecond / 1e9`) |
| 6 | `avg_bytes_per_flow` | Flow table deltas | Δbytes / flow\_count |
| 7 | `tx_rx_byte_ratio` | Port connector stats | `tx_bytes / (rx_bytes + 1e-9)` |
| 8 | `packet_size_variance` | Per-flow byte counts | `np.var(per_flow_bytes)` (requires ≥ 2 flows) |

**Port Connector Statistics**: Feature 7 (TX/RX ratio) is sourced from switch port statistics (node-connector / port-stats path):

&nbsp;

```json
opendaylight-inventory:node-connector[]
  └── opendaylight-port-statistics:flow-capable-node-connector-statistics
       └── bytes
            ├── transmitted
            └── received
```

The extractor aggregates TX and RX bytes across all connectors on the node and maintains its own per-switch snapshot dictionary (`_prev_stats`) independent from the `FlowTableExtractor`.

### Evaluation Framework (`evaluator.py`)

The evaluator supports **13 synthetic attack types** for systematic benchmarking of both engines:

| Attack Type | IF Behavior | RF Behavior |
| :---- | :---- | :---- |
| `VOLUMETRIC_FLOOD` | ×10 bytes\_per\_second | High attack\_prob |
| `PACKET_FLOOD` | ×8 packet\_count | High attack\_prob |
| `FLOW_EXHAUSTION` | ×5 flow\_count | Moderate attack\_prob |
| `SLOW_DRIP` | ×1.3 all metrics | Low attack\_prob |
| `SYN_FLOOD` | ×12 packets, small size | DDoS classification |
| `UDP_FLOOD` | ×15 bytes, ×10 packets | DoS classification |
| `ICMP_FLOOD` | Moderate packets, fixed size | DoS classification |
| `PORT_SCAN` | ×8 flows, low volume | Probe classification |
| `SLOWLORIS` | ×0.2 bytes, ×3 flows | Web\_Attack classification |
| `BRUTE_FORCE` | ×4 packets, small size | Brute\_Force classification |
| `WEB_ATTACK` | Normal-ish traffic, odd ratios | Web\_Attack classification |
| `BOTNET` | Periodic, low-volume | Botnet classification |
| `CONTROL_PLANE_DOS` | ×20 flow count | DoS classification |

Each attack injects **additive noise** on top of real traffic features (never replaces), maintaining scientific validity. The evaluator tracks per-switch and global TP/TN/FP/FN metrics and computes accuracy, precision, recall, F1, and detection latency.

---

## 8\. Challenges and Solutions

This section documents the key engineering challenges encountered during development and the solutions implemented to address them.

### 8.1 Feature Incompatibility Between IF and RF Engines

**Challenge**: The IF engine uses 5 delta-based flow-table features while the RF engine uses 6–8 aggregate features. These feature sets measure fundamentally different traffic properties and cannot be interchanged. Training metrics from one engine cannot be transferred to the other.

**Solution**: A dual-extractor architecture was implemented. Each engine owns its feature extraction pipeline independently — `FlowTableExtractor` for IF and `PortConnectorExtractor` for RF. Both extractors operate on the same raw controller telemetry but produce separate, engine-specific feature vectors. The hybrid mode includes both feature sets in every response, allowing the frontend to forward RF features to the RF detector for a parallel opinion.

### 8.2 Controller Returning Stale or Empty Statistics

**Challenge**: The OpenDaylight RESTCONF API (`opendaylight-inventory:nodes`) occasionally returns all-zero counters (`packet-count = 0`, `byte-count = 0`) even when the switch has active traffic. Computing deltas from these stale responses produces misleading zero-valued feature vectors that can contaminate the baseline or trigger false negatives during detection.

**Solution**: An all-zero guard was implemented in `FlowTableExtractor.extract()`. If the current poll returns `cur_packets == 0` and `cur_bytes == 0` while a previous snapshot already exists, the extractor returns `None` (skip) and preserves the previous snapshot intact. This ensures that only genuine data updates contribute to feature computation.

### 8.3 Baseline Contamination During Traffic Anomalies

**Challenge**: Collecting baseline samples during an ongoing (but undetected) attack produces a poisoned baseline. The resulting IF model treats attack traffic as "normal," severely degrading detection accuracy.

**Solution**: A drift validation mechanism splits the collected baseline into two halves (first 50 samples, last 50 samples), normalizes each feature to zero-mean and unit-variance, and computes the L2 distance between the half-means. If drift exceeds the threshold (1.0), the baseline is flagged as `CONTAMINATED`, cleared entirely, and collection restarts. After 3 failed attempts, the system enters a `DEGRADED` state and trains with a higher contamination parameter (0.15 vs. 0.10), accepting some baseline noise while still providing approximate detection capability.

### 8.4 Counter Resets on Switch Restarts

**Challenge**: When a switch restarts or its flow counters are reset, the delta computation (`current - previous`) produces negative values, which are meaningless and can cause incorrect feature vectors.

**Solution**: The `FlowTableExtractor._delta()` method detects counter resets by checking if `current < previous`. In this case, the delta is set to `current` itself (treating the counter as freshly started from zero), rather than computing a negative difference.

### 8.5 Thread Safety for Multi-Switch Concurrent Polling

**Challenge**: In production SDN environments, multiple switches send detection requests simultaneously via the Node.js backend. Without proper synchronization, concurrent access to shared state (baseline, model, extractor snapshot) causes race conditions and data corruption.

**Solution**: A per-switch `threading.Lock()` is embedded within each `SwitchDetector` instance, serializing all processing for that switch. A separate `_registry_lock` protects the global detector dictionary when new switches are registered. This design allows different switches to be processed in parallel while preventing intra-switch concurrency issues.

### 8.6 RF Model Compatibility Across Training Pipelines

**Challenge**: Different training scripts (`train_classifier.py`, `retrain_kdd_rf.py`, `train_multiclass.py`) produce `.pkl` bundles with different internal structures (some use a scikit-learn `Pipeline` object with a `pipeline` key, others use a bare model with a `model` key). Loading the wrong key crashes the detector.

**Solution**: The `load_rf()` function implements flexible model extraction. It first tries `data.get("pipeline")`, then falls back to `data.get("model")`. For multi-class models, it extracts class names from either `class_names`, `label_encoder.classes_`, or `model.classes_` in that order. The scaler is validated before use: if it lacks a `transform` method, it is discarded with a warning rather than crashing.

### 8.7 Flow-Level Statistics Lack TX/RX Byte Split

**Challenge**: OpenFlow flow-level statistics provide aggregate byte and packet counts per flow rule but do not distinguish between transmitted (TX) and received (RX) bytes. This makes it impossible to compute traffic asymmetry — a valuable feature for detecting exfiltration attacks.

**Solution**: For the IF engine, the `asymmetry` feature is set to a constant `1.0`, explicitly acknowledging that flow-table data cannot provide this information. For the RF engine, a separate `PortConnectorExtractor` was implemented that sources TX/RX byte counts from port-level statistics, which does provide transmitted and received bytes per physical port.

### 8.8 Extreme Traffic Volume Bypassing Model Predictions

**Challenge**: Under extreme volumetric attacks (`bytes_per_sec > 250,000` or `pktcount > 50,000`), the pre-trained RF model may underestimate attack probability because its training data may not include samples at such extreme magnitudes.

**Solution**: A **flood override** mechanism was implemented in the RF scoring pipeline. When traffic volume exceeds the flood thresholds, the model is bypassed entirely and the attack probability is computed directly from the traffic metrics: `prob = min(0.50 + (bps / 2,000,000) + (pkt / 400,000), 0.99)`. This ensures that obvious volumetric attacks always receive appropriately high probabilities.

---

## 9\. Limitations

> **Critical Limitation: Feature Incompatibility Between Modes**

1. **IF and RF features are NOT interchangeable.** The IF uses 5 delta-based flow-table features while the RF uses 6–8 aggregate features. They measure fundamentally different traffic properties. RF accuracy metrics cannot be transferred to IF detection performance.

2. **Baseline Delay**: The IF detector requires \~25 minutes (100 polls × 15 seconds) of clean traffic before it can begin detection. Any traffic anomaly during this period may contaminate the baseline.

3. **Baseline Sensitivity**: The drift validation uses a simple L2 norm comparison. Gradual, slow-changing traffic patterns may not trigger the contamination detector, leading to a baseline that captures an ongoing slow-drip attack as "normal."

4. **Asymmetry Feature Limitation**: The `asymmetry` feature for the IF detector is hardcoded to `1.0` because flow-level statistics do not provide per-flow tx/rx byte split. This reduces the IF's ability to detect direction-based anomalies (e.g., exfiltration).

5. **RF Model Generalization**: The RF model is trained on the InSDN/Kaggle dataset which was collected in a specific lab environment. It may not generalize well to production SDN traffic with different traffic patterns, topologies, or flow characteristics.

6. **No Real-Time RF Retraining**: The RF model is loaded from a static `.pkl` file. There is no mechanism for online fine-tuning or incremental learning to adapt to evolving attack patterns.

7. **ODL RESTCONF Schema Dependency**: The IF features are extracted directly from the OpenDaylight flow inventory schema (`opendaylight-inventory:nodes`). Changes to the ODL YANG model or RESTCONF URI structure across different controller releases require updating the extraction logic in `FlowTableExtractor`.

8. **No Encrypted Traffic Inspection**: Both models rely on flow-level statistics (packet counts, byte counts, durations). They cannot inspect payload contents, making them blind to application-layer attacks within encrypted flows.

9. **Counter Reset Vulnerability**: If a switch restarts or its counters reset during detection, the delta computation may produce misleading zero or negative values, potentially causing false negatives.

10. **Evaluation Mode Injection Bias**: The synthetic attack profiles in the evaluator use fixed multipliers (e.g., ×10, ×8). Real attacks have much more variable signatures, so evaluator metrics may overstate detection performance.

11. **Flood Override Simplicity**: The flood override formula is a simple linear combination of traffic metrics. It may produce intermediate probabilities (0.55–0.70) for traffic that falls just above the threshold but is not actually malicious.

12. **No Model Versioning**: There is no mechanism to track which training dataset or training parameters produced a given `.pkl` model. Rolling back to a previous model version requires manual file management.
