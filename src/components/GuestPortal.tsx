import React, { useState, useEffect } from "react";
import {
  Car,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Table,
  Phone,
  User,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  X,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Tag
} from "lucide-react";
import { CarEntry, CarStatus } from "../types";
import Logo from "./Logo";

interface GuestPortalProps {
  initialTicketId?: string | null;
  onTicketIdChange?: (id: string | null) => void;
  simulateTableNumber?: string;
}

export default function GuestPortal({
  initialTicketId,
  onTicketIdChange,
  simulateTableNumber,
}: GuestPortalProps) {
  // Active tracking state
  const [ticketId, setTicketId] = useState<string | null>(initialTicketId || localStorage.getItem("guest_ticket_id"));
  const [trackedCar, setTrackedCar] = useState<CarEntry | null>(null);
  const [trackerError, setTrackerError] = useState("");
  const [retrievalError, setRetrievalError] = useState("");
  const [isLoadingTracker, setIsLoadingTracker] = useState(false);

  // Navigation / View state (Only Tracker & Lookup for Customers)
  const [activeTab, setActiveTab] = useState<"tracker" | "lookup">(
    initialTicketId || localStorage.getItem("guest_ticket_id") ? "tracker" : "lookup"
  );

  const [tableNumber, setTableNumber] = useState(simulateTableNumber || "");
  const [sessionId, setSessionId] = useState("");

  // Instant Ticket QR Modal State
  const [qrModalCar, setQrModalCar] = useState<CarEntry | null>(null);
  const [copiedModalUrl, setCopiedModalUrl] = useState(false);

  // Parse URL search parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTicket = params.get("ticket") || params.get("ticketId");
      const urlTable = params.get("table");
      const urlSession = params.get("session") || params.get("sessionId");

      if (urlTicket) {
        setTicketId(urlTicket);
        setActiveTab("tracker");
      }
      if (urlTable) setTableNumber(urlTable);
      if (urlSession) setSessionId(urlSession);
    }
  }, []);

  // Lookup state
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<CarEntry[]>([]);
  const [lookupError, setLookupError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Sync state with parent and localStorage
  useEffect(() => {
    if (ticketId) {
      localStorage.setItem("guest_ticket_id", ticketId);
      if (onTicketIdChange) onTicketIdChange(ticketId);
      setActiveTab("tracker");
    } else {
      localStorage.removeItem("guest_ticket_id");
      if (onTicketIdChange) onTicketIdChange(null);
    }
  }, [ticketId]);

  // Update table number if simulated
  useEffect(() => {
    if (simulateTableNumber) {
      setTableNumber(simulateTableNumber);
      if (ticketId) {
        setActiveTab("tracker");
      } else {
        setActiveTab("lookup");
      }
    }
  }, [simulateTableNumber, ticketId]);

  // Poll car status from backend when tracking a ticket
  useEffect(() => {
    if (!ticketId || activeTab !== "tracker") return;

    const fetchCarStatus = async () => {
      try {
        const response = await fetch(`/api/cars/${ticketId}`);
        if (!response.ok) {
          throw new Error("Valet ticket not found or expired.");
        }
        const data = await response.json();
        setTrackedCar(data);
        setTrackerError("");
      } catch (err: any) {
        setTrackerError(err.message);
        setTrackedCar(null);
      }
    };

    setIsLoadingTracker(true);
    fetchCarStatus().finally(() => setIsLoadingTracker(false));

    // Poll every 4 seconds for live updates
    const interval = setInterval(fetchCarStatus, 4000);
    return () => clearInterval(interval);
  }, [ticketId, activeTab]);

  // QR Code generator helper URLs pointing to Customer Website
  const getTicketDirectUrl = (id: string) => {
    if (typeof window === "undefined") return `/customer?ticket=${id}`;
    return `${window.location.origin}/customer?ticket=${id}`;
  };

  const getTicketQrImageUrl = (id: string, size = 280) => {
    const directUrl = getTicketDirectUrl(id);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=0f172a&data=${encodeURIComponent(directUrl)}`;
  };

  const copyTicketUrlToClipboard = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(getTicketDirectUrl(id));
      setCopiedModalUrl(true);
      setTimeout(() => setCopiedModalUrl(false), 2200);
    }
  };

  // Search/Lookup a car
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    setLookupResults([]);
    
    if (!lookupQuery) return;
    setIsSearching(true);

    try {
      const response = await fetch("/api/cars/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: lookupQuery }),
      });

      if (!response.ok) {
        throw new Error("Search failed.");
      }

      const results = await response.json();
      setLookupResults(results);
      if (results.length === 0) {
        setLookupError("No active valet ticket found matching that plate or ticket ID.");
      }
    } catch (err: any) {
      setLookupError(err.message || "Error searching for ticket.");
    } finally {
      setIsSearching(false);
    }
  };

  // Request Retrieval
  const handleRequestRetrieval = async (id: string) => {
    try {
      const response = await fetch(`/api/cars/${id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: tableNumber || undefined }),
      });

      if (!response.ok) {
        throw new Error("Failed to request valet retrieval.");
      }

      const updatedCar = await response.json();
      if (ticketId === id) {
        setTrackedCar(updatedCar);
      } else {
        setTicketId(id);
      }
      setActiveTab("tracker");
      setRetrievalError("");
    } catch (err: any) {
      setRetrievalError(err.message || "Failed to request valet retrieval.");
    }
  };

  const getStatusStepClass = (stepStatus: CarStatus, currentStatus: CarStatus) => {
    const statusOrder: CarStatus[] = [
      "CHECKED_IN",
      "RETRIEVAL_REQUESTED",
      "RETRIEVAL_IN_PROGRESS",
      "READY",
      "DELIVERED",
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepStatus);

    if (stepIndex < currentIndex) {
      return "bg-emerald-600 text-white border-emerald-600"; // completed
    } else if (stepIndex === currentIndex) {
      return "bg-indigo-600 text-white border-indigo-600 animate-pulse ring-4 ring-indigo-100"; // active
    } else {
      return "bg-white text-slate-400 border-slate-200"; // pending
    }
  };

  const getStatusTextClass = (stepStatus: CarStatus, currentStatus: CarStatus) => {
    const statusOrder: CarStatus[] = [
      "CHECKED_IN",
      "RETRIEVAL_REQUESTED",
      "RETRIEVAL_IN_PROGRESS",
      "READY",
      "DELIVERED",
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepStatus);

    if (stepIndex < currentIndex) {
      return "text-slate-800 font-medium";
    } else if (stepIndex === currentIndex) {
      return "text-indigo-600 font-bold";
    } else {
      return "text-slate-400";
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#141416] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden" id="guest-portal-container">
      {/* Top Banner / Tab Navigation */}
      <div className="bg-[#0E0E10] text-white px-6 pt-6 pb-5 relative border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Logo size="md" showSubtitle={true} subtitle="Customer Mobile Vehicle Tracker" />
          </div>

          {trackedCar && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
              Pass Active
            </span>
          )}
        </div>

        {/* Customer Tabs */}
        <div className="flex bg-[#0A0A0B] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("tracker")}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 relative cursor-pointer ${
              activeTab === "tracker"
                ? "bg-slate-800 text-indigo-400 shadow"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            1. Live Status Tracker
            {ticketId && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-[#0A0A0B]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("lookup")}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "lookup"
                ? "bg-slate-800 text-indigo-400 shadow"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            2. Find My Ticket
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* LIVE TRACKER VIEW */}
        {activeTab === "tracker" && (
          <div className="space-y-6">
            {!ticketId ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl p-6">
                <Car className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-1">No Active Valet Ticket</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5 leading-relaxed">
                  Your valet attendant registers your car upon curb drop-off. Point your camera at the QR code on your valet card, or search below by your license plate last 4 or key tag number.
                </p>
                <button
                  onClick={() => setActiveTab("lookup")}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  Find My Valet Ticket
                </button>
              </div>
            ) : isLoadingTracker && !trackedCar ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Loading your digital valet ticket...</p>
              </div>
            ) : trackerError ? (
              <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-xl text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <h4 className="font-bold text-rose-300 text-sm mb-1">Ticket Error</h4>
                <p className="text-xs text-rose-400 mb-4">{trackerError}</p>
                <button
                  onClick={() => setTicketId(null)}
                  className="px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900 border border-rose-800 rounded-lg text-xs font-bold text-rose-300 transition"
                >
                  Clear Ticket & Restart
                </button>
              </div>
            ) : trackedCar ? (
              <div className="space-y-6">
                {/* DIGITAL PASS TICKET DESIGN */}
                <div className="relative bg-[#1C1C1F] border border-slate-800 rounded-2xl overflow-hidden p-5 shadow-inner">
                  {/* Notch cutouts for ticket look */}
                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#141416] border border-slate-800 rounded-full" />
                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#141416] border border-slate-800 rounded-full" />

                  <div className="flex justify-between items-start border-b border-dashed border-slate-800 pb-4 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        DIGITAL VALET TICKET
                      </span>
                      <h3 className="text-3xl font-mono font-extrabold text-white tracking-tight mt-0.5">
                        {trackedCar.id}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setQrModalCar(trackedCar)}
                        className="px-2.5 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                        title="Display scannable QR ticket code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Show QR</span>
                      </button>
                      <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-mono text-xs font-bold tracking-wider">
                        TAG {trackedCar.keyTag || "Pending"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Car Plate</span>
                      <span className="font-bold text-white font-mono text-sm tracking-wide">
                        [****] {trackedCar.plate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Vehicle</span>
                      <span className="font-bold text-white">
                        {trackedCar.color} {trackedCar.brand} {trackedCar.model}
                      </span>
                    </div>
                    {trackedCar.name && (
                      <div>
                        <span className="text-slate-500 block mb-0.5">Guest Name</span>
                        <span className="font-bold text-slate-300">{trackedCar.name}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 block mb-0.5">Location</span>
                      <span className="font-bold text-indigo-400 flex items-center space-x-1">
                        <Table className="w-3.5 h-3.5 mr-1 inline" />
                        <span>{trackedCar.tableNumber ? `Table ${trackedCar.tableNumber}` : "Not Dining"}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* CURRENT STATUS PANEL */}
                <div className="bg-[#1C1C1F] rounded-2xl p-4 border border-slate-800/80 flex items-center space-x-4">
                  {trackedCar.status === "CHECKED_IN" && (
                    <>
                      <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 flex-shrink-0">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">Car is Safely Parked</h4>
                        <p className="text-xs text-slate-400">
                          Enjoy your meal! Click the button below when you are 5-10 minutes from leaving.
                        </p>
                      </div>
                    </>
                  )}

                  {trackedCar.status === "RETRIEVAL_REQUESTED" && (
                    <>
                      <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 flex-shrink-0">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">Retrieval Requested</h4>
                        <p className="text-xs text-slate-400">
                          Valet crew has been alerted. We are preparing to retrieve your car.
                        </p>
                      </div>
                    </>
                  )}

                  {trackedCar.status === "RETRIEVAL_IN_PROGRESS" && (
                    <>
                      <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 flex-shrink-0">
                        <Car className="w-6 h-6 animate-bounce" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">Staff Fetching Your Car</h4>
                        <p className="text-xs text-slate-400">
                          Valet team is bringing your car to the main exit. Estimated wait: <span className="font-bold text-indigo-300">2-4 mins</span>.
                        </p>
                      </div>
                    </>
                  )}

                  {trackedCar.status === "READY" && (
                    <>
                      <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 flex-shrink-0">
                        <CheckCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-emerald-300 text-sm">Car Ready at Exit!</h4>
                        <p className="text-xs text-emerald-400">
                          Your car is waiting for you at the restaurant exit point. Please show ticket <span className="font-bold">{trackedCar.id}</span> to the staff.
                        </p>
                      </div>
                    </>
                  )}

                  {trackedCar.status === "DELIVERED" && (
                    <>
                      <div className="p-3 bg-slate-800 rounded-xl text-slate-400 flex-shrink-0">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">Delivered & Closed</h4>
                        <p className="text-xs text-slate-400">
                          Your car was returned safely. Thank you for dining with us! Have a safe drive.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Retrieval Error Notice */}
                {retrievalError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{retrievalError}</span>
                  </div>
                )}

                {/* THE "MEAL DONE" BUTTON (Only visible for parked cars) */}
                {trackedCar.status === "CHECKED_IN" && (
                  <button
                    onClick={() => handleRequestRetrieval(trackedCar.id)}
                    className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-indigo-900/20 flex flex-col items-center justify-center transition cursor-pointer"
                  >
                    <span>Meal Done / Get My Car</span>
                    <span className="text-[10px] font-normal text-indigo-200 mt-0.5">
                      Triggers instant valet retrieval (5-10 min head start)
                    </span>
                  </button>
                )}

                {/* VISUAL STEPPER PROCESS */}
                <div className="border-t border-slate-800 pt-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
                    Retrieval Progress
                  </h4>

                  <div className="relative">
                    {/* Stepper bar */}
                    <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-slate-800" />

                    <div className="space-y-5 relative">
                      {/* Step 1: Checked In */}
                      <div className="flex items-start space-x-3.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
                          trackedCar.status === "CHECKED_IN" 
                            ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 ring-2 ring-indigo-500/20" 
                            : "bg-[#1C1C1F] text-slate-500 border-slate-800"
                        }`}>
                          P
                        </div>
                        <div className="pt-1.5">
                          <h5 className={`text-xs font-semibold ${trackedCar.status === "CHECKED_IN" ? "text-indigo-400 font-bold" : "text-slate-400"}`}>
                            Car Safely Parked
                          </h5>
                          <p className="text-[10px] text-slate-500">Key associated with tag #{trackedCar.keyTag || "TBD"}</p>
                        </div>
                      </div>

                      {/* Step 2: Requested */}
                      <div className="flex items-start space-x-3.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
                          trackedCar.status === "RETRIEVAL_REQUESTED" 
                            ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 ring-2 ring-indigo-500/20" 
                            : trackedCar.requestedAt ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" : "bg-[#1C1C1F] text-slate-500 border-slate-800"
                        }`}>
                          R
                        </div>
                        <div className="pt-1.5">
                          <h5 className={`text-xs font-semibold ${trackedCar.status === "RETRIEVAL_REQUESTED" ? "text-indigo-400 font-bold" : "text-slate-400"}`}>
                            Retrieval Requested
                          </h5>
                          <p className="text-[10px] text-slate-500">
                            {trackedCar.requestedAt
                              ? `Requested at ${new Date(trackedCar.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : "Waiting for request"}
                          </p>
                        </div>
                      </div>

                      {/* Step 3: In Progress */}
                      <div className="flex items-start space-x-3.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
                          trackedCar.status === "RETRIEVAL_IN_PROGRESS" 
                            ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 ring-2 ring-indigo-500/20" 
                            : (trackedCar.status === "READY" || trackedCar.status === "DELIVERED") ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" : "bg-[#1C1C1F] text-slate-500 border-slate-800"
                        }`}>
                          F
                        </div>
                        <div className="pt-1.5">
                          <h5 className={`text-xs font-semibold ${trackedCar.status === "RETRIEVAL_IN_PROGRESS" ? "text-indigo-400 font-bold" : "text-slate-400"}`}>
                            Staff Fetching Car
                          </h5>
                          <p className="text-[10px] text-slate-500">Valet teammate is retrieving keys and vehicle</p>
                        </div>
                      </div>

                      {/* Step 4: Ready */}
                      <div className="flex items-start space-x-3.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
                          trackedCar.status === "READY" 
                            ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 ring-2 ring-indigo-500/20" 
                            : trackedCar.status === "DELIVERED" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" : "bg-[#1C1C1F] text-slate-500 border-slate-800"
                        }`}>
                          G
                        </div>
                        <div className="pt-1.5">
                          <h5 className={`text-xs font-semibold ${trackedCar.status === "READY" ? "text-indigo-400 font-bold" : "text-slate-400"}`}>
                            Ready at Exit Point
                          </h5>
                          <p className="text-[10px] text-slate-500">Parked in the pick-up lane, ready to go</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear your local session ticket?")) {
                        setTicketId(null);
                        setTrackedCar(null);
                        setActiveTab("checkin");
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                  >
                    Exit & Clear Ticket Session
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* LOOKUP TICKET VIEW */}
        {activeTab === "lookup" && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-display font-bold text-white mb-1">Find Valet Ticket</h2>
              <p className="text-xs text-slate-400">
                Did you drop your car off without scanning the code first, or lost your ticket page? Enter your plate last 4 digits or ticket ID to link it.
              </p>
            </div>

            <form onSubmit={handleLookup} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Plate Digits or Ticket ID (e.g. 2311 or T-1003)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5834"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#0E0E10] border border-slate-800 rounded-xl text-sm font-semibold uppercase text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-700"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>{isSearching ? "Searching..." : "Search"}</span>
                  </button>
                </div>
              </div>

              {lookupError && (
                <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{lookupError}</span>
                </div>
              )}
            </form>

            {lookupResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Matching Active Vehicles
                </h3>

                {lookupResults.map((car) => (
                  <div
                    key={car.id}
                    className="p-4 bg-[#1C1C1F] border border-slate-800 rounded-xl flex justify-between items-center hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-extrabold text-white text-sm">{car.id}</span>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold">
                          {car.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-300 mt-1">
                        {car.color} {car.brand} {car.model}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Plate: [****] {car.plate} | Key Tag: {car.keyTag || "Unassigned"}
                      </p>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <button
                        onClick={() => {
                          setTicketId(car.id);
                          setActiveTab("tracker");
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-xs font-bold transition cursor-pointer"
                      >
                        Track Status
                      </button>

                      {car.status === "CHECKED_IN" && (
                        <button
                          onClick={() => handleRequestRetrieval(car.id)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition cursor-pointer"
                        >
                          Request Retrieval
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="border-t border-slate-800/60 py-3 px-6 bg-[#0E0E10] flex justify-between items-center text-[10px] text-slate-500 font-medium">
        <span>Powered by QuickValet SaaS</span>
        <span>Verified Secure Connection</span>
      </div>

      {/* INSTANT DIGITAL TICKET QR POPUP MODAL */}
      {qrModalCar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-indigo-500/40 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-indigo-950/60 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-950/90 via-[#1C1C1F] to-[#1C1C1F] border-b border-indigo-900/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                    <span>Digital Ticket Generated!</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      Live
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Scan with phone camera to open live ticket
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQrModalCar(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-center">
              {/* Prominent QR Code */}
              <div className="relative inline-block bg-white p-3.5 rounded-2xl shadow-2xl border-4 border-indigo-500/30 mx-auto">
                <img
                  src={getTicketQrImageUrl(qrModalCar.id, 280)}
                  alt={`Valet Ticket ${qrModalCar.id}`}
                  className="w-52 h-52 sm:w-56 sm:h-56 rounded-lg block mx-auto"
                />
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#0A0A0B] text-indigo-300 border border-indigo-500/40 px-3 py-0.5 rounded-full font-mono text-[10px] font-bold shadow-md whitespace-nowrap">
                  {qrModalCar.id}
                </div>
              </div>

              {/* Scan Info Box */}
              <div className="bg-[#0E0E10] border border-indigo-500/20 rounded-xl p-3.5 text-left space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Instant Phone Hand-Off</span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                    TAG {qrModalCar.keyTag || "Pending"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Point your phone camera at the QR code above. The ticket will <strong>automatically open</strong> and connect to your vehicle tracker without downloading any app.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Vehicle</span>
                    <span className="font-semibold text-white truncate block">{qrModalCar.color} {qrModalCar.brand} {qrModalCar.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Plate Last 4</span>
                    <span className="font-mono font-bold text-indigo-300">[****] {qrModalCar.plate}</span>
                  </div>
                  {qrModalCar.tableNumber && (
                    <div className="col-span-2 text-indigo-300 font-medium text-[11px] flex items-center space-x-1">
                      <Table className="w-3 h-3 text-indigo-400" />
                      <span>Assigned to <strong className="text-white">Table #{qrModalCar.tableNumber}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* 1. Simulate Scan in New Tab */}
                <button
                  onClick={() => window.open(getTicketDirectUrl(qrModalCar.id), "_blank")}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/20 border border-indigo-500/40"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Simulate Phone Scan (Open Ticket in New Tab)</span>
                </button>

                {/* 2. Copy Link & View on Kiosk */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyTicketUrlToClipboard(qrModalCar.id)}
                    className="flex-1 py-2 px-3 bg-[#1C1C1F] hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 border border-slate-800 cursor-pointer"
                  >
                    {copiedModalUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Ticket URL</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setTicketId(qrModalCar.id);
                      setActiveTab("tracker");
                      setQrModalCar(null);
                    }}
                    className="py-2 px-3 bg-[#1C1C1F] hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 rounded-lg text-xs font-semibold transition border border-slate-800 cursor-pointer whitespace-nowrap"
                  >
                    View on Kiosk
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#0E0E10] border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                Ready to track your vehicle?
              </span>
              <button
                onClick={() => {
                  setQrModalCar(null);
                  setActiveTab("tracker");
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow"
              >
                Go to Ticket Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
