/* ============================================================
   SECURITY AUDIT & USER DEVICES SERVER ENGINE
   Records and manages authentication attempts, login logs,
   password reset events, and user device sessions with
   disk persistence and real-time security analytics.
   ============================================================ */

import fs from "fs";
import path from "path";
import { resolveGeoLocation, getFlagEmoji } from "./geo-ip";
import { parseUserAgent } from "./user-agent";

export type SecurityEventType =
  | "login_success"
  | "login_failed"
  | "reset_request"
  | "reset_success"
  | "blocked_attempt";

export type SecurityEventRecord = {
  id: string;
  type: SecurityEventType;
  email: string;
  isAdminTarget: boolean;
  ip: string;
  countryCode: string | null;
  countryNameAr: string;
  countryNameEn: string;
  city: string | null;
  flag: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  userAgent: string;
  status: "success" | "failed" | "blocked" | "flagged";
  failureReason: string | null;
  timestamp: string;
};

export type UserDeviceSession = {
  id: string;
  userId: string;
  email: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  ip: string;
  maskedIp: string;
  countryCode: string | null;
  countryNameAr: string;
  countryNameEn: string;
  city: string | null;
  flag: string;
  firstSeenAt: string;
  lastActiveAt: string;
  isCurrent?: boolean;
};

// Known admin emails cache (can be augmented dynamically)
const KNOWN_ADMIN_EMAILS = new Set<string>([
  "alzaben",
  "admin",
  "tareq",
  "tarik",
]);

export function registerKnownAdminEmail(email?: string | null) {
  if (!email) return;
  const clean = email.trim().toLowerCase();
  KNOWN_ADMIN_EMAILS.add(clean);
  const userPart = clean.split("@")[0];
  if (userPart) KNOWN_ADMIN_EMAILS.add(userPart);
}

export function isTargetingAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (KNOWN_ADMIN_EMAILS.has(clean)) return true;
  for (const admin of KNOWN_ADMIN_EMAILS) {
    if (clean.includes(admin)) return true;
  }
  return false;
}

// Data directory resolution
const DATA_DIR = path.join(process.cwd(), ".data");
const LOGS_FILE = path.join(DATA_DIR, "security-audit-logs.json");
const DEVICES_FILE = path.join(DATA_DIR, "user-device-sessions.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("[SecurityAudit] Failed to create .data dir:", err);
  }
}

// In-memory state buffers
let securityLogsBuffer: SecurityEventRecord[] = [];
let userDevicesBuffer: Map<string, UserDeviceSession> = new Map();
let isInitialized = false;

function loadPersistedData() {
  if (isInitialized) return;
  isInitialized = true;
  ensureDataDir();

  // 1. Load security logs
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const raw = fs.readFileSync(LOGS_FILE, "utf-8");
      securityLogsBuffer = JSON.parse(raw);
    }
  } catch (err) {
    console.error("[SecurityAudit] Error loading security-audit-logs.json:", err);
    securityLogsBuffer = [];
  }

  // 2. Load user devices
  try {
    if (fs.existsSync(DEVICES_FILE)) {
      const raw = fs.readFileSync(DEVICES_FILE, "utf-8");
      const list: UserDeviceSession[] = JSON.parse(raw);
      userDevicesBuffer = new Map(list.map((d) => [d.id, d]));
    }
  } catch (err) {
    console.error("[SecurityAudit] Error loading user-device-sessions.json:", err);
    userDevicesBuffer = new Map();
  }
}

let saveLogsTimer: NodeJS.Timeout | null = null;
function scheduleSaveLogs() {
  if (saveLogsTimer) return;
  saveLogsTimer = setTimeout(() => {
    saveLogsTimer = null;
    try {
      ensureDataDir();
      fs.writeFileSync(LOGS_FILE, JSON.stringify(securityLogsBuffer.slice(0, 1000), null, 2), "utf-8");
    } catch (err) {
      console.error("[SecurityAudit] Error persisting security logs:", err);
    }
  }, 2000);
}

let saveDevicesTimer: NodeJS.Timeout | null = null;
function scheduleSaveDevices() {
  if (saveDevicesTimer) return;
  saveDevicesTimer = setTimeout(() => {
    saveDevicesTimer = null;
    try {
      ensureDataDir();
      const list = Array.from(userDevicesBuffer.values());
      fs.writeFileSync(DEVICES_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error("[SecurityAudit] Error persisting user devices:", err);
    }
  }, 2000);
}

function maskIp(ip?: string | null): string {
  if (!ip) return "***.***";
  const clean = ip.trim();
  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }
  if (clean.includes(":")) {
    const parts = clean.split(":");
    return `${parts[0]}:${parts[1]}:****:****`;
  }
  return clean;
}

export type RecordSecurityEventInput = {
  type: SecurityEventType;
  email: string;
  ip: string;
  userAgent?: string | null;
  headers?: (name: string) => string | undefined | null;
  status?: "success" | "failed" | "blocked" | "flagged";
  failureReason?: string | null;
  isAdminTarget?: boolean;
};

/**
 * Authoritatively records a security or login event on the server.
 */
export function recordSecurityEvent(input: RecordSecurityEventInput): SecurityEventRecord {
  loadPersistedData();

  const getHeader = input.headers || (() => undefined);
  const geo = resolveGeoLocation(getHeader, input.ip);
  const dev = parseUserAgent(input.userAgent);

  const cleanEmail = (input.email || "unknown").trim().toLowerCase();
  const isAdmin = input.isAdminTarget ?? isTargetingAdmin(cleanEmail);

  const event: SecurityEventRecord = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: input.type,
    email: cleanEmail,
    isAdminTarget: isAdmin,
    ip: input.ip,
    countryCode: geo.countryCode,
    countryNameAr: geo.countryNameAr,
    countryNameEn: geo.countryNameEn,
    city: geo.city,
    flag: geo.flag,
    deviceName: dev.deviceName,
    deviceType: dev.deviceType,
    browser: dev.browser,
    os: dev.os,
    userAgent: input.userAgent || "",
    status: input.status || (input.type.includes("failed") ? "failed" : "success"),
    failureReason: input.failureReason || null,
    timestamp: new Date().toISOString(),
  };

  // Prepend new event
  securityLogsBuffer.unshift(event);
  if (securityLogsBuffer.length > 2000) {
    securityLogsBuffer = securityLogsBuffer.slice(0, 1000);
  }

  scheduleSaveLogs();
  return event;
}

export type SecurityFilterOptions = {
  type?: string;
  email?: string;
  ip?: string;
  adminOnly?: boolean;
  range?: "24h" | "7d" | "30d" | "all";
  limit?: number;
};

export function getSecurityLogs(filter?: SecurityFilterOptions) {
  loadPersistedData();

  const now = Date.now();
  let events = [...securityLogsBuffer];

  // 1. Time range filter
  if (filter?.range && filter.range !== "all") {
    let windowMs = 7 * 24 * 3600 * 1000;
    if (filter.range === "24h") windowMs = 24 * 3600 * 1000;
    else if (filter.range === "30d") windowMs = 30 * 24 * 3600 * 1000;

    events = events.filter((e) => now - new Date(e.timestamp).getTime() <= windowMs);
  }

  // 2. Type filter
  if (filter?.type && filter.type !== "all") {
    events = events.filter((e) => e.type === filter.type);
  }

  // 3. Admin only filter
  if (filter?.adminOnly) {
    events = events.filter((e) => e.isAdminTarget);
  }

  // 4. Email search filter
  if (filter?.email) {
    const q = filter.email.toLowerCase().trim();
    events = events.filter((e) => e.email.toLowerCase().includes(q));
  }

  // 5. IP search filter
  if (filter?.ip) {
    const q = filter.ip.toLowerCase().trim();
    events = events.filter((e) => e.ip.toLowerCase().includes(q));
  }

  // Stats calculation over whole buffer
  const totalAttempts = securityLogsBuffer.length;
  const failedAttempts = securityLogsBuffer.filter((e) => e.status === "failed" || e.type === "login_failed").length;
  const resetRequests = securityLogsBuffer.filter((e) => e.type === "reset_request").length;
  const adminTargeted = securityLogsBuffer.filter((e) => e.isAdminTarget).length;

  return {
    events: events.slice(0, filter?.limit || 300),
    stats: {
      total: totalAttempts,
      failed: failedAttempts,
      resetRequests,
      adminTargeted,
    },
  };
}

/**
 * Registers or updates a device session for an authenticated user.
 */
export function registerUserDevice(params: {
  userId: string;
  email: string;
  ip: string;
  userAgent?: string | null;
  headers?: (name: string) => string | undefined | null;
  deviceId?: string | null;
}): UserDeviceSession {
  loadPersistedData();

  const getHeader = params.headers || (() => undefined);
  const geo = resolveGeoLocation(getHeader, params.ip);
  const dev = parseUserAgent(params.userAgent);

  // Generate deterministic device session ID per (userId + browser + OS + deviceType)
  const deviceFingerprint = `${params.userId}_${dev.os}_${dev.browser}_${dev.deviceType}`;
  const deviceSessionId = params.deviceId || `dev_${Buffer.from(deviceFingerprint).toString("base64url").slice(0, 24)}`;

  const existing = userDevicesBuffer.get(deviceSessionId);
  const nowIso = new Date().toISOString();

  const session: UserDeviceSession = {
    id: deviceSessionId,
    userId: params.userId,
    email: params.email,
    deviceName: dev.deviceName,
    deviceType: dev.deviceType,
    browser: dev.browser,
    os: dev.os,
    ip: params.ip,
    maskedIp: maskIp(params.ip),
    countryCode: geo.countryCode,
    countryNameAr: geo.countryNameAr,
    countryNameEn: geo.countryNameEn,
    city: geo.city,
    flag: geo.flag,
    firstSeenAt: existing ? existing.firstSeenAt : nowIso,
    lastActiveAt: nowIso,
  };

  userDevicesBuffer.set(deviceSessionId, session);
  scheduleSaveDevices();
  return session;
}

/**
 * Gets all registered devices for a given user.
 */
export function getUserDevices(userId: string, currentSessionId?: string | null): UserDeviceSession[] {
  loadPersistedData();

  const userSessions = Array.from(userDevicesBuffer.values())
    .filter((d) => d.userId === userId)
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

  return userSessions.map((d, index) => ({
    ...d,
    isCurrent: currentSessionId ? d.id === currentSessionId : index === 0,
  }));
}

const revokedDeviceIds = new Set<string>();

/**
 * Revokes / removes a specific device session.
 */
export function revokeUserDevice(userId: string, deviceId: string): boolean {
  loadPersistedData();
  revokedDeviceIds.add(deviceId);
  const session = userDevicesBuffer.get(deviceId);
  if (session && session.userId === userId) {
    userDevicesBuffer.delete(deviceId);
    scheduleSaveDevices();
    return true;
  }
  return true;
}

/**
 * Revokes all device sessions for a user EXCEPT the current session.
 */
export function revokeOtherUserDevices(userId: string, currentSessionId: string): number {
  loadPersistedData();
  let count = 0;
  for (const [id, session] of userDevicesBuffer.entries()) {
    if (session.userId === userId && id !== currentSessionId) {
      revokedDeviceIds.add(id);
      userDevicesBuffer.delete(id);
      count++;
    }
  }
  if (count > 0) scheduleSaveDevices();
  return count;
}

/**
 * Checks whether a given device session has been revoked or is no longer valid.
 */
export function isDeviceRevoked(userId: string, deviceId: string): boolean {
  loadPersistedData();
  if (revokedDeviceIds.has(deviceId)) return true;
  const session = userDevicesBuffer.get(deviceId);
  if (!session) return false; // Not registered yet or fresh, don't falsely revoke
  return session.userId !== userId;
}

