import React, { useState, useEffect } from "react";
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Sparkles,
  Table,
  User,
  Shield,
  Shuffle,
  Eye,
  X,
  Smartphone,
  Layers,
  ArrowRight,
  Info,
  Car,
  Key
} from "lucide-react";

interface ManagerQRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateInApp?: (url: string) => void;
}

export interface GeneratedSessionQR {
  id: string;
  type: "table" | "guest_session" | "kiosk";
  tableNumber: string;
  sessionId: string;
  guestName: string;
  keyTag?: string;
  actionType: "checkin" | "tablerequest";
  url: string;
  createdAt: string;
}

export default function ManagerQRGeneratorModal({
  isOpen,
  onClose,
  onSimulateInApp,
}: ManagerQRGeneratorModalProps) {
  // Mode selection
  const [qrType, setQrType] = useState<"table" | "guest_session" | "kiosk">("table");
  const [actionType, setActionType] = useState<"checkin" | "tablerequest">("checkin");

  // Configuration Fields
  const [tableNumber, setTableNumber] = useState<string>("12");
  const [sessionId, setSessionId] = useState<string>(generateRandomSessionId("SES"));
  const [guestName, setGuestName] = useState<string>("");
  const [keyTag, setKeyTag] = useState<string>("");
  const [zoneName, setZoneName] = useState<string>("Main Dining");

  // UI state
  const [activeTab, setActiveTab] = useState<"generator" | "placard" | "recents">("generator");
  const [copied, setCopied] = useState(false);
  const [recentQrs, setRecentQrs] = useState<GeneratedSessionQR[]>([]);

  // Helper to generate random session ID
  function generateRandomSessionId(prefix = "SES") {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }

  // Load saved recents from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("govalet_saved_qrs") || localStorage.getItem("quickvalet_saved_qrs");
      if (saved) {
        setRecentQrs(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Build the live unique URL
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  
  const generateUrl = () => {
    const params = new URLSearchParams();
    
    if (actionType === "tablerequest") {
      params.set("view", "tablerequest");
      if (tableNumber) params.set("table", tableNumber);
      if (sessionId) params.set("session", sessionId);
    } else {
      params.set("view", "checkin");
      if (tableNumber) params.set("table", tableNumber);
      if (sessionId) params.set("session", sessionId);
      if (guestName) params.set("name", guestName);
      if (keyTag) params.set("keyTag", keyTag);
      if (zoneName && zoneName !== "Main Dining") params.set("zone", zoneName);
    }

    return `${origin}/customer?${params.toString()}`;
  };

  const currentUrl = generateUrl();

  // QR Code Image API URL
  const getQrImageUrl = (dataUrl: string, size = 300) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=0f172a&data=${encodeURIComponent(
      dataUrl
    )}`;
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save current QR to recents
  const handleSaveToRecents = () => {
    const newEntry: GeneratedSessionQR = {
      id: "QR-" + Date.now().toString().slice(-6),
      type: qrType,
      tableNumber,
      sessionId,
      guestName,
      keyTag,
      actionType,
      url: currentUrl,
      createdAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...recentQrs.filter((q) => q.url !== currentUrl)].slice(0, 10);
    setRecentQrs(updated);
    try {
      localStorage.setItem("govalet_saved_qrs", JSON.stringify(updated));
    } catch {}
  };

  // Trigger browser print
  const handlePrint = () => {
    handleSaveToRecents();
    window.print();
  };

  // Preset quick tables
  const presetTables = ["1", "2", "5", "8", "12", "18", "24", "Patio-3", "Bar-2", "VIP-Booth"];
  const presetZones = ["Main Dining", "Rooftop Terrace", "Patio Garden", "VIP Lounge", "Bar Area"];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      id="manager-qr-generator-modal"
    >
      <div className="bg-[#141417] border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="bg-[#101013] px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>Unique Scan-to-Check-In QR Generator</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Manager Utility
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generate dedicated QR codes with pre-locked table numbers or unique guest session tokens.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-[#1C1C1F] hover:bg-slate-800 rounded-xl border border-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-nav Tabs */}
        <div className="flex border-b border-slate-800/80 bg-[#0E0E10] px-6">
          <button
            onClick={() => setActiveTab("generator")}
            className={`py-3 px-4 text-xs font-bold transition flex items-center space-x-2 border-b-2 cursor-pointer ${
              activeTab === "generator"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>1. Generator & Config</span>
          </button>

          <button
            onClick={() => setActiveTab("placard")}
            className={`py-3 px-4 text-xs font-bold transition flex items-center space-x-2 border-b-2 cursor-pointer ${
              activeTab === "placard"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>2. Printable Table Placard / Tent Card</span>
          </button>

          <button
            onClick={() => setActiveTab("recents")}
            className={`py-3 px-4 text-xs font-bold transition flex items-center space-x-2 border-b-2 cursor-pointer ${
              activeTab === "recents"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Recent Generated QRs ({recentQrs.length})</span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "generator" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Select QR Target Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    QR Target Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQrType("table");
                        setActionType("checkin");
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        qrType === "table"
                          ? "bg-indigo-600/10 border-indigo-500 text-white shadow-inner"
                          : "bg-[#0E0E10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Table className={`w-4 h-4 mb-2 ${qrType === "table" ? "text-indigo-400" : "text-slate-500"}`} />
                      <span className="text-xs font-bold block">Dining Table</span>
                      <span className="text-[10px] text-slate-500">For table tent cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setQrType("guest_session");
                        setActionType("checkin");
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        qrType === "guest_session"
                          ? "bg-indigo-600/10 border-indigo-500 text-white shadow-inner"
                          : "bg-[#0E0E10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <User className={`w-4 h-4 mb-2 ${qrType === "guest_session" ? "text-indigo-400" : "text-slate-500"}`} />
                      <span className="text-xs font-bold block">VIP Session</span>
                      <span className="text-[10px] text-slate-500">Unique guest token</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setQrType("kiosk");
                        setActionType("checkin");
                        setTableNumber("");
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        qrType === "kiosk"
                          ? "bg-indigo-600/10 border-indigo-500 text-white shadow-inner"
                          : "bg-[#0E0E10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Car className={`w-4 h-4 mb-2 ${qrType === "kiosk" ? "text-indigo-400" : "text-slate-500"}`} />
                      <span className="text-xs font-bold block">Valet Kiosk</span>
                      <span className="text-[10px] text-slate-500">General drop-off</span>
                    </button>
                  </div>
                </div>

                {/* 2. Destination Action Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Action on Scan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActionType("checkin")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                        actionType === "checkin"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/20"
                          : "bg-[#0E0E10] text-slate-400 border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>1. Scan-to-Check-In (Drop-off)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType("tablerequest")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                        actionType === "tablerequest"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/20"
                          : "bg-[#0E0E10] text-slate-400 border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>2. Table Retrieval Stand (Pick-up)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Table Assignment Section */}
                <div className="space-y-2 bg-[#0E0E10] p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <Table className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Assigned Table / Booth Number</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Auto-locks in guest phone form</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 12 or VIP-4"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-[#141417] border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                    />
                    <select
                      value={zoneName}
                      onChange={(e) => setZoneName(e.target.value)}
                      className="px-3 py-2.5 bg-[#141417] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {presetZones.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preset quick chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {presetTables.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTableNumber(t)}
                        className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                          tableNumber === t
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-[#1C1C1F] text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Unique Guest Session Token */}
                <div className="space-y-2 bg-[#0E0E10] p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Unique Guest Session ID</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSessionId(generateRandomSessionId(qrType === "guest_session" ? "VIP" : "SES"))}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Generate New Token</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="e.g. SES-9482"
                    className="w-full px-3.5 py-2.5 bg-[#141417] border border-slate-800 rounded-xl text-sm font-bold font-mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* 5. Optional Guest Details */}
                {qrType === "guest_session" && (
                  <div className="grid grid-cols-2 gap-3 bg-[#0E0E10] p-4 rounded-xl border border-slate-800/80 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Guest / Party Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Alexander Party"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#141417] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Pre-assigned Key Tag # (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. #Key-14"
                        value={keyTag}
                        onChange={(e) => setKeyTag(e.target.value)}
                        className="w-full px-3 py-2 bg-[#141417] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live QR Preview & Actions (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="bg-[#0E0E10] p-5 rounded-2xl border border-slate-800 flex flex-col items-center text-center shadow-lg relative">
                  {/* Badge */}
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-400 mb-3">
                    <Sparkles className="w-3 h-3" />
                    <span>Live Auto-Updating QR Code</span>
                  </div>

                  {/* QR Image Box */}
                  <div className="bg-white p-3.5 rounded-2xl shadow-xl border-2 border-indigo-500/40 inline-block my-1">
                    <img
                      src={getQrImageUrl(currentUrl, 260)}
                      alt="Generated Scan-to-Check-In QR"
                      className="w-48 h-48 object-contain"
                    />
                  </div>

                  {/* QR Details */}
                  <div className="mt-3 w-full bg-[#141417] border border-slate-800/80 rounded-xl p-2.5 text-left text-xs">
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-slate-400 font-medium">Assigned Table:</span>
                      <span className="font-mono font-bold text-white">
                        {tableNumber ? `Table #${tableNumber}` : "Unassigned / General"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-slate-400 font-medium">Session ID:</span>
                      <span className="font-mono font-bold text-indigo-400">{sessionId}</span>
                    </div>

                    {guestName && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-medium">Guest Name:</span>
                        <span className="font-bold text-white">{guestName}</span>
                      </div>
                    )}
                  </div>

                  {/* Encoded URL breakdown */}
                  <div className="mt-2 w-full text-left">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                      Generated URL
                    </span>
                    <div className="bg-[#141417] px-2.5 py-1.5 rounded-lg border border-slate-800/60 font-mono text-[10px] text-slate-400 truncate flex items-center justify-between">
                      <span className="truncate mr-2">{currentUrl}</span>
                      <button
                        onClick={handleCopy}
                        className="text-slate-400 hover:text-white transition cursor-pointer p-1"
                        title="Copy URL"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/20 border border-indigo-500/40"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Link Copied!" : "Copy Scan Link"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSaveToRecents();
                        window.open(currentUrl, "_blank");
                      }}
                      className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 border border-slate-700"
                      title="Open in New Tab to simulate mobile scan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Test Link</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("placard")}
                      className="flex-1 py-2 bg-[#1C1C1F] hover:bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 border border-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Print Table Placard / Tent Card</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRINTABLE PLACARD / TENT CARD */}
          {activeTab === "placard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#0E0E10] p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Printable Table Tent / Valet Placard Card</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Print this placard and place it on Table #{tableNumber || "X"} or hand it to guests upon arrival.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Placard Now</span>
                </button>
              </div>

              {/* Placard Preview Canvas */}
              <div className="flex justify-center p-4">
                <div
                  id="printable-valet-placard"
                  className="w-full max-w-sm bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border-4 border-indigo-600 text-center flex flex-col items-center space-y-4"
                >
                  {/* Restaurant Header */}
                  <div className="border-b border-slate-200 pb-3 w-full">
                    <div className="inline-flex items-center space-x-1.5 text-indigo-600 font-extrabold text-xs uppercase tracking-widest mb-1">
                      <Key className="w-3.5 h-3.5" />
                      <span>GoValet Concierge</span>
                    </div>
                    <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">
                      {tableNumber ? `Dining Table #${tableNumber}` : "Express Valet Check-In"}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {zoneName ? `${zoneName} • ` : ""}Session #{sessionId}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="p-3 bg-slate-50 rounded-2xl border-2 border-slate-900 inline-block shadow-md">
                    <img
                      src={getQrImageUrl(currentUrl, 260)}
                      alt={`Table ${tableNumber} QR Code`}
                      className="w-48 h-48 object-contain"
                    />
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1.5 text-left w-full bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 text-slate-800 text-[11px]">
                    <div className="font-bold text-indigo-900 text-xs mb-1 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>How to retrieve your car:</span>
                    </div>
                    <p className="leading-snug">
                      <strong>1.</strong> Point your phone camera at this QR code.
                    </p>
                    <p className="leading-snug">
                      <strong>2.</strong> Enter the last 4 digits of your vehicle plate.
                    </p>
                    <p className="leading-snug">
                      <strong>3.</strong> Tap <em>"Request Car"</em> before paying your check.
                    </p>
                  </div>

                  <div className="text-[10px] text-slate-400 italic pt-1">
                    No app download required • Instant live updates
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECENT GENERATED QR CODES */}
          {activeTab === "recents" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Recently Generated Session QR Codes</h3>
                {recentQrs.length > 0 && (
                  <button
                    onClick={() => {
                      setRecentQrs([]);
                      localStorage.removeItem("quickvalet_saved_qrs");
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {recentQrs.length === 0 ? (
                <div className="text-center py-12 bg-[#0E0E10] rounded-xl border border-slate-800 text-slate-500 text-xs">
                  <QrCode className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                  <p>No recently generated QR codes yet.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Use the generator tab to create table or session links.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recentQrs.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0E0E10] p-4 rounded-xl border border-slate-800 flex items-start justify-between space-x-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white font-mono">
                            {item.tableNumber ? `Table #${item.tableNumber}` : "General Kiosk"}
                          </span>
                          <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded font-mono font-semibold">
                            {item.sessionId}
                          </span>
                        </div>

                        {item.guestName && (
                          <p className="text-xs text-slate-300 font-medium">Guest: {item.guestName}</p>
                        )}

                        <p className="text-[10px] text-slate-500 font-mono truncate max-w-[240px]">
                          {item.url}
                        </p>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.url);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="p-1.5 bg-[#1C1C1F] hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                          title="Copy Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => window.open(item.url, "_blank")}
                          className="p-1.5 bg-[#1C1C1F] hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                          title="Open Link in New Tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#101013] px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scanning on mobile automatically opens the pre-filled check-in portal.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition cursor-pointer"
          >
            Close Utility
          </button>
        </div>
      </div>
    </div>
  );
}
