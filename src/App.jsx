// import React from "react";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import "./App.css";
// import AllNodes from "./Pages/Nodes/AllNodes";
// import NodeConnector from "./Pages/Nodes/NodeConnector";
// import TopologySimple from "./Pages/Topology/TopologySimple";
// import Spinner from "./Components/Spinner";
// import Login from "./Components/Login/Login";
// import Layout from "./Components/Layout/Layout";
// import ApiTester from "./Pages/ApiTester/ApiTester";
// import Yangman from "./Pages/Yangui/YangLast";
// import Dashboard from "./Components/Dashboard/Dashboard";
// import Flows from "./Pages/Flows";
// import Stats from "./Pages/Stats";
// import AnomalyDetector from "./Pages/AnomalyDetector/AnomalyDetector";
// import Cloud from "./Pages/Cloud";

// // ─── Top-level error boundary — shows the actual crash instead of white screen
// class AppErrorBoundary extends React.Component {
//   constructor(props) { super(props); this.state = { error: null }; }
//   static getDerivedStateFromError(e) { return { error: e }; }
//   render() {
//     if (this.state.error) return (
//       <div style={{ padding: 32, fontFamily: "monospace" }}>
//         <h2 style={{ color: "red" }}>App crashed — check the error below:</h2>
//         <pre style={{ background: "#fee", padding: 16, borderRadius: 8, whiteSpace: "pre-wrap" }}>
//           {this.state.error.message}{"\n\n"}{this.state.error.stack}
//         </pre>
//         <button onClick={() => this.setState({ error: null })}
//           style={{ marginTop: 16, padding: "8px 16px" }}>
//           Retry
//         </button>
//       </div>
//     );
//     return this.props.children;
//   }
// }

// // ─── Topology route — lazy loads topology only when navigated to
// function TopologyRoute() {
//   const [topo, setTopo]       = React.useState(null);
//   const [loading, setLoading] = React.useState(true);
//   const [error, setError]     = React.useState(null);

//   React.useEffect(() => {
//     import("./Pages/Topology/TopologyService").then(({ default: svc }) => {
//       svc.getNode("flow:1")
//         .then((data) => { setTopo(data); setLoading(false); })
//         .catch((err) => { setError(err.message); setLoading(false); });
//     });
//   }, []);

//   if (loading) return <Spinner />;
//   if (error || !topo) return (
//     <div className="flex items-center justify-center h-64 text-gray-500">
//       Topology unavailable — ODL controller not reachable.
//     </div>
//   );
//   return <TopologySimple topologyData={topo} onReload={() => {
//     setTopo(null); setLoading(true); setError(null);
//     import("./Pages/Topology/TopologyService").then(({ default: svc }) =>
//       svc.getNode("flow:1")
//         .then((d) => { setTopo(d); setLoading(false); })
//         .catch((e) => { setError(e.message); setLoading(false); })
//     );
//   }} />;
// }

// const App = () => (
//   <AppErrorBoundary>
//     <Router>
//       <Layout>
//         <Routes>
//           <Route path="/"                    element={<Login />} />
//           <Route path="/dashboard"           element={<Dashboard />} />
//           <Route path="/nodes"               element={<AllNodes />} />
//           <Route path="/node/:nodeId/detail" element={<NodeConnector />} />
//           <Route path="/flows"               element={<Flows />} />
//           <Route path="/stats"               element={<Stats />} />
//           <Route path="/topology"            element={<TopologyRoute />} />
//           <Route path="/cloud"               element={<Cloud />} />
//           <Route path="/anomaly"             element={<AnomalyDetector />} />
//           <Route path="/api-tester"          element={<ApiTester />} />
//           <Route path="/yangui"              element={<Yangman />} />
//           <Route path="*"                    element={<div className="p-8 text-gray-400">Page not found</div>} />
//         </Routes>
//       </Layout>
//     </Router>
//   </AppErrorBoundary>
// );

// export default App;



















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
import PathTrace from "./Pages/PathTrace/PathTrace";
import AnomalyDetector from "./Pages/AnomalyDetector/AnomalyDetector";
import ApiTester from "./Pages/ApiTester/ApiTester";
import NetworkTopologySvc from "./Pages/Topology/TopologyService"; // Ensure this import is correct
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
            <Route path="/topology" element={<TopologyRoute />} /> {/* FIXED ROUTE */}
            <Route path="/flows" element={<Flows />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/slicing" element={<NetworkSlicing />} />
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