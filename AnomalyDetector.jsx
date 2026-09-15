// import { useState, useEffect, useRef, useCallback, useMemo } from "react";
// import { getNodes } from "../../api/api-controller";

// const SERVER_URLS = {
//   ONLINE:  "http://localhost:5001",
//   OFFLINE: "http://localhost:5002",
// };

// const POLL_MS = 15_000;
// const AUTO_BLOCK_RF_THRESHOLD = 0.98;

// // Online IF Features (from ODL flow tables)
// const IF_FEATURES = [
//   { key: "avg_packet_size",   abbr: "APS", label: "Avg Packet Size", unit: "bytes" },
//   { key: "bytes_per_second",  abbr: "B/S", label: "Bytes / Second",  unit: "bytes" },
//   { key: "packet_count",      abbr: "PKT", label: "Packet Count",    unit: "pkts"  },
//   { key: "active_flow_count", abbr: "AFL", label: "Active Flows",    unit: "flows" },
//   { key: "asymmetry",         abbr: "ASY", label: "Asymmetry",       unit: ""      },
// ];

// // Offline RF Features (automatically extracted from ODL)
// const RF_FEATURES = [
//   { key: "avg_pkt_size",         abbr: "APS", label: "Avg Packet Size",  unit: "bytes" },
//   { key: "total_duration_sec",   abbr: "DUR", label: "Flow Duration",    unit: "sec"   },
//   { key: "bytes_per_sec",        abbr: "B/S", label: "Bytes / Second",   unit: "B/s"   },
//   { key: "tx_rx_byte_asymmetry", abbr: "ASY", label: "TX/RX Asymmetry",  unit: "0-1"   },
//   { key: "pktcount",             abbr: "PKT", label: "Packet Count",     unit: "pkts"  },
//   { key: "tx_bytes",             abbr: "TXB", label: "TX Bytes",         unit: "bytes" },
// ];

// function fmt(v) {
//   if (v == null) return "—";
//   return typeof v === "number" ? parseFloat(v.toFixed(3)).toLocaleString() : String(v);
// }

// export default function AnomalyDetector() {
//   const [mode,         setMode]         = useState("ONLINE");
//   const [results,      setResults]      = useState({});      // IF results: { switch_id: data }
//   const [rfResults,    setRfResults]    = useState({});      // RF results: { switch_id: data }
//   const [lastFeatures, setLastFeatures] = useState(null);    // IF features
//   const [log,          setLog]          = useState([]);
//   const [connected,    setConnected]    = useState({ ONLINE: null, OFFLINE: null });
//   const [running,      setRunning]      = useState(false);
//   const [lastPollTime, setLastPollTime] = useState(null);
//   const intervalRef = useRef(null);
//   const prevFlowStatsRef = useRef({})
//   const [blockMode, setBlockMode] = useState("surgical")

//   // ── Health checks ───────────────────────────────────────────────────────────
//   const checkHealth = useCallback(async () => {
//     const check = async (key, url) => {
//       try { 
//         const res = await fetch(`${url}/health`);
//         if (res.ok) {
//           setConnected(prev => ({ ...prev, [key]: true }));
//         } else {
//           console.log(`[Health] ${key} server returned ${res.status}`);
//           setConnected(prev => ({ ...prev, [key]: false }));
//         }
//       } catch (err) { 
//         console.log(`[Health] ${key} server error:`, err.message);
//         setConnected(prev => ({ ...prev, [key]: false })); 
//       }
//     };
    
//     check("ONLINE", SERVER_URLS.ONLINE);
//     check("OFFLINE", SERVER_URLS.OFFLINE);
//   }, []);

//   useEffect(() => { checkHealth(); }, [checkHealth]);

//   useEffect(() => {
//     if ("Notification" in window && Notification.permission === "default") {
//       Notification.requestPermission();
//     }
//   }, []);

//   // ── Extract RF features from ODL ────────────────────────────────────────────
//   const extractRFFeatures = useCallback((rawOdl, switchId) => {
//     const nodes = rawOdl?.["opendaylight-inventory:nodes"]?.node ?? []
//     const node  = nodes.find(n => n.id === switchId)
//     if (!node) return null

//     let totalDeltaPkt = 0, totalDeltaBytes = 0, totalDeltaTime = 0, flowCount = 0
//     const now = Date.now() / 1000

//     for (const table of node["flow-node-inventory:table"] ?? []) {
//       for (const flow of table["flow"] ?? []) {
//         const s   = flow["opendaylight-flow-statistics:flow-statistics"] ?? {}
//         const pkt = parseInt(s["packet-count"] ?? s["packetCount"] ?? 0)
//         const byt = parseInt(s["byte-count"]   ?? s["byteCount"]   ?? 0)
//         const flowId = flow["id"]

//         if (pkt === 0 && byt === 0) continue

//         const flowKey = switchId + ":" + flowId
//         const prev = prevFlowStatsRef.current[flowKey]

//         // Always update with current values
//         prevFlowStatsRef.current[flowKey] = { packets: pkt, bytes: byt, ts: now }

//         if (prev === undefined) continue  // first poll, no delta yet

//         const deltaPkt   = Math.max(0, pkt  - prev.packets)
//         const deltaBytes = Math.max(0, byt - prev.bytes)
//         const deltaTime  = Math.max(1, now  - prev.ts)

//         if (deltaPkt === 0 && deltaBytes === 0) continue  // no new traffic

//         totalDeltaPkt   += deltaPkt
//         totalDeltaBytes += deltaBytes
//         totalDeltaTime  += deltaTime
//         flowCount       += 1
//       }
//     }

//     if (flowCount === 0) return null

//     const avgDeltaTime = totalDeltaTime / flowCount

//     return {
//       src:                  switchId,
//       avg_pkt_size:         totalDeltaPkt > 0 ? totalDeltaBytes / totalDeltaPkt : 0,
//       total_duration_sec:   avgDeltaTime,
//       bytes_per_sec:        totalDeltaBytes / avgDeltaTime,
//       tx_rx_byte_asymmetry: 1.0,
//       pktcount:             totalDeltaPkt,
//       tx_bytes:             totalDeltaBytes,
//     }
//   }, [])

//   // ── Online IF state polling (backend-driven) ────────────────────────────────────────
//   const fetchState = useCallback(async () => {
//     try {
//       const res  = await fetch(`${SERVER_URLS.ONLINE}/state`)
//       if (!res.ok) { setConnected(p => ({ ...p, ONLINE: false })); return }
//       const data = await res.json()
//       setConnected(p => ({ ...p, ONLINE: true }))

//       const alerts = data.alerts ?? []
//       if (alerts.length > 0) {
//           alerts.forEach(a => {
//               new Notification("DDoS Attack Detected", {
//                   body: `${a.switch_id} — RF confidence ${(a.rf_prob*100).toFixed(0)}%`,
//                   requireInteraction: true,
//               })
//           })

//           fetch(`${SERVER_URLS.ONLINE}/alerts/clear`, {
//               method:  "POST",
//               headers: { "Content-Type": "application/json" },
//               body:    JSON.stringify({ ids: alerts.map(a => a.id) }),
//           })
//       }

//       const backendResults = data.results ?? {}
//       setResults(backendResults)

//       // Set feature display from worst IF result (ignore SKIP phase)
//       const allEntries = Object.values(backendResults).filter(r => r.phase !== "SKIP")

//       const worstEntry = allEntries
//         .filter(r => r.features)
//         .reduce((a, b) => {
//           if (!a) return b;
//           const a_sev = a.state === "ATTACK" ? 3 : a.state === "SUSPICIOUS" ? 2 : a.state === "NORMAL" ? 1 : 0;
//           const b_sev = b.state === "ATTACK" ? 3 : b.state === "SUSPICIOUS" ? 2 : b.state === "NORMAL" ? 1 : 0;
//           return b_sev > a_sev ? b : a;
//         }, null)

//       if (worstEntry?.features) {
//         setLastFeatures(worstEntry.features)
//       }

//       // Update log with new entries (ignore SKIP phase)
//       const entries = Object.values(backendResults)
//         .filter(r => r.phase !== "SKIP")
//         .map(r => ({
//           switch_id: r.switch_id,
//           state:     r.state,
//           phase:     r.phase,
//           raw_score: r.raw_score,
//           soft_anomaly:   r.soft_anomaly,
//           hard_anomaly:   r.hard_anomaly,
//           percentile:     r.percentile,
//           network_severity: r.network_severity,
//           // Only include RF fields in HYBRID mode
//           ...(mode === "HYBRID" ? {
//             rf_score: r.rf_score,
//             rf_zone:  r.rf_zone,
//             rf_state: r.rf_state,
//           } : {}),
//           _ts:   new Date().toLocaleTimeString(),
//           _mode: mode === "HYBRID" ? "HYBRID" : "ONLINE",
//         }))
//       if (entries.length > 0) {
//         setLog(prev => [...entries, ...prev].slice(0, 50))
//       }

//       // Sync auto-blocks that happened in the backend
//       const autoBlocks = data.auto_blocks ?? {}
//       const newAutoBlocked = Object.entries(autoBlocks)
//         .filter(([, blocked]) => blocked)
//         .map(([sid]) => sid)
      
//       setAutoBlockedSwitches(new Set(newAutoBlocked))  // ← always update, no condition

//       if (newAutoBlocked.length > 0) {
//         setBlockedSwitches(prev => new Set([...prev, ...newAutoBlocked]))
//       }

//     } catch {
//       setConnected(p => ({ ...p, ONLINE: false }))
//     }
//   }, [])


//   // ── Offline RF polling ──────────────────────────────────────────────────────
//   const sendOffline = useCallback(async () => {
//     console.log("[sendOffline] fired")
//     let rawOdl
//     try { 
//       rawOdl = await getNodes() 
//     } catch (err) { 
//       console.error("sendOffline error - getNodes failed:", err)
//       setConnected(p => ({ ...p, OFFLINE: false }))
//       return 
//     }

//     const nodes   = rawOdl?.["opendaylight-inventory:nodes"]?.node ?? []
//     const ids     = nodes
//       .map(n => n.id)
//       .filter(id => id && !id.startsWith("host:") && !id.includes(":LOCAL") && !/openflow:\d+:\d+$/.test(id))
//     console.log("[sendOffline] targets:", ids)
//     const targets = ids.length > 0 ? ids : ["global"]

//     let atLeastOneSuccess = false
//     const rfResultsLocal = {}   // accumulate results to post to backend

//     for (const sid of targets) {
//       const features = extractRFFeatures(rawOdl, sid)
//       console.log("[sendOffline] features for", sid, ":", features)
//       if (!features) {
//         // No active flows with traffic, set to NORMAL
//         const normalData = {
//           src: sid,
//           state: "NORMAL",
//           reason: "No active flows with traffic",
//           attack_prob: 0,
//           rf_zone: "NORMAL"
//         }
//         rfResultsLocal[sid] = normalData
//         setRfResults(prev => ({
//           ...prev,
//           [sid]: normalData
//         }))
//         setLog(prev => [{
//           ...normalData,
//           _ts:   new Date().toLocaleTimeString(),
//           _mode: "OFFLINE"
//         }, ...prev.slice(0, 49)])
//         continue
//       }

//       try {
//         const res  = await fetch(`${SERVER_URLS.OFFLINE}/detect`, {
//           method:  "POST",
//           headers: { "Content-Type": "application/json" },
//           body:    JSON.stringify(features),
//         })
        
//         if (!res.ok) {
//           console.error(`sendOffline error - HTTP ${res.status} for ${sid}`)
//           continue
//         }
        
//         const data = await res.json()

//         // Accumulate locally for backend posting
//         rfResultsLocal[data.src] = data
        
//         // Store results with worst-case aggregation (same pattern as IF)
//         setRfResults(prev => {
//           const next = { ...prev, [data.src]: data }
          
//           // Find worst result for display
//           const allVals = Object.values(next)
//           const worst = allVals.reduce((worst, current) => {
//             const worstSeverity = worst?.state === "ATTACK" ? 3 : 
//                                  worst?.state === "SUSPICIOUS" ? 2 : 
//                                  worst?.state === "NORMAL" ? 1 : 0
//             const currSeverity = current?.state === "ATTACK" ? 3 : 
//                                 current?.state === "SUSPICIOUS" ? 2 : 
//                                 current?.state === "NORMAL" ? 1 : 0
//             return currSeverity > worstSeverity ? current : worst
//           }, allVals[0])
          
//           setLastFeatures(worst?.features ?? null)
//           return next
//         })
        
//         setLog(prev => [{
//           ...data,
//           _ts:   new Date().toLocaleTimeString(),
//           _mode: "OFFLINE"
//         }, ...prev.slice(0, 49)])
        
//         atLeastOneSuccess = true
//       } catch (err) {
//         console.error(`sendOffline error - fetch failed for ${sid}:`, err)
//       }
//     }
    
//     // Update connection status
//     setConnected(p => ({ ...p, OFFLINE: atLeastOneSuccess || targets.length === 0 }))

//     // Post RF scores to IF backend for auto-block decisions
//     // Fire-and-forget — works even when admin is on a different page
//     const rfScorePayload = {}
//     for (const [sid, data] of Object.entries(rfResultsLocal)) {
//       rfScorePayload[sid] = {
//         attack_prob: data.attack_prob ?? 0,
//         rf_zone:     data.rf_zone ?? "benign",
//         state:       data.state ?? "NORMAL",
//       }
//     }
//     if (Object.keys(rfScorePayload).length > 0) {
//       fetch(`${SERVER_URLS.ONLINE}/rf-scores`, {
//         method:  "POST",
//         headers: { "Content-Type": "application/json" },
//         body:    JSON.stringify(rfScorePayload),
//       }).catch(() => {})   // fire and forget — non-blocking
//     }
//   }, [extractRFFeatures])



//   // ── Mode-specific detect dispatcher ─────────────────────────────────────────
//   const sendDetect = useCallback(async () => {
//     try {
//       if (mode === "ONLINE")  return await fetchState()
//       if (mode === "OFFLINE") return await sendOffline()
//       if (mode === "HYBRID")  {
//         await fetchState()
//         await sendOffline()
//       }
//     } catch (err) {
//       console.error("sendDetect error:", err)
//     } finally {
//       setLastPollTime(Date.now())
//     }
//   }, [mode, fetchState, sendOffline])

//   // ── Polling control ─────────────────────────────────────────────────────────
//   const startPolling = useCallback(() => {
//     if (intervalRef.current) return
//     setRunning(true)
//     fetchState()     // immediate state refresh
//     sendOffline()    // immediate RF poll
//     intervalRef.current = setInterval(() => {
//       fetchState()
//       sendOffline()
//     }, POLL_MS)
//   }, [fetchState, sendOffline])

//   const stopPolling = useCallback(() => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current)
//       intervalRef.current = null
//     }
//     setRunning(false)
//   }, [])

//   const handleRefresh = useCallback(async () => {
//     await fetchState()
//     if (mode === "OFFLINE" || mode === "HYBRID") {
//       await sendOffline()
//     }
//   }, [fetchState, sendOffline, mode])

//   // Cleanup on unmount
//   useEffect(() => () => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current)
//     }
//   }, [])

//   // Auto-start state refresh for Online mode — backend already detecting
//   useEffect(() => {
//     if (mode !== "ONLINE") return

//     fetchState()
//     intervalRef.current = setInterval(fetchState, POLL_MS)
//     setRunning(true)

//     return () => {
//       clearInterval(intervalRef.current)
//       intervalRef.current = null
//       setRunning(false)
//     }
//   }, [mode, fetchState])

//   // Stop polling when switching modes
//   const switchMode = (newMode) => {
//     setMode(newMode)
//     setLog([])  // Always clear log on mode switch
//     // Clear appropriate results
//     if (newMode === "ONLINE") {
//       setRfResults({})
//       prevFlowStatsRef.current = {}  // Clear flow stats when switching away from OFFLINE
//     } else if (newMode === "OFFLINE") {
//       setResults({})
//       setLastFeatures(null)
//       prevFlowStatsRef.current = {}  // Start fresh with OFFLINE mode
//     } else if (newMode === "HYBRID") {
//       prevFlowStatsRef.current = {}  // Clear for HYBRID as well
//     }
//   }

//   // ── Reset ───────────────────────────────────────────────────────────────────
//   const handleReset = async () => {
//     stopPolling()
    
//     // Reset appropriate server
//     try {
//       if (mode === "ONLINE") {
//         await fetch(`${SERVER_URLS.ONLINE}/reset`, { 
//           method: "POST", 
//           headers: { "Content-Type": "application/json" }, 
//           body: "{}" 
//         })
//       } else if (mode === "OFFLINE") {
//         await fetch(`${SERVER_URLS.OFFLINE}/reset`, { 
//           method: "POST", 
//           headers: { "Content-Type": "application/json" }, 
//           body: "{}" 
//         })
//       }
//     } catch { /* ignore */ }
    
//     // Clear UI state
//     if (mode === "ONLINE") {
//       setResults({})
//       setLastFeatures(null)
//     } else {
//       setRfResults({})
//     }
//     setLog([])
//     prevFlowStatsRef.current = {}
//     checkHealth()
    
//     // Clear mitigation state on reset
//     setBlockedSwitches(new Set())
//     setMitigationLog([])
//   }



//   // ── Derived state ───────────────────────────────────────────────────────────
//   const allIFResults = Object.values(results)
//   const worstIFResult = allIFResults.length > 0
//     ? allIFResults.reduce((worst, current) => {
//         const worstSeverity = worst?.state === "ATTACK" ? 3 : 
//                              worst?.state === "SUSPICIOUS" ? 2 : 
//                              worst?.state === "NORMAL" ? 1 : 0
//         const currSeverity = current?.state === "ATTACK" ? 3 : 
//                             current?.state === "SUSPICIOUS" ? 2 : 
//                             current?.state === "NORMAL" ? 1 : 0
//         return currSeverity > worstSeverity ? current : worst
//       })
//     : null

//   const allRFResults = Object.values(rfResults)
//   const worstRFResult = allRFResults.length > 0
//     ? allRFResults.reduce((worst, current) => {
//         const worstSeverity = worst?.state === "ATTACK" ? 3 : 
//                              worst?.state === "SUSPICIOUS" ? 2 : 
//                              worst?.state === "NORMAL" ? 1 : 0
//         const currSeverity = current?.state === "ATTACK" ? 3 : 
//                             current?.state === "SUSPICIOUS" ? 2 : 
//                             current?.state === "NORMAL" ? 1 : 0
//         return currSeverity > worstSeverity ? current : worst
//       })
//     : null

//   // ── Attack detection calculations ───────────────────────────────────────────
//   const isIFAttack = allIFResults.some(r => r.state === "ATTACK")
//   const isIFSuspicious = allIFResults.some(r => r.state === "SUSPICIOUS") && !isIFAttack
//   const isRFAttack = allRFResults.some(r => r.state === "ATTACK")
//   const isRFSuspicious = allRFResults.some(r => r.state === "SUSPICIOUS") && !isRFAttack
  
//   const isAttack = mode === "ONLINE" ? isIFAttack : 
//                    mode === "OFFLINE" ? isRFAttack : 
//                    (isIFAttack || isRFAttack)
//   const isSuspicious = mode === "ONLINE" ? isIFSuspicious :
//                        mode === "OFFLINE" ? isRFSuspicious : false

//   // ── Mitigation logic ─────────────────────────────────────────────────────────
//   const canBlock = useMemo(() => {
//     const ifPhase   = worstIFResult?.phase ?? null
//     const ifState   = worstIFResult?.state ?? null
    
//     const ifInDetection = ifPhase === "DETECTION"
//     const ifInBaseline  = ifPhase === "BASELINE" ||
//                           ifPhase === "TRAINED"   ||
//                           ifPhase === "SKIP"      ||
//                           ifPhase === null         // IF not started yet
    
//     const ifAttack   = allIFResults.some(r => r.state === "ATTACK")
//     const rfAttack   = allRFResults.some(r => r.state === "ATTACK")
//     const rfHighConf = allRFResults.some(r => (r.attack_prob ?? 0) >= 0.85)

//     // Condition 1: IF in detection + ATTACK, AND RF in ATTACK
//     if (ifInDetection && ifAttack && rfAttack) return true

//     // Condition 2: RF high confidence regardless of IF state
//     if (rfHighConf) return true

//     // Condition 3: IF not in detection (baseline/trained/null) AND RF ATTACK
//     if (!ifInDetection && rfAttack) return true

//     return false
//   }, [worstIFResult, allIFResults, allRFResults])

//   // ── Mitigation state ────────────────────────────────────────────────────────
//   const [blockedSwitches, setBlockedSwitches] = useState(new Set())
//   const [mitigationLog,   setMitigationLog]   = useState([])
//   const [rollbackLoading, setRollbackLoading] = useState(false)
//   const [autoBlockedSwitches, setAutoBlockedSwitches] = useState(new Set())
//   const [autoBlockLog, setAutoBlockLog] = useState([])

//   // ── Auto-Block logic ────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (mode !== "HYBRID") return;

//     const ifAttacks = allIFResults.filter(r => r.state === "ATTACK").map(r => r.switch_id);
//     const rfAttacks = allRFResults.filter(r => r.state === "ATTACK" && r.attack_prob >= AUTO_BLOCK_RF_THRESHOLD);
    
//     // Find switches that satisfy BOTH conditions
//     const rfAttackMap = new Map(rfAttacks.map(r => [r.src, r]));
    
//     for (const sid of ifAttacks) {
//       if (rfAttackMap.has(sid) && !blockedSwitches.has(sid) && !autoBlockedSwitches.has(sid)) {
//         // Trigger Auto-Block!
//         console.log(`[AutoBlock] Triggering for ${sid}`);
        
//         // Dispatch window event for Sidebar
//         window.dispatchEvent(new CustomEvent("autoblock", { detail: { switch_id: sid } }));
        
//         // Show browser notification
//         if (Notification.permission === "granted") {
//           new Notification("SDN Auto-Block Triggered", {
//             body: `Switch ${sid} was automatically blocked due to confirmed attack.`,
//           });
//         }
        
//         // Trigger backend API
//         fetch(`${SERVER_URLS.ONLINE}/auto-block/trigger`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ switch_id: sid })
//         }).then(res => res.json()).then(data => {
//           if (data.status === "auto_blocked" || data.status === "already_blocked") {
//             setAutoBlockedSwitches(prev => new Set([...prev, sid]));
//             setBlockedSwitches(prev => new Set([...prev, sid]));
//             setAutoBlockLog(prev => [{
//               ts: new Date().toLocaleTimeString(),
//               switch_id: sid,
//               prob: rfAttackMap.get(sid).attack_prob
//             }, ...prev]);
//           }
//         }).catch(err => console.error("AutoBlock failed:", err));
//       }
//     }
//   }, [allIFResults, allRFResults, mode, blockedSwitches, autoBlockedSwitches]);

//   // ── Mitigation functions ────────────────────────────────────────────────────
//   const handleBlock = useCallback(async () => {
//     // Find worst attacking switch
//     const worstIF = Object.values(results ?? {})
//         .filter(r => r.state === "ATTACK")
//         .sort((a, b) => (a.raw_score ?? 0) - (b.raw_score ?? 0))[0]

//     const worstRF = Object.values(rfResults ?? {})
//         .filter(r => r.state === "ATTACK")
//         .sort((a, b) => (b.attack_prob ?? 0) - (a.attack_prob ?? 0))[0]

//     const targetSwitch = worstIF?.switch_id ?? worstRF?.src
//     if (!targetSwitch) return
//     if (blockedSwitches.has(targetSwitch)) return

//     try {
//         let res

//         if (blockMode === "surgical") {
//             // Get attacking host from backend state
//             const attackingHost = worstIF?.attacking_host

//             if (!attackingHost) {
//                 // No host identified — fall back to switch-wide
//                 console.warn("[BLOCK] No attacking host identified — falling back to switch-wide")
//                 res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block`, {
//                     method:  "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body:    JSON.stringify({
//                         switch_id: targetSwitch,
//                         block_type: "switch_wide",
//                     }),
//                 })
//             } else {
//                 res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block-host`, {
//                     method:  "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body:    JSON.stringify({
//                         switch_id: targetSwitch,
//                         src_ip:    attackingHost.ip,
//                         src_mac:   attackingHost.mac,
//                     }),
//                 })
//             }
//         } else {
//             // Switch-wide block
//             res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block`, {
//                 method:  "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body:    JSON.stringify({
//                     switch_id:  targetSwitch,
//                     block_type: "switch_wide",
//                 }),
//             })
//         }

//         const data = await res.json()

//         if (data.success) {
//             setBlockedSwitches(prev => new Set([...prev, targetSwitch]))
//             setMitigationLog(prev => [{
//                 ts:         new Date().toLocaleTimeString(),
//                 action:     "BLOCKED",
//                 switch_id:  targetSwitch,
//                 flow_id:    data.flow_id,
//                 block_type: data.action ?? blockMode,
//                 src_ip:     data.src_ip ?? null,
//             }, ...prev])
//         }

//     } catch (err) {
//         console.error("[BLOCK] Failed:", err)
//     }
//   }, [results, rfResults, blockedSwitches, blockMode, worstIFResult])

//   const handleRollback = useCallback(async () => {
//     setRollbackLoading(true)
//     try {
//       const res  = await fetch(`${SERVER_URLS.ONLINE}/mitigation/rollback`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: "{}",
//       })
//       const data = await res.json()

//       const failed = data.results ? data.results.filter(r => !r.success).map(r => r.switch_id) : []
//       const succeeded = data.results ? data.results.filter(r => r.success).map(r => r.switch_id) : []

//       setBlockedSwitches(new Set(failed))  // only failed ones stay "blocked"

//       setMitigationLog(prev => [{
//         ts:               new Date().toLocaleTimeString(),
//         action:           failed.length > 0 ? "ROLLBACK_PARTIAL" : "ROLLBACK",
//         cleaned:          succeeded,
//         failed:           failed,
//         results:          data.results,
//       }, ...prev])

//     } catch (err) {
//       console.error("Rollback failed", err)
//     } finally {
//       setRollbackLoading(false)
//     }
//   }, [])

//   const isBaseline = allIFResults.length > 0 && allIFResults.every(r => r.phase === "BASELINE")
//   const bCollected = worstIFResult?.collected || 0
//   const bTotal = bCollected + (worstIFResult?.remaining || 100)
//   const bPct = Math.min(100, (bCollected / bTotal) * 100)

//   const onlineConn = connected.ONLINE
//   const offlineConn = connected.OFFLINE
  
//   const activeConn = mode === "ONLINE" ? onlineConn :
//                      mode === "OFFLINE" ? offlineConn :
//                      mode === "HYBRID" ? (onlineConn || offlineConn) : false

//   // Get features for display
//   const features    = (mode === "OFFLINE" || mode === "HYBRID") ? RF_FEATURES : IF_FEATURES
//   // For ONLINE: read features directly from worstIFResult (always fresh, no stale state)
//   const featureData = mode === "OFFLINE" ? worstRFResult?.features
//                     : mode === "HYBRID"  ? (worstRFResult?.features ?? worstIFResult?.features)
//                     : worstIFResult?.features  // ONLINE — IF features only

//   return (
//     <div className="p-6 max-w-5xl mx-auto space-y-5">

//       {/* top bar */}
//       <div className="flex items-center justify-between flex-wrap gap-3">
//         <div className="flex items-center gap-2">
//           <h1 className="text-xl font-bold text-gray-800">Anomaly Detector</h1>
          
//           {/* mode toggle */}
//           <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-3">
//             <button onClick={() => switchMode("ONLINE")}
//               className={`px-3 py-1 text-xs font-semibold transition-colors ${
//                 mode === "ONLINE" ? "bg-indigo-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
//               }`}>
//               Online
//             </button>
//             <button onClick={() => switchMode("OFFLINE")}
//               className={`px-3 py-1 text-xs font-semibold transition-colors ${
//                 mode === "OFFLINE" ? "bg-emerald-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
//               }`}>
//               Offline
//             </button>
//             <button onClick={() => switchMode("HYBRID")}
//               className={`px-3 py-1 text-xs font-semibold transition-colors ${
//                 mode === "HYBRID" ? "bg-purple-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
//               }`}>
//               Hybrid
//             </button>
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
//             activeConn === null ? "bg-gray-200 text-gray-500" :
//             activeConn ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
//           }`}>
//             {activeConn === null ? "Checking…" : activeConn ? "Online" : "Offline"}
//           </span>
//           {lastPollTime && (
//             <span className="text-xs text-gray-500">
//               Last poll: {new Date(lastPollTime).toLocaleTimeString()}
//             </span>
//           )}

//           {/* Start/Stop — only shown in Offline and Hybrid */}
//           {mode !== "ONLINE" && (
//             <button
//               onClick={running ? stopPolling : startPolling}
//               disabled={activeConn === false}
//               className={`px-4 py-1.5 rounded-lg text-sm font-semibold text-white ${
//                 running
//                   ? "bg-red-500 hover:bg-red-600"
//                   : "bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40"
//               }`}>
//               {running ? "Stop" : "Start Polling"}
//             </button>
//           )}

//           {/* Refresh (Online) or Send Once (Offline/Hybrid) */}
//           <button
//             onClick={handleRefresh}
//             disabled={activeConn === false}
//             className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gray-200 hover:bg-gray-300 disabled:opacity-40">
//             {mode === "ONLINE" ? "Refresh" : "Send Once"}
//           </button>

//           <button onClick={handleReset}
//             className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-yellow-100 hover:bg-yellow-200 text-yellow-800">
//             Reset
//           </button>
//         </div>
//       </div>

//       {/* mode description */}
//       <div className={`text-xs px-4 py-2 rounded-lg font-medium ${
//         mode === "ONLINE" ? "bg-indigo-50 text-indigo-700" : 
//         mode === "OFFLINE" ? "bg-emerald-50 text-emerald-700" :
//         "bg-purple-50 text-purple-700"
//       }`}>
//         {mode === "ONLINE" ? (
//           <>
//             <span className="font-semibold">Online Isolation Forest (Live SDN Detection):</span> Unsupervised online learning using real-time ODL flow table statistics with baseline collection, adaptive thresholds, and state machine.
//           </>
//         ) : mode === "OFFLINE" ? (
//           <>
//             <span className="font-semibold">Offline Random Forest (Automated RF Detection):</span> Polls live ODL flow records every 15 seconds — scores aggregated per-switch features against the pretrained RF model.
//           </>
//         ) : (
//           <>
//             <span className="font-semibold">Hybrid Mode:</span> Runs both Online IF and Offline RF detection simultaneously.
//           </>
//         )}
//       </div>

//       {/* status card */}
//       <div className={`rounded-xl border-2 p-5 transition-colors ${
//         isAttack ? "bg-red-50 border-red-400" : 
//         isSuspicious ? "bg-yellow-50 border-yellow-400" : 
//         "bg-green-50 border-green-300"
//       }`}>
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg font-bold ${
//               isAttack ? "bg-red-500" : 
//               isSuspicious ? "bg-yellow-500" : 
//               "bg-green-500"
//             }`}>
//               {isAttack ? "✕" : isSuspicious ? "⚠" : "✓"}
//             </div>
//             <div>
//               <p className={`text-lg font-bold leading-tight ${
//                 isAttack ? "text-red-700" : 
//                 isSuspicious ? "text-yellow-700" : 
//                 "text-green-700"
//               }`}>
//                 {mode === "ONLINE" ? "SDN Traffic" : mode === "OFFLINE" ? "RF Classification" : "Hybrid Detection"} 
//                 {isAttack ? " Attack Detected" : isSuspicious ? " Suspicious" : " Normal"}
//               </p>
//               <p className="text-xs text-gray-400">
//                 {mode === "ONLINE" && worstIFResult
//                   ? `${worstIFResult.phase} — Switch: ${worstIFResult.switch_id}`
//                   : mode === "OFFLINE" && worstRFResult
//                   ? `DETECTION — Src: ${worstRFResult.src}`
//                   : mode === "HYBRID" && (worstIFResult || worstRFResult)
//                   ? `HYBRID — ${worstIFResult ? "IF active" : ""}${worstIFResult && worstRFResult ? " + " : ""}${worstRFResult ? "RF active" : ""}`
//                   : "Waiting for detection…"}
//               </p>
//             </div>
//           </div>
//           <span className={`text-xs font-bold px-4 py-1 rounded-full border ${
//             isAttack ? "bg-red-100 text-red-700 border-red-300" : 
//             isSuspicious ? "bg-yellow-100 text-yellow-700 border-yellow-300" : 
//             "bg-green-100 text-green-700 border-green-300"
//           }`}>
//             {isAttack ? "ATTACK" : isSuspicious ? "SUSPICIOUS" : "NORMAL"}
//           </span>
//         </div>

//         {/* Online IF detail */}
//         {mode === "ONLINE" && worstIFResult?.phase === "DETECTION" && (
//           <div className="mt-4 border-t pt-3 space-y-0.5">
//             <p className="text-xs text-indigo-600 font-semibold">Isolation Forest Model</p>
//             <div className="flex items-center gap-2">
//               <span className={`w-2.5 h-2.5 rounded-full ${isIFAttack ? "bg-red-500" : "bg-green-500"}`} />
//               <span className={`text-sm font-semibold ${isIFAttack ? "text-red-700" : "text-green-700"}`}>
//                 {isIFAttack ? "Anomaly" : "Benign"}
//               </span>
//               <span className="text-xs text-gray-400 ml-1">
//                 attack prob: {worstIFResult?.percentile != null ? (100 - worstIFResult.percentile).toFixed(1) : "—"}%
//               </span>
//             </div>
//             <p className="text-xs text-gray-400 pl-4">
//               IF score: {worstIFResult?.raw_score?.toFixed(3) ?? "—"} — {worstIFResult?.state}
//             </p>
//             {/* Attacking host — only shown when backend identifies a source */}
//             {worstIFResult?.attacking_host && (
//               <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
//                 <p className="text-xs font-semibold text-red-700">
//                   ⚠ Suspected source: {worstIFResult.attacking_host.ip}
//                 </p>
//                 <p className="text-xs text-red-500">
//                   MAC: {worstIFResult.attacking_host.mac} — Port: {worstIFResult.attacking_host.port}
//                 </p>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Offline RF detail */}
//         {mode === "OFFLINE" && worstRFResult && (
//           <div className="mt-4 border-t pt-3 space-y-0.5">
//             <p className="text-xs text-emerald-600 font-semibold">Random Forest Model</p>
//             <div className="flex items-center gap-2">
//               <span className={`w-2.5 h-2.5 rounded-full ${isRFAttack ? "bg-red-500" : isRFSuspicious ? "bg-yellow-500" : "bg-green-500"}`} />
//               <span className={`text-sm font-semibold ${isRFAttack ? "text-red-700" : isRFSuspicious ? "text-yellow-700" : "text-green-700"}`}>
//                 {worstRFResult.state}
//               </span>
//               <span className="text-xs text-gray-400 ml-1">
//                 attack prob: {worstRFResult.attack_prob != null ? (worstRFResult.attack_prob * 100).toFixed(1) : "—"}%
//               </span>
//             </div>
//             <p className="text-xs text-gray-400 pl-4">
//               zone: {worstRFResult.rf_zone ?? "—"} — {worstRFResult.reason}
//             </p>
//           </div>
//         )}

//         {/* Baseline progress (ONLINE only) */}
//         {mode === "ONLINE" && isBaseline && (
//           <div className="mt-4 border-t pt-3">
//             <p className="text-xs text-blue-600 font-semibold mb-1">
//               Collecting baseline… {bCollected} / {bTotal} samples
//             </p>
//             <div className="w-full bg-blue-100 rounded-full h-2">
//               <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${bPct}%` }} />
//             </div>
//           </div>
//         )}

//         {/* Block button section */}
//         {/* Block button section */}
//         {(isAttack || blockedSwitches.size > 0 || autoBlockedSwitches.size > 0) && (
//           <div className="mt-4 border-t pt-3 flex items-center gap-3">
//             {isAttack && blockedSwitches.size === 0 && autoBlockedSwitches.size === 0 && (
//                 <div className="flex items-center gap-3 flex-wrap">
//                     {/* Block mode dropdown */}
//                     <select
//                         value={blockMode}
//                         onChange={e => setBlockMode(e.target.value)}
//                         className="text-sm border border-gray-300 rounded-lg px-3 py-1.5
//                                    bg-white text-gray-700 focus:outline-none
//                                    focus:ring-2 focus:ring-red-300 cursor-pointer">
//                         <option value="surgical">
//                             Surgical — block attacking host only
//                         </option>
//                         <option value="switch_wide">
//                             Switch-wide — block all traffic on switch
//                         </option>
//                     </select>

//                     {/* Block button */}
//                     <button
//                         onClick={handleBlock}
//                         disabled={!canBlock}
//                         className="px-4 py-1.5 rounded-lg text-sm font-bold text-white
//                                    bg-red-600 hover:bg-red-700 disabled:opacity-40
//                                    transition-colors">
//                         Block Attacking Switch
//                     </button>

//                     {/* Show target info */}
//                     {canBlock && (
//                         <span className="text-xs text-gray-500">
//                             Target: {
//                                 Object.values(results ?? {})
//                                     .find(r => r.state === "ATTACK")?.switch_id
//                                 ?? "—"
//                             }
//                             {blockMode === "surgical" && worstIFResult?.attacking_host && (
//                                 <span className="ml-2 text-red-500 font-semibold">
//                                     → {worstIFResult.attacking_host.ip}
//                                 </span>
//                             )}
//                         </span>
//                     )}
//                 </div>
//             )}

//             {(blockedSwitches.size > 0 || autoBlockedSwitches.size > 0) && (
//               <button
//                 onClick={handleRollback}
//                 disabled={rollbackLoading}
//                 className="px-4 py-2 rounded-lg text-sm font-bold
//                            bg-gray-700 hover:bg-gray-800 text-white
//                            disabled:opacity-40 transition-colors"
//               >
//                 {rollbackLoading ? "Rolling back…" : "Rollback All Blocks"}
//               </button>
//             )}

//             {(blockedSwitches.size > 0 || autoBlockedSwitches.size > 0) && (
//               <span className="text-xs text-red-600 font-semibold">
//                 {Math.max(blockedSwitches.size, autoBlockedSwitches.size)} switch{Math.max(blockedSwitches.size, autoBlockedSwitches.size) > 1 ? "es" : ""} blocked
//               </span>
//             )}

//             {!canBlock && autoBlockedSwitches.size === 0 && blockedSwitches.size === 0 && (
//               <span className="text-xs text-gray-400">
//                 Requires RF attack detection or high confidence (≥85%)
//               </span>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Feature cards - mode specific */}
//       {featureData && (
//         <div className="grid grid-cols-5 gap-3">
//           {features.map(({ key, abbr, label, unit }) => (
//             <div key={key} className={`bg-white border rounded-xl p-4 shadow-sm ${
//               (mode === "OFFLINE" || mode === "HYBRID") ? "border-emerald-100" : "border-gray-200"
//             }`}>
//               <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
//                 (mode === "OFFLINE" || mode === "HYBRID") ? "text-emerald-500" : "text-gray-400"
//               }`}>{abbr}</p>
//               <p className="text-xl font-bold text-gray-800">{fmt(featureData[key])}</p>
//               <p className="text-xs text-gray-500 mt-1">{label}</p>
//               {unit && <p className="text-xs text-gray-400">{unit}</p>}
//             </div>
//           ))}
//         </div>
//       )}

//       {/* event log */}
//       {log.length > 0 && (
//         <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
//           <div className="flex items-center justify-between px-5 py-3 border-b">
//             <p className="font-semibold text-sm text-gray-700">Event Log</p>
//             <button onClick={() => setLog([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
//           </div>
//           <div className="overflow-x-auto max-h-72 overflow-y-auto">
//             <table className="min-w-full text-xs">
//               <thead className="bg-gray-50 sticky top-0">
//                 <tr>
//                   {["Time", "Mode", "Switch / Src", "State", "Score / Prob", "Phase / Zone"].map(h => (
//                     <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {log.map((e, i) => (
//                   <tr key={i} className={`border-t ${e.state === "ATTACK" ? "bg-red-50" : ""}`}>
//                     <td className="px-3 py-2 text-gray-400 font-mono">{e._ts}</td>
//                     <td className="px-3 py-2">
//                       <span className={`px-2 py-0.5 rounded-full text-white text-xs font-semibold ${
//                         e._mode === "ONLINE" ? "bg-indigo-500" : "bg-emerald-500"
//                       }`}>
//                         {e._mode === "ONLINE" ? "IF" : "RF"}
//                       </span>
//                     </td>
//                     <td className="px-3 py-2 font-mono">{e.switch_id ?? e.src ?? "—"}</td>
//                     <td className="px-3 py-2">
//                       <span className={`px-2 py-0.5 rounded-full text-white text-xs font-semibold ${
//                         e.state === "ATTACK"      ? "bg-red-500"    :
//                         e.state === "SUSPICIOUS"  ? "bg-yellow-500" :
//                         e.state === "NORMAL"      ? "bg-green-500"  :
//                         e.phase  === "BASELINE"   ? "bg-blue-400"   : "bg-gray-400"
//                       }`}>
//                         {e.state || e.phase || "—"}
//                       </span>
//                     </td>
//                     <td className="px-3 py-2 font-mono">
//                       {e._mode === "OFFLINE"
//                         ? (e.attack_prob != null ? (e.attack_prob * 100).toFixed(1) + "%" : "—")
//                         : e._mode === "HYBRID" && e.rf_score != null
//                             ? `IF:${e.raw_score?.toFixed(3)} RF:${(e.rf_score * 100).toFixed(1)}%`
//                             : (e.raw_score?.toFixed(4) ?? "—")}
//                     </td>
//                     <td className="px-3 py-2 text-gray-500">
//                       {e._mode === "OFFLINE" ? (e.rf_zone ?? "—") : (e.phase ?? "—")}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* mitigation log */}
//       {mitigationLog.length > 0 && (
//         <div className="bg-white rounded-xl border border-red-200 shadow-sm">
//           <div className="flex items-center justify-between px-5 py-3 border-b">
//             <p className="font-semibold text-sm text-red-700">Mitigation Log</p>
//             <button
//               onClick={() => setMitigationLog([])}
//               className="text-xs text-gray-400 hover:text-gray-600"
//             >
//               Clear
//             </button>
//           </div>
//           <div className="overflow-x-auto max-h-48 overflow-y-auto">
//             <table className="min-w-full text-xs">
//               <thead className="bg-red-50 sticky top-0">
//                 <tr>
//                   {["Time", "Action", "Switch", "Type", "Source IP", "Flow ID"].map(h => (
//                     <th key={h} className="px-3 py-2 text-left text-xs text-gray-400 font-medium">
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {mitigationLog.map((e, i) => (
//                   <tr key={i} className="border-t">
//                     <td className="px-3 py-2 font-mono text-xs text-gray-500">{e.ts}</td>
//                     <td className="px-3 py-2">
//                       <span className={`px-2 py-0.5 rounded-full text-white text-xs font-bold ${
//                         e.action === "BLOCKED"          ? "bg-red-500" :
//                         e.action === "ROLLBACK"         ? "bg-gray-600" :
//                         e.action === "ROLLBACK_PARTIAL" ? "bg-amber-600" : "bg-gray-400"
//                       }`}>
//                         {e.action}
//                       </span>
//                     </td>
//                     <td className="px-3 py-2 font-mono text-xs font-semibold text-red-700">
//                       {e.switch_id ?? "—"}
//                     </td>
//                     <td className="px-3 py-2 text-xs">
//                       {e.block_type === "host_targeted" || e.block_type === "surgical"
//                         ? <span className="text-blue-600 font-semibold">Surgical</span>
//                         : e.block_type === "switch_wide"
//                           ? <span className="text-red-600 font-semibold">Switch-wide</span>
//                           : <span className="text-gray-400">—</span>
//                       }
//                     </td>
//                     <td className="px-3 py-2 font-mono text-xs text-gray-600">
//                       {e.src_ip ?? "—"}
//                     </td>
//                     <td className="px-3 py-2 font-mono text-xs text-gray-400">
//                       {e.flow_id ?? (e.action === "ROLLBACK" || e.action === "ROLLBACK_PARTIAL" 
//                         ? `${e.clean} clean, ${e.cleaned} cleaned, ${e.failed?.length || 0} failed` 
//                         : `${e.removed || 0} removed`)}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
          
//           {/* Show failed switches for partial rollbacks */}
//           {mitigationLog.some(e => e.action === "ROLLBACK_PARTIAL" && e.failed?.length > 0) && (
//             <div className="px-5 py-3 border-t bg-amber-50">
//               <p className="text-sm font-semibold text-amber-800 mb-1">Rollback Failures Detected</p>
//               {mitigationLog
//                 .filter(e => e.action === "ROLLBACK_PARTIAL" && e.failed?.length > 0)
//                 .map((e, i) => (
//                   <div key={i} className="mb-2">
//                     <p className="text-xs text-amber-700">
//                       Failed to clear: {e.failed.join(", ")} — retry rollback or clear manually.
//                     </p>
//                     {e.per_switch && Object.entries(e.per_switch).map(([switchId, detail]) => (
//                       detail.status === "failed" && detail.flows_stuck?.length > 0 && (
//                         <div key={switchId} className="ml-3 mt-1 text-xs text-amber-600">
//                           <span className="font-medium">{switchId}:</span> {detail.flows_stuck.join(", ")}
//                         </div>
//                       )
//                     ))}
//                   </div>
//                 ))}
//             </div>
//           )}
//         </div>
//       )}

//       {/* Auto-Block log */}
//       {autoBlockLog.length > 0 && (
//         <div className="bg-white rounded-xl border border-red-500 shadow-sm mt-5">
//           <div className="flex items-center justify-between px-5 py-3 border-b bg-red-50 rounded-t-xl">
//             <p className="font-bold text-sm text-red-700 flex items-center gap-2">
//               <span className="text-lg">🚨</span> Auto-Block History
//             </p>
//             <button onClick={() => setAutoBlockLog([])} className="text-xs text-red-500 hover:text-red-700">Clear</button>
//           </div>
//           <div className="overflow-x-auto max-h-48 overflow-y-auto">
//             <table className="min-w-full text-xs">
//               <thead className="bg-red-50 sticky top-0">
//                 <tr>
//                   {["Time", "Switch", "RF Probability", "Action"].map(h => (
//                     <th key={h} className="px-3 py-2 text-left text-red-600 font-semibold">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {autoBlockLog.map((e, i) => (
//                   <tr key={i} className="border-t">
//                     <td className="px-3 py-2 font-mono text-gray-500">{e.ts}</td>
//                     <td className="px-3 py-2 font-mono font-bold text-gray-800">{e.switch_id}</td>
//                     <td className="px-3 py-2 text-gray-600">{(e.prob * 100).toFixed(1)}%</td>
//                     <td className="px-3 py-2">
//                       <span className="px-2 py-0.5 rounded-full text-white text-xs font-bold bg-red-600">
//                         AUTO-BLOCKED
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// } 

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getNodes } from "../../api/api-controller";

const SERVER_URLS = {
  ONLINE:  "http://localhost:5001",
  OFFLINE: "http://localhost:5002",
};

const POLL_MS = 3_000; // Real-time 3s polling interval
const AUTO_BLOCK_RF_THRESHOLD = 0.98;

// Online IF Features (from ODL flow tables)
const IF_FEATURES = [
  { key: "avg_packet_size",   abbr: "APS", label: "Avg Packet Size", unit: "bytes" },
  { key: "bytes_per_second",  abbr: "B/S", label: "Bytes / Second",  unit: "bytes" },
  { key: "packet_count",      abbr: "PKT", label: "Packet Count",    unit: "pkts"  },
  { key: "active_flow_count", abbr: "AFL", label: "Active Flows",    unit: "flows" },
  { key: "asymmetry",         abbr: "ASY", label: "Asymmetry",       unit: ""      },
];

// Offline RF Features (automatically extracted from ODL)
const RF_FEATURES = [
  { key: "avg_pkt_size",         abbr: "APS", label: "Avg Packet Size",  unit: "bytes" },
  { key: "total_duration_sec",   abbr: "DUR", label: "Flow Duration",    unit: "sec"   },
  { key: "bytes_per_sec",        abbr: "B/S", label: "Bytes / Second",   unit: "B/s"   },
  { key: "tx_rx_byte_asymmetry", abbr: "ASY", label: "TX/RX Asymmetry",  unit: "0-1"   },
  { key: "pktcount",             abbr: "PKT", label: "Packet Count",     unit: "pkts"  },
  { key: "tx_bytes",             abbr: "TXB", label: "TX Bytes",         unit: "bytes" },
];

const ATTACK_TYPES = {
  0: { name: "Normal",      icon: "✓", color: "bg-green-500",  border: "border-green-500", text: "text-green-700", bg: "bg-green-50/80", pulseClass: "" },
  1: { name: "DDoS",        icon: "☠", color: "bg-red-500",      border: "border-red-500",     text: "text-red-700",     bg: "bg-red-50/80",     pulseClass: "animate-pulse-red" },
  2: { name: "Port Scan",   icon: "⌕", color: "bg-orange-500",   border: "border-orange-500",  text: "text-orange-700",  bg: "bg-orange-50/80",  pulseClass: "animate-pulse-orange" },
  3: { name: "Brute Force", icon: "🔓", color: "bg-amber-500",    border: "border-amber-500",   text: "text-amber-700",   bg: "bg-amber-50/80",   pulseClass: "animate-pulse-amber" },
  4: { name: "Botnet",      icon: "🤖", color: "bg-purple-500",   border: "border-purple-500",  text: "text-purple-700",  bg: "bg-purple-50/80",  pulseClass: "animate-pulse-purple" },

  // Fallbacks for string-based states if returned by older controllers
  "NORMAL":     { name: "Normal",      icon: "✓", color: "bg-green-500",  border: "border-green-500", text: "text-green-700", bg: "bg-green-50/80", pulseClass: "" },
  "ATTACK":     { name: "Anomaly",     icon: "⚠", color: "bg-red-500",      border: "border-red-500",     text: "text-red-700",     bg: "bg-red-50/80",     pulseClass: "animate-pulse-red" },
  "SUSPICIOUS": { name: "Suspicious",  icon: "⚠", color: "bg-yellow-500",   border: "border-yellow-500",  text: "text-yellow-700",  bg: "bg-yellow-50/80",  pulseClass: "animate-pulse-orange" },
};

// Always renders a number. Missing/undefined/NaN values fall back to 0
// instead of an em-dash, so metric cards never show a blank "—".
function fmt(v) {
  const n = typeof v === "number" && !Number.isNaN(v) ? v : Number(v);
  if (v == null || Number.isNaN(n)) return (0).toLocaleString();
  return parseFloat(n.toFixed(3)).toLocaleString();
}

// Resilient feature extractor from switch result objects
function getFeature(result, key) {
  if (!result) return 0;

  // Try result.features[key] first
  if (result.features && result.features[key] != null) {
    return result.features[key];
  }

  // Try result[key] next
  if (result[key] != null) {
    return result[key];
  }

  // Try fallback keys if they exist in either place
  const fallbacks = {
    avg_packet_size: ["avg_pkt_size", "avg_pkt_len"],
    avg_pkt_size: ["avg_packet_size", "avg_pkt_len"],
    bytes_per_second: ["bytes_per_sec", "byte_rate", "bytes_per_second_rate"],
    bytes_per_sec: ["bytes_per_second", "byte_rate", "bytes_per_sec_rate"],
    packet_count: ["pktcount", "pkt_rate", "packetCount"],
    pktcount: ["packet_count", "pkt_rate", "packetCount"],
    flow_duration: ["total_duration_sec", "total_duration", "duration"],
    total_duration_sec: ["flow_duration", "total_duration", "duration"],
    tx_rx_byte_asymmetry: ["asymmetry"],
    asymmetry: ["tx_rx_byte_asymmetry"],
    active_flow_count: ["activeFlowCount", "flow_count"],
  };

  const altKeys = fallbacks[key] || [];
  for (const altKey of altKeys) {
    if (result.features && result.features[altKey] != null) return result.features[altKey];
    if (result[altKey] != null) return result[altKey];
  }

  // No value found anywhere — report 0 rather than null so the UI always
  // shows a number.
  return 0;
}

const customStyles = `
  @keyframes pulse-red {
    0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.6); }
    50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.8); border-color: rgba(239, 68, 68, 1); }
  }
  @keyframes pulse-orange {
    0%, 100% { box-shadow: 0 0 15px rgba(249, 115, 22, 0.4); border-color: rgba(249, 115, 22, 0.6); }
    50% { box-shadow: 0 0 30px rgba(249, 115, 22, 0.8); border-color: rgba(249, 115, 22, 1); }
  }
  @keyframes pulse-amber {
    0%, 100% { box-shadow: 0 0 15px rgba(245, 158, 11, 0.4); border-color: rgba(245, 158, 11, 0.6); }
    50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.8); border-color: rgba(245, 158, 11, 1); }
  }
  @keyframes pulse-purple {
    0%, 100% { box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); border-color: rgba(168, 85, 247, 0.6); }
    50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.8); border-color: rgba(168, 85, 247, 1); }
  }
  .animate-pulse-red { animation: pulse-red 2s infinite; }
  .animate-pulse-orange { animation: pulse-orange 2s infinite; }
  .animate-pulse-amber { animation: pulse-amber 2s infinite; }
  .animate-pulse-purple { animation: pulse-purple 2s infinite; }
  .glass-card {
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  /* Shared tactile press feedback so every button feels reactive to clicks */
  .btn-reactive {
    transition: transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease, opacity 120ms ease;
  }
  .btn-reactive:active:not(:disabled) {
    transform: scale(0.94);
  }
  .btn-reactive:disabled {
    cursor: not-allowed;
  }
`;

export default function AnomalyDetector() {
  const [mode,         setMode]         = useState("ONLINE");
  const [results,      setResults]      = useState({});      // IF results: { switch_id: data }
  const [rfResults,    setRfResults]    = useState({});      // RF results: { switch_id: data }
  const [lastFeatures, setLastFeatures] = useState(null);
  const [log,          setLog]          = useState([]);
  const [connected,    setConnected]    = useState({ ONLINE: null, OFFLINE: null });
  // Polling now starts true for every mode (ONLINE/OFFLINE/HYBRID) and is
  // toggled purely by the Run/Pause button — no mode-based override.
  const [running,      setRunning]      = useState(true);
  const [lastPollTime, setLastPollTime] = useState(null);
  const prevFlowStatsRef = useRef({});
  const [blockMode, setBlockMode] = useState("surgical");

  // ── Mitigation state (declared early so callbacks below can reference it) ──
  const [blockedSwitches, setBlockedSwitches] = useState(new Set());
  const [mitigationLog,   setMitigationLog]   = useState([]);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [autoBlockedSwitches, setAutoBlockedSwitches] = useState(new Set());
  const [autoBlockLog, setAutoBlockLog] = useState([]);

  // ── Health checks ───────────────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    const check = async (key, url) => {
      try {
        const res = await fetch(`${url}/health`);
        if (res.ok) {
          setConnected(prev => ({ ...prev, [key]: true }));
        } else {
          console.log(`[Health] ${key} server returned ${res.status}`);
          setConnected(prev => ({ ...prev, [key]: false }));
        }
      } catch (err) {
        console.log(`[Health] ${key} server error:`, err.message);
        setConnected(prev => ({ ...prev, [key]: false }));
      }
    };

    check("ONLINE", SERVER_URLS.ONLINE);
    check("OFFLINE", SERVER_URLS.OFFLINE);
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Extract RF features from ODL ────────────────────────────────────────────
  const extractRFFeatures = useCallback((rawOdl, switchId) => {
    const nodes = rawOdl?.["opendaylight-inventory:nodes"]?.node ?? [];
    const node  = nodes.find(n => n.id === switchId);
    if (!node) return null;

    let totalDeltaPkt = 0, totalDeltaBytes = 0, totalDeltaTime = 0, flowCount = 0;
    const now = Date.now() / 1000;

    for (const table of node["flow-node-inventory:table"] ?? []) {
      for (const flow of table["flow"] ?? []) {
        const s   = flow["opendaylight-flow-statistics:flow-statistics"] ?? {};
        const pkt = parseInt(s["packet-count"] ?? s["packetCount"] ?? 0);
        const byt = parseInt(s["byte-count"]   ?? s["byteCount"]   ?? 0);
        const flowId = flow["id"];

        if (pkt === 0 && byt === 0) continue;

        const flowKey = switchId + ":" + flowId;
        const prev = prevFlowStatsRef.current[flowKey];

        // Always update with current values
        prevFlowStatsRef.current[flowKey] = { packets: pkt, bytes: byt, ts: now };

        if (prev === undefined) continue;  // first poll, no delta yet

        const deltaPkt   = Math.max(0, pkt  - prev.packets);
        const deltaBytes = Math.max(0, byt - prev.bytes);
        const deltaTime  = Math.max(1, now  - prev.ts);

        if (deltaPkt === 0 && deltaBytes === 0) continue;  // no new traffic

        totalDeltaPkt   += deltaPkt;
        totalDeltaBytes += deltaBytes;
        totalDeltaTime  += deltaTime;
        flowCount       += 1;
      }
    }

    if (flowCount === 0) return null;

    const avgDeltaTime = totalDeltaTime / flowCount;

    return {
      src:                  switchId,
      avg_pkt_size:         totalDeltaPkt > 0 ? totalDeltaBytes / totalDeltaPkt : 0,
      total_duration_sec:   avgDeltaTime,
      bytes_per_sec:        totalDeltaBytes / avgDeltaTime,
      tx_rx_byte_asymmetry: 1.0,
      pktcount:             totalDeltaPkt,
      tx_bytes:             totalDeltaBytes,
    };
  }, []);

  // ── Online IF state polling (backend-driven) ────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      let res = await fetch(`${SERVER_URLS.ONLINE}/state`);
      if (!res.ok) {
        res = await fetch(`${SERVER_URLS.ONLINE}/analyze`);
      }
      if (!res.ok) { setConnected(p => ({ ...p, ONLINE: false })); return; }
      const data = await res.json();
      setConnected(p => ({ ...p, ONLINE: true }));

      const alerts = data.alerts ?? [];
      if (alerts.length > 0) {
          alerts.forEach(a => {
              new Notification("DDoS Attack Detected", {
                  body: `${a.switch_id} — Confidence ${(a.rf_prob*100).toFixed(0)}%`,
                  requireInteraction: true,
              });
          });

          fetch(`${SERVER_URLS.ONLINE}/alerts/clear`, {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ ids: alerts.map(a => a.id) }),
          }).catch(() => {});
      }

      const backendResults = data.results ?? {};
      setResults(backendResults);

      const allEntries = Object.values(backendResults).filter(r => r.phase !== "SKIP");

      const worstEntry = allEntries
        .filter(r => r.features)
        .reduce((a, b) => {
          if (!a) return b;
          const a_sev = a.state === "ATTACK" ? 3 : a.state === "SUSPICIOUS" ? 2 : a.state === "NORMAL" ? 1 : 0;
          const b_sev = b.state === "ATTACK" ? 3 : b.state === "SUSPICIOUS" ? 2 : b.state === "NORMAL" ? 1 : 0;
          return b_sev > a_sev ? b : a;
        }, null);

      if (worstEntry?.features) {
        setLastFeatures(worstEntry.features);
      }

      const entries = Object.values(backendResults)
        .filter(r => r.phase !== "SKIP")
        .map(r => ({
          switch_id: r.switch_id,
          state:     r.state,
          phase:     r.phase,
          raw_score: r.raw_score,
          soft_anomaly:   r.soft_anomaly,
          hard_anomaly:   r.hard_anomaly,
          percentile:     r.percentile,
          network_severity: r.network_severity,
          ...(mode === "HYBRID" ? {
            rf_score: r.rf_score,
            rf_zone:  r.rf_zone,
            rf_state: r.rf_state,
          } : {}),
          _ts:   new Date().toLocaleTimeString(),
          _mode: mode === "HYBRID" ? "HYBRID" : "ONLINE",
        }));
      if (entries.length > 0) {
        setLog(prev => [...entries, ...prev].slice(0, 50));
      }

      const autoBlocks = data.auto_blocks ?? {};
      const newAutoBlocked = Object.entries(autoBlocks)
        .filter(([, blocked]) => blocked)
        .map(([sid]) => sid);

      setAutoBlockedSwitches(new Set(newAutoBlocked));

      if (newAutoBlocked.length > 0) {
        setBlockedSwitches(prev => new Set([...prev, ...newAutoBlocked]));
      }

    } catch {
      setConnected(p => ({ ...p, ONLINE: false }));
    }
  }, [mode]);


  // ── Offline RF polling ──────────────────────────────────────────────────────
  const sendOffline = useCallback(async () => {
    console.log("[sendOffline] fired");
    let rawOdl;
    try {
      rawOdl = await getNodes();
    } catch (err) {
      console.error("sendOffline error - getNodes failed:", err);
      setConnected(p => ({ ...p, OFFLINE: false }));
      return;
    }

    const nodes   = rawOdl?.["opendaylight-inventory:nodes"]?.node ?? [];
    const ids     = nodes
      .map(n => n.id)
      .filter(id => id && !id.startsWith("host:") && !id.includes(":LOCAL") && !/openflow:\d+:\d+$/.test(id));
    console.log("[sendOffline] targets:", ids);
    const targets = ids.length > 0 ? ids : ["global"];

    let atLeastOneSuccess = false;
    const rfResultsLocal = {};

    for (const sid of targets) {
      const features = extractRFFeatures(rawOdl, sid);
      console.log("[sendOffline] features for", sid, ":", features);
      if (!features) {
        // Explicitly supply baseline zero values so metric cards show 0 instead of -
        const normalData = {
          src: sid,
          state: "NORMAL",
          reason: "No active flows with traffic",
          attack_prob: 0,
          rf_zone: "NORMAL",
          features: {
            avg_pkt_size: 0,
            total_duration_sec: 0,
            bytes_per_sec: 0,
            tx_rx_byte_asymmetry: 0,
            pktcount: 0,
            tx_bytes: 0
          }
        };
        rfResultsLocal[sid] = normalData;
        setRfResults(prev => ({ ...prev, [sid]: normalData }));
        setLog(prev => [{
          ...normalData,
          _ts:   new Date().toLocaleTimeString(),
          _mode: "OFFLINE"
        }, ...prev.slice(0, 49)]);
        continue;
      }

      try {
        const res  = await fetch(`${SERVER_URLS.OFFLINE}/detect`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(features),
        });

        if (!res.ok) {
          console.error(`sendOffline error - HTTP ${res.status} for ${sid}`);
          continue;
        }

        const data = await res.json();
        // Merge locally calculated features so they are saved in the component state
        const mergedData = {
          ...data,
          features: data.features ?? features
        };
        rfResultsLocal[data.src] = mergedData;

        setRfResults(prev => {
          const next = { ...prev, [data.src]: mergedData };
          const allVals = Object.values(next);
          const worst = allVals.reduce((worst, current) => {
            const worstSeverity = worst?.state === "ATTACK" ? 3 :
                                 worst?.state === "SUSPICIOUS" ? 2 :
                                 worst?.state === "NORMAL" ? 1 : 0;
            const currSeverity = current?.state === "ATTACK" ? 3 :
                                current?.state === "SUSPICIOUS" ? 2 :
                                current?.state === "NORMAL" ? 1 : 0;
            return currSeverity > worstSeverity ? current : worst;
          }, allVals[0]);

          setLastFeatures(worst?.features ?? null);
          return next;
        });

        setLog(prev => [{
          ...mergedData,
          _ts:   new Date().toLocaleTimeString(),
          _mode: "OFFLINE"
        }, ...prev.slice(0, 49)]);

        atLeastOneSuccess = true;
      } catch (err) {
        console.error(`sendOffline error - fetch failed for ${sid}:`, err);
      }
    }

    //  setConnected(p => ({ ...p, OFFLINE: atLeastOneSuccess || targets.length === 0 }));
// Only demote OFFLINE to "down" when a real network attempt failed.
    // "No active flow traffic" (features === null) is not a connectivity
    // signal — it just means nothing was sent this tick — so we no longer
    // let it silently overwrite a healthy RF connection with false.
    if (atLeastOneSuccess) {
      setConnected(p => ({ ...p, OFFLINE: true }));
    }
    const rfScorePayload = {};
    for (const [sid, data] of Object.entries(rfResultsLocal)) {
      rfScorePayload[sid] = {
        attack_prob: data.attack_prob ?? 0,
        rf_zone:     data.rf_zone ?? "benign",
        state:       data.state ?? "NORMAL",
      };
    }
    if (Object.keys(rfScorePayload).length > 0) {
      fetch(`${SERVER_URLS.ONLINE}/rf-scores`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(rfScorePayload),
      }).catch(() => {});
    }
  }, [extractRFFeatures]);

  // ── Refresh Action ──────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    checkHealth(); // Refresh health statuses reactively immediately
    if (mode === "ONLINE" || mode === "HYBRID") {
      await fetchState();
    }
    if (mode === "OFFLINE" || mode === "HYBRID") {
      await sendOffline();
    }
    setLastPollTime(Date.now());
  }, [fetchState, sendOffline, mode, checkHealth]);

  // ── Unified Polling Trigger ──────────────────────────────────────────────────
  // `running` is now the single source of truth for all three modes — no
  // mode-specific override, so the Run/Pause button always reflects and
  // controls the live polling state, including in ONLINE mode.
  useEffect(() => {
    if (!running) return;

    // const tick = () => {
    //   if (mode === "ONLINE" || mode === "HYBRID") fetchState();
    //   if (mode === "OFFLINE" || mode === "HYBRID") sendOffline();
    //   setLastPollTime(Date.now());
    // };
const tick = () => {
      checkHealth(); // real /health ping — authoritative connectivity signal
      if (mode === "ONLINE" || mode === "HYBRID") fetchState();
      if (mode === "OFFLINE" || mode === "HYBRID") sendOffline();
      setLastPollTime(Date.now());
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [running, mode, fetchState, sendOffline, checkHealth]);

  // Cleanup on unmount
  const stopPolling = useCallback(() => {
    setRunning(false);
  }, []);

  const startPolling = useCallback(() => {
    setRunning(true);
  }, []);

  // Stop polling when switching modes
  const switchMode = (newMode) => {
    setMode(newMode);
    setLog([]);
    if (newMode === "ONLINE") {
      setRfResults({});
      prevFlowStatsRef.current = {};
    } else if (newMode === "OFFLINE") {
      setResults({});
      setLastFeatures(null);
      prevFlowStatsRef.current = {};
    } else if (newMode === "HYBRID") {
      prevFlowStatsRef.current = {};
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    stopPolling();
    try {
      if (mode === "ONLINE") {
        await fetch(`${SERVER_URLS.ONLINE}/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        });
      } else if (mode === "OFFLINE") {
        await fetch(`${SERVER_URLS.OFFLINE}/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        });
      }
    } catch { /* ignore */ }

    if (mode === "ONLINE") {
      setResults({});
      setLastFeatures(null);
    } else {
      setRfResults({});
    }
    setLog([]);
    prevFlowStatsRef.current = {};
    checkHealth();
    setBlockedSwitches(new Set());
    setMitigationLog([]);
    startPolling();
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const allIFResults = Object.values(results);
  const worstIFResult = allIFResults.length > 0
    ? allIFResults.reduce((worst, current) => {
        const worstSeverity = worst?.state === "ATTACK" ? 3 : worst?.state === "SUSPICIOUS" ? 2 : worst?.state === "NORMAL" ? 1 : 0;
        const currSeverity = current?.state === "ATTACK" ? 3 : current?.state === "SUSPICIOUS" ? 2 : current?.state === "NORMAL" ? 1 : 0;
        return currSeverity > worstSeverity ? current : worst;
      })
    : null;

  const allRFResults = Object.values(rfResults);
  const worstRFResult = allRFResults.length > 0
    ? allRFResults.reduce((worst, current) => {
        const worstSeverity = worst?.state === "ATTACK" ? 3 : worst?.state === "SUSPICIOUS" ? 2 : worst?.state === "NORMAL" ? 1 : 0;
        const currSeverity = current?.state === "ATTACK" ? 3 : current?.state === "SUSPICIOUS" ? 2 : current?.state === "NORMAL" ? 1 : 0;
        return currSeverity > worstSeverity ? current : worst;
      }, allRFResults[0])
    : null;

  // Determine attack state based on current mode
  const isIFAttack = allIFResults.some(r => r.state === "ATTACK");
  const isIFSuspicious = allIFResults.some(r => r.state === "SUSPICIOUS") && !isIFAttack;

  const isRFAttack = allRFResults.some(r => r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0));
  const isRFSuspicious = allRFResults.some(r => r.state === "SUSPICIOUS") && !isRFAttack;

  const isAttack = mode === "ONLINE" ? isIFAttack :
                   mode === "OFFLINE" ? isRFAttack :
                   (isIFAttack || isRFAttack);

  const isSuspicious = mode === "ONLINE" ? isIFSuspicious :
                       mode === "OFFLINE" ? isRFSuspicious :
                       ((isIFSuspicious || isRFSuspicious) && !isAttack);
  const canBlock = useMemo(() => {
    const ifPhase = worstIFResult?.phase ?? null;
    const ifInDetection = ifPhase === "DETECTION";

    const ifAttack = allIFResults.some(r => r.state === "ATTACK");
    const ifHardAnomaly = allIFResults.some(r => r.hard_anomaly === true);
    const rfAttack = allRFResults.some(r => r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0));
    const rfHighConf = allRFResults.some(r => (r.attack_prob ?? 0) >= 0.85);

    if (ifInDetection && ifAttack && rfAttack) return true;
    if (rfHighConf) return true;
    if (!ifInDetection && rfAttack) return true;
    // NEW: allow IF alone to authorize a block when it's at hard-anomaly
    // confidence, even if RF hasn't independently corroborated yet — covers
    // the case where RF's per-poll snapshot briefly shows no traffic delta.
    if (ifInDetection && ifHardAnomaly) return true;

    return false;
  }, [worstIFResult, allIFResults, allRFResults]);   
  // const canBlock = useMemo(() => {
  //   const ifPhase = worstIFResult?.phase ?? null;
  //   const ifInDetection = ifPhase === "DETECTION";

  //   const ifAttack = allIFResults.some(r => r.state === "ATTACK");
  //   const rfAttack = allRFResults.some(r => r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0));
  //   const rfHighConf = allRFResults.some(r => (r.attack_prob ?? 0) >= 0.85);

  //   if (ifInDetection && ifAttack && rfAttack) return true;
  //   if (rfHighConf) return true;
  //   if (!ifInDetection && rfAttack) return true;

  //   return false;
  // }, [worstIFResult, allIFResults, allRFResults]);

  // ── Auto-Block logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "HYBRID") return;

    const ifAttacks = allIFResults.filter(r => r.state === "ATTACK").map(r => r.switch_id);
    const rfAttacks = allRFResults.filter(r => (r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0)) && r.attack_prob >= AUTO_BLOCK_RF_THRESHOLD);

    const rfAttackMap = new Map(rfAttacks.map(r => [r.src, r]));

    for (const sid of ifAttacks) {
      if (rfAttackMap.has(sid) && !blockedSwitches.has(sid) && !autoBlockedSwitches.has(sid)) {
        console.log(`[AutoBlock] Triggering for ${sid}`);

        window.dispatchEvent(new CustomEvent("autoblock", { detail: { switch_id: sid } }));

        if (Notification.permission === "granted") {
          new Notification("SDN Auto-Block Triggered", {
            body: `Switch ${sid} was automatically isolated due to high confidence attack.`,
          });
        }

        fetch(`${SERVER_URLS.ONLINE}/auto-block/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ switch_id: sid })
        }).then(res => res.json()).then(data => {
          if (data.status === "auto_blocked" || data.status === "already_blocked") {
            setAutoBlockedSwitches(prev => new Set([...prev, sid]));
            setBlockedSwitches(prev => new Set([...prev, sid]));
            setAutoBlockLog(prev => [{
              ts: new Date().toLocaleTimeString(),
              switch_id: sid,
              prob: rfAttackMap.get(sid).attack_prob
            }, ...prev]);
          }
        }).catch(err => console.error("AutoBlock failed:", err));
      }
    }
  }, [allIFResults, allRFResults, mode, blockedSwitches, autoBlockedSwitches]);

  // ── Mitigation functions ────────────────────────────────────────────────────
  const handleBlock = useCallback(async () => {
    const worstIF = Object.values(results ?? {})
        .filter(r => r.state === "ATTACK")
        .sort((a, b) => (a.raw_score ?? 0) - (b.raw_score ?? 0))[0];

    const worstRF = Object.values(rfResults ?? {})
        .filter(r => r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0))
        .sort((a, b) => (b.attack_prob ?? 0) - (a.attack_prob ?? 0))[0];

    const targetSwitch = worstIF?.switch_id ?? worstRF?.src;
    if (!targetSwitch) return;
    if (blockedSwitches.has(targetSwitch)) return;

    try {
        let res;

        if (blockMode === "surgical") {
            const attackingHost = worstIF?.attacking_host;

            if (!attackingHost) {
                console.warn("[BLOCK] No attacking host identified — falling back to switch-wide");
                res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block`, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({
                        switch_id: targetSwitch,
                        block_type: "switch_wide",
                    }),
                });
            } else {
                res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block-host`, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({
                        switch_id: targetSwitch,
                        src_ip:    attackingHost.ip,
                        src_mac:   attackingHost.mac,
                    }),
                });
            }
        } else {
            res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    switch_id:  targetSwitch,
                    block_type: "switch_wide",
                }),
            });
        }

        const data = await res.json();

        if (data.success) {
            setBlockedSwitches(prev => new Set([...prev, targetSwitch]));
            setMitigationLog(prev => [{
                ts:         new Date().toLocaleTimeString(),
                action:     "BLOCKED",
                switch_id:  targetSwitch,
                flow_id:    data.flow_id,
                block_type: data.action ?? blockMode,
                src_ip:     data.src_ip ?? null,
            }, ...prev]);
        }

    } catch (err) {
        console.error("[BLOCK] Failed:", err);
    }
  }, [results, rfResults, blockedSwitches, blockMode]);

  const handleRollback = useCallback(async () => {
    setRollbackLoading(true);
    try {
      const res  = await fetch(`${SERVER_URLS.ONLINE}/mitigation/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();

      // Resilient processing of results
      const resultsList = data.results || (data.success ? [{ switch_id: "all", success: true }] : []);
      const failed = resultsList.filter(r => !r.success).map(r => r.switch_id || "unknown");
      const succeeded = resultsList.filter(r => r.success).map(r => r.switch_id || "all");

      setBlockedSwitches(new Set(failed));

      setMitigationLog(prev => [{
        ts:               new Date().toLocaleTimeString(),
        action:           failed.length > 0 ? "ROLLBACK_PARTIAL" : "ROLLBACK",
        cleaned:          succeeded,
        failed:           failed,
        results:          resultsList,
      }, ...prev]);

    } catch (err) {
      console.error("Rollback failed", err);
    } finally {
      setRollbackLoading(false);
    }
  }, []);

  const isBaseline = allIFResults.length > 0 && allIFResults.every(r => r.phase === "BASELINE");
  const bCollected = worstIFResult?.collected || 0;
  const bTotal = bCollected + (worstIFResult?.remaining || 100);
  const bPct = Math.min(100, (bCollected / bTotal) * 100);

  const onlineConn = connected.ONLINE;
  const offlineConn = connected.OFFLINE;

  const activeConn = mode === "ONLINE" ? onlineConn :
                     mode === "OFFLINE" ? offlineConn :
                     (onlineConn && offlineConn);

  // Map attack state for styling
  const getUIStateKey = () => {
    if (mode === "ONLINE") {
      return worstIFResult?.state ?? "NORMAL";
    } else if (mode === "OFFLINE") {
      return worstRFResult?.state ?? 0;
    } else {
      // Hybrid
      const ifScore = worstIFResult?.state === "ATTACK" ? 3 : worstIFResult?.state === "SUSPICIOUS" ? 2 : 1;
      const rfState = worstRFResult?.state;
      const rfScore = (rfState === "ATTACK" || (typeof rfState === "number" && rfState > 0)) ? 3 : worstRFResult?.state === "SUSPICIOUS" ? 2 : 1;
      return ifScore >= rfScore ? (worstIFResult?.state ?? "NORMAL") : (rfState ?? 0);
    }
  };

  const statusKey = getUIStateKey();
  const statusDetails = ATTACK_TYPES[statusKey] || ATTACK_TYPES["NORMAL"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 select-none font-sans antialiased text-gray-800">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      {/* Top Header Panel (Fully Reactive Buttons) */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Anomaly Detection</h1>

          {/* Mode Switcher Buttons */}
          <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50 ml-3">
            {["ONLINE", "OFFLINE", "HYBRID"].map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`btn-reactive px-3 py-1.5 rounded-lg text-xs font-bold ${
                  mode === m
                    ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Polling / Connectivity Actions */}
        <div className="flex items-center gap-3">
          {/* Separate, always-visible badges per engine — makes it obvious
              which backend (port 5001 IF vs port 5002 RF) is unreachable,
              instead of one ambiguous combined light. */}
          <div className="flex items-center gap-1.5">
            <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
              onlineConn === null ? "bg-gray-100 text-gray-500" :
              onlineConn ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
            }`} title={`IF engine — ${SERVER_URLS.ONLINE}/health`}>
              <span className={`h-1.5 w-1.5 rounded-full ${onlineConn ? "bg-green-500" : onlineConn === null ? "bg-gray-400" : "bg-red-500"}`} />
              IF {onlineConn === null ? "…" : onlineConn ? "Live" : "Down"}
            </span>
            <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
              offlineConn === null ? "bg-gray-100 text-gray-500" :
              offlineConn ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
            }`} title={`RF engine — ${SERVER_URLS.OFFLINE}/health`}>
              <span className={`h-1.5 w-1.5 rounded-full ${offlineConn ? "bg-green-500" : offlineConn === null ? "bg-gray-400" : "bg-red-500"}`} />
              RF {offlineConn === null ? "…" : offlineConn ? "Live" : "Down"}
            </span>
          </div>

          {lastPollTime && (
            <span className="text-xs text-gray-400 font-mono">
              Poll: {new Date(lastPollTime).toLocaleTimeString()}
            </span>
          )}

          {/* Run/Pause now works uniformly across ONLINE, OFFLINE, and HYBRID */}
          <button
            onClick={running ? stopPolling : startPolling}
            className={`btn-reactive px-3.5 py-1.5 rounded-lg text-xs font-bold text-white ${
              running
                ? "bg-red-500 hover:bg-red-600 shadow-md"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            }`}
          >
            {running ? "Pause Telemetry" : "Run Continuous"}
          </button>

          <button
            onClick={handleRefresh}
            className="btn-reactive px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            Query Once
          </button>

          <button
            onClick={handleReset}
            className="btn-reactive px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
          >
            Clear State
          </button>
        </div>
      </div>

      {/* Mode Info Bar */}
      <div className={`text-xs px-4 py-3 rounded-2xl border ${
        mode === "ONLINE"
          ? "bg-indigo-50/60 text-indigo-800 border-indigo-100"
          : mode === "OFFLINE"
            ? "bg-emerald-50/60 text-emerald-800 border-emerald-100"
            : "bg-purple-50/60 text-purple-800 border-purple-100"
      }`}>
        {mode === "ONLINE" ? (
          <p>
            <span className="font-bold">Online Isolation Forest:</span> Active baseline tracking, dynamic telemetry counters over ODL, and unsupervised anomaly triggers.
          </p>
        ) : mode === "OFFLINE" ? (
          <p>
            <span className="font-bold">Offline Random Forest:</span> Multi-class classifier using supervised standard configurations over ODL flows.
          </p>
        ) : (
          <p>
            <span className="font-bold">Hybrid Mode:</span> Running Online IF baseline analysis & Offline RF 5-Class classifier for unified decision orchestration.
          </p>
        )}
      </div>

      {/* Diagnostic banner — appears only when a backend this mode depends on
          is unreachable, so zeroed-out feature cards never get mistaken for
          real "no attack" telemetry. */}
      {(((mode === "ONLINE" || mode === "HYBRID") && onlineConn === false) ||
        ((mode === "OFFLINE" || mode === "HYBRID") && offlineConn === false)) && (
        <div className="text-xs px-4 py-3 rounded-2xl border bg-red-50 text-red-700 border-red-200 flex items-start gap-2">
          <span className="text-base leading-none">⚠</span>
          <div>
            <p className="font-bold">
              {onlineConn === false && offlineConn === false && (mode === "HYBRID")
                ? "Both engines unreachable — the numbers below are placeholders, not live detections."
                : onlineConn === false && (mode === "ONLINE" || mode === "HYBRID")
                ? `IF engine unreachable at ${SERVER_URLS.ONLINE} — Online features below are placeholders, not live detections.`
                : `RF engine unreachable at ${SERVER_URLS.OFFLINE} — Offline features below are placeholders, not live detections.`}
            </p>
            <p className="text-red-600/80 mt-0.5">
              Start the missing backend process, confirm it's listening on that port, and check the browser console/network tab for CORS errors — then hit <span className="font-semibold">Query Once</span> to pull real data.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Status Card - Visual Indicators change based on the anomaly */}
      <div className={`rounded-3xl border-2 p-6 glass-card shadow-lg transition-all duration-300 ${statusDetails.pulseClass} ${statusDetails.bg} ${statusDetails.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-md ${statusDetails.color}`}>
              {statusDetails.icon}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Threat Matrix Status</p>
              <h2 className={`text-2xl font-black leading-tight ${statusDetails.text}`}>
                {statusDetails.name === "Normal" ? "Normal Traffic" : `${statusDetails.name} Detected`}
              </h2>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                {mode === "ONLINE" && worstIFResult
                  ? `IF Engine (${worstIFResult.phase}) ── switch: ${worstIFResult.switch_id}`
                  : mode === "OFFLINE" && worstRFResult
                  ? `RF Engine (Classification) ── source: ${worstRFResult.src}`
                  : mode === "HYBRID" && (worstIFResult || worstRFResult)
                  ? `Hybrid Engine ── IF: ${worstIFResult?.phase || "Idle"} | RF: ${worstRFResult ? "Detecting" : "Idle"}`
                  : "Standby ── Awaiting telemetry packet..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-widest px-4 py-1.5 rounded-xl bg-white border shadow-sm text-gray-700">
              STATE: {statusDetails.name.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Online IF Model Detail */}
        {(mode === "ONLINE" || mode === "HYBRID") && worstIFResult?.phase === "DETECTION" && (
          <div className="mt-4 border-t pt-3 space-y-0.5 text-xs text-gray-600">
            <p className="font-semibold text-indigo-600">Isolation Forest Model (Unsupervised)</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isIFAttack ? "bg-red-500" : "bg-green-500"}`} />
              <span className={`font-semibold ${isIFAttack ? "text-red-700" : "text-green-700"}`}>
                {isIFAttack ? "Anomaly" : "Benign"}
              </span>
              <span className="text-gray-400">
                attack prob: {fmt(worstIFResult?.percentile != null ? 100 - worstIFResult.percentile : 0)}%
              </span>
            </div>
            <p className="pl-4 text-gray-400 font-mono text-[11px]">
              score: {fmt(worstIFResult?.raw_score)} — {worstIFResult?.state ?? "NORMAL"}
            </p>
            {worstIFResult?.attacking_host && (
              <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[11px] font-semibold text-red-700">
                  ⚠ Suspected source: {worstIFResult.attacking_host.ip}
                </p>
                <p className="text-[10px] text-red-500 font-mono">
                  MAC: {worstIFResult.attacking_host.mac} — Port: {worstIFResult.attacking_host.port}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Offline RF Model Detail */}
        {(mode === "OFFLINE" || mode === "HYBRID") && worstRFResult && (
          <div className="mt-4 border-t pt-3 space-y-0.5 text-xs text-gray-600">
            <p className="font-semibold text-emerald-600">Random Forest Model (Supervised 5-Class)</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRFAttack ? "bg-red-500" : isRFSuspicious ? "bg-yellow-500" : "bg-green-500"}`} />
              <span className={`font-semibold ${isRFAttack ? "text-red-700" : isRFSuspicious ? "text-yellow-700" : "text-green-700"}`}>
                {statusDetails.name}
              </span>
              <span className="text-gray-400">
                attack prob: {fmt((worstRFResult.attack_prob ?? 0) * 100)}%
              </span>
            </div>
            <p className="pl-4 text-gray-400 font-mono text-[11px]">
              zone: {worstRFResult.rf_zone ?? "NORMAL"} — {worstRFResult.reason ?? "No active flows with traffic"}
            </p>
          </div>
        )}

        {/* Baseline Training progress */}
        {mode === "ONLINE" && isBaseline && (
          <div className="mt-5 border-t pt-4">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-700 mb-2">
              <span>Generating baseline signatures...</span>
              <span>{bCollected} / {bTotal} Samples</span>
            </div>
            <div className="w-full bg-indigo-50 border border-indigo-100 rounded-full h-3 overflow-hidden p-0.5">
              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${bPct}%` }} />
            </div>
          </div>
        )}

        {/* Surgical Blocking / Mitigation Actions */}
        {(isAttack || blockedSwitches.size > 0 || autoBlockedSwitches.size > 0) && (
          <div className="mt-5 border-t pt-4 flex items-center justify-between flex-wrap gap-4">
            {isAttack && blockedSwitches.size === 0 && autoBlockedSwitches.size === 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={blockMode}
                  onChange={e => setBlockMode(e.target.value)}
                  className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400 font-semibold cursor-pointer shadow-sm"
                >
                  <option value="surgical">Surgical Isolation (Attacking Host Only)</option>
                  <option value="switch_wide">Full Switch Quarantine (Volumetric Defense)</option>
                </select>

                <button
                  onClick={handleBlock}
                  disabled={!canBlock}
                  className="btn-reactive px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 shadow-md"
                >
                  Apply Emergency block
                </button>

                {canBlock && (
                  <span className="text-[11px] font-mono text-gray-500">
                    Switch Vector: {worstIFResult?.switch_id ?? worstRFResult?.src ?? "global"}
                  </span>
                )}
              </div>
            )}

            {(blockedSwitches.size > 0 || autoBlockedSwitches.size > 0) && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRollback}
                  disabled={rollbackLoading}
                  className="btn-reactive px-4 py-2 rounded-xl text-xs font-extrabold bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40 shadow-sm"
                >
                  {rollbackLoading ? "Removing constraints..." : "Rollback Block Actions"}
                </button>
                <span className="text-xs text-red-600 font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  Active quarantines: {Math.max(blockedSwitches.size, autoBlockedSwitches.size)} switch nodes
                </span>
              </div>
            )}

            {!canBlock && autoBlockedSwitches.size === 0 && blockedSwitches.size === 0 && (
              <span className="text-xs text-gray-400 font-semibold">
                Quarantine rules require RF Attack flags or high confidence (≥85%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Feature telemetry grid with complete Online/Offline distinction and fallbacks — always shows numbers */}
      {mode === "ONLINE" && (
        <div className="space-y-3 bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
              Online IF Features
              <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full normal-case tracking-normal ${
                onlineConn ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-500 border border-red-200"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${onlineConn ? "bg-green-500" : "bg-red-500"}`} />
                {onlineConn ? "Live data" : "No signal"}
              </span>
            </h3>
          <div className="grid grid-cols-5 gap-3">
            {IF_FEATURES.map(f => {
              const val = getFeature(worstIFResult, f.key);
              return (
                <div key={f.key} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{f.abbr} ── {f.label}</p>
                  <h3 className="text-xl font-black font-mono text-gray-900 mt-2">{fmt(val)}</h3>
                  {f.unit && <p className="text-[10px] text-gray-400 mt-1 font-bold">{f.unit}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "OFFLINE" && (
        <div className="space-y-3 bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              Offline RF Features
              <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full normal-case tracking-normal ${
                offlineConn ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-500 border border-red-200"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${offlineConn ? "bg-green-500" : "bg-red-500"}`} />
                {offlineConn ? "Live data" : "No signal"}
              </span>
            </h3>
          <div className="grid grid-cols-6 gap-3">
            {RF_FEATURES.map(f => {
              const val = getFeature(worstRFResult, f.key);
              return (
                <div key={f.key} className="bg-emerald-50/10 border border-emerald-100 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-2">{f.abbr} ── {f.label}</p>
                  <h3 className="text-xl font-black font-mono text-gray-900 mt-2">{fmt(val)}</h3>
                  {f.unit && <p className="text-[10px] text-emerald-400 mt-1 font-bold">{f.unit}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "HYBRID" && (
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3 bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
              Online IF Features
              <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full normal-case tracking-normal ${
                onlineConn ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-500 border border-red-200"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${onlineConn ? "bg-green-500" : "bg-red-500"}`} />
                {onlineConn ? "Live data" : "No signal"}
              </span>
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {IF_FEATURES.map(f => {
                const val = getFeature(worstIFResult, f.key);
                return (
                  <div key={f.key} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{f.abbr} ── {f.label}</p>
                    <h3 className="text-xl font-black font-mono text-gray-900 mt-2">{fmt(val)}</h3>
                    {f.unit && <p className="text-[10px] text-gray-400 mt-1 font-bold">{f.unit}</p>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-3 bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              Offline RF Features
              <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full normal-case tracking-normal ${
                offlineConn ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-500 border border-red-200"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${offlineConn ? "bg-green-500" : "bg-red-500"}`} />
                {offlineConn ? "Live data" : "No signal"}
              </span>
            </h3>
            <div className="grid grid-cols-6 gap-3">
              {RF_FEATURES.map(f => {
                const val = getFeature(worstRFResult, f.key);
                return (
                  <div key={f.key} className="bg-emerald-50/10 border border-emerald-100 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-2">{f.abbr} ── {f.label}</p>
                    <h3 className="text-xl font-black font-mono text-gray-900 mt-2">{fmt(val)}</h3>
                    {f.unit && <p className="text-[10px] text-emerald-400 mt-1 font-bold">{f.unit}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Event Logs */}
      {log.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              Event Logging
            </h3>
            <button onClick={() => setLog([])} className="btn-reactive text-xs text-gray-400 hover:text-gray-600 font-semibold">
              Flush Logs
            </button>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-gray-50/50 sticky top-0 border-b border-gray-200">
                <tr>
                  {["Time", "Telemetry Mode", "Switch Vector", "Calculated Threat", "Certainty", "Zone"].map(h => (
                    <th key={h} className="px-4 py-3 text-gray-400 font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {log.map((e, i) => {
                  const itemState = ATTACK_TYPES[e.state] || ATTACK_TYPES["NORMAL"];
                  return (
                    <tr key={i} className={`hover:bg-gray-50/50 ${e.state === "ATTACK" || (typeof e.state === "number" && e.state > 0) ? "bg-red-50/20" : ""}`}>
                      <td className="px-4 py-3 text-gray-400 font-mono">{e._ts || e.ts || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
                          e._mode === "ONLINE" ? "bg-indigo-500" : "bg-emerald-500"
                        }`}>
                          {e._mode === "ONLINE" ? "IF Engine" : "RF Engine"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-700">{e.switch_id ?? e.src ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${itemState.text} ${itemState.bg}`}>
                          {itemState.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {e._mode === "OFFLINE" || e.attack_prob != null
                          ? fmt((e.attack_prob ?? 0) * 100) + "%"
                          : fmt(e.raw_score)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-medium">
                        {e.rf_zone ?? e.phase ?? "Telemetry Ingress"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
      </table>
          </div>
        </div>
      )}

      {/* Mitigation Log */}
      {mitigationLog.length > 0 && (
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50/30">
            <h3 className="font-extrabold text-sm text-red-800 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
              Mitigation Execution Log
            </h3>
            <button
              onClick={() => setMitigationLog([])}
              className="btn-reactive text-xs text-red-600 hover:text-red-800 font-semibold"
            >
              Clear Log
            </button>
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-red-50/20 sticky top-0 border-b border-red-100">
                <tr>
                  {["Time", "Mitigation Action", "Switch Node", "Type", "Attacking IP", "Action ID"].map(h => (
                    <th key={h} className="px-4 py-3 text-red-600 font-bold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 bg-red-50/5">
                {mitigationLog.map((e, i) => (
                  <tr key={i} className="hover:bg-red-50/10">
                    <td className="px-4 py-3 font-mono text-gray-500">{e.ts}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
                        e.action === "BLOCKED"          ? "bg-red-500" :
                        e.action === "ROLLBACK"         ? "bg-gray-700" :
                        e.action === "ROLLBACK_PARTIAL" ? "bg-amber-600" : "bg-gray-500"
                      }`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-red-900">
                      {e.switch_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {e.block_type === "surgical"
                        ? <span className="text-indigo-600">Surgical</span>
                        : e.block_type === "switch_wide"
                          ? <span className="text-red-600 font-bold">Switch-wide</span>
                          : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{e.src_ip ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">
                      {e.flow_id ?? (e.action === "ROLLBACK" || e.action === "ROLLBACK_PARTIAL"
                        ? `${e.cleaned?.length || 0} Rolled back, ${e.failed?.length || 0} Stuck`
                        : "Constraint Removed")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rollback Stuck Constraints warning */}
          {mitigationLog.some(e => e.action === "ROLLBACK_PARTIAL" && e.failed?.length > 0) && (
            <div className="px-5 py-4 border-t border-amber-200 bg-amber-50">
              <h4 className="text-xs font-bold text-amber-800">Telemetry Alert: Stuck Constraints Detected</h4>
              <p className="text-xs text-amber-700 mt-1">
                Failed to release switches: {Array.from(new Set(
                  mitigationLog
                    .filter(e => e.action === "ROLLBACK_PARTIAL" && e.failed)
                    .flatMap(e => e.failed)
                )).join(", ")}. Direct controller mitigation clear required.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Auto-Block Actions logs */}
      {autoBlockLog.length > 0 && (
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-red-200 bg-red-500/10">
            <h3 className="font-extrabold text-sm text-red-700 flex items-center gap-2">
              <span>🚨</span> Autonomous Quarantine Log
            </h3>
            <button onClick={() => setAutoBlockLog([])} className="btn-reactive text-xs text-red-500 hover:text-red-700 font-semibold">
              Flush Log
            </button>
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-red-50/30 sticky top-0 border-b border-red-200">
                <tr>
                  {["Time", "Switch Node", "RF Certainty", "Action Result"].map(h => (
                    <th key={h} className="px-4 py-3 text-red-700 font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {autoBlockLog.map((e, i) => (
                  <tr key={i} className="hover:bg-red-50/10">
                    <td className="px-4 py-3 font-mono text-gray-500">{e.ts}</td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{e.switch_id}</td>
                    <td className="px-4 py-3 text-gray-600 font-semibold">{fmt((e.prob ?? 0) * 100)}%</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white">
                        AUTO-QUARANTINED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

