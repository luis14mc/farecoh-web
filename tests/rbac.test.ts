import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessRoute,
  normalizeAdminPath,
  roleHomePath,
  routePermissions,
} from "../src/lib/rbac-policy.ts";
import { resolveAdminAccess } from "../src/lib/rbac-policy.ts";
import type { StaffRole } from "../src/lib/rbac-policy.ts";

test("normalizeAdminPath keeps /admin and first-level admin routes", () => {
  assert.equal(normalizeAdminPath("/admin"), "/admin");
  assert.equal(normalizeAdminPath("/admin/"), "/admin");
  assert.equal(normalizeAdminPath("/admin/sales"), "/admin/sales");
  assert.equal(normalizeAdminPath("/admin/sales/extra"), "/admin/sales");
});

test("super_admin can access all protected admin routes", () => {
  for (const route of Object.keys(routePermissions)) {
    assert.equal(canAccessRoute("super_admin", route), true, route);
  }
});

test("seller can access sales, reservations, tickets, and delivery only", () => {
  const allowed = new Set(["/admin/sales", "/admin/reservations", "/admin/tickets", "/admin/delivery", "/admin/no-autorizado"]);
  for (const route of Object.keys(routePermissions)) {
    assert.equal(canAccessRoute("seller", route), allowed.has(route), route);
  }
});

test("checkin_operator can access checkin and no-autorizado", () => {
  assert.equal(canAccessRoute("checkin_operator", "/admin/checkin"), true);
  assert.equal(canAccessRoute("checkin_operator", "/admin/sales"), false);
  assert.equal(canAccessRoute("checkin_operator", "/admin/no-autorizado"), true);
});

test("event_manager cannot access users", () => {
  assert.equal(canAccessRoute("event_manager", "/admin/users"), false);
  assert.equal(canAccessRoute("event_manager", "/admin/reports"), true);
  assert.equal(canAccessRoute("event_manager", "/admin/printing"), true);
});

test("resolveAdminAccess distinguishes unauthenticated, missing profile, and unauthorized", () => {
  const profile = {
    id: "u1",
    auth_user_id: "a1",
    email: "seller@farecoh.org",
    full_name: "Seller",
    role_id: "r1",
    role: "seller" as const,
    active: true,
    created_at: "2026-01-01T00:00:00.000Z",
  };

  assert.deepEqual(resolveAdminAccess({ hasUser: false, profile: null, pathname: "/admin" }), {
    ok: false,
    reason: "unauthenticated",
  });

  assert.deepEqual(resolveAdminAccess({ hasUser: true, profile: null, pathname: "/admin" }), {
    ok: false,
    reason: "no_profile",
  });

  assert.deepEqual(resolveAdminAccess({ hasUser: true, profile, pathname: "/admin/users" }), {
    ok: false,
    reason: "unauthorized",
  });

  assert.deepEqual(resolveAdminAccess({ hasUser: true, profile, pathname: "/admin/sales" }), {
    ok: true,
  });
});

test("roleHomePath sends each role to its primary workspace", () => {
  const expected: Record<StaffRole, string> = {
    super_admin: "/admin",
    event_manager: "/admin",
    seller: "/admin/sales",
    checkin_operator: "/admin/checkin",
  };

  assert.deepEqual(roleHomePath, expected);
});
