import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import AllNodes from "./Pages/Nodes/AllNodes";
import NodeConnector from "./Pages/Nodes/NodeConnector";
import TopologySimple from "./Pages/Topology/TopologySimple";
import Spinner from "./Components/Spinner";
import Login from "./Components/Login/Login";
import Layout from "./Components/Layout/Layout";
import ApiTester from "./Pages/ApiTester/ApiTester";
import Yangman from "./Pages/Yangui/YangLast";
import Dashboard from "./Components/Dashboard/Dashboard";
import Flows from "./Pages/Flows";
import FlowManager from "./Pages/FlowManager";
import Stats from "./Pages/Stats";
import AnomalyDetector from "./Pages/AnomalyDetector/AnomalyDetector";
import Cloud from "./Pages/Cloud";
import NetworkSlicing from "./Pages/NetworkSlicing";
import SlicingVerification from "./Pages/SlicingVerification";
import NetworkSlices from "./Pages/NetworkSlices";
import VmTopologyMap from "./Pages/VmTopologyMap";
import SecurityHub from "./Pages/Security/SecurityHub";
import SlicingHub from "./Pages/Slicing/SlicingHub";
import { NotificationProvider } from "./context/NotificationContext";
import { SdnProvider } from "./pipeline/SdnContext";

// ─── Top-level error boundary — shows the actual crash instead of white screen
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, fontFamily: "monospace" }}>
        <h2 style={{ color: "red" }}>App crashed — check the error below:</h2>
        <pre style={{ background: "#fee", padding: 16, borderRadius: 8, whiteSpace: "pre-wrap" }}>
          {this.state.error.message}{"\n\n"}{this.state.error.stack}
        </pre>
        <button onClick={() => this.setState({ error: null })}
          style={{ marginTop: 16, padding: "8px 16px" }}>
          Retry
        </button>
      </div>
    );
    return this.props.children;
  }
}

function TopologyRoute() {
  // OpenFlow state
  const [openflowTopo, setOpenflowTopo]       = React.useState(null);
  const [openflowLoading, setOpenflowLoading] = React.useState(true);
  const [openflowError, setOpenflowError]     = React.useState(null);

  // DevStack state
  const [devstackTopo, setDevstackTopo]       = React.useState(null);
  const [devstackLoading, setDevstackLoading] = React.useState(true);
  const [devstackError, setDevstackError]     = React.useState(null);

  // Cloud data for cross-check (DevStack only)
  const [cloudData, setCloudData]             = React.useState(null);
  const [crossCheck, setCrossCheck]           = React.useState(true);

  const loadTopologies = React.useCallback(() => {
    setOpenflowLoading(true);
    setDevstackLoading(true);
    setOpenflowError(null);
    setDevstackError(null);
    import("./Pages/Topology/TopologyService").then(({ default: svc }) => {
      // Fetch OpenFlow topology
      svc.getNode("flow:1")
        .then((data) => { setOpenflowTopo(data); setOpenflowLoading(false); })
        .catch((err) => { setOpenflowError(err.message); setOpenflowLoading(false); });

      // Fetch DevStack topology + cloud summary
      Promise.all([
        svc.getNode("ovsdb:1"),
        fetch("/api/openstack/cloud-summary")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ])
        .then(([topoData, cloud]) => {
          setDevstackTopo(topoData);
          setCloudData(cloud);
          setDevstackLoading(false);
        })
        .catch((err) => {
          setDevstackError(err.message);
          setDevstackLoading(false);
        });
    });
  }, []);

  React.useEffect(() => {
    loadTopologies();
  }, [loadTopologies]);

  // Cross-check filter & topology graph integrity for DevStack topology
  const displayedDevstackTopo = React.useMemo(() => {
    if (!devstackTopo) return null;

    let nodes = [...(devstackTopo.nodes || [])];
    let links = [...(devstackTopo.links || [])];

    // 1. Ensure OVS Host exists
    let ovsNode = nodes.find((n) => n.group === "ovs-host");
    if (!ovsNode) {
      const ovsId = "ovsdb://192.168.122.156:6640";
      ovsNode = {
        id: ovsId,
        label: "OVS Host (DevStack)",
        group: "ovs-host",
        value: 28,
        title: "OVS Host: <b>DevStack</b><br>Type: <b>OVSDB Host Manager</b><br>IP: <b>192.168.122.156</b>",
        nodeDetails: {
          type: "OVS Host",
          hostname: "DevStack",
          nodeId: ovsId,
          ip: "192.168.122.156",
        },
      };
      nodes.unshift(ovsNode);
    }

    // 2. Ensure Integration Bridge (br-int) exists
    let brIntNode = nodes.find((n) => n.group === "bridge-int");
    if (!brIntNode) {
      const brIntId = "bridge/br-int";
      brIntNode = {
        id: brIntId,
        label: "Integration Bridge (br-int)",
        group: "bridge-int",
        value: 26,
        title: "Bridge: <b>br-int</b><br>Type: <b>Integration Bridge (DevStack OVN)</b>",
        nodeDetails: {
          type: "Integration Bridge",
          bridgeName: "br-int",
          nodeId: brIntId,
        },
      };
      nodes.push(brIntNode);
    }

    // 3. Ensure External Bridge (br-ex) exists
    let brExNode = nodes.find((n) => n.group === "bridge-ex");
    if (!brExNode) {
      const brExId = "bridge/br-ex";
      brExNode = {
        id: brExId,
        label: "External Bridge (br-ex)",
        group: "bridge-ex",
        value: 22,
        title: "Bridge: <b>br-ex</b><br>Type: <b>External Uplink Bridge</b>",
        nodeDetails: {
          type: "External Bridge",
          bridgeName: "br-ex",
          nodeId: brExId,
        },
      };
      nodes.push(brExNode);
    }

    // 4. Ensure Link OVS Host <-> br-int exists
    const hasHostIntLink = links.some(
      (l) => (l.from === ovsNode.id && l.to === brIntNode.id) || (l.from === brIntNode.id && l.to === ovsNode.id)
    );
    if (!hasHostIntLink) {
      links.push({
        from: ovsNode.id,
        to: brIntNode.id,
        title: "OVSDB ↔ Integration Bridge",
        dashes: true,
        color: { color: "#818cf8" },
        width: 1.5,
      });
    }

    // 5. Ensure Patch Link br-int <-> br-ex exists
    const hasPatchLink = links.some(
      (l) => (l.from === brIntNode.id && l.to === brExNode.id) || (l.from === brExNode.id && l.to === brIntNode.id)
    );
    if (!hasPatchLink) {
      links.push({
        from: brIntNode.id,
        to: brExNode.id,
        title: "Patch Link: <b>patch-br-int-to-br-ex</b>",
        width: 3.5,
        color: { color: "#818cf8", highlight: "#6366f1" },
      });
    }

    // 6. Merge & Attach OpenStack VMs from cloud-summary
    const cloudVms = cloudData?.virtualMachines || [];
    cloudVms.forEach((vm) => {
      const vmId = `vm-${vm.id}`;
      const vmLabel = `${vm.name || "VM"}\n${vm.ip || ""}`;
      const existingVmNode = nodes.find((n) => n.id === vmId || n.nodeDetails?.vmUuid === vm.id);
      if (!existingVmNode) {
        nodes.push({
          id: vmId,
          label: vmLabel,
          group: "vm",
          value: 18,
          title: `VM: <b>${vm.name}</b><br>IP: <b>${vm.ip}</b><br>Status: <b>${vm.status}</b><br>Network: ${vm.network || "N/A"}<br>Port: ${vm.logicalPort || "N/A"}`,
          nodeDetails: {
            type: "Virtual Machine",
            vmUuid: vm.id,
            vmName: vm.name,
            ip: vm.ip,
            allIps: vm.allIps,
            network: vm.network,
            logicalPort: vm.logicalPort,
            ifaceStatus: vm.status,
          },
        });
      }

      // Link VM to br-int
      const targetVmId = existingVmNode ? existingVmNode.id : vmId;
      const isVmLinked = links.some(
        (l) => (l.from === targetVmId && l.to === brIntNode.id) || (l.from === brIntNode.id && l.to === targetVmId)
      );
      if (!isVmLinked) {
        links.push({
          from: targetVmId,
          to: brIntNode.id,
          title: `VM Interface: <b>${vm.logicalPort?.slice(0, 11) || "tap"}</b><br>IP: <b>${vm.ip}</b>`,
          width: 2,
          color: { color: "#38bdf8" },
        });
      }
    });

    // 7. Ensure ANY VM node currently in nodes has a link to br-int (never floating)
    nodes.filter((n) => n.group === "vm").forEach((vmNode) => {
      const isLinked = links.some((l) => l.from === vmNode.id || l.to === vmNode.id);
      if (!isLinked) {
        links.push({
          from: vmNode.id,
          to: brIntNode.id,
          title: `VM Interface: <b>${vmNode.nodeDetails?.tapPort || "tap"}</b>`,
          width: 2,
          color: { color: "#38bdf8" },
        });
      }
    });

    // 8. Cross-check filter: if enabled, remove foreign/stale VMs
    if (crossCheck && cloudVms.length > 0) {
      const myVmIds = new Set(cloudVms.map((vm) => vm.id));
      const foreignVmNodeIds = new Set();
      nodes.forEach((n) => {
        if (n.group === "vm" && n.nodeDetails?.vmUuid) {
          if (!myVmIds.has(n.nodeDetails.vmUuid)) {
            foreignVmNodeIds.add(n.id);
          }
        }
      });

      if (foreignVmNodeIds.size > 0) {
        nodes = nodes.filter((n) => !foreignVmNodeIds.has(n.id));
        links = links.filter(
          (l) => !foreignVmNodeIds.has(l.from) && !foreignVmNodeIds.has(l.to)
        );
      }
    }

    return {
      ...devstackTopo,
      nodes,
      links,
    };
  }, [devstackTopo, cloudData, crossCheck]);

  const renderSection = (title, topo, loading, error, reloadFn, extraProps = {}) => {
    if (loading) return <Spinner />;
    if (error || !topo) return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-400 gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="text-sm">{title} unavailable — {error || "no data returned"}</div>
        <button 
          onClick={reloadFn}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
    return (
      <TopologySimple
        topologyData={topo}
        title={title}
        onReload={reloadFn}
        {...extraProps}
      />
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {renderSection(
        "OpenFlow Topology",
        openflowTopo,
        openflowLoading,
        openflowError,
        () => {
          setOpenflowLoading(true);
          setOpenflowError(null);
          import("./Pages/Topology/TopologyService").then(({ default: svc }) => {
            svc.getNode("flow:1")
              .then((data) => { setOpenflowTopo(data); setOpenflowLoading(false); })
              .catch((err) => { setOpenflowError(err.message); setOpenflowLoading(false); });
          });
        }
      )}

      {renderSection(
        "DevStack OVSDB Topology",
        displayedDevstackTopo,
        devstackLoading,
        devstackError,
        () => {
          setDevstackLoading(true);
          setDevstackError(null);
          import("./Pages/Topology/TopologyService").then(({ default: svc }) => {
            Promise.all([
              svc.getNode("ovsdb:1"),
              fetch("/api/openstack/cloud-summary")
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
            ])
              .then(([topoData, cloud]) => {
                setDevstackTopo(topoData);
                setCloudData(cloud);
                setDevstackLoading(false);
              })
              .catch((err) => {
                setDevstackError(err.message);
                setDevstackLoading(false);
              });
          });
        },
        {
          crossCheckOpenstack: crossCheck,
          onToggleCrossCheck: (val) => setCrossCheck(val),
          openstackConnected: Boolean(cloudData?.virtualMachines),
        }
      )}
    </div>
  );
}

const App = () => (
  <AppErrorBoundary>
    <SdnProvider>
      <NotificationProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/"                    element={<Navigate to="/dashboard" replace />} />
              <Route path="/login"               element={<Login />} />
              <Route path="/dashboard"           element={<Dashboard />} />
              <Route path="/nodes"               element={<AllNodes />} />
              <Route path="/node/:nodeId/detail" element={<NodeConnector />} />
              <Route path="/flows"               element={<Flows />} />
              <Route path="/flow-manager"       element={<FlowManager />} />
              <Route path="/stats"               element={<Stats />} />
              <Route path="/topology"            element={<TopologyRoute />} />
              <Route path="/cloud"               element={<Cloud />} />
              <Route path="/vm-topology"         element={<VmTopologyMap />} />
              
              {/* Slicing Suite Routes */}
              <Route path="/slicing"              element={<SlicingHub defaultTab="overview" />} />
              <Route path="/slicing/overview"     element={<SlicingHub defaultTab="overview" />} />
              <Route path="/slicing/onos"         element={<SlicingHub defaultTab="onos" />} />
              <Route path="/slicing/openstack"    element={<SlicingHub defaultTab="openstack" />} />
              <Route path="/slicing/odl"          element={<SlicingHub defaultTab="odl" />} />
              <Route path="/slicing/verification" element={<SlicingHub defaultTab="verification" />} />

              {/* Slicing Backward Compatibility Aliases */}
              <Route path="/network-slicing"      element={<Navigate to="/slicing/onos" replace />} />
              <Route path="/slices"               element={<Navigate to="/slicing/openstack" replace />} />
              <Route path="/slicing-verification" element={<Navigate to="/slicing/verification" replace />} />

              {/* Security Suite Routes */}
              <Route path="/security"            element={<SecurityHub defaultTab="overview" />} />
              <Route path="/security/overview"   element={<SecurityHub defaultTab="overview" />} />
              <Route path="/security/anomaly"    element={<SecurityHub defaultTab="anomaly" />} />
              <Route path="/security/linkguard"  element={<SecurityHub defaultTab="linkguard" />} />
              <Route path="/security/tls"        element={<SecurityHub defaultTab="tls" />} />

              {/* Security Backward Compatibility Aliases */}
              <Route path="/anomaly"             element={<Navigate to="/security/anomaly" replace />} />
              <Route path="/linkguard"           element={<Navigate to="/security/linkguard" replace />} />
              <Route path="/tls"                 element={<Navigate to="/security/tls" replace />} />

              <Route path="/api-tester"          element={<ApiTester />} />
              <Route path="/yangui"              element={<Yangman />} />
              <Route path="*"                    element={<div className="p-8 text-gray-400">Page not found</div>} />
            </Routes>
          </Layout>
        </Router>
      </NotificationProvider>
    </SdnProvider>
  </AppErrorBoundary>
);

export default App;
