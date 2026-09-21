# PNTC — Startup Runbook

Every command needed to bring the full stack up from a cold boot, in the order that
actually works (ODL needs a head start; Mininet needs OVS already running; the frontend
needs the backend already listening). This assumes the machine already has the software
installed (Karaf/ODL, Mininet/OVS, Docker, Node, Python venv) — this is the **run** guide,
not the from-scratch install guide (that's in `README.md`).

All long-running processes go in detached `screen` sessions so they survive independently
of your terminal. `screen -r <name>` to attach to one, `Ctrl-A` then `D` to detach again
without killing it.

---

## 0. One-time sanity checks (skip if you know OVS is already running)

```bash
sudo systemctl status openvswitch-switch --no-pager
# if not active:
sudo systemctl start openvswitch-switch
```

---

## 1. Start OpenDaylight (ODL)

ODL is slow to boot (~60–90s to finish loading features) — start it first and let it
run in the background while you do everything else.

```bash
cd ~/karaf-0.23.1
screen -dmS odl ./bin/karaf
```

Wait ~60s, then confirm RESTCONF (TLS) is answering:

```bash
sleep 60
curl -sk -u admin:admin https://127.0.0.1:8443/rests/data/network-topology:network-topology -o /dev/null -w "ODL RESTCONF HTTP:%{http_code}\n"
```

You want `200`. If you get connection-refused, give it more time and retry — first boot
can take up to 2 minutes.

> TLS is already configured on ODL's Jetty connector (`etc/jetty.xml`,
> `etc/org.ops4j.pax.web.cfg`, `etc/odl-tls-keystore.jks`) — nothing to redo here, it
> persists on disk across restarts.

---

## 2. Start Mininet (the emulated topology)

Run from the project root — `custom_topo.py` lives here. Must be run as root.

```bash
cd "/home/abigiya/Downloads/Telegram Desktop/Insa-dluxf ab/Insa-dluxf (2)"
sudo mn -c   # clean up any leftover state from a previous run — safe even on a fresh boot
sudo screen -dmS mn_slicing sudo mn --custom custom_topo.py --topo slicingtopo --controller=remote,ip=127.0.0.1,port=6653 --switch ovsk,protocols=OpenFlow13
```

Confirm all 8 switches connected to ODL:

```bash
sleep 5
sudo ovs-vsctl show | grep -c "is_connected: true"   # want: 8
```

Trigger host discovery — ODL only learns a host once it sees traffic from it, so without
this the Topology page will show switches with no hosts attached:

```bash
sudo screen -S mn_slicing -X stuff "pingall$(printf '\r')"
sleep 8
sudo screen -S mn_slicing -X hardcopy /tmp/pingall_check.txt && tail -12 /tmp/pingall_check.txt
```

You want `0% dropped (56/56 received)`.

---

## 3. Start ONOS (secondary controller, optional but the UI can switch to it)

```bash
docker start onos-concurrent
sleep 20
```

After a fresh container start, the OpenFlow apps come up `INSTALLED` but not `ACTIVE` —
nothing listens on the OpenFlow port until you activate all three:

```bash
for app in org.onosproject.openflow-base org.onosproject.openflow-message org.onosproject.openflow; do
  curl -s -u onos:rocks -X POST "http://localhost:8183/onos/v1/applications/${app}/active" -o /dev/null -w "$app: %{http_code}\n"
done
```

(If `onos-concurrent` doesn't exist yet — e.g. it was removed — recreate it with:
`docker run -d --name onos-concurrent -p 6666:6653 -p 8183:8181 -p 8102:8101 onosproject/onos:latest`,
then repeat the activation step above.)

---

## 4. Start the Python anomaly-detection services

Two independent Flask services: Isolation Forest (online, trains live from ODL flow
deltas) on 5001, Random Forest (offline, pretrained) on 5002.

```bash
cd "/home/abigiya/Downloads/Telegram Desktop/Insa-dluxf ab/Insa-dluxf (2)"
screen -dmS anomaly_if bash -c "source anomaly_env/bin/activate && cd anomaly && python detector.py"
screen -dmS anomaly_rf bash -c "source anomaly_env/bin/activate && cd anomaly && python rf_detector.py"
sleep 3
curl -s -o /dev/null -w "IF (5001) HTTP:%{http_code}\n" http://localhost:5001/
curl -s -o /dev/null -w "RF (5002) HTTP:%{http_code}\n" http://localhost:5002/
```

---

## 5. Start the Node.js backend

Proxies ODL RESTCONF (TLS) and ONOS REST so the browser never talks to either controller
directly. `NODE_EXTRA_CA_CERTS` points Node at ODL's self-signed cert so the TLS handshake
validates instead of failing.

```bash
cd "/home/abigiya/Downloads/Telegram Desktop/Insa-dluxf ab/Insa-dluxf (2)"
screen -dmS pntc_server npm run server
sleep 2
curl -s -o /dev/null -w "Backend (5050) HTTP:%{http_code}\n" http://localhost:5050/api/tls-status
```

---

## 6. Start the React frontend (Vite)

```bash
cd "/home/abigiya/Downloads/Telegram Desktop/Insa-dluxf ab/Insa-dluxf (2)"
screen -dmS pntc_vite npm run dev
sleep 3
curl -s -o /dev/null -w "Frontend (5175) HTTP:%{http_code}\n" http://localhost:5175/
```

Open **http://localhost:5175** in a browser. Log in and check the Topology page — all
8 switches and 8 hosts should be visible (from the `pingall` in step 2).

---

## 7. Full health check (run anytime)

```bash
echo "ODL:      $(curl -sk -o /dev/null -w '%{http_code}' -u admin:admin https://127.0.0.1:8443/rests/data/network-topology:network-topology)"
echo "ONOS:     $(curl -s -o /dev/null -w '%{http_code}' -u onos:rocks http://localhost:8183/onos/v1/devices)"
echo "Backend:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5050/api/tls-status)"
echo "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5175/)"
echo "IF (5001):$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5001/)"
echo "RF (5002):$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5002/)"
sudo ovs-vsctl show | grep -c "is_connected: true"   # want: 8
```

---

## Shutting everything down

```bash
screen -X -S pntc_vite quit
screen -X -S pntc_server quit
screen -X -S anomaly_if quit
screen -X -S anomaly_rf quit
docker stop onos-concurrent
sudo screen -X -S mn_slicing quit   # tears down the Mininet topology
sudo mn -c
screen -X -S odl quit               # or leave ODL running — its config persists either way
```

---

## Quick reference — screen sessions & ports

| Session | Runs | Port(s) |
|---|---|---|
| `odl` | Karaf / OpenDaylight | 8443 (RESTCONF, TLS), 6653 (OpenFlow) |
| `mn_slicing` (root) | Mininet — 8 switches, 8 hosts | — |
| `onos-concurrent` (Docker) | ONOS | 8183 (REST), 6666 (OpenFlow) |
| `anomaly_if` | Isolation Forest detector | 5001 |
| `anomaly_rf` | Random Forest detector | 5002 |
| `pntc_server` | Node/Express backend | 5050 |
| `pntc_vite` | Vite dev server (the actual app UI) | 5175 |

Creds: ODL `admin:admin`, ONOS `onos:rocks`.

---

## Troubleshooting notes learned the hard way

- **Topology page shows switches but few/no hosts** → ODL hasn't seen traffic from them
  yet. Run `pingall` in the `mn_slicing` screen (step 2) — a host only appears once it
  sends a packet.
- **Stale `iperf`/`ping` processes breaking a new test** — Mininet hosts share the host's
  PID namespace, so leftover processes from a previous test session are visible via
  `ps aux` and can silently pollute new traffic tests. Kill them explicitly
  (`sudo pkill -9 -f "iperf -s -u"`) before starting a new one on the same host.
- **Sending multiple `screen -X stuff` commands back-to-back without checking each landed**
  can corrupt the Mininet CLI (fragments of consecutive commands get concatenated into
  garbage). Send one command, `sleep`, then verify with
  `screen -S mn_slicing -X hardcopy /tmp/check.txt && tail /tmp/check.txt` before sending
  the next.
- **After any full reboot**, ODL usually survives (Karaf/TLS config is on disk) but
  Mininet, ONOS's container, the anomaly services, and the Node/Vite screens all die —
  re-run steps 2–6 above.
