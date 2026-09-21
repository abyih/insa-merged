import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Header from "./Components/Header/Header";
import Dashboard from "./Components/Dashboard/Dashboard";
import AllNodes from "./Pages/Nodes/AllNodes";
import TopologySimple from "./Pages/Topology/TopologySimple";
import NodeConnector from "./Pages/Nodes/NodeConnector";
import Flows from "./Pages/Flows"; 
import Stats from "./Pages/Stats";
import NetworkSlicing from "./Pages/NetworkSlicing/NetworkSlicing";
import IntentSlicing from "./Pages/IntentSlicing/IntentSlicing";
import SlicingHub from "./Pages/Slicing/SlicingHub";
import SlicingVerification from "./Pages/SlicingVerification";
import LinkGuard from "./Pages/LinkGuard";
import FlowManager from "./Pages/FlowManager";
import PathTrace from "./Pages/PathTrace/PathTrace";
import AnomalyDetector from "./Pages/AnomalyDetector/AnomalyDetector";
import ApiTester from "./Pages/ApiTester/ApiTester";
import NetworkTopologySvc from "./Pages/Topology/TopologyService";
import * as controllerManager from "./api/controllerManager";

// Safety Wrapper to prevent crashes before ODL data arrives
function TopologyRoute() {
  const [topo, setTopo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    NetworkTopologySvc.getNode()
      .then((data) => {
        setTopo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400 font-black uppercase animate-pulse">Mapping SDN Infrastructure...</div>;
  if (error || !topo) return (
    <div className="flex flex-col items-center justify-center h-screen text-red-500 font-bold gap-2">
      <span>Failed to sync with {controllerManager.CONTROLLERS[controllerManager.getActiveController()].label} Controller</span>
      {error && <span className="text-xs text-red-400 font-normal">{error}</span>}
    </div>
  );
  
  return <TopologySimple topologyData={topo} />;
}

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <main className="flex-1 pt-24 px-6 pb-10 w-full max-w-[1800px] mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/nodes" element={<AllNodes />} />
            <Route path="/node/:nodeId/detail" element={<NodeConnector />} />
            <Route path="/topology" element={<TopologyRoute />} />
            <Route path="/flows" element={<Flows />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/slicing" element={<NetworkSlicing />} />
            <Route path="/network-slicing" element={<NetworkSlicing />} />
            <Route path="/slicing-hub" element={<SlicingHub />} />
            <Route path="/intent-slicing" element={<IntentSlicing />} />
            <Route path="/slicing-verification" element={<SlicingVerification />} />
            <Route path="/link-guard" element={<LinkGuard />} />
            <Route path="/flow-manager" element={<FlowManager />} />
            <Route path="/path-trace" element={<PathTrace />} />
            <Route path="/anomaly" element={<AnomalyDetector />} />
            <Route path="/api-tester" element={<ApiTester />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;