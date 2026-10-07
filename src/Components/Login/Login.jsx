import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../../assets/images/insa_logo.png";
import {
  ShieldAlert,
  KeyRound,
  User,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Server,
  Lock,
} from "lucide-react";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (localStorage.getItem("isAuthenticated") === "true") {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("currentUser", JSON.stringify(data.user || { username: username.trim(), role: "admin" }));
        window.dispatchEvent(new Event("auth-changed"));

        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      } else {
        setError(data.error || "Authentication failed. Please verify credentials.");
        setPassword("");
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setError("Unable to connect to authentication server. Check network or server status.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden select-none">
      {/* Ambient Radial Mesh Background */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[130px] -z-10 animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[120px] -z-10 animate-pulse duration-7000 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 -z-20 pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="relative bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden transition-all duration-300">
          {/* Subtle Top Accent Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500" />

          {/* Logo & Header Title */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-50 group-hover:opacity-80 transition duration-500" />
              <div className="relative w-16 h-16 p-1.5 bg-zinc-900 rounded-2xl border border-zinc-700/60 flex items-center justify-center shadow-xl">
                <img
                  className="w-full h-full object-contain"
                  src={logo}
                  alt="INSA PNTC Logo"
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold tracking-wider uppercase mb-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Air-Gapped SDN Controller
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
                PNTC Platform
              </h1>
              <p className="text-xs text-zinc-400 font-medium">
                Software Defined Networking & Multi-Domain Control
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-200"
                  required
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full pl-10 pr-11 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-200"
                  required
                />
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 text-xs text-red-400 bg-red-950/30 border border-red-900/40 p-3.5 rounded-xl animate-in fade-in duration-200">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Bar */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
              <span className="flex items-center gap-1 font-medium text-zinc-400">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Quick Access
              </span>
              <span className="text-[10px] text-zinc-500">Click to fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("admin", "admin")}
                className="flex items-center justify-between px-3 py-2 bg-zinc-950/70 hover:bg-indigo-950/30 border border-zinc-800 hover:border-indigo-800/50 rounded-lg text-left transition-all text-xs group cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-zinc-200 group-hover:text-indigo-300">
                    admin
                  </div>
                  <div className="text-[10px] text-zinc-500">pass: admin</div>
                </div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("insa", "insa123")}
                className="flex items-center justify-between px-3 py-2 bg-zinc-950/70 hover:bg-cyan-950/30 border border-zinc-800 hover:border-cyan-800/50 rounded-lg text-left transition-all text-xs group cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-zinc-200 group-hover:text-cyan-300">
                    insa
                  </div>
                  <div className="text-[10px] text-zinc-500">pass: insa123</div>
                </div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                  Operator
                </span>
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-zinc-400" />
              Credentials encrypted with bcrypt & stored in local SQLite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
