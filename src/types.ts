export type CarStatus =
  | "CHECKED_IN"
  | "RETRIEVAL_REQUESTED"
  | "RETRIEVAL_IN_PROGRESS"
  | "READY"
  | "DELIVERED";

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
  status: CarStatus;
  createdAt: string;
  requestedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
}

export interface ValetAnalytics {
  totalCarsToday: number;
  activeCars: number;
  requestedCars: number;
  averageRetrievalTimeMinutes: number; // calculated from requestedAt to readyAt
  carsByStatus: Record<CarStatus, number>;
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
