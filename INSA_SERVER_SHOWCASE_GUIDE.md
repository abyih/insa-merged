# 🚀 INSA Server Deployment & Live Showcase Playbook

A complete step-by-step operational guide to set up, connect, launch, and showcase the **SDN Network Slicing & OpenStack Cloud Management Platform** on the INSA server.

---

## 📋 Quick Reference & Network Topology

| Component | Role | Location / Host IP | Default Credentials | Ports Used |
| :--- | :--- | :--- | :--- | :--- |
| **INSA Host Server** | Main host machine (`virbr0: 192.168.122.1`) | `localhost` | Current user (`abyih`) | `5173`, `5000`, `5001`, `5005` |
| **ONOS SDN Controller** | L2/OpenFlow Controller | Docker container on Host | `onos` / `rocks` | `8181` (REST/GUI), `6653` (OpenFlow), `8101` (CLI) |
| **DevStack VM** | OpenStack Cloud Infrastructure | `192.168.122.156` (KVM/libvirt) | `abyih` $\rightarrow$ `stack` | `80` (Keystone/Dashboard), `22` (SSH) |
| **Mininet VM** | Data Plane & OVS Network | `192.168.122.88` (KVM/libvirt) | `mininet` / `mininet` | `22` (SSH) |
| **Web Dashboard** | React Vite Frontend | `http://localhost:5173` | `insa` / `insa123` | `5173` |

---

## 🖥️ Recommended Terminal Layout for Demo Day

Have **6 dedicated terminal windows/tabs** open for clean separation and immediate control:
1. **Terminal 1 (Host)**: ONOS Backend Middleware (`server-onos.js`)
2. **Terminal 2 (Host)**: DevStack Backend Middleware (`server.js`)
3. **Terminal 3 (Host)**: AI Intent Service
4. **Terminal 4 (Host)**: React Vite Frontend UI
5. **Terminal 5 (Mininet SSH)**: Mininet CLI (`mininet>`) for live traffic testing
6. **Terminal 6 (DevStack SSH)**: DevStack CLI for OpenStack commands

---

## Phase 1: Host Infrastructure & Controller Setup

### Step 1: Start or Verify KVM Virtual Machines
On the INSA host machine:
```bash
# Check if the VMs are running
virsh list --all

# If they are shut off, start them:
virsh start devstack
virsh start mininet

# Check VM IP addresses assigned on virbr0:
virsh domifaddr devstack
virsh domifaddr mininet
```
*(Default IPs: DevStack is `192.168.122.156`, Mininet is `192.168.122.88`).*

---

### Step 2: Start ONOS SDN Controller (Docker)
```bash
# Check if ONOS container exists
docker ps -a | grep onos

# If stopped, start it:
docker start onos

# (If setting up fresh on a new server):
# docker run -d --name onos -p 8181:8181 -p 6653:6653 -p 6640:6640 -p 8101:8101 onosproject/onos:latest
```

Verify ONOS GUI is reachable:
- Open in browser: `http://localhost:8181/onos/ui` (Username: `onos`, Password: `rocks`)

*(Optional) Ensure OpenFlow & Forwarding apps are active:*
```bash
# SSH into ONOS Karaf CLI (Password: rocks)
ssh -p 8101 onos@localhost

# In ONOS CLI:
app activate org.onosproject.openflow
app activate org.onosproject.fwd
logout
```

---

## Phase 2: Project Setup & Dependencies on Host

Navigate to the project root:
```bash
cd /home/abyih/projects/work/insa/insa-merged
```

### Step 1: Install Node.js Dependencies
```bash
# Install all required packages (including node-cron, better-sqlite3, etc.)
bun install
# (or: npm install)
```

### Step 2: Initialize Database & Default Admin Login
```bash
node setup-db.js
```
*Expected Output:*
```
User 'insa' already exists. (or created)
Database tables initialized successfully.
```
*Default login created: Username **`insa`** / Password **`insa123`**.*

### Step 3: Install Python AI Dependencies
```bash
cd anomaly
uv sync
cd ..
```

### Step 4: Verify `.env` File
Make sure your `.env` contains:
```ini
ONOS_URL=http://localhost:8181
ONOS_USERNAME=onos
ONOS_PASSWORD=rocks
PORT=5000

KEYSTONE_URL=http://192.168.122.156/identity/v3
OS_USERNAME=admin
OS_PASSWORD=secret
OS_PROJECT_NAME=admin
OS_USER_DOMAIN_NAME=default
OS_PROJECT_DOMAIN_NAME=default

MININET_HOST=192.168.122.88
MININET_USER=mininet
MININET_SSH_KEY=~/.ssh/id_main
INTENT_SERVICE_URL=http://127.0.0.1:5005
```

---

## Phase 3: DevStack VM Configuration (SSH & Commands)

### Step 1: SSH into DevStack VM
```bash
ssh abyih@192.168.122.156
```

### Step 2: Switch to `stack` User
```bash
sudo -su stack
# (or: sudo su - stack)
```

### Step 3: Source OpenStack Credentials & Verify Services
```bash
cd ~/devstack
source openrc admin admin

# Verify OpenStack services are UP:
openstack service list
openstack server list
openstack network list
```

### Step 4: Verify OVS Bridge Controller (if pointing to Host ONOS/ODL)
```bash
sudo ovs-vsctl set-manager ptcp:6640:127.0.0.1 tcp:192.168.122.1:6640
sudo ovs-vsctl set-controller br-int tcp:192.168.122.1:6653
```

> **If DevStack Stopped After a VM Reboot:**
> ```bash
> cd ~/devstack
> ./rejoin-stack.sh
> ```

Keep this terminal open for OpenStack verification during the demo.

---

## Phase 4: Mininet VM Configuration (SSH & Commands)

### Step 1: Copy QoS Setup Script to Mininet
From your host terminal:
```bash
scp scripts/setup_mininet_qos.sh mininet@192.168.122.88:~/
```

### Step 2: SSH into Mininet VM
```bash
ssh mininet@192.168.122.88
# Password: mininet
```

### Step 3: Clean & Start Mininet Topology
Always clean any hanging Open vSwitch state first:
```bash
sudo mn -c
```

Now start Mininet connected to the ONOS controller (`192.168.122.1:6653` on host `virbr0`):
```bash
sudo mn --controller=remote,ip=192.168.122.1,port=6653 \
        --topo=tree,depth=2,fanout=2 \
        --switch=ovsk,protocols=OpenFlow13 \
        --mac
```
*(This launches a 3-switch, 4-host topology: `s1`, `s2`, `s3` with hosts `h1`, `h2`, `h3`, `h4`).*

### Step 4: Configure OVS QoS Queues
In a second SSH session to Mininet (`ssh mininet@192.168.122.88`):
```bash
sudo bash ~/setup_mininet_qos.sh --auto
```
*This automatically creates:*
- **Queue 0** (URLLC / High Priority / DSCP 46): 60 Mbps guaranteed
- **Queue 1** (Best Effort): 15 Mbps guaranteed
- **Total Link Ceiling**: 80 Mbps

### Step 5: Trigger Initial Host Discovery
In the Mininet CLI:
```bash
mininet> pingall
```
*(This sends initial ARP packets so ONOS discovers `h1`, `h2`, `h3`, `h4`).*

Keep this Mininet prompt active for live testing.

---

## Phase 5: Launching All Application Services

Open separate host terminals (or use tmux/tabs) and start the services:

### Terminal 1: ONOS Slicing Middleware (Port 5001)
```bash
cd /home/abyih/projects/work/insa/insa-merged
bun run server:onos
```

### Terminal 2: DevStack / OpenStack Backend (Port 5000)
```bash
cd /home/abyih/projects/work/insa/insa-merged
bun run server
```

### Terminal 3: AI Intent Service (Port 5005)
```bash
cd /home/abyih/projects/work/insa/insa-merged
bun run intent:service
```

### Terminal 4: React UI Frontend (Port 5173)
```bash
cd /home/abyih/projects/work/insa/insa-merged
bun run dev
```

> **Shortcut Alternative:**
> To start all services in a single terminal with colored outputs:
> ```bash
> ./start_services.sh --with-frontend
> ```

---

## Phase 6: Live Showcase Script (Step-by-Step Demo)

### 1. Open the UI & Log In
- Open browser: `http://localhost:5173`
- Log in with:
  - **Username:** `insa`
  - **Password:** `insa123`

---

### 2. Showcase ONOS Network Slicing
1. Click **Network Slicing** (`/network-slicing`) in the sidebar.
2. Show the audience:
   - **Topology Overview**: Detected switches (`s1`, `s2`, `s3`) and active hosts (`h1`=10.0.0.1, `h2`=10.0.0.2, etc.).
   - **Capacity Budget**: Total physical capacity pool (100 MB/s).
3. **Provision Slice 1 (URLLC Slice):**
   - Click **+ Create Slice**.
   - Name: `URLLC-Robotics-Slice`
   - Template: Select **URLLC (Ultra-Reliable Low Latency)**
   - Member Hosts: Select `10.0.0.1 (h1)` and `10.0.0.2 (h2)`.
   - Click **Deploy Slice**.
4. **Provision Slice 2 (eMBB Slice):**
   - Click **+ Create Slice**.
   - Name: `eMBB-Video-Slice`
   - Template: Select **eMBB (Enhanced Mobile Broadband)**
   - Member Hosts: Select `10.0.0.3 (h3)` and `10.0.0.4 (h4)`.
   - Click **Deploy Slice**.

---

### 3. Live Terminal Verification in Mininet (The Demo Climax)

Switch to **Terminal 5 (Mininet)** to show live data-plane enforcement:

#### A. Intra-Slice Connectivity (Allowed):
```bash
mininet> h1 ping -c 3 h2
```
*Result: 0% packet loss, RTT < 1ms.*

#### B. Cross-Slice Isolation (Blocked):
```bash
mininet> h1 ping -c 3 h3
```
*Result: 100% packet loss! Traffic between Slice 1 and Slice 2 is strictly blocked by Priority 39000 drop rules.*

#### C. Bandwidth Enforcement via OpenFlow Meters:
```bash
mininet> h2 iperf -s -u &
mininet> h1 iperf -c 10.0.0.2 -u -b 80M -t 10 -i 1
```
*Result: Even though h1 sends at 80 Mbps, the meter drops excess packets and throughput is capped at the slice's configured bandwidth!*

#### D. Low-Latency URLLC Prioritization (DSCP 46 / Queue 0):
```bash
mininet> h1 ping -Q 184 10.0.0.2
```
*(TOS byte 184 = DSCP 46 EF. Packets enter Queue 0 on OpenFlow switches).*

#### E. Inspect Live OVS Flows on Switches:
In Mininet VM bash:
```bash
sudo ovs-ofctl dump-flows s1 -O OpenFlow13
sudo ovs-ofctl dump-meters s1 -O OpenFlow13
```

---

### 4. Showcase AI Intent-Based Slicing
1. On the Slicing page, open the **AI Intent-Based Slicing** tab.
2. Select **Smart Heuristic** or **LLM Provider**.
3. Type:
   > *"Provision an ultra-reliable low latency slice between 10.0.0.1 and 10.0.0.2 with 30 MB/s bandwidth."*
4. Click **Compile Intent** $\rightarrow$ Show the extracted parameters $\rightarrow$ Click **Apply & Provision**.

---

### 5. Showcase OpenStack Cloud Slicing
1. Click **Cloud Slices** (`/network-slices`).
2. Show the audience:
   - Live VMs fetched from DevStack Nova (`openstack server list`).
   - Neutron QoS capabilities (Bandwidth limit rules, Minimum bandwidth, DSCP).
3. Create a Cloud Slice isolating tenant VMs into a dedicated QoS policy and Security Group.

---

## Phase 7: Emergency Troubleshooting & Quick Fixes

| Symptom | Cause | Quick Fix Command |
| :--- | :--- | :--- |
| `Cannot find package 'node-cron'` | Missing dependency in `node_modules` | Run `bun install` or `npm install` in repo root. |
| Duplicate / Stale host MACs in ONOS | Mininet restarted with new MACs | Clear old MACs in ONOS: `curl -X DELETE -u onos:rocks "http://localhost:8181/onos/v1/hosts/<MAC>%2FNone"` |
| Hosts not showing in ONOS topology | Hosts haven't transmitted yet | Run `mininet> pingall` in Mininet console. |
| `5000` / `5001` port in use | Previous process still running in background | Run `fuser -k 5000/tcp 5001/tcp 5005/tcp 5173/tcp` |
| DevStack API unreachable | DevStack VM shut off or IP changed | Run `virsh list` and `virsh domifaddr devstack`. Update `KEYSTONE_URL` in `.env` if IP changed. |
| Controller port collision (6653/8181) | Both ODL and ONOS are running | `docker stop odl && docker start onos` |
| DevStack services down after reboot | DevStack doesn't auto-start on boot | SSH to DevStack $\rightarrow$ `sudo -su stack` $\rightarrow$ `cd ~/devstack && ./rejoin-stack.sh` |
