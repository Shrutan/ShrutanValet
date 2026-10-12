import React, { useState } from "react";
import {
  Smartphone,
  LayoutDashboard,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Car,
  Lock,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Share2,
  Users,
  Compass
} from "lucide-react";
import Logo from "./Logo";

interface PortalDirectoryHubProps {
  onSelectCustomer: () => void;
  onSelectValet: () => void;
}

export default function PortalDirectoryHub({
  onSelectCustomer,
  onSelectValet,
}: PortalDirectoryHubProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeQrModal, setActiveQrModal] = useState<"customer" | "valet" | null>(null);

  const originUrl = typeof window !== "undefined" ? window.location.origin : "";
  const customerUrl = `${originUrl}/customer`;
  const valetUrl = `${originUrl}/valet`;

  const copyUrl = (url: string, type: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2200);
    }
  };

  const getQrCodeUrl = (url: string, size = 260) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=0f172a&data=${encodeURIComponent(
      url
    )}`;
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-8 px-4 sm:px-6 max-w-6xl mx-auto w-full">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-indigo-400 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          <span>Independent Dual-Website Deployment</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-white tracking-tight">
          Two Separate Websites. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200">
            One Real-Time Valet Engine.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          The customer and valet staff interfaces are decoupled into two distinct websites with separate URLs, isolated permissions, and air-gapped security.
        </p>
      </div>

      {/* The Two Distinct Websites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* ============================================================ */}
        {/* WEBSITE 1: CUSTOMER PORTAL                                   */}
        {/* ============================================================ */}
        <div className="bg-[#141417] border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition shadow-2xl">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Website #1 • Customer Portal</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-[#0E0E10] px-2.5 py-1 rounded-lg border border-slate-800">
                /customer
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Customer Digital Valet Pass
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              Strictly guest-facing. Diners scan their paper claim ticket or table QR code to track their vehicle status in real-time and call for retrieval without staff friction.
            </p>

            {/* Direct URL Box */}
            <div className="bg-[#0A0A0D] border border-slate-800 rounded-xl p-3 mb-6 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Direct Guest Website URL
                </span>
                <span className="text-xs font-mono text-slate-300 truncate block">
                  {customerUrl}
                </span>
              </div>
              <button
                onClick={() => copyUrl(customerUrl, "customer")}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1 border border-slate-700/80 cursor-pointer flex-shrink-0"
                title="Copy Customer Website URL"
              >
                {copiedType === "customer" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Security & Feature Bullets */}
            <div className="space-y-2.5 mb-8">
              <div className="flex items-start space-x-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Zero Staff Access:</strong> No valet controls, intake options, or admin buttons exist on this site.</span>
              </div>
              <div className="flex items-start space-x-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>No App Download:</strong> Opens immediately in mobile browser via QR code or SMS.</span>
              </div>
              <div className="flex items-start space-x-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Table-Side Retrieval:</strong> 1-tap "Meal Done" alert sends instant vehicle fetch order to staff.</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onSelectCustomer}
              className="w-full sm:flex-1 py-3.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/20 cursor-pointer"
            >
              <span>Launch Customer Website</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveQrModal("customer")}
              className="w-full sm:w-auto py-3.5 px-4 bg-[#1C1C1F] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Show scannable QR code for phone test"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>Scan QR on Phone</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* WEBSITE 2: VALET STAFF OS                                    */}
        {/* ============================================================ */}
        <div className="bg-[#141417] border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition shadow-2xl">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Website #2 • Valet Staff OS</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-[#0E0E10] px-2.5 py-1 rounded-lg border border-slate-800">
                /valet
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Valet Staff Operations Terminal
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              Strictly attendant & manager-facing. Stationed on podium tablets or attendants' mobile phones to manage car intake, key tags, stage transitions, analytics, and security.
            </p>

            {/* Direct URL Box */}
            <div className="bg-[#0A0A0D] border border-slate-800 rounded-xl p-3 mb-6 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Direct Staff Terminal URL
                </span>
                <span className="text-xs font-mono text-slate-300 truncate block">
                  {valetUrl}
                </span>
              </div>
              <button
                onClick={() => copyUrl(valetUrl, "valet")}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1 border border-slate-700/80 cursor-pointer flex-shrink-0"
                title="Copy Valet Staff OS URL"
              >
                {copiedType === "valet" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Security & Feature Bullets */}
            <div className="space-y-2.5 mb-8">
              <div className="flex items-start space-x-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span><strong>PIN / Passcode Protected:</strong> Default PIN: <code className="text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded font-mono">1234</code>. Supports long passwords.</span>
              </div>
              <div className="flex items-start space-x-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span><strong>Rate-Limited Defense:</strong> 15-minute anti-brute force lockout after 5 failed passcode attempts.</span>
              </div>
              <div className="flex items-start space-x-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span><strong>Podium Auto-Lock & Device Roster:</strong> Auto-locks on inactivity + hardware device whitelisting.</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onSelectValet}
              className="w-full sm:flex-1 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Launch Staff Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveQrModal("valet")}
              className="w-full sm:w-auto py-3.5 px-4 bg-[#1C1C1F] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Show scannable QR code for podium tablet test"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>Tablet QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deployment & Separation Guide Card */}
      <div className="bg-[#101014] border border-slate-800/80 rounded-2xl p-6 text-xs text-slate-400 space-y-3">
        <div className="flex items-center space-x-2 text-white font-bold">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span>How To Run As 2 Separate Websites in Production:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-3 bg-[#0A0A0D] rounded-xl border border-slate-850">
            <p className="font-semibold text-slate-200 mb-1">For Restaurant Guests:</p>
            <p className="text-[11px] leading-relaxed">
              Print the <strong>Customer Website URL/QR</strong> on paper claim tickets or place QR table tents on dining tables. Guests only ever see their pass and cannot access staff settings.
            </p>
          </div>
          <div className="p-3 bg-[#0A0A0D] rounded-xl border border-slate-850">
            <p className="font-semibold text-slate-200 mb-1">For Valet Attendants:</p>
            <p className="text-[11px] leading-relaxed">
              Add the <strong>Staff Terminal URL</strong> as a home-screen bookmark on the podium iPad or staff phones. Keep the staff PIN/passcode confidential.
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Popup Modal */}
      {activeQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141417] border border-slate-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl relative text-center">
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
                activeQrModal === "customer" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              }`}>
                {activeQrModal === "customer" ? "Customer Website QR" : "Valet Staff OS QR"}
              </span>
              <h3 className="text-lg font-bold text-white mt-2">
                Scan with Smartphone
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Point your phone camera to open the {activeQrModal === "customer" ? "Customer Pass" : "Staff Terminal"} directly on your mobile device.
              </p>
            </div>

            <div className="bg-[#0A0A0D] p-4 rounded-2xl border border-slate-800 inline-block mb-4 shadow-inner">
              <img
                src={getQrCodeUrl(activeQrModal === "customer" ? customerUrl : valetUrl, 240)}
                alt="QR Code"
                className="w-48 h-48 bg-white p-2 rounded-xl"
              />
            </div>

            <div className="text-[11px] font-mono text-slate-400 truncate mb-5 bg-[#0E0E10] px-3 py-2 rounded-xl border border-slate-850">
              {activeQrModal === "customer" ? customerUrl : valetUrl}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => copyUrl(activeQrModal === "customer" ? customerUrl : valetUrl, activeQrModal)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {copiedType === activeQrModal ? "URL Copied!" : "Copy URL"}
              </button>
              <button
                onClick={() => setActiveQrModal(null)}
                className="py-2.5 px-4 bg-slate-700/50 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
