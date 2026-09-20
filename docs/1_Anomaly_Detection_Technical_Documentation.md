# Anomaly Detection — Technical Documentation
## Isolation Forest (IF), Random Forest (RF), and Hybrid Method

> **Project**: INSA SDN Dashboard
> **Subsystem**: Anomaly Detection Engine

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Environment Setup](#2-environment-setup)
3. [Datasets](#3-datasets)
4. [Isolation Forest (IF) — Online Unsupervised Detection](#4-isolation-forest-if--online-unsupervised-detection)
5. [Random Forest (RF) — Offline Supervised Classification](#5-random-forest-rf--offline-supervised-classification)
6. [Multi-Class Random Forest — Advanced Attack Classification](#6-multi-class-random-forest--advanced-attack-classification)
7. [Hybrid Method — Dual-Engine Detection](#7-hybrid-method--dual-engine-detection)
8. [Limitations](#8-limitations)

---

## 1. Overview & Architecture

The anomaly detection system is a **dual-engine pipeline** designed for SDN network traffic analysis. It comprises two fully independent detection modes and a hybrid operational mode that runs both simultaneously:

| Engine | Algorithm | Learning Type | Feature Source | Purpose |
|--------|-----------|---------------|----------------|---------|
| **Online IF** | Isolation Forest | Unsupervised, Online | ODL Flow Table Stats (5 features) | Real-time production monitoring |
| **Offline RF** | Random Forest | Supervised, Offline | Kaggle/InSDN Dataset (6 or 8 features) | Benchmark classification & multi-class attack typing |
| **Hybrid** | IF + RF combined | Both | Both pipelines in parallel | Comprehensive dual-perspective detection |

### Architectural Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SDN Controller (ODL / ONOS)                  │
│              Flow Table Stats / Port Connector Stats            │
└─────────────────┬──────────────────────┬────────────────────────┘
                  │                      │
    ┌─────────────▼──────────┐ ┌─────────▼───────────────┐
    │  Online IF (port 5003) │ │ Offline RF (port 5002)  │
    │  ──────────────────    │ │ ──────────────────────── │
    │  FlowTableExtractor    │ │ PortConnectorExtractor   │
    │  → 5 IF Features       │ │ → 6/8 RF Features        │
    │  → Baseline (100 polls)│ │ → Pretrained Model (.pkl)│
    │  → IF Model Training   │ │ → Probability Scoring    │
    │  → State Machine       │ │ → Zone Classification    │
    │  → Coordinator         │ │ → Decision Engine        │
    └────────────────────────┘ └──────────────────────────┘
                  │                      │
    ┌─────────────▼──────────────────────▼────────────────┐
    │              Frontend Dashboard (React)              │
    │         AnomalyDetector Page — Dual Mode View        │
    └─────────────────────────────────────────────────────┘
```

### Module Breakdown

The anomaly subsystem is organized into **8 numbered modules** inside the `anomaly/` directory:

| Module | File | Responsibility |
|--------|------|---------------|
| 1 | `config.py` | Global configuration (thresholds, baseline size, contamination) |
| 2 | `features.py` | Feature extraction (FlowTableExtractor for IF, PortConnectorExtractor for RF) |
| 3 | `baseline.py` | Baseline collection, drift validation, contamination handling |
| 4 | `model.py` | Isolation Forest wrapper (training + percentile thresholding) |
| 5 | `state_machine.py` | Per-switch detection state machine (NORMAL → SUSPICIOUS → ATTACK) |
| 6 | `coordinator.py` | Network-wide severity aggregation (NORMAL → TARGETED → ELEVATED → CRITICAL) |
| 7 | `evaluator.py` | Synthetic attack injection and metric tracking (TP/TN/FP/FN/F1) |
| 8 | `detector.py` | Main IF pipeline Flask server (port 5003) |
| — | `rf_detector.py` | RF pipeline Flask server (port 5002) |
| — | `mitigation.py` | ODL flow-rule based mitigation (drop rules) |

---

## 2. Environment Setup

### Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| **Python** | ≥ 3.12 | Anomaly detection backend |
| **uv** | Latest | Python package manager (replaces pip/venv) |
| **Node.js** | ≥ 20.x (tested with v26.7.0) | Frontend & backend servers |
| **npm** | ≥ 10.x (tested with 11.19.0) | Node dependency management |
| **OpenDaylight** | 0.19.x (Potassium) or compatible | SDN Controller (for IF features) |
| **ONOS** | 2.7.0+ | SDN Controller (alternative) |
| **Mininet** | 2.3.x | Network emulation |
| **Open vSwitch** | 2.17+ | Virtual switch layer |

### Step 1 — Clone the Project

```bash
git clone <repository-url> insa-merged
cd insa-merged
```

### Step 2 — Install Node.js Dependencies

```bash
npm install
```

Key Node.js dependencies (from `package.json`):
- `express` ^4.21.2 — Backend API server
- `axios` ^1.7.9 — HTTP client
- `cors` ^2.8.5 — Cross-origin resource sharing
- `concurrently` ^10.0.4 — Parallel process runner
- `react` ^18.3.1, `vite` ^6.0.1 — Frontend framework

### Step 3 — Install Python Dependencies (Anomaly Module)

```bash
cd anomaly

# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync
```

Python dependencies (from `anomaly/pyproject.toml`):

| Package | Version | Purpose |
|---------|---------|---------|
| `flask` | ≥ 3.1.3 | REST API server |
| `flask-cors` | ≥ 6.0.5 | CORS support |
| `scikit-learn` | ≥ 1.9.0 | Isolation Forest & Random Forest models |
| `numpy` | ≥ 2.5.1 | Numerical computation |
| `pandas` | ≥ 3.0.3 | Data manipulation |
| `joblib` | ≥ 1.5.3 | Model serialization (.pkl) |
| `scipy` | ≥ 1.18.0 | Statistical functions |
| `torch` | ≥ 2.0.0 | PyTorch (for intent service embeddings) |
| `sentence-transformers` | ≥ 3.0.0 | NLP intent engine (all-MiniLM-L6-v2) |
| `requests` | ≥ 2.34.2 | HTTP requests for ODL mitigation API |

### Step 4 — Start the Detection Services

```bash
# Option A: Start all services at once (recommended)
npm run services

# Option B: Start individually
# Terminal 1 — Online IF Detector (port 5003)
npm run anomaly:if

# Terminal 2 — Offline RF Detector (port 5002)
npm run anomaly:rf

# Terminal 3 — Frontend (port 5173)
npm run dev
```

---

## 3. Datasets

### InSDN Dataset (Used for Multi-Class RF Training)

Located in `datasets/`:

| File | Size | Content |
|------|------|---------|
| `Normal_data.csv` | ~33 MB | Benign network traffic (CICFlowMeter format) |
| `OVS.csv` | ~55 MB | Open vSwitch attack traffic |
| `metasploitable-2.csv` | ~52 MB | Metasploitable 2 attack traffic |

### SDN Dataset (Used for Binary IF/RF Training)

| File | Size | Content |
|------|------|---------|
| `dataset_sdn.csv` | ~12 MB | Binary-labeled SDN flow data (Kaggle format, label=0/1) |

### CICFlowMeter Feature Mapping

The InSDN dataset uses 84 CICFlowMeter features. These are mapped to 8 ODL-compatible features in `train_multiclass.py`:

| CICFlowMeter Column | → ODL Feature |
|---------------------|--------------|
| `Pkt Size Avg` | → `avg_pkt_size` |
| `Flow Byts/s` | → `bytes_per_sec` |
| `Flow Pkts/s` | → `packets_per_sec` |
| `Subflow Fwd Pkts + Bwd Pkts` | → `active_flow_count` |
| `Flow Duration` (μs → sec) | → `flow_duration` |
| `Fwd Pkt Len Mean` | → `avg_bytes_per_flow` |
| `TotLen Fwd / TotLen Bwd` | → `tx_rx_byte_ratio` |
| `Pkt Len Var` | → `packet_size_variance` |

---

## 4. Isolation Forest (IF) — Online Unsupervised Detection

### How It Works

The IF detector operates as a **per-switch, online unsupervised anomaly detector**. It learns the "normal" traffic baseline from live ODL flow statistics and then scores subsequent traffic samples against this learned baseline.

#### Phase 1 — Feature Extraction (`features.py`)

The `FlowTableExtractor` parses the raw ODL REST API inventory response and computes 5 **delta-based** features per polling interval:

```
Features (5):
  1. avg_packet_size   = Δbytes / Δpackets
  2. bytes_per_second  = Δbytes / poll_interval (15s)
  3. packet_count      = Δpackets (this interval)
  4. active_flow_count = current number of flows in the table
  5. asymmetry         = 1.0 (constant placeholder — ODL flow-level has no tx/rx split)
```

The extractor maintains an internal snapshot per switch. On each poll, it computes the **delta** (difference) between the current and previous aggregate counters. The first poll for each switch is always skipped because the delta is not meaningful without a previous snapshot.

Counter resets (e.g., switch restart) are handled by treating `current < previous` as `current` (assuming a fresh counter from zero).

#### Phase 2 — Baseline Collection (`baseline.py`)

The baseline collects **100 feature vectors** (configurable via `CFG.baseline_samples`) during normal network operation:

1. **COLLECTING**: Accumulates samples one-by-one from each polling cycle
2. **Drift Validation**: Once 100 samples are collected, the baseline is split into two halves (first 50, last 50). Features are normalized to zero-mean, unit-variance. The L2 norm between the two half-means is computed as a **drift metric**
3. **State Transitions**:
   - `drift ≤ 1.0` → **CLEAN** — Baseline is stable, proceed to training
   - `drift > 1.0` AND `attempts < 3` → **CONTAMINATED** — Baseline is noisy, clear and restart
   - `drift > 1.0` AND `attempts ≥ 3` → **DEGRADED** — Accept noisy baseline with higher contamination (0.15 instead of 0.10)

```
Baseline States:
  COLLECTING   → Accumulating samples
  CLEAN        → Drift ≤ threshold, ready for training
  CONTAMINATED → Drift > threshold, retry (clear & restart)
  DEGRADED     → Exceeded max attempts, train anyway with contamination=0.15
```

#### Phase 3 — Model Training (`model.py`)

Once the baseline is validated, an `IsolationForest` from scikit-learn is trained:

```python
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

```python
raw_score = model.decision_function(vector)  # Higher = more normal
soft_anomaly = raw_score < soft_threshold
hard_anomaly = raw_score < hard_threshold
```

The **state machine** prevents single false-positive spikes from escalating:

```
State Transitions:
  NORMAL → SUSPICIOUS       (any soft anomaly)
  NORMAL → FAST_SUSPICIOUS  (any hard anomaly)
  SUSPICIOUS → ATTACK       (10 consecutive soft anomalies)
  FAST_SUSPICIOUS → ATTACK  (3 consecutive hard anomalies)
  ATTACK → NORMAL           (4 consecutive normal polls)
  SUSPICIOUS → NORMAL       (normal poll)
  FAST_SUSPICIOUS → NORMAL  (normal poll)
```

#### Phase 5 — Network Coordinator (`coordinator.py`)

The coordinator aggregates per-switch states into a network-wide severity:

| Attacking Switches | Severity |
|-------------------|----------|
| 0 | **NORMAL** |
| 1 | **TARGETED** |
| 2 to minority | **ELEVATED** |
| ≥ majority | **CRITICAL** |

#### Phase 6 — Mitigation (`mitigation.py`)

When an attack is confirmed, automated mitigation can install **switch-wide drop rules** on ODL:

```python
# Priority 3000 drop rule — blocks ALL traffic on the switch
flow_body = {
    "priority": 3000,
    "match": {},          # empty match = all traffic
    "instructions": [{ "apply-actions": [{ "drop-action": {} }] }]
}
# Installed via ODL RESTCONF PUT
```

Session-based rollback allows removing all installed drop rules in one operation.

### Training the IF Model (Offline, Optional)

```bash
cd anomaly
uv run python train_if.py --data ../dataset_sdn.csv
```

This produces:
- `pretrained_if.pkl` — Serialized IF model with thresholds
- `if_score_distribution.png` — Score distribution visualization

### API Endpoints (IF Detector — Port 5003)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/detect` | Submit raw ODL data for detection |
| `GET` | `/health` | Configuration and coordinator summary |
| `GET` | `/status` | Per-switch state and model info |
| `GET` | `/state` | Current detection state for all switches |
| `POST` | `/reset` | Reset one or all switch detectors |
| `POST` | `/baseline/configure` | Configure baseline sample count (5–500) |
| `POST` | `/eval/start` | Start synthetic attack injection |
| `GET` | `/eval/metrics` | Get TP/TN/FP/FN and F1 metrics |
| `POST` | `/mitigation/block` | Install switch-wide drop rule |
| `POST` | `/mitigation/rollback` | Remove all installed blocks |

---

## 5. Random Forest (RF) — Offline Supervised Classification

### How It Works

The RF detector is a **strictly offline, pre-trained classifier**. It loads a serialized Random Forest model from a `.pkl` file and scores incoming feature vectors against it. No online learning or baseline collection occurs.

#### Binary RF Training (`train_classifier.py`)

```bash
cd anomaly
uv run python train_classifier.py --data ../dataset_sdn.csv
```

**Feature Engineering (6 features)**:

```python
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
1. **Log1p Transform**: Applied to `avg_pkt_size`, `bytes_per_sec`, `pktcount`, `tx_bytes` (high-magnitude, right-skewed features)
2. **RobustScaler**: Fitted on **benign-only** training samples (resistant to outliers)
3. **Train/Test Split**: 70/30 stratified split with `random_state=42`

**Model Configuration**:
```python
RandomForestClassifier(
    n_estimators=300,
    min_samples_leaf=5,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
```

**Output**: `pretrained_clf.pkl` — Contains model, scaler, feature order, and log feature list.

#### RF Scoring Pipeline (`rf_detector.py`)

1. Convert input JSON to 6-element feature vector
2. **Flood Override Check**: If `bytes_per_sec > 250,000` or `pktcount > 50,000`, bypass model and compute probability directly from traffic volume
3. Apply `log1p` transform on designated features
4. Scale with the pre-fitted `RobustScaler`
5. `predict_proba()` → Extract attack class probability
6. Map to **attack zone**:

| Probability | Zone |
|------------|------|
| `< 0.40` | **benign** |
| `0.40–0.69` | **suspicious** |
| `0.70–0.84` | **attack** |
| `≥ 0.85` | **high_confidence_attack** |

#### Adaptive Threshold Engine

The RF detector includes a simple adaptive threshold system that allows the UI to adjust zone boundaries at runtime via `/thresholds` endpoints.

#### Recent Events Ring Buffer

A `deque(maxlen=200)` stores the last 200 detection events for frontend real-time feeds. Each event includes `state`, `attack_prob`, `rf_zone`, `src_ip`, `dst_ip`, `protocol`, and timestamps.

### API Endpoints (RF Detector — Port 5002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/detect` | Score a feature vector |
| `GET` | `/health` | Model status and label mode |
| `GET` | `/metrics` | Classification statistics |
| `GET` | `/thresholds` | Current zone boundaries |
| `POST` | `/thresholds` | Update zone boundaries |
| `GET` | `/recent` | Recent detection events (polling-friendly) |
| `GET` | `/stats` | Aggregated stats with threat level |

---

## 6. Multi-Class Random Forest — Advanced Attack Classification

### Training (`train_multiclass.py`)

```bash
cd anomaly
uv run python train_multiclass.py --data ../datasets/
```

This script maps 84 CICFlowMeter features from the InSDN dataset down to **8 ODL-compatible features**:

```python
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
|-------------|---------------|
| Normal | → Normal |
| DoS | → DoS |
| DDoS | → DDoS |
| Probe | → Probe |
| BFA | → Brute_Force |
| Web-Attack | → Web_Attack |
| BOTNET | → Botnet |
| U2R | → Exploitation |

**Model Configuration**:
```python
RandomForestClassifier(
    n_estimators=500,    # More trees for multi-class
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
2. Derives missing features from raw input fields (`pktcount`, `bytecount`, `dur`, etc.)
3. Applies log1p + RobustScaler
4. `predict()` → Predicted class index
5. `predict_proba()` → Per-class probability distribution
6. Maps back to class name using `LabelEncoder.inverse_transform()`
7. Computes `attack_prob = 1 - P(Normal)` for backward compatibility

Response includes:
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

### Model Loading Priority

The RF detector searches for model files in this order:

```python
PKL_PATHS = [
    "pretrained_multiclass_rf.pkl",   # 1st — Multi-class (8 features)
    "pretrained_kdd_rf.pkl",          # 2nd — KDD-retrained binary
    "pretrained_clf.pkl",             # 3rd — Legacy binary (6 features)
]
```

---

## 7. Hybrid Method — Dual-Engine Detection

### Concept

The hybrid method runs **both the IF and RF engines simultaneously** on the same SDN data. This is achieved at two levels:

#### Server-Level Parallelism

Both Flask servers run as independent processes on separate ports:
- IF Detector on port 5003
- RF Detector on port 5002

The `npm run services` command starts both with `concurrently`:

```json
"services": "concurrently ... \"cd anomaly && uv run python rf_detector.py\" \"cd anomaly && uv run python detector.py\" ..."
```

#### Feature-Level Dual Extraction

Inside the IF detector's `SwitchDetector.process()` method (`detector.py`), after computing the IF features, it also **extracts RF features** from the same raw ODL data:

```python
def _resp_with_rf(self, phase, fv, raw_odl, **kwargs):
    result = { "phase": phase, "features": dict(zip(FLOW_TABLE_FEATURES, fv.values)) }
    # Also extract RF features
    rf_fv = self.rf_extractor.extract(raw_odl, self.switch_id)
    if rf_fv is not None:
        rf_feature_names = ["avg_pkt_size", "total_duration_sec", "bytes_per_sec", "pktcount", "tx_bytes"]
        result["rf_features"] = dict(zip(rf_feature_names, rf_fv.values))
    return result
```

This means every IF detection response also includes `rf_features`, enabling the frontend to forward these features to the RF detector for a second opinion.

#### Evaluation Framework (`evaluator.py`)

The evaluator supports **13 synthetic attack types** for systematic benchmarking of both engines:

| Attack Type | IF Behavior | RF Behavior |
|-------------|-------------|-------------|
| `VOLUMETRIC_FLOOD` | ×10 bytes_per_second | High attack_prob |
| `PACKET_FLOOD` | ×8 packet_count | High attack_prob |
| `FLOW_EXHAUSTION` | ×5 flow_count | Moderate attack_prob |
| `SLOW_DRIP` | ×1.3 all metrics | Low attack_prob |
| `SYN_FLOOD` | ×12 packets, small size | DDoS classification |
| `UDP_FLOOD` | ×15 bytes, ×10 packets | DoS classification |
| `PORT_SCAN` | ×8 flows, low volume | Probe classification |
| `SLOWLORIS` | ×0.2 bytes, ×3 flows | Web_Attack classification |
| `BRUTE_FORCE` | ×4 packets, small size | Brute_Force classification |
| `CONTROL_PLANE_DOS` | ×20 flow count | DoS classification |

Each attack injects **additive noise** on top of real traffic features (never replaces), maintaining scientific validity.

---

## 8. Limitations

> **Critical Limitation: Feature Incompatibility Between Modes**

1. **IF and RF features are NOT interchangeable.** The IF uses 5 delta-based flow-table features while the RF uses 6–8 aggregate features. They measure fundamentally different traffic properties. You cannot transfer RF accuracy metrics to IF detection performance.

2. **Baseline Delay**: The IF detector requires ~25 minutes (100 polls × 15 seconds) of clean traffic before it can begin detection. Any traffic anomaly during this period may contaminate the baseline.

3. **Baseline Sensitivity**: The drift validation uses a simple L2 norm comparison. Gradual, slow-changing traffic patterns may not trigger the contamination detector, leading to a baseline that captures an ongoing slow-drip attack as "normal."

4. **Asymmetry Feature Limitation**: The `asymmetry` feature for the IF detector is hardcoded to `1.0` because ODL flow-level statistics do not provide per-flow tx/rx byte split. This reduces the IF's ability to detect direction-based anomalies (e.g., exfiltration).

5. **RF Model Generalization**: The RF model is trained on the InSDN/Kaggle dataset which was collected in a specific lab environment. It may not generalize well to production SDN traffic with different traffic patterns, topologies, or flow characteristics.

6. **No Real-Time RF Retraining**: The RF model is loaded from a static `.pkl` file. There is no mechanism for online fine-tuning or incremental learning to adapt to evolving attack patterns.

7. **Single-Controller Feature Source**: The IF features are extracted specifically from the ODL `flow-node-inventory` REST API format. Using a different controller (e.g., ONOS) requires a different feature extraction path (handled separately via `PortConnectorExtractor`).

8. **No Encrypted Traffic Inspection**: Both models rely on flow-level statistics (packet counts, byte counts, durations). They cannot inspect payload contents, making them blind to application-layer attacks within encrypted flows.

9. **Counter Reset Vulnerability**: If a switch restarts or its counters reset during detection, the delta computation may produce misleading zero or negative values, potentially causing false negatives.

10. **Evaluation Mode Injection Bias**: The synthetic attack profiles in the evaluator use fixed multipliers (e.g., ×10, ×8). Real attacks have much more variable signatures, so evaluator metrics may overstate detection performance.
