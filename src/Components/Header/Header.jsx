// // import React, { useState } from "react";
// // import { Link, useLocation } from "react-router-dom";
// // import {
// //   FaTachometerAlt,
// //   FaNetworkWired,
// //   FaMicrochip,
// //   FaProjectDiagram,
// //   FaChartBar,
// //   FaTools,
// //   FaBars,
// //   FaTimes,
// //   FaShieldAlt,
// //   FaCloud,
// // } from "react-icons/fa";
// // import logo from "../../assets/images/insa_logo.png";

// // function Header() {
// //   const location = useLocation();
// //   const isLoginPage = location.pathname === "/";
// //   const [menuOpen, setMenuOpen] = useState(false);

// //   const navItems = [
// //     { label: "Dashboard", icon: <FaTachometerAlt />, to: "/dashboard" },
// //     { label: "Topology", icon: <FaNetworkWired />, to: "/topology" },
// //     { label: "Devices", icon: <FaMicrochip />, to: "/nodes" },
// //     { label: "Flows", icon: <FaProjectDiagram />, to: "/flows" },
// //     { label: "Stats", icon: <FaChartBar />, to: "/stats" },
// //     { label: "Anomaly", icon: <FaShieldAlt />, to: "/anomaly" },
// //     { label: "Cloud", icon: <FaCloud />, to: "/cloud" },
// //     { label: "Tools", icon: <FaTools />, to: "/api-tester" },
// //   ];

// //   return (
// //     <header className="fixed top-0 left-0 right-0 bg-blue-900 text-white h-20 px-4 sm:px-6 flex items-center justify-between z-50 shadow-md">
// //       {/* Logo and title */}
// //       <div className="flex items-center gap-3">
// //         <img
// //           className="w-14 h-14 p-1 bg-gray-200 rounded-full"
// //           src={logo}
// //           alt="insa-logo"
// //         />
// //         <h1 className="text-2xl font-bold">PNTC</h1>
// //       </div>

// //       {/* Desktop Navigation */}
// //       {!isLoginPage && (
// //         <nav className="hidden md:flex items-center gap-6 text-sm">
// //           {navItems.map((item) => (
// //             <Link
// //               key={item.label}
// //               to={item.to}
// //               className={`flex items-center gap-2 hover:text-yellow-400 transition ${
// //                 location.pathname === item.to
// //                   ? "text-yellow-400 font-semibold"
// //                   : ""
// //               }`}
// //             >
// //               {item.icon}
// //               <span>{item.label}</span>
// //             </Link>
// //           ))}
// //           <Link
// //             to="/"
// //             onClick={() => localStorage.removeItem("isAuthenticated")}
// //             className="ml-4 py-1 px-3 bg-white text-blue-800 rounded hover:bg-gray-100 transition"
// //           >
// //             Logout
// //           </Link>
// //         </nav>
// //       )}

// //       {/* Mobile Menu Toggle */}
// //       {!isLoginPage && (
// //         <button
// //           onClick={() => setMenuOpen(!menuOpen)}
// //           className="md:hidden text-xl"
// //         >
// //           {menuOpen ? <FaTimes /> : <FaBars />}
// //         </button>
// //       )}

// //       {/* Mobile Menu */}
// //       {menuOpen && !isLoginPage && (
// //         <div className="absolute top-20 left-0 right-0 bg-blue-900 border-t border-blue-800 md:hidden">
// //           <nav className="flex flex-col px-4 py-4 gap-4 text-sm">
// //             {navItems.map((item) => (
// //               <Link
// //                 key={item.label}
// //                 to={item.to}
// //                 onClick={() => setMenuOpen(false)}
// //                 className={`flex items-center gap-2 hover:text-yellow-400 transition ${
// //                   location.pathname === item.to
// //                     ? "text-yellow-400 font-semibold"
// //                     : ""
// //                 }`}
// //               >
// //                 {item.icon}
// //                 <span>{item.label}</span>
// //               </Link>
// //             ))}
// //             <Link
// //               to="/"
// //               onClick={() => { localStorage.removeItem("isAuthenticated"); setMenuOpen(false); }}
// //               className="py-1 px-3 mt-2 bg-white text-blue-800 rounded hover:bg-gray-100 transition w-max"
// //             >
// //               Logout
// //             </Link>
// //           </nav>
// //         </div>
// //       )}
// //     </header>
// //   );
// // }

// // export default Header;

// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SdnToggle } from "./SdnToggle"; // Import the SDN Switch
// import {
//   FaTachometerAlt,
//   FaNetworkWired,
//   FaMicrochip,
//   FaProjectDiagram,
//   FaChartBar,
//   FaTools,
//   FaBars,
//   FaTimes,
//   FaShieldAlt,
//   FaCloud,
// } from "react-icons/fa";
// import logo from "../../assets/images/insa_logo.png";

// function Header() {
//   const location = useLocation();
//   const isLoginPage = location.pathname === "/";
//   const [menuOpen, setMenuOpen] = useState(false);

//   const navItems = [
//     { label: "Dashboard", icon: <FaTachometerAlt />, to: "/dashboard" },
//     { label: "Topology", icon: <FaNetworkWired />, to: "/topology" },
//     { label: "Devices", icon: <FaMicrochip />, to: "/nodes" },
//     { label: "Flows", icon: <FaProjectDiagram />, to: "/flows" },
//     { label: "Stats", icon: <FaChartBar />, to: "/stats" },
//     { label: "Anomaly", icon: <FaShieldAlt />, to: "/anomaly" },
//     { label: "Cloud", icon: <FaCloud />, to: "/cloud" },
//     { label: "Tools", icon: <FaTools />, to: "/api-tester" },
//   ];

//   return (
//     <header className="fixed top-0 left-0 right-0 bg-blue-900 text-white h-20 px-4 sm:px-6 flex items-center justify-between z-50 shadow-md">
//       {/* Logo and title */}
//       <div className="flex items-center gap-3">
//         <img
//           className="w-14 h-14 p-1 bg-gray-200 rounded-full"
//           src={logo}
//           alt="insa-logo"
//         />
//         <h1 className="text-2xl font-bold">PNTC</h1>
//       </div>

//       {/* Desktop Navigation */}
//       {!isLoginPage && (
//         <nav className="hidden md:flex items-center gap-6 text-sm">
//           {navItems.map((item) => (
//             <Link
//               key={item.label}
//               to={item.to}
//               className={`flex items-center gap-2 hover:text-yellow-400 transition ${
//                 location.pathname === item.to
//                   ? "text-yellow-400 font-semibold"
//                   : ""
//               }`}
//             >
//               {item.icon}
//               <span>{item.label}</span>
//             </Link>
//           ))}
          
//           {/* Integrated SDN Toggle Button */}
//           <div className="ml-2 scale-90">
//             <SdnToggle />
//           </div>

//           <Link
//             to="/"
//             onClick={() => localStorage.removeItem("isAuthenticated")}
//             className="ml-4 py-1 px-3 bg-white text-blue-800 rounded hover:bg-gray-100 transition"
//           >
//             Logout
//           </Link>
//         </nav>
//       )}

//       {/* Mobile Menu Toggle */}
//       {!isLoginPage && (
//         <button
//           onClick={() => setMenuOpen(!menuOpen)}
//           className="md:hidden text-xl"
//         >
//           {menuOpen ? <FaTimes /> : <FaBars />}
//         </button>
//       )}

//       {/* Mobile Menu */}
//       {menuOpen && !isLoginPage && (
//         <div className="absolute top-20 left-0 right-0 bg-blue-900 border-t border-blue-800 md:hidden">
//           <nav className="flex flex-col px-4 py-4 gap-4 text-sm">
//             {navItems.map((item) => (
//               <Link
//                 key={item.label}
//                 to={item.to}
//                 onClick={() => setMenuOpen(false)}
//                 className={`flex items-center gap-2 hover:text-yellow-400 transition ${
//                   location.pathname === item.to
//                     ? "text-yellow-400 font-semibold"
//                     : ""
//                 }`}
//               >
//                 {item.icon}
//                 <span>{item.label}</span>
//               </Link>
//             ))}

//             {/* Mobile SDN Toggle Button */}
//             <div className="py-2 border-t border-b border-blue-800 flex justify-center">
//               <SdnToggle />
//             </div>

//             <Link
//               to="/"
//               onClick={() => { localStorage.removeItem("isAuthenticated"); setMenuOpen(false); }}
//               className="py-1 px-3 mt-2 bg-white text-blue-800 rounded hover:bg-gray-100 transition w-max self-center"
//             >
//               Logout
//             </Link>
//           </nav>
//         </div>
//       )}
//     </header>
//   );
// }

// export default Header;









// import { useTheme } from "../context/ThemeContext"; // Adjust path
// import { FaSun, FaMoon } from "react-icons/fa";
// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SdnToggle } from "./SdnToggle"; 
// import {
//   FaTachometerAlt,
//   FaNetworkWired,
//   FaMicrochip,
//   FaProjectDiagram,
//   FaChartBar,
//   FaTools,
//   FaBars,
//   FaTimes,
//   FaShieldAlt,
//   FaCloud,
// } from "react-icons/fa";
// import logo from "../../assets/images/insa_logo.png";

// function Header() {
//   const location = useLocation();
//   const isLoginPage = location.pathname === "/";
//   const [menuOpen, setMenuOpen] = useState(false);
// const { isDark, toggleTheme } = useTheme();
//   const navItems = [
//     { label: "Dashboard", icon: <FaTachometerAlt />, to: "/dashboard" },
//     { label: "Topology", icon: <FaNetworkWired />, to: "/topology" },
//     { label: "Devices", icon: <FaMicrochip />, to: "/nodes" },
//     { label: "Flows", icon: <FaProjectDiagram />, to: "/flows" },
//     { label: "Stats", icon: <FaChartBar />, to: "/stats" },
//     { label: "Anomaly", icon: <FaShieldAlt />, to: "/anomaly" },
//     { label: "Cloud", icon: <FaCloud />, to: "/cloud" },
//     { label: "Tools", icon: <FaTools />, to: "/api-tester" },
//   ];

//   return (
//     <header className="fixed top-0 left-0 right-0 bg-[#1e293b] text-white h-20 px-4 lg:px-8 flex items-center justify-between z-50 border-b border-white/5 shadow-2xl">
      
//       {/* LEFT: Logo - flex-shrink-0 ensures it doesn't get crushed */}
//       <div className="flex items-center gap-3 flex-shrink-0">
//         <div className="bg-white w-12 h-12 flex items-center justify-center rounded-full shadow-lg border-2 border-white/10 p-1">
//           <img className="w-full h-full object-contain" src={logo} alt="insa-logo" />
//         </div>
//         <h1 className="text-xl font-black tracking-tight text-white hidden md:block">
//           PNTC
//         </h1>
//       </div>

//       {/* MIDDLE: Desktop Navigation */}
//       {!isLoginPage && (
//         <nav className="hidden xl:flex items-center gap-0.5 bg-slate-800/50 p-1 rounded-2xl border border-white/5 mx-4">
//           {navItems.map((item) => {
//             const isActive = location.pathname === item.to;
//             return (
//               <Link
//                 key={item.label}
//                 to={item.to}
//                 className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all duration-300 whitespace-nowrap ${
//                   isActive 
//                     ? "bg-blue-600 shadow-lg text-white" 
//                     : "text-slate-400 hover:text-white hover:bg-white/5"
//                 }`}
//               >
//                 <span className={isActive ? "text-white" : "text-slate-500"}>
//                   {item.icon}
//                 </span>
//                 {/* On smaller desktops, we hide the text of inactive links to keep things fit */}
//                 <span className={`${isActive ? "block" : "hidden 2xl:block"}`}>{item.label}</span>
//               </Link>
//             );
//           })}
//         </nav>
//       )}

//       {/* RIGHT: Controls & Logout */}
//       {!isLoginPage && (
//         <div className="flex items-center gap-3 flex-shrink-0">
//           <div className="hidden lg:block scale-[0.8] origin-right">
//             <SdnToggle />
//           </div>

//           <div className="h-8 w-px bg-white/10 hidden lg:block mx-1" />

//           <Link
//             to="/"
//             onClick={() => localStorage.removeItem("isAuthenticated")}
//             className="text-[11px] font-bold tracking-tighter uppercase px-4 py-2.5 border border-white/20 rounded-xl hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center whitespace-nowrap"
//           >
//             Logout
//           </Link>

//           {/* Mobile Menu Toggle */}
//           <button onClick={() => setMenuOpen(!menuOpen)} className="xl:hidden p-2 text-slate-400 hover:text-white">
//             {menuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
//           </button>
//         </div>
//       )}

//       {/* MOBILE MENU: Full Logic Included */}
//       {menuOpen && !isLoginPage && (
//         <div className="absolute top-20 left-0 right-0 bg-[#1e293b] border-t border-white/5 xl:hidden shadow-2xl">
//           <nav className="flex flex-col p-4 gap-2">
//             {navItems.map((item) => (
//               <Link
//                 key={item.label}
//                 to={item.to}
//                 onClick={() => setMenuOpen(false)}
//                 className={`flex items-center gap-4 p-4 rounded-xl transition ${
//                   location.pathname === item.to
//                     ? "bg-blue-600 text-white shadow-lg"
//                     : "text-slate-400 hover:bg-white/5"
//                 }`}
//               >
//                 {item.icon}
//                 <span className="text-base font-semibold">{item.label}</span>
//               </Link>
//             ))}
//             <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-4">
//               <div className="flex justify-center bg-slate-800/50 p-4 rounded-xl">
//                 <SdnToggle />
//               </div>
//               <Link
//                 to="/"
//                 onClick={() => { localStorage.removeItem("isAuthenticated"); setMenuOpen(false); }}
//                 className="py-4 bg-white text-slate-900 rounded-xl font-black text-center uppercase tracking-widest text-sm"
//               >
//                 Logout
//               </Link>
//             </div>
//           </nav>
//         </div>
//       )}
//     </header>
//   );
// }

// export default Header;












// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SdnToggle } from "./SdnToggle"; 
// import { useTheme } from "../../context/ThemeContext";
// import {
//   FaTachometerAlt,
//   FaNetworkWired,
//   FaMicrochip,
//   FaProjectDiagram,
//   FaChartBar,
//   FaTools,
//   FaBars,
//   FaTimes,
//   FaShieldAlt,
//   FaCloud,
//   FaSun,
//   FaMoon
// } from "react-icons/fa";
// import logo from "../../assets/images/insa_logo.png";

// function Header() {
//   const { isDark, toggleTheme } = useTheme(); 
//   const location = useLocation();
//   const isLoginPage = location.pathname === "/";
//   const [menuOpen, setMenuOpen] = useState(false);

//   const navItems = [
//     { label: "Dashboard", icon: <FaTachometerAlt />, to: "/dashboard" },
//     { label: "Topology", icon: <FaNetworkWired />, to: "/topology" },
//     { label: "Devices", icon: <FaMicrochip />, to: "/nodes" },
//     { label: "Flows", icon: <FaProjectDiagram />, to: "/flows" },
//     { label: "Stats", icon: <FaChartBar />, to: "/stats" },
//     { label: "Anomaly", icon: <FaShieldAlt />, to: "/anomaly" },
//     { label: "Cloud", icon: <FaCloud />, to: "/cloud" },
//     { label: "Tools", icon: <FaTools />, to: "/api-tester" },
//   ];

//   return (
//     <header className="fixed top-0 left-0 right-0 bg-[#1e293b] dark:bg-[#0f172a] text-white h-20 px-4 lg:px-8 flex items-center justify-between z-50 border-b border-white/5 shadow-2xl transition-all duration-300">
      
//       {/* LEFT: Logo Section (Protected from shrinking) */}
//       <div className="flex items-center gap-3 flex-shrink-0">
//         <div className="bg-white w-12 h-12 flex items-center justify-center rounded-full shadow-lg border-2 border-white/10 p-1">
//           <img className="w-full h-full object-contain" src={logo} alt="insa-logo" />
//         </div>
//         <h1 className="text-xl font-black tracking-tighter text-white hidden md:block">
//           PNTC
//         </h1>
//       </div>

//       {/* MIDDLE: Desktop Navigation (Modern Pill Design) */}
//       {!isLoginPage && (
//         <nav className="hidden xl:flex items-center gap-1 bg-slate-800/40 p-1.5 rounded-2xl border border-white/5 mx-2">
//           {navItems.map((item) => {
//             const isActive = location.pathname === item.to;
//             return (
//               <Link
//                 key={item.label}
//                 to={item.to}
//                 className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all duration-300 whitespace-nowrap ${
//                   isActive 
//                     ? "bg-blue-600 shadow-lg shadow-blue-900/50 text-white" 
//                     : "text-slate-400 hover:text-white hover:bg-white/5"
//                 }`}
//               >
//                 <span className={isActive ? "text-white" : "text-slate-500"}>
//                   {item.icon}
//                 </span>
//                 {/* Adaptive labels: text only shows for active item or on large screens */}
//                 <span className={`${isActive ? "block" : "hidden 2xl:block"}`}>{item.label}</span>
//               </Link>
//             );
//           })}
//         </nav>
//       )}

//       {/* RIGHT: Controls (Theme Toggle + SDN Toggle + Logout) */}
//       {!isLoginPage && (
//         <div className="flex items-center gap-3 flex-shrink-0">
          
//           {/* SDN Controller Toggle (Scaled for fit) */}
//           <div className="hidden lg:block scale-[0.75] origin-right">
//             <SdnToggle />
//           </div>

//           <div className="h-8 w-px bg-white/10 hidden lg:block mx-1" />

//           {/* DARK MODE SWITCH */}
//           <button 
//             onClick={toggleTheme}
//             className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-yellow-400 flex items-center justify-center"
//             title="Toggle Theme"
//           >
//             {isDark ? <FaSun size={18} /> : <FaMoon size={18} />}
//           </button>

//           {/* LOGOUT BUTTON */}
//           <Link
//             to="/"
//             onClick={() => localStorage.removeItem("isAuthenticated")}
//             className="text-[11px] font-black tracking-widest uppercase px-5 py-2.5 border-2 border-white/10 rounded-xl hover:bg-white hover:text-slate-900 transition-all active:scale-95 flex items-center justify-center min-w-[100px]"
//           >
//             Logout
//           </Link>

//           {/* Mobile Menu Toggle (Only shows on smaller screens) */}
//           <button
//             onClick={() => setMenuOpen(!menuOpen)}
//             className="xl:hidden p-2 text-slate-400 hover:text-white"
//           >
//             {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
//           </button>
//         </div>
//       )}

//       {/* MOBILE MENU DRAWER */}
//       {menuOpen && !isLoginPage && (
//         <div className="absolute top-20 left-0 right-0 bg-[#1e293b] dark:bg-[#0f172a] border-t border-white/5 xl:hidden shadow-2xl animate-in slide-in-from-top duration-300">
//           <nav className="flex flex-col p-6 gap-2">
//             {navItems.map((item) => (
//               <Link
//                 key={item.label}
//                 to={item.to}
//                 onClick={() => setMenuOpen(false)}
//                 className={`flex items-center gap-4 p-4 rounded-xl transition ${
//                   location.pathname === item.to
//                     ? "bg-blue-600 text-white shadow-lg"
//                     : "text-slate-400 hover:bg-white/5"
//                 }`}
//               >
//                 {item.icon}
//                 <span className="text-lg font-bold">{item.label}</span>
//               </Link>
//             ))}
//             <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-6">
//               <div className="flex justify-center">
//                 <SdnToggle />
//               </div>
//               <Link
//                 to="/"
//                 onClick={() => { localStorage.removeItem("isAuthenticated"); setMenuOpen(false); }}
//                 className="py-4 bg-white text-slate-900 rounded-xl font-black text-center uppercase tracking-widest"
//               >
//                 Logout
//               </Link>
//             </div>
//           </nav>
//         </div>
//       )}
//     </header>
//   );
// }

// export default Header;







// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SdnToggle } from "./SdnToggle"; 
// import {
//   FaTachometerAlt,
//   FaNetworkWired,
//   FaMicrochip,
//   FaProjectDiagram,
//   FaChartBar,
//   FaTools,
//   FaBars,
//   FaTimes,
//   FaShieldAlt,
//   FaCloud,
// } from "react-icons/fa";
// import logo from "../../assets/images/insa_logo.png";

// function Header() {
//   const location = useLocation();
//   const isLoginPage = location.pathname === "/";
//   const [menuOpen, setMenuOpen] = useState(false);

//   const navItems = [
//     { label: "Dashboard", icon: <FaTachometerAlt />, to: "/dashboard" },
//     { label: "Topology", icon: <FaNetworkWired />, to: "/topology" },
//     { label: "Devices", icon: <FaMicrochip />, to: "/nodes" },
//     { label: "Flows", icon: <FaProjectDiagram />, to: "/flows" },
//     { label: "Stats", icon: <FaChartBar />, to: "/stats" },
//     { label: "Anomaly", icon: <FaShieldAlt />, to: "/anomaly" },
//     { label: "Cloud", icon: <FaCloud />, to: "/cloud" },
//     { label: "Tools", icon: <FaTools />, to: "/api-tester" },
//   ];

//   return (
//     <header className="fixed top-0 left-0 right-0 bg-blue-900 text-white h-20 px-4 sm:px-6 flex items-center justify-between z-50 shadow-md">
//       {/* Logo and title */}
//       <div className="flex items-center gap-3">
//         <img
//           className="w-14 h-14 p-1 bg-gray-200 rounded-full"
//           src={logo}
//           alt="insa-logo"
//         />
//         <h1 className="text-2xl font-bold">PNTC</h1>
//       </div>

//       {/* Desktop Navigation */}
//       {!isLoginPage && (
//         <nav className="hidden md:flex items-center gap-6 text-sm">
//           {navItems.map((item) => (
//             <Link
//               key={item.label}
//               to={item.to}
//               className={`flex items-center gap-2 hover:text-yellow-400 transition ${
//                 location.pathname === item.to
//                   ? "text-yellow-400 font-semibold"
//                   : ""
//               }`}
//             >
//               {item.icon}
//               <span>{item.label}</span>
//             </Link>
//           ))}
          
//           {/* Integrated SDN Toggle Button */}
//           <div className="ml-2 scale-90">
//             <SdnToggle />
//           </div>

//           <Link
//             to="/"
//             onClick={() => localStorage.removeItem("isAuthenticated")}
//             className="ml-4 py-1 px-3 bg-white text-blue-800 rounded hover:bg-gray-100 transition"
//           >
//             Logout
//           </Link>
//         </nav>
//       )}

//       {/* Mobile Menu Toggle */}
//       {!isLoginPage && (
//         <button
//           onClick={() => setMenuOpen(!menuOpen)}
//           className="md:hidden text-xl"
//         >
//           {menuOpen ? <FaTimes /> : <FaBars />}
//         </button>
//       )}

//       {/* Mobile Menu */}
//       {menuOpen && !isLoginPage && (
//         <div className="absolute top-20 left-0 right-0 bg-blue-900 border-t border-blue-800 md:hidden">
//           <nav className="flex flex-col px-4 py-4 gap-4 text-sm">
//             {navItems.map((item) => (
//               <Link
//                 key={item.label}
//                 to={item.to}
//                 onClick={() => setMenuOpen(false)}
//                 className={`flex items-center gap-2 hover:text-yellow-400 transition ${
//                   location.pathname === item.to
//                     ? "text-yellow-400 font-semibold"
//                     : ""
//                 }`}
//               >
//                 {item.icon}
//                 <span>{item.label}</span>
//               </Link>
//             ))}

//             <div className="py-2 border-t border-b border-blue-800 flex justify-center">
//               <SdnToggle />
//             </div>

//             <Link
//               to="/"
//               onClick={() => { localStorage.removeItem("isAuthenticated"); setMenuOpen(false); }}
//               className="py-1 px-3 mt-2 bg-white text-blue-800 rounded hover:bg-gray-100 transition w-max self-center"
//             >
//               Logout
//             </Link>
//           </nav>
//         </div>
//       )}
//     </header>
//   );
// }

// export default Header;





// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SdnToggle } from "./SdnToggle"; 
// import {
//   FaTachometerAlt, FaNetworkWired, FaMicrochip, FaProjectDiagram,
//   FaChartBar, FaShieldAlt, FaCloud, FaTools, FaBars, FaTimes
// } from "react-icons/fa";
// import logo from "../../assets/images/insa_logo.png";

// function Header() {
//   const location = useLocation();
//   const isLoginPage = location.pathname === "/";
//   const [menuOpen, setMenuOpen] = useState(false);

//   const navItems = [
//     { label: "Dashboard", icon: <FaTachometerAlt />, to: "/dashboard" },
//     { label: "Topology", icon: <FaNetworkWired />, to: "/topology" },
//     { label: "Devices", icon: <FaMicrochip />, to: "/nodes" },
//     { label: "Flows", icon: <FaProjectDiagram />, to: "/flows" },
//     { label: "Stats", icon: <FaChartBar />, to: "/stats" },
//     { label: "Anomaly", icon: <FaShieldAlt />, to: "/anomaly" },
//     { label: "Cloud", icon: <FaCloud />, to: "/cloud" },
//     { label: "Tools", icon: <FaTools />, to: "/api-tester" },
//   ];

//   return (
//     <header className="fixed top-0 left-0 right-0 bg-[#1e293b] text-white h-20 px-4 lg:px-8 flex items-center justify-between z-50 border-b border-white/5 shadow-2xl">
//       <div className="flex items-center gap-3 flex-shrink-0">
//         <div className="bg-white w-12 h-12 flex items-center justify-center rounded-full shadow-lg p-1 border-2 border-white/10">
//           <img className="w-full h-full object-contain" src={logo} alt="logo" />
//         </div>
//         <h1 className="text-xl font-black tracking-tight hidden md:block uppercase">PNTC</h1>
//       </div>

//       {!isLoginPage && (
//         <nav className="hidden xl:flex items-center gap-1 bg-slate-800/40 p-1.5 rounded-2xl border border-white/5 mx-2">
//           {navItems.map((item) => {
//             const isActive = location.pathname === item.to;
//             return (
//               <Link key={item.label} to={item.to} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${isActive ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
//                 {item.icon} <span className={isActive ? "block" : "hidden 2xl:block"}>{item.label}</span>
//               </Link>
//             );
//           })}
//         </nav>
//       )}

//       {!isLoginPage && (
//         <div className="flex items-center gap-4 flex-shrink-0">
//           <div className="hidden lg:block scale-[0.8] origin-right"><SdnToggle /></div>
//           <div className="h-8 w-px bg-white/10 hidden lg:block mx-1" />
//           <Link to="/" onClick={() => localStorage.removeItem("isAuthenticated")} className="text-[11px] font-black uppercase px-5 py-2.5 border-2 border-white/10 rounded-xl hover:bg-white hover:text-slate-900 transition-all flex-shrink-0">
//             Logout
//           </Link>
//           <button onClick={() => setMenuOpen(!menuOpen)} className="xl:hidden p-2 text-slate-400">{menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}</button>
//         </div>
//       )}
//     </header>
//   );
// }
// export default Header;




















// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SdnToggle } from "./SdnToggle"; 
// import {
//   FaTachometerAlt, FaNetworkWired, FaMicrochip, FaProjectDiagram,
//   FaChartBar, FaShieldAlt, FaCloud, FaTools, FaBars, FaTimes, FaLayerGroup
// } from "react-icons/fa";
// import logo from "../../assets/images/insa_logo.png";

// function Header() {
//   const location = useLocation();
//   const isLoginPage = location.pathname === "/";
//   const [menuOpen, setMenuOpen] = useState(false);

//   // Added Slicing and aligned names with your project
//   const navItems = [
//     { label: "Dashboard", icon: <FaTachometerAlt />, to: "/dashboard" },
//     { label: "Topology", icon: <FaNetworkWired />, to: "/topology" },
//     { label: "Nodes", icon: <FaMicrochip />, to: "/nodes" },
//     { label: "Flows", icon: <FaProjectDiagram />, to: "/flows" },
//     { label: "Stats", icon: <FaChartBar />, to: "/stats" },
//     { label: "Anomaly", icon: <FaShieldAlt />, to: "/anomaly" },
//     { label: "Slicing", icon: <FaLayerGroup />, to: "/slicing" }, // New Item
//     { label: "Cloud", icon: <FaCloud />, to: "/cloud" },
//     { label: "Tools", icon: <FaTools />, to: "/api-tester" },
//   ];

//   return (
//     <header className="fixed top-0 left-0 right-0 bg-[#1e293b] text-white h-20 px-4 lg:px-8 flex items-center justify-between z-50 border-b border-white/5 shadow-2xl">
//       <div className="flex items-center gap-3 flex-shrink-0">
//         <div className="bg-white w-12 h-12 flex items-center justify-center rounded-full shadow-lg p-1 border-2 border-white/10">
//           <img className="w-full h-full object-contain" src={logo} alt="logo" />
//         </div>
//         <h1 className="text-xl font-black tracking-tight hidden md:block uppercase">PNTC</h1>
//       </div>

//       {!isLoginPage && (
//         <nav className="hidden xl:flex items-center gap-1 bg-slate-800/40 p-1.5 rounded-2xl border border-white/5 mx-2">
//           {navItems.map((item) => {
//             const isActive = location.pathname === item.to;
//             return (
//               <Link key={item.label} to={item.to} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${isActive ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
//                 {item.icon} <span className={isActive ? "block" : "hidden 2xl:block"}>{item.label}</span>
//               </Link>
//             );
//           })}
//         </nav>
//       )}

//       {!isLoginPage && (
//         <div className="flex items-center gap-4 flex-shrink-0">
//           <div className="hidden lg:block scale-[0.8] origin-right"><SdnToggle /></div>
//           <div className="h-8 w-px bg-white/10 hidden lg:block mx-1" />
//           <Link to="/" onClick={() => localStorage.removeItem("isAuthenticated")} className="text-[11px] font-black uppercase px-5 py-2.5 border-2 border-white/10 rounded-xl hover:bg-white hover:text-slate-900 transition-all flex-shrink-0">
//             Logout
//           </Link>
//           <button onClick={() => setMenuOpen(!menuOpen)} className="xl:hidden p-2 text-slate-400">{menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}</button>
//         </div>
//       )}
//     </header>
//   );
// }
// export default Header;






import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaNetworkWired,
  FaMicrochip,
  FaProjectDiagram,
  FaChartBar,
  FaTools,
  FaBars,
  FaTimes,
  FaShieldAlt,
  FaCloud,
  FaRoute,
} from "react-icons/fa";
import { Sparkles } from "lucide-react";
import logo from "../../assets/images/insa_logo.png";
import CommandPalette from "../CommandPalette";
import * as controllerManager from "../../api/controllerManager";

// Floodlight has no adapter yet — don't show a selectable option that does nothing.
const CONTROLLERS = [
  { key: "odl", label: "OpenDaylight" },
  { key: "onos", label: "ONOS" },
];

function Header() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [controller, setController] = useState(() => controllerManager.getActiveController());
  const [status, setStatus] = useState(null); // null = checking, else { connected, ... }

  const selectController = (key) => {
    controllerManager.setActiveController(key);
    setController(key);
  };

  useEffect(() => {
    let cancelled = false;
    setStatus(null);
    controllerManager.getControllerStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => { cancelled = true; };
  }, [controller]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navItems = [
    { label: "Dashboard", icon: <FaTachometerAlt />, to: "/dashboard" },
    { label: "Topology", icon: <FaNetworkWired />, to: "/topology" },
    { label: "Nodes", icon: <FaMicrochip />, to: "/nodes" },
    { label: "Flows", icon: <FaProjectDiagram />, to: "/flows" },
    { label: "Path Trace", icon: <FaRoute />, to: "/path-trace" },
    { label: "Stats", icon: <FaChartBar />, to: "/stats" },
    { label: "Anomaly", icon: <FaShieldAlt />, to: "/anomaly" },
    { label: "Slicing", icon: <FaNetworkWired />, to: "/slicing" },
    { label: "Cloud", icon: <FaCloud />, to: "/cloud" },
    { label: "Tools", icon: <FaTools />, to: "/api-tester" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#0f172a] text-white h-20 px-4 sm:px-6 flex items-center justify-between z-50 shadow-lg border-b border-white/5">
      <div className="flex items-center gap-3 shrink-0">
        <img className="w-12 h-12 p-1 bg-gray-100 rounded-full" src={logo} alt="insa-logo" />
        <h1 className="text-xl font-black tracking-tight">PNTC</h1>
      </div>

      {!isLoginPage && (
        <nav className="hidden lg:flex items-center gap-1 bg-slate-800/40 rounded-2xl px-2 py-1.5 border border-white/5">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.label} to={item.to} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${active ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}>
                {item.icon} <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {!isLoginPage && (
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <button onClick={() => setIsPaletteOpen(true)} title="AI Assistant (Ctrl/⌘ + K)" className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95">
            <Sparkles size={14} className="animate-pulse" fill="currentColor" />
            <span>AI</span>
            <span className="hidden xl:inline text-[9px] font-bold text-blue-200 bg-white/10 px-1.5 py-0.5 rounded">⌘K</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1 border border-white/5">
            {CONTROLLERS.map((c) => {
              const active = controller === c.key;
              return (
                <button key={c.key} onClick={() => selectController(c.key)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${active ? c.key === "odl" ? "bg-yellow-400 text-slate-900 shadow" : "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 px-2" title={status?.error || ""}>
            <span className={`w-2 h-2 rounded-full ${status === null ? "bg-slate-500 animate-pulse" : status.connected ? "bg-emerald-400" : "bg-red-500"}`} />
            <span className="text-[9px] font-black uppercase text-slate-400">
              {status === null ? "Checking" : status.connected ? "Connected" : "Offline"}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <Link to="/" onClick={() => localStorage.removeItem("isAuthenticated")} className="py-2 px-4 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition">
            Logout
          </Link>
        </div>
      )}

      {!isLoginPage && (
        <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden text-xl">
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      )}

      {menuOpen && !isLoginPage && (
        <div className="absolute top-20 left-0 right-0 bg-[#0f172a] border-t border-white/10 lg:hidden">
          <nav className="flex flex-col px-4 py-4 gap-2 text-sm">
            <button onClick={() => { setIsPaletteOpen(true); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white font-bold w-max">
              <Sparkles size={14} fill="currentColor" /> AI Assistant
            </button>
            {navItems.map((item) => (
              <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition ${location.pathname === item.to ? "bg-blue-600 text-white font-semibold" : "text-slate-300 hover:bg-slate-700/50"}`}>
                {item.icon} <span>{item.label}</span>
              </Link>
            ))}
            <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1 border border-white/5 mt-2 w-max">
              {CONTROLLERS.map((c) => (
                <button key={c.key} onClick={() => selectController(c.key)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${controller === c.key ? c.key === "odl" ? "bg-yellow-400 text-slate-900" : "bg-blue-600 text-white" : "text-slate-400"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 px-3 mt-1">
              <span className={`w-2 h-2 rounded-full ${status === null ? "bg-slate-500 animate-pulse" : status.connected ? "bg-emerald-400" : "bg-red-500"}`} />
              <span className="text-[9px] font-black uppercase text-slate-400">
                {status === null ? "Checking" : status.connected ? "Connected" : "Offline"}
              </span>
            </div>
            <Link to="/" onClick={() => { localStorage.removeItem("isAuthenticated"); setMenuOpen(false); }} className="py-2 px-4 mt-2 bg-white/5 border border-white/10 text-white rounded-xl w-max">
              Logout
            </Link>
          </nav>
        </div>
      )}

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </header>
  );
}

export default Header;