import { useEffect, useState } from "react";
import { Pencil, Plus, ShieldAlert, UserPlus } from "lucide-react";
import { ROLE_LABELS, type StaffRole } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/admin/react/NativeSelect";
import { ResponsiveScrollArea } from "@/components/admin/react/ResponsiveScrollArea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STAFF_ROLES: { value: StaffRole; label: string }[] = [
  { value: "super_admin", label: "Super administrador" },
  { value: "event_manager", label: "Gestor de eventos" },
  { value: "seller", label: "Vendedor" },
  { value: "checkin_operator", label: "Operador de acceso" },
];

export interface StaffProfileRow {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  active: boolean;
  created_at: string;
  roleName: string;
  roleLabel: string;
  createdLabel: string;
}

interface UsersAdminPanelProps {
  users: StaffProfileRow[];
  isSuperAdmin: boolean;
  currentAuthUserId?: string;
  formMessage?: string;
  formError?: boolean;
  lastFormAction?: string;
}

type FormMode = "create" | "update";

export function UsersAdminPanel({
  users,
  isSuperAdmin,
  currentAuthUserId,
  formMessage,
  formError,
  lastFormAction,
}: UsersAdminPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [profileId, setProfileId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (formMessage && (lastFormAction === "create" || lastFormAction === "update")) {
      setDialogOpen(true);
    }
  }, [formMessage, lastFormAction]);

  const showPageAlert = formMessage && lastFormAction === "toggle_active";

  function openCreate() {
    setMode("create");
    setProfileId("");
    setFullName("");
    setEmail("");
    setRole("");
    setDialogOpen(true);
  }

  function openEdit(user: StaffProfileRow) {
    setMode("update");
    setProfileId(user.id);
    setFullName(user.full_name);
    setEmail(user.email);
    setRole(user.roleName);
    setDialogOpen(true);
  }

  return (
    <section className="space-y-4">
      {showPageAlert && (
        <Alert variant={formError ? "destructive" : "success"}>
          <AlertDescription>{formMessage}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Solo super administrador</AlertTitle>
        <AlertDescription>
          Cree usuarios en Supabase Auth y asigne permisos desde la tabla de perfiles administrativos.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usuarios de staff</h2>
          <p className="text-sm text-muted-foreground">Perfiles con acceso al panel administrativo.</p>
        </div>
        {isSuperAdmin && (
          <Button className="w-full sm:w-auto" onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        )}
      </div>

      {!isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acción restringida</CardTitle>
            <CardDescription>
              Solo los usuarios con rol de super administrador pueden crear y modificar usuarios staff.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay usuarios administrativos registrados.</p>
          ) : (
            <>
              <div className="hidden lg:block">
                <ResponsiveScrollArea minWidth="880px">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Creado</TableHead>
                        {isSuperAdmin && <TableHead className="text-right">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-semibold">{user.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>{user.roleLabel}</TableCell>
                          <TableCell>
                            <Badge variant={user.active ? "success" : "secondary"}>{user.active ? "Activo" : "Inactivo"}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.createdLabel}</TableCell>
                          {isSuperAdmin && (
                            <TableCell className="text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => openEdit(user)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </Button>
                                <form method="POST" className="inline">
                                  <input type="hidden" name="profile_id" value={user.id} />
                                  <input type="hidden" name="action" value="toggle_active" />
                                  <Button
                                    type="submit"
                                    variant={user.active ? "destructive" : "secondary"}
                                    size="sm"
                                    disabled={user.auth_user_id === currentAuthUserId}
                                    title={user.auth_user_id === currentAuthUserId ? "No puede desactivarse a sí mismo" : undefined}
                                  >
                                    {user.active ? "Desactivar" : "Reactivar"}
                                  </Button>
                                </form>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveScrollArea>
              </div>

              <div className="divide-y lg:hidden">
                {users.map((user) => (
                  <article key={user.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{user.full_name}</p>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant={user.active ? "success" : "secondary"}>{user.active ? "Activo" : "Inactivo"}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{user.roleLabel}</span>
                      <span>·</span>
                      <span>{user.createdLabel}</span>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => openEdit(user)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <form method="POST" className="w-full">
                          <input type="hidden" name="profile_id" value={user.id} />
                          <input type="hidden" name="action" value="toggle_active" />
                          <Button
                            type="submit"
                            variant={user.active ? "destructive" : "secondary"}
                            size="sm"
                            className="w-full"
                            disabled={user.auth_user_id === currentAuthUserId}
                          >
                            {user.active ? "Desactivar" : "Reactivar"}
                          </Button>
                        </form>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{mode === "create" ? "Nuevo usuario staff" : "Editar usuario staff"}</DialogTitle>
                <DialogDescription>
                  {mode === "create"
                    ? "Registre usuarios administrativos y de control."
                    : "Actualice nombre y rol del usuario seleccionado."}
                </DialogDescription>
              </DialogHeader>

              <form id="user-form" method="POST" className="space-y-4">
                <input type="hidden" name="profile_id" value={profileId} />
                <input type="hidden" name="action" value={mode} />

                <div className="space-y-2">
                  <Label htmlFor="user-full-name">Nombre completo *</Label>
                  <Input
                    id="user-full-name"
                    name="full_name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {mode === "create" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="user-email">Correo electrónico *</Label>
                      <Input
                        id="user-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user-password">Contraseña de acceso *</Label>
                      <Input
                        id="user-password"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="user-role">Rol administrativo *</Label>
                  <NativeSelect
                    id="user-role"
                    name="role"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="" disabled>
                      Seleccione un rol
                    </option>
                    {STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {formMessage && (
                  <Alert variant={formError ? "destructive" : "success"}>
                    <AlertDescription>{formMessage}</AlertDescription>
                  </Alert>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    {mode === "create" ? "Guardar usuario" : "Actualizar usuario"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div className="fixed bottom-4 left-4 right-4 z-30 lg:hidden">
            <Button className="h-12 w-full shadow-lg" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
