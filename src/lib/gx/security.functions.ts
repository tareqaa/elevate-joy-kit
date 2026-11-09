/* ============================================================
   SECURITY & AUTH ATTEMPTS SERVER FUNCTIONS
   Server RPC bridges for Admin security dashboard and
   customer active devices management.
   ============================================================ */

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { resolveSafeClientIp } from "./ip";
import { assertAdminCaller, getVerifiedCaller } from "./supabase-auth.server";
import { getUserScopedClient } from "./supabase-request";
import {
  recordSecurityEvent,
  getSecurityLogs,
  registerUserDevice,
  getUserDevices,
  revokeUserDevice,
  revokeOtherUserDevices,
  isDeviceRevoked,
  registerKnownAdminEmail,
  type SecurityEventType,
} from "./security-audit.server";

/**
 * Public server function to log an authentication attempt (login, failed password, etc.)
 */
export const recordAuthAttemptServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        email: z.string().trim().max(160),
        type: z.enum([
          "login_success",
          "login_failed",
          "reset_request",
          "reset_success",
          "blocked_attempt",
        ] as const),
        status: z.enum(["success", "failed", "blocked", "flagged"] as const).optional(),
        failureReason: z.string().max(300).optional().nullable(),
        userId: z.string().uuid().optional().nullable(),
        deviceId: z.string().max(100).optional().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    let ip = "127.0.0.1";
    try {
      ip = resolveSafeClientIp(getRequestHeader);
    } catch {
      ip = "127.0.0.1";
    }

    const ua = getRequestHeader("user-agent") || null;

    // Record the security attempt
    const event = recordSecurityEvent({
      type: data.type as SecurityEventType,
      email: data.email,
      ip,
      userAgent: ua,
      headers: getRequestHeader,
      status: data.status,
      failureReason: data.failureReason,
    });

    // If login was successful, register/update the device session — but only
    // for the account proven by the caller's verified session token. A userId
    // supplied in the request body is never trusted.
    if (data.type === "login_success") {
      const caller = await getVerifiedCaller();
      if (caller) {
        let verifiedEmail = data.email;
        try {
          const { data: userRes } = await getUserScopedClient(caller.token).auth.getUser(caller.token);
          if (userRes?.user?.email) verifiedEmail = userRes.user.email;
        } catch {}
        registerUserDevice({
          userId: caller.userId,
          email: verifiedEmail,
          ip,
          userAgent: ua,
          headers: getRequestHeader,
          deviceId: data.deviceId,
        });
      }
    }

    return { ok: true, eventId: event.id };
  });

/**
 * Admin-only server function: Fetch recent security & login attempts with stats.
 */
export const getAdminSecurityAuditServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        type: z.string().optional(),
        email: z.string().optional(),
        ip: z.string().optional(),
        adminOnly: z.boolean().optional(),
        range: z.enum(["24h", "7d", "30d", "all"]).default("7d"),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const caller = await assertAdminCaller();
    const client = getUserScopedClient(caller.token);

    // Fetch the admin's email to register as a known admin
    try {
      const { data: userRes } = await client.auth.getUser();
      if (userRes?.user?.email) {
        registerKnownAdminEmail(userRes.user.email);
      }
    } catch {}

    // Also fetch blocked IPs count from Supabase
    let blockedIpsList: Array<{ ip: string; reason?: string | null; created_at?: string }> = [];
    try {
      const { data: blocked } = await (client as any)
        .from("blocked_ips")
        .select("ip, reason, created_at")
        .order("created_at", { ascending: false });
      if (blocked && Array.isArray(blocked)) {
        blockedIpsList = blocked;
      }
    } catch {}

    const logsResult = getSecurityLogs({
      type: data.type,
      email: data.email,
      ip: data.ip,
      adminOnly: data.adminOnly,
      range: data.range,
    });

    return {
      ok: true,
      events: logsResult.events,
      stats: {
        ...logsResult.stats,
        blockedIps: blockedIpsList.length,
      },
      blockedIps: blockedIpsList,
    };
  });

/**
 * Admin-only: Block an IP address authoritatively via Supabase RPC.
 */
export const adminBlockIpServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ip: z.string().trim().min(3).max(64),
        reason: z.string().max(200).optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const caller = await assertAdminCaller();
    const client = getUserScopedClient(caller.token);

    const { data: res, error } = await (client as any).rpc("admin_block_ip", {
      _ip: data.ip.trim(),
      _reason: data.reason || "محاولة مشبوهة / استهداف الحساب",
    });

    if (error) {
      throw new Error(error.message || "فشل حظر عنوان الـ IP");
    }

    return { ok: true, result: res };
  });

/**
 * Admin-only: Unblock an IP address authoritatively via Supabase RPC.
 */
export const adminUnblockIpServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ip: z.string().trim().min(3).max(64),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const caller = await assertAdminCaller();
    const client = getUserScopedClient(caller.token);

    const { data: res, error } = await (client as any).rpc("admin_unblock_ip", {
      _ip: data.ip.trim(),
    });

    if (error) {
      throw new Error(error.message || "فشل إزالة حظر عنوان الـ IP");
    }

    return { ok: true, result: res };
  });

/**
 * Customer / User: Get active registered devices and current session info.
 */
export const getUserRegisteredDevicesServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        currentDeviceId: z.string().optional().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const caller = await getVerifiedCaller();
    if (!caller) {
      return { ok: false, devices: [] };
    }

    let ip = "127.0.0.1";
    try {
      ip = resolveSafeClientIp(getRequestHeader);
    } catch {
      ip = "127.0.0.1";
    }

    const ua = getRequestHeader("user-agent") || null;

    // Ensure current device is registered / touched
    const currentSession = registerUserDevice({
      userId: caller.userId,
      email: "",
      ip,
      userAgent: ua,
      headers: getRequestHeader,
      deviceId: data.currentDeviceId,
    });

    const devices = getUserDevices(caller.userId, currentSession.id);

    return {
      ok: true,
      currentDeviceId: currentSession.id,
      devices,
    };
  });

/**
 * Customer / User: Revoke a specific registered device or all other devices.
 */
export const revokeUserDeviceServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        deviceId: z.string().optional(),
        revokeOthers: z.boolean().optional(),
        currentDeviceId: z.string().optional().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const caller = await getVerifiedCaller();
    if (!caller) {
      throw new Error("يجب تسجيل الدخول أولاً");
    }

    if (data.revokeOthers && data.currentDeviceId) {
      const count = revokeOtherUserDevices(caller.userId, data.currentDeviceId);
      return { ok: true, revokedCount: count };
    }

    if (data.deviceId) {
      const revoked = revokeUserDevice(caller.userId, data.deviceId);
      return { ok: revoked };
    }

    return { ok: false };
  });

/**
 * Customer / User: Periodically verify if the current device session is still active and not revoked.
 */
export const checkDeviceSessionStatusServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        deviceId: z.string().trim().min(1).max(100),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const caller = await getVerifiedCaller();
    if (!caller) {
      return { active: false, revoked: true };
    }

    const revoked = isDeviceRevoked(caller.userId, data.deviceId);
    return { active: !revoked, revoked };
  });

