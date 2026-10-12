import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";
import fs from "fs";
import path from "path";

// Load configuration
function getFirebaseConfig() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn("Could not read firebase-applet-config.json, falling back to process.env", err);
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID || "halogen-bindery-56shk",
    appId: process.env.FIREBASE_APP_ID || "1:69336912385:web:ec0d251be7650b29a5a600",
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBu0m_Wihz6TGGw7ziV754t7B2RCKN1BeM",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "halogen-bindery-56shk.firebaseapp.com",
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-restaurantvalets-a2ef49d7-7ca2-4957-a83d-dc10190b9a94",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "halogen-bindery-56shk.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "69336912385"
  };
}

const firebaseConfig = getFirebaseConfig();

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export interface CarEntry {
  id: string;
  plate: string;
  color: string;
  brand: string;
  model: string;
  name?: string;
  phone?: string;
  tableNumber?: string;
  keyTag?: string;
  sessionId?: string;
  status: "CHECKED_IN" | "RETRIEVAL_REQUESTED" | "RETRIEVAL_IN_PROGRESS" | "READY" | "DELIVERED";
  createdAt: string;
  requestedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
}

export interface DeviceAuthorization {
  deviceId: string;
  name: string;
  role: "guest" | "manager" | "qrplayground" | "analytics";
  lastActive: string;
  isApproved?: boolean;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  eventType: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOCKOUT_TRIGGERED" | "PASSCODE_CHANGED" | "DEVICE_REVOKED" | "DEVICE_APPROVED" | "TERMINAL_LOCKED";
  deviceId: string;
  deviceName?: string;
  ip?: string;
  details: string;
  status: "success" | "warning" | "danger";
}

export interface AppSettings {
  adminPasscode: string;
  requireDeviceApproval: boolean;
  autoLockMinutes: number;
  devices: DeviceAuthorization[];
  auditLogs: SecurityAuditLog[];
}

// Cars & Valet Tickets Firestore Helpers
export async function dbGetCars(): Promise<CarEntry[]> {
  try {
    // Try valet_tickets collection first
    const ticketsCol = collection(db, "valet_tickets");
    let snapshot = await getDocs(ticketsCol);
    if (snapshot.empty) {
      // Fallback to legacy cars collection if valet_tickets is empty
      const carsCol = collection(db, "cars");
      snapshot = await getDocs(carsCol);
    }
    if (snapshot.empty) {
      return [];
    }
    const list: CarEntry[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as CarEntry);
    });
    // Sort by createdAt desc or ticket id
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.error("Error fetching tickets from Firestore:", err);
    throw err;
  }
}

export async function dbSaveCar(car: CarEntry): Promise<void> {
  // Save to primary valet_tickets collection
  const ticketRef = doc(db, "valet_tickets", car.id);
  await setDoc(ticketRef, car);

  // Also save to legacy cars collection for backwards compatibility
  try {
    const carRef = doc(db, "cars", car.id);
    await setDoc(carRef, car);
  } catch (err) {
    console.warn("Legacy cars sync warning:", err);
  }
}

export async function dbGetCarById(id: string): Promise<CarEntry | null> {
  const ticketRef = doc(db, "valet_tickets", id);
  let snap = await getDoc(ticketRef);
  if (snap.exists()) {
    return snap.data() as CarEntry;
  }
  const carRef = doc(db, "cars", id);
  snap = await getDoc(carRef);
  if (snap.exists()) {
    return snap.data() as CarEntry;
  }
  return null;
}

export async function dbClearCars(): Promise<void> {
  const ticketsCol = collection(db, "valet_tickets");
  const snapshot = await getDocs(ticketsCol);
  const promises: Promise<void>[] = [];
  snapshot.forEach((docSnap) => {
    promises.push(deleteDoc(docSnap.ref));
  });

  const carsCol = collection(db, "cars");
  const carsSnap = await getDocs(carsCol);
  carsSnap.forEach((docSnap) => {
    promises.push(deleteDoc(docSnap.ref));
  });

  await Promise.all(promises);
}

// Settings Firestore Helpers
export async function dbGetSettings(): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    adminPasscode: "1234",
    requireDeviceApproval: false,
    autoLockMinutes: 5,
    devices: [],
    auditLogs: [],
  };

  try {
    const settingsRef = doc(db, "settings", "global_settings");
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<AppSettings>;
      return {
        adminPasscode: data.adminPasscode || defaultSettings.adminPasscode,
        requireDeviceApproval: data.requireDeviceApproval ?? defaultSettings.requireDeviceApproval,
        autoLockMinutes: data.autoLockMinutes ?? defaultSettings.autoLockMinutes,
        devices: data.devices || defaultSettings.devices,
        auditLogs: data.auditLogs || defaultSettings.auditLogs,
      };
    }
  } catch (err) {
    console.error("Error fetching settings from Firestore:", err);
  }

  return defaultSettings;
}

export async function dbSaveSettings(settings: AppSettings): Promise<void> {
  const settingsRef = doc(db, "settings", "global_settings");
  await setDoc(settingsRef, settings);
}
