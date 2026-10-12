import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import {
  dbGetCars,
  dbSaveCar,
  dbClearCars,
  dbGetSettings,
  dbSaveSettings,
  CarEntry,
  AppSettings,
  DeviceAuthorization
} from "./src/lib/firebase.js";

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data", "cars.json");
const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

// Seed initial data to Firestore if empty
async function initStorage() {
  try {
    const firestoreCars = await dbGetCars();
    if (firestoreCars.length === 0) {
      console.log("Seeding initial tickets to Firestore database...");
      const initialSeed: CarEntry[] = [
        {
          id: "T-1001",
          plate: "4521",
          color: "Deep Black",
          brand: "Audi",
          model: "A6",
          name: "Sarah Jenkins",
          phone: "+1 (555) 019-2834",
          tableNumber: "14",
          keyTag: "101",
          status: "CHECKED_IN",
          createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
        },
        {
          id: "T-1002",
          plate: "8890",
          color: "Pearl White",
          brand: "Tesla",
          model: "Model Y",
          name: "David Chen",
          phone: "+1 (555) 014-9921",
          tableNumber: "8",
          keyTag: "102",
          status: "RETRIEVAL_REQUESTED",
          createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
          requestedAt: new Date(Date.now() - 4 * 60000).toISOString(),
        },
        {
          id: "T-1003",
          plate: "2311",
          color: "Metallic Silver",
          brand: "BMW",
          model: "530i",
          name: "Elena Rostova",
          phone: "+1 (555) 017-8833",
          tableNumber: "22",
          keyTag: "103",
          status: "RETRIEVAL_IN_PROGRESS",
          createdAt: new Date(Date.now() - 75 * 60000).toISOString(),
          requestedAt: new Date(Date.now() - 8 * 60000).toISOString(),
        },
        {
          id: "T-1004",
          plate: "7721",
          color: "Cherry Red",
          brand: "Porsche",
          model: "Macan",
          name: "Marcus Aurelius",
          phone: "+1 (555) 012-3456",
          tableNumber: "Bar-3",
          keyTag: "104",
          status: "READY",
          createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
          requestedAt: new Date(Date.now() - 10 * 60000).toISOString(),
          readyAt: new Date(Date.now() - 2 * 60000).toISOString(),
        }
      ];

      for (const car of initialSeed) {
        await dbSaveCar(car);
      }
    }
  } catch (err) {
    console.error("Firestore init warning (falling back to JSON if needed):", err);
  }
}

async function getCars(): Promise<CarEntry[]> {
  try {
    const cars = await dbGetCars();
    if (cars && cars.length > 0) return cars;
  } catch (e) {
    console.warn("Could not load from Firestore, trying local file fallback", e);
  }
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveCars(cars: CarEntry[]): Promise<void> {
  try {
    await dbClearCars();
    for (const c of cars) {
      await dbSaveCar(c);
    }
  } catch (e) {
    console.error("Error saving cars batch to Firestore:", e);
  }
  try {
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(cars, null, 2));
  } catch {}
}

async function saveSingleCar(car: CarEntry): Promise<void> {
  try {
    await dbSaveCar(car);
  } catch (e) {
    console.error("Error saving single car to Firestore:", e);
  }
  // Also keep local file in sync
  try {
    const cars = await getCars();
    const idx = cars.findIndex(c => c.id === car.id);
    if (idx !== -1) {
      cars[idx] = car;
    } else {
      cars.push(car);
    }
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(cars, null, 2));
  } catch {}
}

async function getSettings(): Promise<AppSettings> {
  try {
    const settings = await dbGetSettings();
    if (settings) return settings;
  } catch (e) {
    console.warn("Firestore settings get error, falling back to local file", e);
  }
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      adminPasscode: "1234",
      requireDeviceApproval: false,
      autoLockMinutes: 5,
      devices: [],
      auditLogs: []
    };
  }
}

async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await dbSaveSettings(settings);
  } catch (e) {
    console.error("Error saving settings to Firestore:", e);
  }
  try {
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch {}
}

// In-memory brute force defense store
interface AttemptRecord {
  failures: number;
  lockedUntil?: number;
  lastAttempt: number;
}
const authAttempts = new Map<string, AttemptRecord>();
const MAX_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

function checkRateLimit(key: string): { isLocked: boolean; remainingSeconds: number; failures: number } {
  const record = authAttempts.get(key);
  const now = Date.now();
  if (!record) {
    return { isLocked: false, remainingSeconds: 0, failures: 0 };
  }

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, failures: record.failures };
  }

  // If lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    authAttempts.delete(key);
    return { isLocked: false, remainingSeconds: 0, failures: 0 };
  }

  return { isLocked: false, remainingSeconds: 0, failures: record.failures };
}

function recordFailedAttempt(key: string): { isLocked: boolean; remainingSeconds: number; failures: number } {
  const now = Date.now();
  const record = authAttempts.get(key) || { failures: 0, lastAttempt: now };
  record.failures += 1;
  record.lastAttempt = now;

  if (record.failures >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    authAttempts.set(key, record);
    return { isLocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000), failures: record.failures };
  }

  authAttempts.set(key, record);
  return { isLocked: false, remainingSeconds: 0, failures: record.failures };
}

function recordSuccessfulAttempt(key: string) {
  authAttempts.delete(key);
}

async function recordAuditLog(
  settings: AppSettings,
  eventType: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOCKOUT_TRIGGERED" | "PASSCODE_CHANGED" | "DEVICE_REVOKED" | "DEVICE_APPROVED" | "TERMINAL_LOCKED",
  deviceId: string,
  deviceName: string,
  ip: string,
  details: string,
  status: "success" | "warning" | "danger"
) {
  if (!settings.auditLogs) {
    settings.auditLogs = [];
  }
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    eventType,
    deviceId: deviceId || "unknown",
    deviceName: deviceName || "Unknown Device",
    ip: ip || "127.0.0.1",
    details,
    status
  };
  settings.auditLogs.unshift(newLog);
  // Keep last 100 entries
  if (settings.auditLogs.length > 100) {
    settings.auditLogs = settings.auditLogs.slice(0, 100);
  }
}

async function startServer() {
  await initStorage();
  const app = express();
  app.use(express.json());

  // API Routes

  // GET all cars
  app.get("/api/cars", async (req, res) => {
    try {
      const cars = await getCars();
      res.json(cars);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET a single car by ID
  app.get("/api/cars/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const cars = await getCars();
      const car = cars.find((c) => c.id === id);
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }
      res.json(car);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST check-in a new car
  app.post("/api/cars/checkin", async (req, res) => {
    try {
      const { plate, color, brand, model, name, phone, tableNumber, keyTag, sessionId } = req.body;
      
      if (!plate || !plate.toString().trim()) {
        return res.status(400).json({ error: "Last 4 digits of license plate are required" });
      }

      const cars = await getCars();
      
      // Calculate next ticket number
      const lastTicket = cars.reduce((max, car) => {
        const num = parseInt(car.id.replace("T-", ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 1000);
      const ticketId = `T-${lastTicket + 1}`;

      const newCar: CarEntry = {
        id: ticketId,
        plate: plate.toString().trim().slice(-4),
        color: color?.toString().trim() || "Black",
        brand: brand?.toString().trim() || "Vehicle",
        model: model?.toString().trim() || "Car",
        name: name?.toString().trim() || "",
        phone: phone?.toString().trim() || "",
        tableNumber: tableNumber?.toString().trim() || "",
        keyTag: keyTag?.toString().trim() || "",
        sessionId: sessionId?.toString().trim() || "",
        status: "CHECKED_IN",
        createdAt: new Date().toISOString(),
      };

      cars.push(newCar);
      await saveSingleCar(newCar);
      res.status(201).json(newCar);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST request valet retrieval
  app.post("/api/cars/:id/request", async (req, res) => {
    try {
      const { id } = req.params;
      const { tableNumber } = req.body;
      const cars = await getCars();
      const index = cars.findIndex((c) => c.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Car not found" });
      }

      const car = cars[index];
      car.status = "RETRIEVAL_REQUESTED";
      car.requestedAt = new Date().toISOString();
      if (tableNumber) {
        car.tableNumber = tableNumber;
      }

      await saveSingleCar(car);
      res.json(car);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST update car status (staff dashboard)
  app.post("/api/cars/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, keyTag } = req.body;

      const cars = await getCars();
      const index = cars.findIndex((c) => c.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Car not found" });
      }

      const car = cars[index];
      if (status) {
        car.status = status;
        if (status === "READY") {
          car.readyAt = new Date().toISOString();
        } else if (status === "DELIVERED") {
          car.deliveredAt = new Date().toISOString();
        }
      }
      if (keyTag !== undefined) {
        car.keyTag = keyTag;
      }

      await saveSingleCar(car);
      res.json(car);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST search/lookup car by plate or ticket number
  app.post("/api/cars/lookup", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const cars = await getCars();
      const normalizedQuery = query.trim().toUpperCase();

      const results = cars.filter((c) => {
        const matchesTicket = c.id.toUpperCase() === normalizedQuery;
        const matchesPlate = c.plate === normalizedQuery;
        return (matchesTicket || matchesPlate) && c.status !== "DELIVERED";
      });

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST reset data
  app.post("/api/cars/reset", async (req, res) => {
    try {
      await saveCars([]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET admin settings
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const settings = await getSettings();
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
      const key = `${clientIp}`;
      const rateLimitStatus = checkRateLimit(key);

      res.json({
        hasPasscode: !!settings.adminPasscode,
        requireDeviceApproval: settings.requireDeviceApproval ?? false,
        autoLockMinutes: settings.autoLockMinutes ?? 5,
        devices: settings.devices || [],
        auditLogs: settings.auditLogs || [],
        rateLimit: {
          isLocked: rateLimitStatus.isLocked,
          remainingSeconds: rateLimitStatus.remainingSeconds,
          failures: rateLimitStatus.failures,
          maxFailures: MAX_FAILURES
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST verify passcode with brute-force protection & device whitelist
  app.post("/api/admin/verify", async (req, res) => {
    try {
      const { passcode, deviceId, name } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString();
      const rateLimitKey = `${deviceId || clientIp}`;

      // 1. Check Rate Limit / Lockout
      const rateLimit = checkRateLimit(rateLimitKey);
      if (rateLimit.isLocked) {
        return res.status(423).json({
          error: `Security Lockout Active. Too many failed attempts. Try again in ${rateLimit.remainingSeconds}s.`,
          isLocked: true,
          remainingSeconds: rateLimit.remainingSeconds
        });
      }

      if (!passcode) {
        return res.status(400).json({ error: "Passcode is required" });
      }

      const settings = await getSettings();

      // 2. Check Device Whitelist if enabled
      if (settings.requireDeviceApproval && deviceId) {
        const deviceRecord = settings.devices.find((d) => d.deviceId === deviceId);
        if (!deviceRecord || deviceRecord.isApproved === false) {
          await recordAuditLog(
            settings,
            "LOGIN_FAILED",
            deviceId,
            name || "Unknown Tablet",
            clientIp,
            "Rejected: Device not whitelisted by manager",
            "danger"
          );
          await saveSettings(settings);
          return res.status(403).json({
            error: "Device Whitelist Enforced. This device has not been approved by the manager.",
            devicePendingApproval: true
          });
        }
      }

      // 3. Verify Passcode
      if (settings.adminPasscode === passcode.trim()) {
        recordSuccessfulAttempt(rateLimitKey);

        if (deviceId) {
          const index = settings.devices.findIndex((d) => d.deviceId === deviceId);
          if (index !== -1) {
            settings.devices[index].role = "manager";
            settings.devices[index].lastActive = new Date().toISOString();
            if (name) settings.devices[index].name = name;
          } else {
            settings.devices.push({
              deviceId,
              name: name || "Admin Console",
              role: "manager",
              lastActive: new Date().toISOString(),
              isApproved: !settings.requireDeviceApproval,
            });
          }
        }

        await recordAuditLog(
          settings,
          "LOGIN_SUCCESS",
          deviceId || "web",
          name || "Staff Terminal",
          clientIp,
          "Authenticated to Valet Operations Terminal",
          "success"
        );

        await saveSettings(settings);
        return res.json({ success: true, role: "manager" });
      } else {
        // Failed attempt
        const failedResult = recordFailedAttempt(rateLimitKey);
        
        const eventType = failedResult.isLocked ? "LOCKOUT_TRIGGERED" : "LOGIN_FAILED";
        const details = failedResult.isLocked
          ? `Lockout triggered: 5 failed attempts reached from ${clientIp}. 15-minute lock activated.`
          : `Invalid passcode attempt (${failedResult.failures}/${MAX_FAILURES} attempts used)`;

        await recordAuditLog(
          settings,
          eventType,
          deviceId || "unknown",
          name || "Unknown Terminal",
          clientIp,
          details,
          "danger"
        );
        await saveSettings(settings);

        if (failedResult.isLocked) {
          return res.status(423).json({
            error: `Security Lockout Active. 5 failed attempts reached. Terminal locked for ${failedResult.remainingSeconds}s.`,
            isLocked: true,
            remainingSeconds: failedResult.remainingSeconds
          });
        }

        return res.status(401).json({
          error: `Incorrect passcode. (${MAX_FAILURES - failedResult.failures} attempts remaining before temporary lockout)`,
          attemptsRemaining: MAX_FAILURES - failedResult.failures
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST update full security settings (passcode, whitelist toggle, autolock)
  app.post("/api/admin/update-settings", async (req, res) => {
    try {
      const { currentPasscode, newPasscode, requireDeviceApproval, autoLockMinutes, deviceId, name } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString();

      const settings = await getSettings();

      if (currentPasscode) {
        if (settings.adminPasscode !== currentPasscode.trim()) {
          return res.status(401).json({ error: "Incorrect current passcode" });
        }
      }

      if (newPasscode) {
        if (newPasscode.trim().length < 4) {
          return res.status(400).json({ error: "New passcode/password must be at least 4 characters" });
        }
        settings.adminPasscode = newPasscode.trim();
        await recordAuditLog(
          settings,
          "PASSCODE_CHANGED",
          deviceId || "manager-session",
          name || "Manager",
          clientIp,
          "Valet OS staff password was successfully updated",
          "warning"
        );
      }

      if (typeof requireDeviceApproval === "boolean") {
        settings.requireDeviceApproval = requireDeviceApproval;
      }

      if (typeof autoLockMinutes === "number" && autoLockMinutes >= 1) {
        settings.autoLockMinutes = autoLockMinutes;
      }

      await saveSettings(settings);
      res.json({
        success: true,
        message: "Security settings saved successfully",
        settings: {
          hasPasscode: !!settings.adminPasscode,
          requireDeviceApproval: settings.requireDeviceApproval,
          autoLockMinutes: settings.autoLockMinutes,
          devices: settings.devices
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST approve device for whitelist
  app.post("/api/admin/devices/approve", async (req, res) => {
    try {
      const { targetDeviceId, isApproved } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").toString();

      if (!targetDeviceId) {
        return res.status(400).json({ error: "targetDeviceId is required" });
      }

      const settings = await getSettings();
      const index = settings.devices.findIndex((d) => d.deviceId === targetDeviceId);
      if (index !== -1) {
        settings.devices[index].isApproved = isApproved !== false;
        settings.devices[index].lastActive = new Date().toISOString();
      }

      await recordAuditLog(
        settings,
        isApproved !== false ? "DEVICE_APPROVED" : "DEVICE_REVOKED",
        targetDeviceId,
        settings.devices[index]?.name || targetDeviceId,
        clientIp,
        isApproved !== false ? "Device whitelisted for staff access" : "Device approval revoked",
        isApproved !== false ? "success" : "warning"
      );

      await saveSettings(settings);
      res.json({ success: true, devices: settings.devices });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST register device / fetch its role
  app.post("/api/admin/devices/register", async (req, res) => {
    try {
      const { deviceId, name, forceRole } = req.body;
      if (!deviceId) {
        return res.status(400).json({ error: "deviceId is required" });
      }

      const settings = await getSettings();
      let index = settings.devices.findIndex((d) => d.deviceId === deviceId);
      
      let role: any = "guest";
      if (index !== -1) {
        if (forceRole) {
          settings.devices[index].role = forceRole;
        }
        settings.devices[index].lastActive = new Date().toISOString();
        if (name) settings.devices[index].name = name;
        role = settings.devices[index].role;
      } else {
        const defaultRole = forceRole || "guest";
        settings.devices.push({
          deviceId,
          name: name || `Device-${deviceId.slice(0, 4)}`,
          role: defaultRole,
          lastActive: new Date().toISOString(),
          isApproved: !settings.requireDeviceApproval,
        });
        role = defaultRole;
      }

      await saveSettings(settings);
      res.json({
        success: true,
        role,
        isApproved: settings.devices[index !== -1 ? index : settings.devices.length - 1]?.isApproved,
        requireDeviceApproval: settings.requireDeviceApproval
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST assign role to specific device
  app.post("/api/admin/devices/assign", async (req, res) => {
    try {
      const { targetDeviceId, role, name, isApproved } = req.body;
      if (!targetDeviceId || !role) {
        return res.status(400).json({ error: "targetDeviceId and role are required" });
      }

      const settings = await getSettings();
      let index = settings.devices.findIndex((d) => d.deviceId === targetDeviceId);
      
      if (index !== -1) {
        settings.devices[index].role = role;
        settings.devices[index].lastActive = new Date().toISOString();
        if (name) settings.devices[index].name = name;
        if (typeof isApproved === "boolean") settings.devices[index].isApproved = isApproved;
      } else {
        settings.devices.push({
          deviceId: targetDeviceId,
          name: name || `Device-${targetDeviceId.slice(0, 4)}`,
          role,
          lastActive: new Date().toISOString(),
          isApproved: typeof isApproved === "boolean" ? isApproved : true,
        });
      }

      await saveSettings(settings);
      res.json({ success: true, devices: settings.devices });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST remove/revoke device
  app.post("/api/admin/devices/revoke", async (req, res) => {
    try {
      const { targetDeviceId } = req.body;
      if (!targetDeviceId) {
        return res.status(400).json({ error: "targetDeviceId is required" });
      }

      const settings = await getSettings();
      settings.devices = settings.devices.filter((d) => d.deviceId !== targetDeviceId);
      await saveSettings(settings);
      res.json({ success: true, devices: settings.devices });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST clear audit logs
  app.post("/api/admin/audit/clear", async (req, res) => {
    try {
      const settings = await getSettings();
      settings.auditLogs = [];
      await saveSettings(settings);
      res.json({ success: true, auditLogs: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
