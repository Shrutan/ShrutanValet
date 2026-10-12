import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Key,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Laptop,
  Trash2,
  Check,
  X,
  Sliders,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Activity
} from "lucide-react";
import { DeviceAuthorization, SecurityAuditLog } from "../types";

interface SecurityPanelProps {
  currentDeviceId: string;
}

export default function SecurityPanel({ currentDeviceId }: SecurityPanelProps) {
  const [settings, setSettings] = useState<{
    hasPasscode: boolean;
    requireDeviceApproval: boolean;
    autoLockMinutes: number;
    devices: DeviceAuthorization[];
    auditLogs: SecurityAuditLog[];
    rateLimit?: {
      isLocked: boolean;
      remainingSeconds: number;
      failures: number;
      maxFailures: number;
    };
  }>({
    hasPasscode: true,
    requireDeviceApproval: false,
    autoLockMinutes: 5,
    devices: [],
    auditLogs: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [generalFeedback, setGeneralFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSecuritySettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to load security settings", err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchSecuritySettings().finally(() => setIsLoading(false));
    const interval = setInterval(fetchSecuritySettings, 5000);
    return () => clearInterval(interval);
  }, []);

  // Password Strength Calculation
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "None", color: "bg-slate-700" };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak (PIN only)", color: "bg-rose-500" };
    if (score <= 3) return { score: 2, label: "Moderate", color: "bg-amber-500" };
    if (score <= 4) return { score: 3, label: "Strong", color: "bg-emerald-500" };
    return { score: 4, label: "Enterprise Fortified", color: "bg-indigo-400" };
  };

  const strength = calculateStrength(newPass);

  const generateStrongPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(generated);
    setShowNewPass(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassFeedback(null);
    if (!newPass || newPass.trim().length < 4) {
      setPassFeedback({ type: "error", msg: "Password must be at least 4 characters." });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPasscode: currentPass,
          newPasscode: newPass,
          deviceId: currentDeviceId,
          name: "Current Manager Station"
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update passcode");
      }

      setPassFeedback({ type: "success", msg: "Valet staff password updated successfully!" });
      setCurrentPass("");
      setNewPass("");
      fetchSecuritySettings();
    } catch (err: any) {
      setPassFeedback({ type: "error", msg: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleWhitelist = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requireDeviceApproval: enabled,
          deviceId: currentDeviceId,
        }),
      });
      if (res.ok) {
        setGeneralFeedback({
          type: "success",
          msg: enabled
            ? "Device Whitelisting Enabled: Only approved tablets can access Staff OS."
            : "Device Whitelisting Disabled: Any device with staff PIN can log in."
        });
        fetchSecuritySettings();
      }
    } catch (err: any) {
      setGeneralFeedback({ type: "error", msg: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAutoLock = async (minutes: number) => {
    try {
      await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoLockMinutes: minutes,
          deviceId: currentDeviceId,
        }),
      });
      fetchSecuritySettings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeviceApproveToggle = async (targetDeviceId: string, isApproved: boolean) => {
    try {
      await fetch("/api/admin/devices/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDeviceId, isApproved }),
      });
      fetchSecuritySettings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeviceRevoke = async (targetDeviceId: string) => {
    try {
      await fetch("/api/admin/devices/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDeviceId }),
      });
      fetchSecuritySettings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAuditLogs = async () => {
    if (confirm("Are you sure you want to clear security audit logs?")) {
      try {
        await fetch("/api/admin/audit/clear", { method: "POST" });
        fetchSecuritySettings();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Security Summary */}
      <div className="bg-[#131317] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Valet OS Security & Access Control</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-black text-white">
              Enterprise Access & Defense
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Configure multi-layered security protections: brute-force rate limiting, device whitelisting, auto-lock timeouts, and comprehensive audit logs.
            </p>
          </div>

          <button
            onClick={fetchSecuritySettings}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh State</span>
          </button>
        </div>

        {generalFeedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
              generalFeedback.type === "success"
                ? "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
                : "bg-rose-950/40 border border-rose-800/60 text-rose-300"
            }`}
          >
            <span>{generalFeedback.msg}</span>
            <button
              onClick={() => setGeneralFeedback(null)}
              className="text-slate-400 hover:text-white cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Grid: 3 Pillars of Security */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: Anti-Brute Force Defense */}
        <div className="bg-[#131317] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                Active Defense
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Anti-Brute Force Rate Limiter</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Restricts invalid passcode attempts. If 5 incorrect attempts occur, the terminal locks down for 15 minutes with exponential backoff.
            </p>
          </div>

          <div className="bg-[#0A0A0D] p-3 rounded-xl border border-slate-800/80 text-xs">
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span>Attempt Threshold:</span>
              <strong className="text-white font-mono">5 Attempts</strong>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Lockout Duration:</span>
              <strong className="text-amber-400 font-mono">15 Minutes</strong>
            </div>
          </div>
        </div>

        {/* Pillar 2: Hardware Device Whitelisting */}
        <div className="bg-[#131317] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Laptop className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${
                  settings.requireDeviceApproval
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {settings.requireDeviceApproval ? "Whitelisting ON" : "Whitelisting OFF"}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Hardware Device Whitelisting</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Even if an attacker knows the password, only pre-authorized tablets and operator consoles approved by the manager are allowed in.
            </p>
          </div>

          <button
            onClick={() => handleToggleWhitelist(!settings.requireDeviceApproval)}
            disabled={isSaving}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 border cursor-pointer ${
              settings.requireDeviceApproval
                ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{settings.requireDeviceApproval ? "Disable Whitelist" : "Enable Device Whitelist"}</span>
          </button>
        </div>

        {/* Pillar 3: Inactivity Auto-Lock */}
        <div className="bg-[#131317] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {settings.autoLockMinutes} min idle
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Inactivity Auto-Lock Timer</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Automatically locks the valet staff console back to the passcode screen when unattended at the podium.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {[2, 5, 10, 15].map((mins) => (
              <button
                key={mins}
                onClick={() => handleUpdateAutoLock(mins)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  settings.autoLockMinutes === mins
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                    : "bg-[#0A0A0D] border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Row: Password Management & Connected Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Fortify Staff Passcode / Password */}
        <div className="bg-[#131317] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Fortify Staff Password / PIN</h3>
                <p className="text-[11px] text-slate-400">
                  Upgrade from a 4-digit PIN to a high-entropy alphanumeric password.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={generateStrongPassword}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1 cursor-pointer bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto-Generate</span>
            </button>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Current Passcode / Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter current password (Default: 1234)"
                  className="w-full py-2.5 pl-3 pr-10 bg-[#0A0A0D] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                New Passcode or Complex Password
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="e.g. Valet@Podium2026! or 6-digit PIN"
                  className="w-full py-2.5 pl-3 pr-10 bg-[#0A0A0D] border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPass && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Strength:</span>
                    <span className="font-bold text-slate-300">{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 h-full rounded-full transition-all ${
                          strength.score >= step ? strength.color : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {passFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  passFeedback.type === "success"
                    ? "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
                    : "bg-rose-950/40 border border-rose-800/60 text-rose-300"
                }`}
              >
                {passFeedback.type === "success" ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{passFeedback.msg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving Password..." : "Update Staff Password"}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Connected Hardware Tablets & Device Roster */}
        <div className="bg-[#131317] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Registered Valet Devices & Tablets</h3>
                  <p className="text-[11px] text-slate-400">
                    Pair and manage specific podium iPads, mobile terminals, and manager stations.
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {settings.devices.length} {settings.devices.length === 1 ? "device" : "devices"}
              </span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {settings.devices.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 bg-[#0A0A0D] rounded-xl border border-slate-800/80">
                  No devices registered yet. Devices register upon their first staff login.
                </div>
              ) : (
                settings.devices.map((dev) => {
                  const isCurrent = dev.deviceId === currentDeviceId;
                  return (
                    <div
                      key={dev.deviceId}
                      className={`p-3 rounded-xl border transition flex items-center justify-between text-xs ${
                        isCurrent
                          ? "bg-indigo-950/20 border-indigo-500/40"
                          : "bg-[#0A0A0D] border-slate-800/80"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{dev.name || "Valet Terminal"}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-semibold">
                              Current Console
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                          <span>ID: {dev.deviceId.slice(0, 8)}...</span>
                          <span>•</span>
                          <span>Role: {dev.role.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Whitelist Toggle Button */}
                        <button
                          onClick={() => handleDeviceApproveToggle(dev.deviceId, !dev.isApproved)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer flex items-center space-x-1 ${
                            dev.isApproved !== false
                              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/70"
                              : "bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-950/70"
                          }`}
                          title={dev.isApproved !== false ? "Device Whitelisted" : "Device Blocked"}
                        >
                          {dev.isApproved !== false ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Approved</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 text-rose-400" />
                              <span>Blocked</span>
                            </>
                          )}
                        </button>

                        {!isCurrent && (
                          <button
                            onClick={() => handleDeviceRevoke(dev.deviceId)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Revoke device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Whitelisting Status:</span>
            <span className="font-bold text-white font-mono">
              {settings.requireDeviceApproval ? "STRICT (Approved Only)" : "OPEN (PIN Required)"}
            </span>
          </div>
        </div>
      </div>

      {/* Security Audit Log Stream */}
      <div className="bg-[#131317] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Security Audit Logs</h3>
              <p className="text-[11px] text-slate-400">
                Real-time forensic trail of authentication attempts, lockouts, password modifications, and terminal unlocks.
              </p>
            </div>
          </div>

          {settings.auditLogs && settings.auditLogs.length > 0 && (
            <button
              onClick={handleClearAuditLogs}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Logs</span>
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {(!settings.auditLogs || settings.auditLogs.length === 0) ? (
            <div className="text-center py-8 text-xs text-slate-500 bg-[#0A0A0D] rounded-xl border border-slate-800/80">
              No audit logs recorded yet. Events will appear here in real-time.
            </div>
          ) : (
            settings.auditLogs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div
                  key={log.id}
                  className="p-3 bg-[#0A0A0D] border border-slate-800/80 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                >
                  <div className="flex items-start space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 ${
                        log.status === "success"
                          ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30"
                          : log.status === "warning"
                          ? "bg-amber-950/50 text-amber-400 border border-amber-500/30"
                          : "bg-rose-950/50 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {log.eventType.replace("_", " ")}
                    </span>
                    <div>
                      <p className="text-slate-200 font-medium text-xs">{log.details}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>Device: {log.deviceName || log.deviceId.slice(0, 8)}</span>
                        <span>•</span>
                        <span>IP: {log.ip || "127.0.0.1"}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                    {dateStr}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
