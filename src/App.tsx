import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  LayoutDashboard,
  QrCode,
  BarChart3,
  ExternalLink,
  ChevronDown,
  CheckCircle,
  Car,
  Lock,
  Unlock,
  Shield,
  LogOut,
  Loader2,
  Key,
  Layers,
  ArrowUpRight,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  X,
  Share2,
  Compass,
  ArrowLeft
} from "lucide-react";
import Logo from "./components/Logo";
import GuestPortal from "./components/GuestPortal";
import ManagerDashboard from "./components/ManagerDashboard";
import TableQRHub from "./components/TableQRHub";
import AnalyticsPanel from "./components/AnalyticsPanel";
import SecurityPanel from "./components/SecurityPanel";
import PortalDirectoryHub from "./components/PortalDirectoryHub";

type WebsitePortal = "hub" | "customer" | "valet";
type ValetSubTab = "operations" | "qrhub" | "analytics" | "security";

export default function App() {
  // Main Portal State: 'hub' (Website Directory) vs 'customer' (Guest Website) vs 'valet' (Valet Operations Website)
  const [activePortal, setActivePortal] = useState<WebsitePortal>("hub");
  const [valetTab, setValetTab] = useState<ValetSubTab>("operations");
  const [simulateTableNumber, setSimulateTableNumber] = useState<string>("");
  const [ticketId, setTicketId] = useState<string | null>(null);

  // Attendant Share Customer Link modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Device & Authorization state
  const [deviceId, setDeviceId] = useState<string>("");
  const [authorizedRole, setAuthorizedRole] = useState<string>("guest");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showLoginPasscode, setShowLoginPasscode] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(5);

  const lastActivityRef = useRef<number>(Date.now());

  // Inactivity Auto-Lock Listener
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity);
    window.addEventListener("click", handleUserActivity);

    const autoLockCheckInterval = setInterval(() => {
      if (authorizedRole === "manager") {
        const idleDurationMs = Date.now() - lastActivityRef.current;
        const maxIdleMs = (autoLockMinutes || 5) * 60 * 1000;
        if (idleDurationMs > maxIdleMs) {
          console.warn("Valet terminal automatically locked due to inactivity.");
          handleLogout();
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      clearInterval(autoLockCheckInterval);
    };
  }, [authorizedRole, autoLockMinutes]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setLoginError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Parse path & URL parameters on mount and when popstate occurs
  const syncRouteFromUrl = () => {
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const table = params.get("table");
    const ticketParam = params.get("ticket") || params.get("ticketId");
    const portalParam = params.get("portal") || params.get("site");

    if (ticketParam) {
      setTicketId(ticketParam);
      localStorage.setItem("guest_ticket_id", ticketParam);
    }
    if (table) {
      setSimulateTableNumber(table);
    }

    // Determine which website was requested:
    const isCustomerRoute =
      pathname.startsWith("/customer") ||
      pathname.startsWith("/guest") ||
      pathname.startsWith("/ticket") ||
      portalParam === "customer" ||
      portalParam === "guest" ||
      !!ticketParam ||
      !!table ||
      view === "checkin" ||
      view === "tablerequest";

    const isValetRoute =
      pathname.startsWith("/valet") ||
      pathname.startsWith("/manager") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/admin") ||
      portalParam === "valet" ||
      portalParam === "staff";

    if (isCustomerRoute) {
      setActivePortal("customer");
    } else if (isValetRoute) {
      setActivePortal("valet");
    } else {
      setActivePortal("hub");
    }
  };

  useEffect(() => {
    // Generate or fetch deviceId
    let id = localStorage.getItem("smartvalet_device_id");
    if (!id) {
      id = "client-" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("smartvalet_device_id", id);
    }
    setDeviceId(id);

    syncRouteFromUrl();

    // Listen for browser back/forward buttons
    window.addEventListener("popstate", syncRouteFromUrl);

    // Initial server registration check & settings fetch
    const registerDevice = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/admin/devices/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: id,
            name: "Terminal Client",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAuthorizedRole(data.role || "guest");
        }

        // Fetch security settings for auto-lock timeout
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.autoLockMinutes) {
            setAutoLockMinutes(settingsData.autoLockMinutes);
          }
          if (settingsData.rateLimit?.isLocked) {
            setLockoutSeconds(settingsData.rateLimit.remainingSeconds);
            setLoginError(`Security Lockout Active. Try again in ${settingsData.rateLimit.remainingSeconds}s.`);
          }
        }
      } catch (err) {
        console.error("Device registration error", err);
      } finally {
        setIsLoading(false);
      }
    };

    registerDevice();

    return () => {
      window.removeEventListener("popstate", syncRouteFromUrl);
    };
  }, []);

  // Programmatic portal switch with clean browser history update
  const navigateToPortal = (portal: WebsitePortal, paramsString = "") => {
    setActivePortal(portal);
    if (typeof window !== "undefined") {
      let newPath = "/";
      if (portal === "customer") newPath = `/customer${paramsString}`;
      else if (portal === "valet") newPath = `/valet${paramsString}`;
      window.history.pushState({}, "", newPath);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setLoginError("");

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, deviceId, name: "Master Terminal" }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setLoginSuccess(true);
        setAuthorizedRole("manager");
        setLoginError("");
        lastActivityRef.current = Date.now();
        setTimeout(() => {
          setIsLoginOpen(false);
          setLoginSuccess(false);
          setPasscode("");
        }, 800);
      } else {
        if (data.isLocked && data.remainingSeconds) {
          setLockoutSeconds(data.remainingSeconds);
          setLoginError(`Lockout Activated: ${data.error}`);
        } else {
          setLoginError(data.error || "Incorrect passcode.");
        }
      }
    } catch (err) {
      setLoginError("Connection failed. Please retry.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/devices/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDeviceId: deviceId, role: "guest" }),
      });
      setAuthorizedRole("guest");
    } catch (err) {
      console.error(err);
      setAuthorizedRole("guest");
    }
  };

  const copyCustomerLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const link = `${originUrl}/customer`;
      navigator.clipboard.writeText(link);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2200);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading GoValet System...</p>
      </div>
    );
  }

  const originUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col font-sans text-slate-300">
      {/* ========================================================================= */}
      {/* VIEW 0: TWO-WEBSITE DIRECTORY & LAUNCHPAD HUB (/)                          */}
      {/* ========================================================================= */}
      {activePortal === "hub" && (
        <div className="flex-1 flex flex-col">
          {/* Hub Header */}
          <header className="bg-[#141417]/90 backdrop-blur-md border-b border-slate-800/80 py-3.5 px-4 sm:px-6 sticky top-0 z-30">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Logo size="md" showSubtitle={true} subtitle="Dual-Website Valet Platform" />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateToPortal("customer")}
                  className="px-3 py-1.5 bg-[#1C1C1F] hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-750 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Guest Pass</span>
                </button>
                <button
                  onClick={() => navigateToPortal("valet")}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Staff Terminal</span>
                </button>
              </div>
            </div>
          </header>

          {/* Hub Main */}
          <main className="flex-1 flex flex-col">
            <PortalDirectoryHub
              onSelectCustomer={() => navigateToPortal("customer")}
              onSelectValet={() => navigateToPortal("valet")}
            />
          </main>

          {/* Hub Footer */}
          <footer className="py-6 px-4 border-t border-slate-900 text-xs text-slate-500 text-center bg-[#0C0C0E]">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Logo size="sm" showSubtitle={false} />
                <span className="text-slate-600">•</span>
                <p>© 2026 GoValet Operations Engine • Multi-Device Sync</p>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span>Customer Web: <code className="text-sky-400 font-mono">/customer</code></span>
                <span>•</span>
                <span>Staff Terminal: <code className="text-indigo-400 font-mono">/valet</code></span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: WEBSITE #1 - CUSTOMER DIGITAL VALET PASS (/customer)              */}
      {/* Strictly customer-facing: NO top switcher, NO valet staff controls        */}
      {/* ========================================================================= */}
      {activePortal === "customer" && (
        <div className="flex-1 flex flex-col">
          {/* Customer Header - Clean, Standalone & Mobile Optimized */}
          <header className="bg-[#141417]/90 backdrop-blur-md border-b border-slate-800/80 py-3.5 px-4 sm:px-6 sticky top-0 z-30">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Logo size="md" showSubtitle={true} subtitle="Customer Digital Valet Pass" />
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-xs font-semibold">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Valet Stand Connected</span>
                </div>
              </div>
            </div>
          </header>

          {/* Customer Main Viewport */}
          <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
            <GuestPortal
              initialTicketId={ticketId}
              onTicketIdChange={setTicketId}
              simulateTableNumber={simulateTableNumber}
            />
          </main>

          {/* Customer Footer - Discreet Administrative Links at Very Bottom */}
          <footer className="py-6 px-4 border-t border-slate-900 text-xs text-slate-500 text-center bg-[#0C0C0E]">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Logo size="sm" showSubtitle={false} />
                <span className="text-slate-600">•</span>
                <p>© 2026 GoValet Concierge Pass</p>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-500">
                <span>Fast 1-Tap Retrieval</span>
                <span>•</span>
                <span>Real-Time Notifications</span>
                <span>•</span>
                {/* Subtle administrative links for testing */}
                <button
                  onClick={() => navigateToPortal("hub")}
                  className="text-slate-600 hover:text-slate-400 transition cursor-pointer"
                  title="Return to Website Directory"
                >
                  Portal Hub
                </button>
                <span>•</span>
                <button
                  onClick={() => navigateToPortal("valet")}
                  className="text-slate-600 hover:text-slate-400 transition cursor-pointer"
                  title="Staff Station Terminal"
                >
                  Staff Station
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: WEBSITE #2 - VALET STAFF OPERATIONS OS (/valet)                   */}
      {/* Gated behind Staff PIN Passcode Authorization                             */}
      {/* ========================================================================= */}
      {activePortal === "valet" && (
        <div className="flex-1 flex flex-col">
          {authorizedRole !== "manager" ? (
            /* Staff Passcode Lock Screen for Valet OS */
            <div className="flex-1 flex items-center justify-center p-4 bg-[#0A0A0C]">
              <div className="max-w-md w-full bg-[#131317] border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                {/* Background accent glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center space-y-3 mb-6 relative">
                  <div className="inline-flex justify-center mb-1">
                    <Logo size="lg" showSubtitle={false} />
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>Valet Attendant Terminal</span>
                  </div>
                  <h2 className="text-xl font-display font-black text-white">Staff Authentication Required</h2>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    This terminal is strictly for valet attendants. Customers must use the Customer Valet Pass.
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-5 relative">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Staff Password / Passcode
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowLoginPasscode(!showLoginPasscode)}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                      >
                        {showLoginPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showLoginPasscode ? "Hide" : "Show"}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showLoginPasscode ? "text" : "password"}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Enter Staff Password or PIN"
                        disabled={lockoutSeconds > 0}
                        className="w-full text-center font-mono text-lg py-3.5 bg-[#0A0A0D] border border-slate-700/80 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-xs placeholder:font-sans disabled:opacity-50"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  {lockoutSeconds > 0 && (
                    <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-3">
                      <Clock className="w-5 h-5 flex-shrink-0 animate-pulse text-rose-400" />
                      <div>
                        <p className="font-bold text-rose-200">Terminal Temporarily Locked</p>
                        <p className="text-[11px] text-rose-300/90 mt-0.5">
                          Too many failed attempts. Defense lock active for{" "}
                          <span className="font-mono font-bold text-white">{lockoutSeconds}s</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {loginError && lockoutSeconds <= 0 && (
                    <div className="text-xs text-rose-400 text-center bg-rose-950/30 py-2.5 px-3 rounded-xl border border-rose-900/50 flex items-center justify-center space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {loginSuccess && (
                    <div className="text-xs text-emerald-400 text-center bg-emerald-950/30 py-2.5 px-3 rounded-xl border border-emerald-900/50 flex items-center justify-center space-x-2">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Access Granted. Loading terminal...</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={lockoutSeconds > 0}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Key className="w-4 h-4" />
                    <span>{lockoutSeconds > 0 ? `Locked (${lockoutSeconds}s)` : "Unlock Valet Terminal"}</span>
                  </button>

                  <div className="pt-1 text-center">
                    <span className="text-[11px] text-slate-500">
                      Default Staff PIN: <strong className="text-slate-400 font-mono">1234</strong>
                    </span>
                  </div>

                  <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => navigateToPortal("hub")}
                      className="text-slate-400 hover:text-slate-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Website Directory</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateToPortal("customer")}
                      className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer flex items-center space-x-1"
                    >
                      <span>Customer Pass</span>
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Authenticated Staff Terminal */
            <>
              {/* Valet Sub-Navigation Header */}
              <header className="bg-[#141416] border-b border-slate-800 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-md">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
                  <div className="flex items-center space-x-3">
                    <Logo size="md" showSubtitle={true} subtitle="Attendant Terminal & Operations" />
                  </div>

                  {/* Subtabs for Staff Website */}
                  <div className="flex items-center space-x-2 bg-[#0E0E10] p-1 rounded-xl border border-slate-800/80 flex-wrap">
                    <button
                      onClick={() => setValetTab("operations")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        valetTab === "operations"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>Live Queue & Intake</span>
                    </button>

                    <button
                      onClick={() => setValetTab("qrhub")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        valetTab === "qrhub"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Table QR Generator</span>
                    </button>

                    <button
                      onClick={() => setValetTab("analytics")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        valetTab === "analytics"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Analytics</span>
                    </button>

                    <button
                      onClick={() => setValetTab("security")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        valetTab === "security"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Security & Access</span>
                    </button>
                  </div>

                  {/* Security & Access Controls */}
                  <div className="flex items-center space-x-2 flex-wrap">
                    {/* Share Customer Web Link Button for attendants */}
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-950/40 hover:bg-sky-900/50 text-sky-400 hover:text-sky-300 border border-sky-800/50 rounded-lg text-xs font-semibold transition cursor-pointer"
                      title="Show or copy Customer Website link for guests"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Customer Link</span>
                    </button>

                    {/* Return to Directory Hub */}
                    <button
                      onClick={() => navigateToPortal("hub")}
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition cursor-pointer"
                      title="View both websites directory"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Hub</span>
                    </button>

                    <span className="flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-[10px] uppercase">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span>Staff Active</span>
                    </span>

                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-900/50 rounded-lg text-xs font-semibold transition cursor-pointer"
                      title="Lock console"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* Valet Main Viewport */}
              <main className="flex-1 w-full max-w-7xl mx-auto py-6 px-4 sm:px-6">
                {valetTab === "operations" && <ManagerDashboard />}

                {valetTab === "qrhub" && (
                  <TableQRHub
                    onSimulateCheckin={() => {
                      navigateToPortal("customer", "?view=checkin");
                    }}
                    onSimulateTableScan={(tableNum) => {
                      setSimulateTableNumber(tableNum);
                      navigateToPortal("customer", `?view=tablerequest&table=${tableNum}`);
                    }}
                  />
                )}

                {valetTab === "analytics" && <AnalyticsPanel currentDeviceId={deviceId} />}

                {valetTab === "security" && <SecurityPanel currentDeviceId={deviceId} />}
              </main>

              {/* Valet Footer */}
              <footer className="py-6 px-6 border-t border-slate-900 text-xs text-slate-600 mt-auto bg-[#0E0E10]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <Logo size="sm" showSubtitle={false} />
                    <span className="text-slate-600">•</span>
                    <p>© 2026 GoValet Operations System • Attendant Terminal</p>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span>Auto-Lock: {autoLockMinutes}m</span>
                    <span>•</span>
                    <span>Brute-Force Guard: Active</span>
                  </div>
                </div>
              </footer>
            </>
          )}
        </div>
      )}

      {/* Attendant "Share Customer Web Link" Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141417] border border-slate-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl relative text-center">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-2">
                Customer Web Pass Link
              </span>
              <h3 className="text-lg font-bold text-white">Share with Diner</h3>
              <p className="text-xs text-slate-400 mt-1">
                Show this QR code to the guest or copy the link to text it.
              </p>
            </div>

            <div className="bg-[#0A0A0D] p-4 rounded-2xl border border-slate-800 inline-block mb-4 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=0f172a&data=${encodeURIComponent(
                  `${originUrl}/customer`
                )}`}
                alt="Customer Portal QR"
                className="w-48 h-48 bg-white p-2 rounded-xl"
              />
            </div>

            <div className="text-[11px] font-mono text-slate-300 truncate mb-5 bg-[#0E0E10] px-3 py-2 rounded-xl border border-slate-850">
              {`${originUrl}/customer`}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={copyCustomerLink}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-sky-600/20"
              >
                {copiedShareLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Customer Link</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Passcode Modal (Direct Dialog) */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141417] border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2 mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Staff Authorization</h3>
              <p className="text-xs text-slate-500">
                Enter your staff passcode to unlock administrative privileges.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Passcode
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.5em] font-mono text-lg py-3 bg-[#0E0E10] border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:tracking-normal"
                  autoFocus
                  required
                />
              </div>

              {loginError && (
                <div className="text-xs text-rose-400 text-center bg-rose-950/20 py-2 rounded-lg border border-rose-950/40">
                  {loginError}
                </div>
              )}

              {loginSuccess && (
                <div className="text-xs text-emerald-400 text-center bg-emerald-950/20 py-2 rounded-lg border border-emerald-950/40 flex items-center justify-center space-x-1">
                  <CheckCircle className="w-4 h-4 animate-bounce" />
                  <span>Passcode Verified! Welcome.</span>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginSuccess}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer border border-indigo-500/30"
                >
                  {loginSuccess ? "Unlocking..." : "Verify Passcode"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
