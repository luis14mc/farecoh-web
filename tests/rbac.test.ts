import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessRoute,
  normalizeAdminPath,
  roleHomePath,
  routePermissions,
} from "../src/lib/rbac-policy.ts";
import type { StaffRole } from "../src/lib/rbac-policy.ts";

test("normalizeAdminPath keeps /admin and first-level admin routes", () => {
  assert.equal(normalizeAdminPath("/admin"), "/admin");
  assert.equal(normalizeAdminPath("/admin/"), "/admin");
  assert.equal(normalizeAdminPath("/admin/ventas"), "/admin/ventas");
  assert.equal(normalizeAdminPath("/admin/ventas/extra"), "/admin/ventas");
});

test("super_admin can access all protected admin routes", () => {
  for (const route of Object.keys(routePermissions)) {
    assert.equal(canAccessRoute("super_admin", route), true, route);
  }
});

test("seller can access ventas and boletos only", () => {
  const allowed = new Set(["/admin/ventas", "/admin/boletos", "/admin/no-autorizado"]);
  for (const route of Object.keys(routePermissions)) {
    assert.equal(canAccessRoute("seller", route), allowed.has(route), route);
  }
});

test("checkin_operator can access checkin and no-autorizado", () => {
  assert.equal(canAccessRoute("checkin_operator", "/admin/checkin"), true);
  assert.equal(canAccessRoute("checkin_operator", "/admin/ventas"), false);
  assert.equal(canAccessRoute("checkin_operator", "/admin/no-autorizado"), true);
});

test("event_manager cannot access usuarios", () => {
  assert.equal(canAccessRoute("event_manager", "/admin/usuarios"), false);
  assert.equal(canAccessRoute("event_manager", "/admin/reportes"), true);
});

test("roleHomePath sends each role to its primary workspace", () => {
  const expected: Record<StaffRole, string> = {
    super_admin: "/admin",
    event_manager: "/admin",
    seller: "/admin/ventas",
    checkin_operator: "/admin/checkin",
  };

  assert.deepEqual(roleHomePath, expected);
});
