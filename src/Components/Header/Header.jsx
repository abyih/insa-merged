import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Network,
  Cpu,
  GitBranch,
  Activity,
  Shield,
  Cloud,
  Layers,
  Wrench,
  Menu,
  X,
  LogOut,
  FileCode,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Lock,
} from "lucide-react";
import logo from "../../assets/images/insa_logo.png";
import { useNotifications } from "../../context/NotificationContext";

function Header() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [securityDropdownOpen, setSecurityDropdownOpen] = useState(false);
  const [mobileSecurityOpen, setMobileSecurityOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [slicingDropdownOpen, setSlicingDropdownOpen] = useState(false);
  const [mobileSlicingOpen, setMobileSlicingOpen] = useState(false);
  const slicingDropdownRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  const { unreadCount, isDrawerOpen, setIsDrawerOpen } = useNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSecurityDropdownOpen(false);
      }
      if (slicingDropdownRef.current && !slicingDropdownRef.current.contains(event.target)) {
        setSlicingDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setSecurityDropdownOpen(false);
    setSlicingDropdownOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Keep state in sync with DOM class in case it is changed elsewhere
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const isSecurityActive =
    location.pathname.startsWith("/security") ||
    location.pathname === "/anomaly" ||
    location.pathname === "/linkguard" ||
    location.pathname === "/tls";

  const isSlicingActive =
    location.pathname.startsWith("/slicing") ||
    location.pathname === "/network-slicing" ||
    location.pathname === "/slices" ||
    location.pathname === "/slicing-verification";

  const securityItems = [
    {
      label: "Security Overview",
      icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
      to: "/security",
      desc: "Unified defense posture & telemetry",
    },
    {
      label: "Anomaly Detector",
      icon: <Activity className="w-3.5 h-3.5 text-red-400" />,
      to: "/security/anomaly",
      desc: "Online IF & Offline RF AI detector",
    },
    {
      label: "Link Guard",
      icon: <Shield className="w-3.5 h-3.5 text-cyan-400" />,
      to: "/security/linkguard",
      desc: "Real-time port & latency shield",
    },
    {
      label: "TLS Encryption",
      icon: <Lock className="w-3.5 h-3.5 text-emerald-400" />,
      to: "/security/tls",
      desc: "Northbound & Southbound mTLS",
    },
  ];

  const slicingItems = [
    {
      label: "Slicing Overview",
      icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
      to: "/slicing",
      desc: "Dual-domain slice telemetry & comparison",
    },
    {
      label: "ONOS Data-Plane Slicing",
      icon: <Network className="w-3.5 h-3.5 text-cyan-400" />,
      to: "/slicing/onos",
      desc: "Host-based slicing, meters & AI intents",
    },
    {
      label: "OpenStack Cloud Slices",
      icon: <Cloud className="w-3.5 h-3.5 text-purple-400" />,
      to: "/slicing/openstack",
      desc: "Cloud VM slicing, Neutron & OVS QoS",
    },
    {
      label: "ODL Network Slicing",
      icon: <Layers className="w-3.5 h-3.5 text-blue-400" />,
      to: "/slicing/odl",
      desc: "ODL Slicing integration",
    },
    {
      label: "Verification & Live Tests",
      icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />,
      to: "/slicing/verification",
      desc: "Ping RTT, iperf saturation & DSCP audits",
    },
  ];

  const navItems = [
    { label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, to: "/dashboard" },
    { label: "Topology", icon: <Network className="w-4 h-4" />, to: "/topology" },
    { label: "Devices", icon: <Cpu className="w-4 h-4" />, to: "/nodes" },
    { label: "Flows", icon: <GitBranch className="w-4 h-4" />, to: "/flows" },
    { label: "Security", icon: <Shield className="w-4 h-4" />, isDropdown: true, type: "security" },
    { label: "Slicing", icon: <Layers className="w-4 h-4" />, isDropdown: true, type: "slicing" },
    { label: "Cloud", icon: <Cloud className="w-4 h-4" />, to: "/cloud" },
    { label: "VM Map", icon: <Network className="w-4 h-4" />, to: "/vm-topology" },
    { label: "Stats", icon: <Activity className="w-4 h-4" />, to: "/stats" },
    { label: "Tools", icon: <Wrench className="w-4 h-4" />, to: "/api-tester" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-20 px-6 flex items-center justify-between z-50 backdrop-blur-md bg-zinc-950/75 border-b border-zinc-800/80 shadow-lg shadow-black/20">
      {/* Logo and title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
          <img
            className="relative w-12 h-12 p-0.5 bg-zinc-900 rounded-full border border-zinc-800"
            src={logo}
            alt="insa-logo"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            PNTC
          </h1>
          <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase block -mt-1">
            SDN Control Panel
          </span>
        </div>
      </div>

      {/* Center: Desktop Navigation */}
      {!isLoginPage && (
        <nav className="hidden xl:flex items-center justify-center gap-1.5 text-sm flex-1 mx-6">
            {navItems.map((item) => {
              if (item.isDropdown && item.type === "security") {
                return (
                  <div key="security-dropdown" className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setSecurityDropdownOpen(!securityDropdownOpen);
                        setSlicingDropdownOpen(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                        isSecurityActive
                          ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50 shadow-inner"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
                          securityDropdownOpen ? "rotate-180 text-zinc-100" : ""
                        }`}
                      />
                    </button>

                    {securityDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                          Security Subsystems
                        </div>
                        {securityItems.map((sub) => {
                          const isSubActive =
                            location.pathname === sub.to ||
                            (sub.to === "/security/anomaly" && location.pathname === "/anomaly") ||
                            (sub.to === "/security/linkguard" && location.pathname === "/linkguard") ||
                            (sub.to === "/security/tls" && location.pathname === "/tls");
                          return (
                            <Link
                              key={sub.label}
                              to={sub.to}
                              onClick={() => setSecurityDropdownOpen(false)}
                              className={`flex items-start gap-3 p-2.5 rounded-xl text-xs transition-all duration-150 ${
                                isSubActive
                                  ? "bg-zinc-850 text-white font-medium shadow-inner"
                                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 mt-0.5">
                                {sub.icon}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-zinc-100">{sub.label}</span>
                                <span className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                                  {sub.desc}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (item.isDropdown && item.type === "slicing") {
                return (
                  <div key="slicing-dropdown" className="relative" ref={slicingDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setSlicingDropdownOpen(!slicingDropdownOpen);
                        setSecurityDropdownOpen(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                        isSlicingActive
                          ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50 shadow-inner"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
                          slicingDropdownOpen ? "rotate-180 text-zinc-100" : ""
                        }`}
                      />
                    </button>

                    {slicingDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                          Network Slicing Domains
                        </div>
                        {slicingItems.map((sub) => {
                          const isSubActive =
                            location.pathname === sub.to ||
                            (sub.to === "/slicing/onos" && location.pathname === "/network-slicing") ||
                            (sub.to === "/slicing/openstack" && location.pathname === "/slices") ||
                            (sub.to === "/slicing/verification" && location.pathname === "/slicing-verification");
                          return (
                            <Link
                              key={sub.label}
                              to={sub.to}
                              onClick={() => setSlicingDropdownOpen(false)}
                              className={`flex items-start gap-3 p-2.5 rounded-xl text-xs transition-all duration-150 ${
                                isSubActive
                                  ? "bg-zinc-850 text-white font-medium shadow-inner"
                                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 mt-0.5">
                                {sub.icon}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-zinc-100">{sub.label}</span>
                                <span className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                                  {sub.desc}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50 shadow-inner"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right side controls: Notifications, Theme, Logout, Mobile toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notifications Bell */}
          {!isLoginPage && (
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="relative p-2 rounded-lg border border-zinc-850 hover:bg-zinc-900 text-zinc-450 hover:text-zinc-100 transition-all duration-200 focus:outline-none"
            title="View SLA Alerts & Notifications"
          >
            <Bell className="w-4 h-4 text-zinc-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-zinc-950 animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Theme switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-zinc-850 hover:bg-zinc-900 text-zinc-450 hover:text-zinc-100 transition-all duration-200 focus:outline-none"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Logout (Desktop) */}
        {!isLoginPage && (
          <div className="hidden xl:flex items-center gap-3">
            <div className="h-4 w-px bg-zinc-850"></div>
            <Link
              to="/"
              onClick={() => { localStorage.removeItem("isAuthenticated"); window.dispatchEvent(new Event("auth-changed")); }}
              className="flex items-center gap-1.5 py-1.5 px-3 border border-zinc-850 hover:bg-red-950/20 hover:border-red-900/40 hover:text-red-400 text-zinc-400 rounded-lg text-xs font-semibold transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Link>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        {!isLoginPage && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="xl:hidden p-2 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-all"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {menuOpen && !isLoginPage && (
        <div className="absolute top-20 left-0 right-0 bg-zinc-950/95 border-b border-zinc-800 xl:hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-5 duration-200 shadow-2xl">
          <nav className="flex flex-col px-6 py-6 gap-2 text-sm max-h-[80vh] overflow-y-auto">
            {navItems.map((item) => {
              if (item.isDropdown && item.type === "security") {
                return (
                  <div key="mobile-security-dropdown" className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setMobileSecurityOpen(!mobileSecurityOpen)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isSecurityActive
                          ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          mobileSecurityOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {mobileSecurityOpen && (
                      <div className="pl-4 pr-2 py-1 flex flex-col gap-1.5 mt-1 border-l-2 border-zinc-800 ml-4">
                        {securityItems.map((sub) => {
                          const isSubActive =
                            location.pathname === sub.to ||
                            (sub.to === "/security/anomaly" && location.pathname === "/anomaly") ||
                            (sub.to === "/security/linkguard" && location.pathname === "/linkguard") ||
                            (sub.to === "/security/tls" && location.pathname === "/tls");
                          return (
                            <Link
                              key={sub.label}
                              to={sub.to}
                              onClick={() => setMenuOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isSubActive
                                  ? "bg-zinc-800 text-zinc-50 font-bold"
                                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                              }`}
                            >
                              {sub.icon}
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (item.isDropdown && item.type === "slicing") {
                return (
                  <div key="mobile-slicing-dropdown" className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setMobileSlicingOpen(!mobileSlicingOpen)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isSlicingActive
                          ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          mobileSlicingOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {mobileSlicingOpen && (
                      <div className="pl-4 pr-2 py-1 flex flex-col gap-1.5 mt-1 border-l-2 border-zinc-800 ml-4">
                        {slicingItems.map((sub) => {
                          const isSubActive =
                            location.pathname === sub.to ||
                            (sub.to === "/slicing/onos" && location.pathname === "/network-slicing") ||
                            (sub.to === "/slicing/openstack" && location.pathname === "/slices") ||
                            (sub.to === "/slicing/verification" && location.pathname === "/slicing-verification");
                          return (
                            <Link
                              key={sub.label}
                              to={sub.to}
                              onClick={() => setMenuOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isSubActive
                                  ? "bg-zinc-800 text-zinc-50 font-bold"
                                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                              }`}
                            >
                              {sub.icon}
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="h-px bg-zinc-850 my-2"></div>
            <Link
              to="/"
              onClick={() => {
                localStorage.removeItem("isAuthenticated");
                window.dispatchEvent(new Event("auth-changed"));
                setMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 mt-1 border border-zinc-850 hover:bg-red-950/20 hover:border-red-900/40 hover:text-red-400 text-zinc-400 rounded-xl text-sm font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
