import React, { useState } from "react";
import { QrCode, Phone, Smartphone, Eye, ArrowRight, Table, Copy, Check, Info } from "lucide-react";

interface TableQRHubProps {
  onSimulateCheckin: () => void;
  onSimulateTableScan: (tableNum: string) => void;
}

export default function TableQRHub({
  onSimulateCheckin,
  onSimulateTableScan,
}: TableQRHubProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Get current hosted URL
  const currentOrigin = window.location.origin;

  // Real, live scannable URLs directed to Customer Website
  const valetStandUrl = `${currentOrigin}/customer?view=checkin`;
  const tableXUrl = (num: string) => `${currentOrigin}/customer?view=tablerequest&table=${num}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(type);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Generate QR code URLs using public QR server
  const getQrUrl = (data: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0f172a&data=${encodeURIComponent(data)}`;

  const demoTables = ["5", "12", "18", "Bar-2"];

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6" id="qr-playground-container">
      {/* Intro Header */}
      <div className="bg-gradient-to-br from-[#121215] to-[#1C1C1F] rounded-xl text-white p-6 md:p-8 shadow-lg border border-slate-800">
        <div className="max-w-2xl">
          <span className="bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-md text-xs font-bold border border-indigo-500/20">
            Interactive QR Playground & Simulator
          </span>
          <h2 className="text-xl md:text-2xl font-display font-extrabold tracking-tight mt-3 text-white">
            Simulate and Test the Entire QR Flow
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-2 leading-relaxed">
            This app uses standard web URLs for QR actions. In a real restaurant, you would print these QR codes and stick them at the valet stand and dining tables. 
            <strong> Scan them with your actual smartphone camera</strong> to test multi-device syncing in real-time, or use the interactive simulator buttons below!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR CODE 1: CUSTOMER PASS & LOOKUP */}
        <div className="bg-[#141417] rounded-xl border border-slate-800 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  CUSTOMER PORTAL
                </span>
                <h3 className="text-base font-display font-bold text-white">Customer Valet Pass QR</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scan to open the Customer Website (`/customer`) to track vehicle status or lookup by plate.
                </p>
              </div>
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <QrCode className="w-5 h-5" />
              </span>
            </div>

            {/* QR Visual */}
            <div className="bg-[#0E0E10] p-4 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center my-4 space-y-3">
              <img
                src={getQrUrl(`${currentOrigin}/customer`)}
                alt="Customer Portal QR"
                className="w-44 h-44 bg-white p-2 rounded-lg shadow-inner border border-slate-700"
              />
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono text-center">
                <span className="truncate max-w-[200px]">{`${currentOrigin}/customer`}</span>
                <button
                  onClick={() => copyToClipboard(`${currentOrigin}/customer`, "valet")}
                  className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {copiedUrl === "valet" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onSimulateCheckin}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer border border-indigo-500/50"
          >
            <Smartphone className="w-4 h-4" />
            <span>Simulate Mobile Scan (Open Customer Website)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* QR CODE 2: TABLE RECOVERYS */}
        <div className="bg-[#141417] rounded-xl border border-slate-800 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  STEP 2: MEAL COMPLETED
                </span>
                <h3 className="text-base font-display font-bold text-white">Dining Table QR Codes</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Glued on dining tables. Guest scans to alert valet they are leaving in 5-10 mins.
                </p>
              </div>
              <span className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                <Table className="w-5 h-5" />
              </span>
            </div>

            {/* Live Table Selection */}
            <div className="my-4 space-y-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Select a Table to View QR
              </span>
              
              <div className="grid grid-cols-4 gap-2">
                {demoTables.map((t) => (
                  <button
                    key={t}
                    onClick={() => onSimulateTableScan(t)}
                    className="py-2.5 bg-[#1C1C1F] hover:bg-rose-950/20 border border-slate-850 hover:border-rose-800/60 rounded-lg text-xs font-bold text-slate-300 hover:text-rose-400 transition flex flex-col items-center space-y-0.5 cursor-pointer"
                  >
                    <span className="text-[9px] text-slate-500">Table</span>
                    <span className="text-sm font-black font-mono">{t}</span>
                  </button>
                ))}
              </div>

              <div className="p-3 bg-[#0E0E10] border border-slate-800/60 rounded-lg flex items-start space-x-2.5 text-[11px] text-slate-400 mt-4 leading-relaxed">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  Scanning a Table QR code automatically registers the table number and queries any active tickets saved in the browser, allowing the guest to retrieve their car in a single tap!
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500 font-semibold italic border-t border-slate-800 pt-4">
            Click any Table button above to simulate scanning from that table
          </div>
        </div>
      </div>

      {/* Guide Flow Card */}
      <div className="bg-[#141417] p-6 rounded-xl border border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-display font-bold text-white flex items-center space-x-2">
          <span>How to test with your actual phone:</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="space-y-1.5 p-4 bg-[#0E0E10] rounded-xl border border-slate-800/50">
            <span className="w-5 h-5 rounded bg-slate-800 text-indigo-400 border border-slate-700/50 font-bold inline-flex items-center justify-center text-[10px] mb-2 font-mono">1</span>
            <h4 className="font-bold text-white">Scan Kiosk with Phone</h4>
            <p className="text-slate-400 text-[11px]">Scan the Kiosk QR on this screen using your smartphone. Fill out and submit the valet form on your phone.</p>
          </div>

          <div className="space-y-1.5 p-4 bg-[#0E0E10] rounded-xl border border-slate-800/50">
            <span className="w-5 h-5 rounded bg-slate-800 text-indigo-400 border border-slate-700/50 font-bold inline-flex items-center justify-center text-[10px] mb-2 font-mono">2</span>
            <h4 className="font-bold text-white">Open Dashboard on Computer</h4>
            <p className="text-slate-400 text-[11px]">On your computer/tablet screen, open the <strong>Valet Operator Dashboard</strong> role. You will see your phone's car registration entry appear in real-time!</p>
          </div>

          <div className="space-y-1.5 p-4 bg-[#0E0E10] rounded-xl border border-slate-800/50">
            <span className="w-5 h-5 rounded bg-slate-800 text-indigo-400 border border-slate-700/50 font-bold inline-flex items-center justify-center text-[10px] mb-2 font-mono">3</span>
            <h4 className="font-bold text-white">Request Retrieval</h4>
            <p className="text-slate-400 text-[11px]">Click "Meal Done" on your phone. You will see the computer dashboard flash and light up, moving your car to the top priority list instantly!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
