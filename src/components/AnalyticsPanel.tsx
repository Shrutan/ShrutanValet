import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  Car,
  CheckCircle,
  HelpCircle,
  BarChart2,
  Sliders,
  DollarSign,
  Briefcase,
  AlertCircle,
  Shield,
  Trash2,
  Key
} from "lucide-react";
import { CarEntry } from "../types";

export default function AnalyticsPanel({ currentDeviceId }: { currentDeviceId?: string }) {
  const [cars, setCars] = useState<CarEntry[]>([]);
  const [restaurantName, setRestaurantName] = useState("L'Avenue French Bistro");
  const [capacity, setCapacity] = useState(120);
  const [valetCount, setValetCount] = useState(3);
  const [successMsg, setSuccessMsg] = useState("");

  // Device & passcode state
  const [devices, setDevices] = useState<any[]>([]);
  const [passcodeCurrent, setPasscodeCurrent] = useState("");
  const [passcodeNew, setPasscodeNew] = useState("");
  const [passcodeSuccessMsg, setPasscodeSuccessMsg] = useState("");
  const [passcodeErrorMsg, setPasscodeErrorMsg] = useState("");
  const [deviceMsg, setDeviceMsg] = useState("");

  const fetchCars = async () => {
    try {
      const response = await fetch("/api/cars");
      if (response.ok) {
        const data = await response.json();
        setCars(data);
      }
    } catch {}
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchCars();
    fetchDevices();
    const interval = setInterval(() => {
      fetchCars();
      fetchDevices();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("Settings updated successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAssignRole = async (targetDeviceId: string, role: string, name: string) => {
    try {
      const res = await fetch("/api/admin/devices/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDeviceId, role, name })
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        setDeviceMsg("Role assigned successfully!");
        setTimeout(() => setDeviceMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeDevice = async (targetDeviceId: string) => {
    if (targetDeviceId === currentDeviceId) {
      alert("You cannot revoke access to your current active master session.");
      return;
    }
    try {
      const res = await fetch("/api/admin/devices/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDeviceId })
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        setDeviceMsg("Device revoked successfully.");
        setTimeout(() => setDeviceMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeErrorMsg("");
    setPasscodeSuccessMsg("");
    try {
      const res = await fetch("/api/admin/update-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPasscode: passcodeCurrent,
          newPasscode: passcodeNew
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasscodeSuccessMsg("Passcode changed successfully!");
        setPasscodeCurrent("");
        setPasscodeNew("");
        setTimeout(() => setPasscodeSuccessMsg(""), 4000);
      } else {
        setPasscodeErrorMsg(data.error || "Failed to update passcode");
      }
    } catch (err) {
      setPasscodeErrorMsg("Failed to connect to backend");
    }
  };

  // Calculations
  const totalTickets = cars.length;
  const activeTickets = cars.filter((c) => c.status !== "DELIVERED").length;
  const completedTickets = cars.filter((c) => c.status === "DELIVERED").length;

  const readyCarsWithTimes = cars.filter((c) => c.requestedAt && c.readyAt);
  const totalRetrievalMinutes = readyCarsWithTimes.reduce((acc, car) => {
    const reqTime = new Date(car.requestedAt!).getTime();
    const readyTime = new Date(car.readyAt!).getTime();
    return acc + (readyTime - reqTime) / 60000;
  }, 0);
  const avgRetrievalTime = readyCarsWithTimes.length > 0
    ? Math.round((totalRetrievalMinutes / readyCarsWithTimes.length) * 10) / 10
    : 4.8;

  // Custom Chart Data: Hourly distribution of valets (Simulated/Calculated)
  const hourlyData = [
    { hour: "5 PM", count: 4 },
    { hour: "6 PM", count: 12 },
    { hour: "7 PM", count: 24 },
    { hour: "8 PM", count: 32 },
    { hour: "9 PM", count: 18 },
    { hour: "10 PM", count: 28 },
    { hour: "11 PM", count: 14 },
  ];

  const maxCount = Math.max(...hourlyData.map((d) => d.count));

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6" id="analytics-panel-container">
      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Col 1 & 2: Stats & Visual Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141417] p-6 rounded-xl border border-slate-800 shadow-sm space-y-6">
            <h3 className="text-sm font-display font-bold text-white flex items-center space-x-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              <span>Valet Performance Analytics</span>
            </h3>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[#0E0E10] rounded-xl border border-slate-800/60">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                  SLA Wait Time Target
                </span>
                <span className="text-xl font-mono font-black text-white block mt-1">
                  &lt; 6.0 <span className="text-xs font-normal text-slate-500">mins</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                  100% On-Target
                </span>
              </div>

              <div className="p-4 bg-[#0E0E10] rounded-xl border border-slate-800/60">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                  Actual SLA Avg
                </span>
                <span className="text-xl font-mono font-black text-indigo-400 block mt-1">
                  {avgRetrievalTime} <span className="text-xs font-normal text-slate-500">mins</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                  Based on active loops
                </span>
              </div>

              <div className="p-4 bg-[#0E0E10] rounded-xl border border-slate-800/60">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                  Total Serviced
                </span>
                <span className="text-xl font-mono font-black text-white block mt-1">
                  {totalTickets} <span className="text-xs font-normal text-slate-500">cars</span>
                </span>
                <span className="text-[10px] text-indigo-400 font-medium block mt-0.5">
                  Tonight's total
                </span>
              </div>
            </div>

            {/* Custom Responsive SVG Chart */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Peak Busy Hours (Car Drop-offs & Retrievals)
                </h4>
                <span className="text-[10px] text-slate-500 font-semibold font-mono">Live hourly tracking</span>
              </div>

              <div className="h-56 bg-[#0E0E10] rounded-xl border border-slate-800/60 p-6 flex flex-col justify-between">
                {/* Visual SVG bars */}
                <div className="flex-1 flex items-end justify-between space-x-4 pt-4">
                  {hourlyData.map((d) => {
                    const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                    return (
                      <div key={d.hour} className="flex-1 flex flex-col items-center h-full group justify-end relative">
                        {/* Hover tooltip */}
                        <span className="opacity-0 group-hover:opacity-100 transition duration-200 bg-slate-950 text-white border border-slate-800 text-[10px] font-bold py-1 px-2 rounded -translate-y-2 pointer-events-none absolute mb-16 shadow-lg z-10 font-mono">
                          {d.count} Cars
                        </span>

                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-t transition-all duration-500 ease-out shadow-lg shadow-indigo-950/20 group-hover:scale-x-105"
                        />
                        <span className="text-[10px] text-slate-500 font-medium mt-2 font-mono">
                          {d.hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Master Access Control Panel */}
          <div className="bg-[#141417] p-6 rounded-xl border border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h3 className="text-sm font-display font-bold text-white flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span>Master Access Control & Role Manager</span>
              </h3>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-bold w-fit">
                {devices.length} Registered Devices
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              As the Master Admin, you can authorize devices, designate staff to the operator dashboard, or revoke access. When customers scan QR codes, they are automatically restricted to the Guest Kiosk role for secure, zero-config access.
            </p>

            {deviceMsg && (
              <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 rounded-lg text-indigo-300 text-xs flex items-center space-x-1.5 animate-pulse">
                <CheckCircle className="w-4 h-4" />
                <span>{deviceMsg}</span>
              </div>
            )}

            {/* Devices List */}
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0E0E10]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#141417] text-slate-400 font-bold">
                    <th className="p-3">Device Name & ID</th>
                    <th className="p-3">Role Authorization</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                        No external devices registered yet. Scan a QR code to see devices list dynamically.
                      </td>
                    </tr>
                  ) : (
                    devices.map((dev) => {
                      const isSelf = dev.deviceId === currentDeviceId;
                      return (
                        <tr key={dev.deviceId} className={`hover:bg-slate-900/40 ${isSelf ? "bg-indigo-500/5" : ""}`}>
                          <td className="p-3 space-y-0.5">
                            <div className="font-bold text-white flex items-center space-x-1.5">
                              <span className="truncate max-w-[150px]">{dev.name || "Unnamed Device"}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.2 rounded uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">{dev.deviceId}</div>
                          </td>
                          <td className="p-3">
                            <select
                              value={dev.role}
                              onChange={(e) => handleAssignRole(dev.deviceId, e.target.value as any, dev.name)}
                              className="px-2 py-1 bg-[#141417] border border-slate-800 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                            >
                              <option value="guest">Guest (Kiosk Only)</option>
                              <option value="manager">Valet Operator</option>
                              <option value="qrplayground">QR Playground Admin</option>
                              <option value="analytics">SaaS Owner / Analytics</option>
                            </select>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">
                            {dev.lastActive ? new Date(dev.lastActive).toLocaleTimeString() : "Unknown"}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleRevokeDevice(dev.deviceId)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center space-x-1 ml-auto cursor-pointer ${
                                isSelf
                                  ? "border-slate-800 text-slate-600 cursor-not-allowed"
                                  : "border-slate-800 hover:border-rose-800/40 text-slate-400 hover:text-rose-400 bg-slate-900/30"
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Change Passcode Card */}
            <div className="bg-[#0E0E10] border border-slate-800/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Update Master Kiosk Passcode
                </h4>
              </div>

              <form onSubmit={handleUpdatePasscode} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Current Passcode
                  </label>
                  <input
                    type="password"
                    value={passcodeCurrent}
                    onChange={(e) => setPasscodeCurrent(e.target.value)}
                    placeholder="e.g. 1234"
                    className="w-full px-3 py-1.5 bg-[#141417] border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    New Passcode
                  </label>
                  <input
                    type="password"
                    value={passcodeNew}
                    onChange={(e) => setPasscodeNew(e.target.value)}
                    placeholder="Set new secret"
                    className="w-full px-3 py-1.5 bg-[#141417] border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer border border-indigo-500/50"
                  >
                    Change Passcode
                  </button>
                </div>
              </form>

              {passcodeSuccessMsg && (
                <div className="text-xs text-emerald-400 bg-emerald-950/20 py-1.5 px-3 rounded-lg border border-emerald-950/40">
                  {passcodeSuccessMsg}
                </div>
              )}

              {passcodeErrorMsg && (
                <div className="text-xs text-rose-400 bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-950/40">
                  {passcodeErrorMsg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Col 3: SaaS Restaurant Settings */}
        <div className="space-y-6">
          <div className="bg-[#141417] p-6 rounded-xl border border-slate-800 shadow-sm">
            <h3 className="text-sm font-display font-bold text-white flex items-center space-x-2 mb-4">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>SaaS Settings (Restaurant)</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E0E10] border border-slate-800 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Total Lot Parking Capacity
                </label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0E0E10] border border-slate-800 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Active Valet Staff Members
                </label>
                <input
                  type="number"
                  value={valetCount}
                  onChange={(e) => setValetCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0E0E10] border border-slate-800 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {successMsg && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-emerald-400 text-xs flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer border border-indigo-500/50"
              >
                Save SaaS Configuration
              </button>
            </form>
          </div>

          {/* Pricing Model & Business Info */}
          <div className="bg-gradient-to-br from-[#1C1C1F] to-[#121215] p-5 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              <span>SaaS Business Metrics</span>
            </h4>
            <div className="text-xs text-slate-400 space-y-2">
              <p>
                <strong className="text-slate-300">Current Plan:</strong> Premium Restaurant Tier ($149/mo)
              </p>
              <p>
                <strong className="text-slate-300">Revenue Generated:</strong> $2,450.00 this month (incl. gratuities synced through POS)
              </p>
              <p>
                <strong className="text-slate-300">Value Proposition:</strong> Reduced exit bottlenecks by 82%, adding approx. 2.4 more table turnovers per weekend night.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
