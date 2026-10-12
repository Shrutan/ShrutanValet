import React, { useState, useEffect } from "react";
import {
  Car,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  Check,
  RefreshCw,
  User,
  Table,
  Phone,
  AlertTriangle,
  Play,
  Key,
  Database,
  QrCode,
  Plus,
  X,
  Copy,
  ExternalLink
} from "lucide-react";
import { CarEntry, CarStatus } from "../types";
import ManagerQRGeneratorModal from "./ManagerQRGeneratorModal";
import Logo from "./Logo";

export default function ManagerDashboard() {
  const [cars, setCars] = useState<CarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CarStatus | "ALL">("ALL");
  const [editingKeyTag, setEditingKeyTag] = useState<Record<string, string>>({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Quick Check-In & Generated QR Code Modal State
  const [isQuickCheckinOpen, setIsQuickCheckinOpen] = useState(false);
  const [isQrGeneratorOpen, setIsQrGeneratorOpen] = useState(false);
  const [valetPlate, setValetPlate] = useState("");
  const [valetColor, setValetColor] = useState("Black");
  const [valetBrand, setValetBrand] = useState("Toyota");
  const [valetModel, setValetModel] = useState("Sedan");
  const [valetKeyTag, setValetKeyTag] = useState("");
  const [valetTable, setValetTable] = useState("");
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [generatedQrCar, setGeneratedQrCar] = useState<CarEntry | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch cars from API
  const fetchCars = async () => {
    try {
      const response = await fetch("/api/cars");
      if (!response.ok) {
        throw new Error("Failed to load valet tickets.");
      }
      const data = await response.json();
      setCars(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Error loading tickets.");
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchCars().finally(() => setIsLoading(false));

    // Poll server every 3 seconds for active dashboard updates
    const interval = setInterval(fetchCars, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError("");

    if (!valetPlate || valetPlate.trim().length < 4) {
      setQuickError("Please enter exactly the last 4 digits of the license plate.");
      return;
    }

    setIsSubmittingQuick(true);
    try {
      const response = await fetch("/api/cars/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: valetPlate.trim(),
          color: valetColor.trim() || "Black",
          brand: valetBrand.trim() || "Vehicle",
          model: valetModel.trim() || "Car",
          keyTag: valetKeyTag.trim(),
          tableNumber: valetTable.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to check in car.");
      }

      const newCar: CarEntry = await response.json();
      setCars((prev) => [newCar, ...prev]);
      setGeneratedQrCar(newCar);
      setIsQuickCheckinOpen(false);

      // Reset form
      setValetPlate("");
      setValetKeyTag("");
      setValetTable("");
    } catch (err: any) {
      setQuickError(err.message || "Error submitting check-in");
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const getTicketCustomerUrl = (ticketId: string) => {
    return `${window.location.origin}/customer?ticket=${ticketId}`;
  };

  const getTicketQrUrl = (ticketId: string) => {
    const claimUrl = getTicketCustomerUrl(ticketId);
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&color=0f172a&data=${encodeURIComponent(claimUrl)}`;
  };

  // Update a car's status
  const updateCarStatus = async (id: string, newStatus: CarStatus) => {
    setIsUpdatingStatus(id);
    try {
      const response = await fetch(`/api/cars/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status.");
      }

      // Local update
      const updatedCar = await response.json();
      setCars((prev) => prev.map((c) => (c.id === id ? updatedCar : c)));
    } catch (err: any) {
      alert(err.message || "Error updating car status");
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Associate a key tag
  const saveKeyTag = async (id: string) => {
    const tagValue = editingKeyTag[id];
    if (tagValue === undefined) return;

    try {
      const response = await fetch(`/api/cars/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyTag: tagValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to save key tag.");
      }

      const updatedCar = await response.json();
      setCars((prev) => prev.map((c) => (c.id === id ? updatedCar : c)));
      
      // Clear editing state for this item
      const updatedEditing = { ...editingKeyTag };
      delete updatedEditing[id];
      setEditingKeyTag(updatedEditing);
    } catch (err: any) {
      alert(err.message || "Error saving key tag");
    }
  };

  // Reset demo database
  const resetDatabase = async () => {
    if (!confirm("Are you sure you want to clear all active valet data? This will reset the system for a fresh demo.")) {
      return;
    }
    try {
      const response = await fetch("/api/cars/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset failed.");
      fetchCars();
      alert("Database reset successfully!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Calculations for Admin Stats
  const activeCars = cars.filter((c) => c.status !== "DELIVERED");
  const parkedCount = cars.filter((c) => c.status === "CHECKED_IN").length;
  const requestedCount = cars.filter((c) => c.status === "RETRIEVAL_REQUESTED" || c.status === "RETRIEVAL_IN_PROGRESS").length;
  const readyCount = cars.filter((c) => c.status === "READY").length;
  const deliveredCount = cars.filter((c) => c.status === "DELIVERED").length;

  // Calculate average retrieval time (requestedAt -> readyAt) in minutes
  const readyCarsWithTimes = cars.filter((c) => c.requestedAt && c.readyAt);
  const totalRetrievalMinutes = readyCarsWithTimes.reduce((acc, car) => {
    const reqTime = new Date(car.requestedAt!).getTime();
    const readyTime = new Date(car.readyAt!).getTime();
    return acc + (readyTime - reqTime) / 60000;
  }, 0);
  const avgRetrievalTime = readyCarsWithTimes.length > 0
    ? Math.round((totalRetrievalMinutes / readyCarsWithTimes.length) * 10) / 10
    : 4.5; // Default reference/simulated wait

  // Filtered list
  const filteredCars = cars.filter((car) => {
    // Search query matches ticket ID, plate, color, brand, model, customer name, phone, keyTag
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      car.id.toLowerCase().includes(normalizedQuery) ||
      car.plate.includes(normalizedQuery) ||
      car.color.toLowerCase().includes(normalizedQuery) ||
      car.brand.toLowerCase().includes(normalizedQuery) ||
      car.model.toLowerCase().includes(normalizedQuery) ||
      car.name?.toLowerCase().includes(normalizedQuery) ||
      car.keyTag?.toLowerCase().includes(normalizedQuery);

    // Status filter
    const matchesStatus =
      statusFilter === "ALL" || car.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort: prioritize requested cars, then ready, then parked, then delivered (sorted by update times)
  const sortedCars = [...filteredCars].sort((a, b) => {
    const statusOrder: Record<CarStatus, number> = {
      RETRIEVAL_REQUESTED: 0,
      RETRIEVAL_IN_PROGRESS: 1,
      READY: 2,
      CHECKED_IN: 3,
      DELIVERED: 4,
    };

    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }

    // Secondary sort: oldest creation or oldest request first
    if (a.status === "RETRIEVAL_REQUESTED" || a.status === "RETRIEVAL_IN_PROGRESS") {
      const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
      const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
      return aTime - bTime; // oldest request first
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest checkin first
  });

  return (
    <div className="w-full bg-[#0A0A0B] min-h-screen text-slate-300" id="manager-dashboard-container">
      {/* Top Admin Header */}
      <div className="bg-[#0E0E10] text-white px-6 py-4 shadow-md flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Logo size="md" showSubtitle={true} subtitle="Valet Operator Dashboard & Tablet Console" />
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end flex-wrap gap-y-2">
          <button
            onClick={() => setIsQrGeneratorOpen(true)}
            className="px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-white rounded-lg transition flex items-center space-x-1.5 text-xs font-bold cursor-pointer border border-indigo-500/40 shadow-md shadow-indigo-950/40"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>QR Code Generator</span>
          </button>

          <button
            onClick={() => {
              setQuickError("");
              setIsQuickCheckinOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition flex items-center space-x-2 text-xs font-bold cursor-pointer shadow-lg shadow-indigo-600/20 border border-indigo-500/30"
          >
            <Plus className="w-4 h-4" />
            <span>Valet Check-In</span>
          </button>

          <button
            onClick={fetchCars}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition flex items-center space-x-1.5 text-xs font-semibold cursor-pointer border border-slate-700/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={resetDatabase}
            className="px-3 py-2 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/30 hover:border-rose-500 text-rose-300 rounded-lg transition flex items-center space-x-1.5 text-xs font-semibold cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Quick Action QR Utility Banner */}
        <div className="bg-gradient-to-r from-indigo-950/40 via-[#141417] to-[#141417] p-4 rounded-xl border border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Unique Scan-to-Check-In QR Utility</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                  Manager Tool
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Generate dedicated scan-to-checkin links with pre-locked table numbers or unique guest session tokens.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsQrGeneratorOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 border border-indigo-500/40 whitespace-nowrap"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Open QR Code Generator</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* STAT 1: PENDING RETRIEVALS */}
          <div className="bg-[#141417] p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Retrieval Requests
              </span>
              <span className="text-2xl font-mono font-black text-rose-400 block mt-1">
                {requestedCount} <span className="text-xs font-normal text-slate-500">active</span>
              </span>
            </div>
            <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          {/* STAT 2: PARKED CARS */}
          <div className="bg-[#141417] p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Parked Cars
              </span>
              <span className="text-2xl font-mono font-black text-white block mt-1">
                {parkedCount} <span className="text-xs font-normal text-slate-500">in lot</span>
              </span>
            </div>
            <div className="p-2.5 bg-slate-800 rounded-lg text-slate-400">
              <Car className="w-5 h-5" />
            </div>
          </div>

          {/* STAT 3: READY AT EXIT */}
          <div className="bg-[#141417] p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Ready at Exit
              </span>
              <span className="text-2xl font-mono font-black text-emerald-400 block mt-1">
                {readyCount} <span className="text-xs font-normal text-slate-500">waiting</span>
              </span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          {/* STAT 4: AVERAGE RETRIEVAL TIME */}
          <div className="bg-[#141417] p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Avg. Wait Time
              </span>
              <span className="text-2xl font-mono font-black text-indigo-400 block mt-1">
                {avgRetrievalTime} <span className="text-xs font-normal text-slate-500">mins</span>
              </span>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters and Queue Search */}
        <div className="bg-[#121215] p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by plate, tag, brand, name, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0E0E10] border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder-slate-600"
            />
          </div>

          {/* Status Segment Filter */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto justify-start md:justify-end">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-slate-800 text-indigo-400 border border-slate-700/50"
                  : "bg-[#141417] hover:bg-slate-800 text-slate-400 border border-slate-800/80"
              }`}
            >
              All Queue ({activeCars.length})
            </button>
            <button
              onClick={() => setStatusFilter("RETRIEVAL_REQUESTED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                statusFilter === "RETRIEVAL_REQUESTED"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-rose-950/10 hover:bg-rose-950/20 text-rose-400 border border-rose-950/40"
              }`}
            >
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping mr-1" />
              Requested ({cars.filter((c) => c.status === "RETRIEVAL_REQUESTED").length})
            </button>
            <button
              onClick={() => setStatusFilter("RETRIEVAL_IN_PROGRESS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                statusFilter === "RETRIEVAL_IN_PROGRESS"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "bg-indigo-950/10 hover:bg-indigo-950/20 text-indigo-400 border border-indigo-950/40"
              }`}
            >
              In Progress ({cars.filter((c) => c.status === "RETRIEVAL_IN_PROGRESS").length})
            </button>
            <button
              onClick={() => setStatusFilter("CHECKED_IN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "CHECKED_IN"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-[#141417] hover:bg-slate-800 text-amber-500 border border-slate-800/80"
              }`}
            >
              Parked ({parkedCount})
            </button>
            <button
              onClick={() => setStatusFilter("READY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "READY"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-[#141417] hover:bg-slate-800 text-emerald-400 border border-slate-800/80"
              }`}
            >
              Ready ({readyCount})
            </button>
            <button
              onClick={() => setStatusFilter("DELIVERED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "DELIVERED"
                  ? "bg-slate-800 text-slate-300 border border-slate-700/50"
                  : "bg-[#141417] hover:bg-slate-800 text-slate-500 border border-slate-800/80"
              }`}
            >
              Delivered ({deliveredCount})
            </button>
          </div>
        </div>

        {/* Queue Grid List */}
        {sortedCars.length === 0 ? (
          <div className="text-center py-16 bg-[#121215] border border-slate-800 rounded-xl shadow-sm">
            <Car className="w-16 h-16 text-slate-800 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Vehicles Match Filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search queries or adding new car entries from the customer guest portal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCars.map((car) => {
              const isUrgent = car.status === "RETRIEVAL_REQUESTED" || car.status === "RETRIEVAL_IN_PROGRESS";
              const timeSinceRequest = car.requestedAt
                ? Math.round((Date.now() - new Date(car.requestedAt).getTime()) / 60000)
                : null;

              return (
                <div
                  key={car.id}
                  className={`bg-[#141417] rounded-xl shadow-lg border overflow-hidden transition-all duration-300 relative ${
                    isUrgent
                      ? "border-rose-500/40 ring-1 ring-rose-500/20 shadow-rose-950/10"
                      : car.status === "READY"
                      ? "border-emerald-500/40 shadow-emerald-950/10"
                      : "border-slate-800"
                  }`}
                >
                  {/* Card Status Banner */}
                  <div
                    className={`px-4 py-2 text-xs font-bold flex justify-between items-center ${
                      car.status === "RETRIEVAL_REQUESTED"
                        ? "bg-rose-900/30 text-rose-300 border-b border-rose-800/40"
                        : car.status === "RETRIEVAL_IN_PROGRESS"
                        ? "bg-indigo-900/30 text-indigo-300 border-b border-indigo-800/40"
                        : car.status === "READY"
                        ? "bg-emerald-950/30 text-emerald-300 border-b border-emerald-800/40"
                        : car.status === "CHECKED_IN"
                        ? "bg-amber-950/20 text-amber-300 border-b border-amber-800/40"
                        : "bg-slate-800 text-slate-300 border-b border-slate-700/50"
                    }`}
                  >
                    <span className="uppercase tracking-wider flex items-center space-x-1.5">
                      {car.status === "RETRIEVAL_REQUESTED" && (
                        <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping mr-1" />
                      )}
                      <span>{car.status.replace(/_/g, " ")}</span>
                    </span>
                    <span className="font-mono text-slate-400">{car.id}</span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Key Details Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-display font-extrabold text-white tracking-tight leading-tight">
                          {car.color} {car.brand}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">{car.model}</p>
                      </div>

                      {/* License Plate Display (Big Bold Monospace) & QR Code Trigger */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setGeneratedQrCar(car)}
                          title="Show Ticket QR Code"
                          className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded font-bold text-xs flex items-center space-x-1 cursor-pointer transition"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR</span>
                        </button>
                        <div className="bg-[#1C1C1F] border border-slate-800 px-3 py-1 rounded font-mono text-base font-black text-white tracking-wider">
                          #{car.plate}
                        </div>
                      </div>
                    </div>

                    {/* Paper Key Tag Management */}
                    <div className="bg-[#0E0E10] p-3 rounded-lg border border-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-400">
                        <Key className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold">Paper Tag ID:</span>
                      </div>

                      {editingKeyTag[car.id] !== undefined ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            placeholder="Tag #"
                            value={editingKeyTag[car.id]}
                            onChange={(e) =>
                               setEditingKeyTag({
                                 ...editingKeyTag,
                                 [car.id]: e.target.value.replace(/\D/g, ""),
                               })
                            }
                            className="w-16 px-2 py-1 bg-slate-850 border border-slate-700 rounded font-bold text-xs text-center text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            maxLength={4}
                          />
                          <button
                            onClick={() => saveKeyTag(car.id)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingKeyTag({
                              ...editingKeyTag,
                              [car.id]: car.keyTag || "",
                            })
                          }
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded font-mono font-bold text-xs text-indigo-400 tracking-wide transition cursor-pointer"
                        >
                          {car.keyTag ? `#${car.keyTag}` : "Set Tag #"}
                        </button>
                      )}
                    </div>

                    {/* Meta-info: Guest contact & location */}
                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        <Table className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="font-medium text-slate-300">
                          {car.tableNumber ? `Dining at Table ${car.tableNumber}` : "Drop-off Station / TBD"}
                        </span>
                      </div>
                      {(car.name || car.phone) && (
                        <div className="flex items-start space-x-2 border-t border-slate-800 pt-2 mt-2">
                          <User className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-300">{car.name || "Guest"}</p>
                            {car.phone && <p className="text-[10px] text-slate-500 font-mono">{car.phone}</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Operational Timings & SLA Alerts */}
                    <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-800/80 pt-3">
                      <span>Checked in: {new Date(car.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isUrgent && timeSinceRequest !== null && (
                        <span className={`font-bold flex items-center ${timeSinceRequest >= 8 ? "text-rose-400 animate-pulse" : "text-amber-500"}`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Requested {timeSinceRequest} mins ago
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar (Footer of Card) */}
                  <div className="bg-[#0E0E10] border-t border-slate-800/60 px-5 py-3 flex justify-end space-x-2">
                    {car.status === "CHECKED_IN" && (
                      <button
                        onClick={() => updateCarStatus(car.id, "RETRIEVAL_REQUESTED")}
                        disabled={isUpdatingStatus === car.id}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current text-white mr-1" />
                        <span>Force Retrieve</span>
                      </button>
                    )}

                    {car.status === "RETRIEVAL_REQUESTED" && (
                      <button
                        onClick={() => updateCarStatus(car.id, "RETRIEVAL_IN_PROGRESS")}
                        disabled={isUpdatingStatus === car.id}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                      >
                        <span>Start Retrieval</span>
                      </button>
                    )}

                    {car.status === "RETRIEVAL_IN_PROGRESS" && (
                      <button
                        onClick={() => updateCarStatus(car.id, "READY")}
                        disabled={isUpdatingStatus === car.id}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 mr-1 text-white" />
                        <span>Car is Ready at Exit</span>
                      </button>
                    )}

                    {car.status === "READY" && (
                      <button
                        onClick={() => updateCarStatus(car.id, "DELIVERED")}
                        disabled={isUpdatingStatus === car.id}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 border border-slate-700/50 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>Confirm Delivery</span>
                      </button>
                    )}

                    {car.status === "DELIVERED" && (
                      <span className="text-xs text-slate-500 py-1 font-semibold">
                        Delivered successfully
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: VALET QUICK CHECK-IN FORM */}
      {isQuickCheckinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141417] border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Valet Rapid Check-In</h3>
                  <p className="text-xs text-slate-400">Enter vehicle 4-digit plate to create ticket & QR code</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickCheckinOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCheckinSubmit} className="space-y-4">
              {/* MANDATORY FIELD: LAST 4 DIGITS OF CAR PLATE */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>Last 4 Digits of Plate *</span>
                  <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">REQUIRED</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={valetPlate}
                  onChange={(e) => setValetPlate(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="e.g. 4829"
                  className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 bg-[#0E0E10] border-2 border-indigo-500/60 rounded-xl text-white focus:outline-none focus:border-indigo-400 transition-all placeholder:tracking-normal placeholder:text-slate-600 font-black shadow-inner"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Valet attendant only needs to enter the vehicle's 4-digit plate digits.
                </p>
              </div>

              {/* OPTIONAL QUICK FIELDS */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Color</label>
                  <select
                    value={valetColor}
                    onChange={(e) => setValetColor(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E0E10] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Black">Black</option>
                    <option value="White">White</option>
                    <option value="Silver">Silver / Gray</option>
                    <option value="Red">Red</option>
                    <option value="Blue">Blue</option>
                    <option value="Green">Green</option>
                    <option value="Gold">Gold / Tan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Make / Brand</label>
                  <select
                    value={valetBrand}
                    onChange={(e) => setValetBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E0E10] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Toyota">Toyota</option>
                    <option value="Honda">Honda</option>
                    <option value="BMW">BMW</option>
                    <option value="Mercedes">Mercedes-Benz</option>
                    <option value="Tesla">Tesla</option>
                    <option value="Audi">Audi</option>
                    <option value="Ford">Ford</option>
                    <option value="Porsche">Porsche</option>
                    <option value="Lexus">Lexus</option>
                    <option value="Vehicle">Other Vehicle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Paper Tag # (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. #A-14"
                    value={valetKeyTag}
                    onChange={(e) => setValetKeyTag(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E0E10] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Table # (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 12"
                    value={valetTable}
                    onChange={(e) => setValetTable(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E0E10] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {quickError && (
                <div className="text-xs text-rose-400 bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/40">
                  {quickError}
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCheckinOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuick || valetPlate.length < 4}
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isSubmittingQuick ? "Creating Ticket..." : "Generate Ticket & QR Code"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GENERATED TICKET QR CODE FOR CUSTOMER SCAN */}
      {generatedQrCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#141417] border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl relative text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <CheckCircle className="w-6 h-6 animate-bounce" />
            </div>

            <h3 className="text-xl font-display font-extrabold text-white tracking-tight">
              Digital Valet Ticket Created!
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Have customer scan this QR code with their phone camera to claim ticket automatically.
            </p>

            {/* Ticket Badge Info */}
            <div className="my-4 bg-[#0E0E10] border border-slate-800 rounded-xl p-3 flex justify-between items-center text-left">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-wider block">
                  TICKET #{generatedQrCar.id}
                </span>
                <span className="text-lg font-mono font-black text-white block mt-0.5">
                  Plate: #{generatedQrCar.plate}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  {generatedQrCar.color} {generatedQrCar.brand} {generatedQrCar.model}
                </span>
              </div>
              {generatedQrCar.keyTag && (
                <div className="bg-indigo-950/40 border border-indigo-800/50 px-2.5 py-1 rounded-lg text-right">
                  <span className="text-[9px] text-indigo-400 block font-bold uppercase">Key Tag</span>
                  <span className="text-xs font-mono font-bold text-white">{generatedQrCar.keyTag}</span>
                </div>
              )}
            </div>

            {/* QR CODE DISPLAY */}
            <div className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-indigo-500/40 inline-block my-1">
              <img
                src={getTicketQrUrl(generatedQrCar.id)}
                alt={`QR Code for Ticket ${generatedQrCar.id}`}
                className="w-56 h-56 mx-auto object-contain"
              />
            </div>

            <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-center space-x-1">
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[320px] font-mono text-[10px] text-indigo-300">
                Customer URL: {getTicketCustomerUrl(generatedQrCar.id)}
              </span>
            </p>

            {/* ACTION BUTTONS */}
            <div className="space-y-2 mt-5">
              <button
                onClick={() => {
                  const url = getTicketCustomerUrl(generatedQrCar.id);
                  window.open(url, "_blank");
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-2 border border-indigo-500/40 shadow-lg shadow-indigo-600/20"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Simulate Customer Scan (Open Customer Website)</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const url = getTicketCustomerUrl(generatedQrCar.id);
                    navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 border border-slate-700/60"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Customer Link"}</span>
                </button>

                <button
                  onClick={() => setGeneratedQrCar(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Done / Next Car
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QR CODE GENERATOR UTILITY FOR TABLES & GUEST SESSIONS */}
      <ManagerQRGeneratorModal
        isOpen={isQrGeneratorOpen}
        onClose={() => setIsQrGeneratorOpen(false)}
      />
    </div>
  );
}
