import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/admin/react/NativeSelect";
import { ResponsiveScrollArea } from "@/components/admin/react/ResponsiveScrollArea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SELLER_TYPE_LABELS, type Seller, type SellerType } from "@/types/sellers";

interface VendorsAdminPanelProps {
  sellers: Seller[];
  formMessage?: string;
  formError?: boolean;
}

type StatusFilter = "all" | "active" | "inactive";

export function VendorsAdminPanel({ sellers, formMessage, formError }: VendorsAdminPanelProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [mode, setMode] = useState<"create" | "update">("create");
  const [sellerId, setSellerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<SellerType | "">("");

  const filtered = useMemo(() => {
    return sellers.filter((seller) => {
      if (statusFilter === "active") return seller.active;
      if (statusFilter === "inactive") return !seller.active;
      return true;
    });
  }, [sellers, statusFilter]);

  useEffect(() => {
    if (formMessage && !formError) {
      resetForm();
    }
  }, [formMessage, formError]);

  function resetForm() {
    setMode("create");
    setSellerId("");
    setName("");
    setPhone("");
    setEmail("");
    setType("");
  }

  function startEdit(seller: Seller) {
    setMode("update");
    setSellerId(seller.id);
    setName(seller.name);
    setPhone(seller.phone);
    setEmail(seller.email);
    setType(seller.type);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">{mode === "create" ? "Nuevo vendedor" : "Editar vendedor"}</CardTitle>
          <CardDescription>Registre vendedores individuales o puntos físicos autorizados.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="POST" className="space-y-4">
            <input type="hidden" name="seller_id" value={sellerId} />
            <input type="hidden" name="action" value={mode === "create" ? "create" : "update"} />
            <div className="space-y-2">
              <Label htmlFor="seller-name">Nombre</Label>
              <Input id="seller-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-phone">Teléfono</Label>
              <Input id="seller-phone" name="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-email">Correo</Label>
              <Input
                id="seller-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-type">Tipo</Label>
              <NativeSelect
                id="seller-type"
                name="type"
                required
                value={type}
                onChange={(e) => setType(e.target.value as SellerType | "")}
              >
                <option value="" disabled>
                  Seleccione
                </option>
                <option value="vendor">Vendedor</option>
                <option value="physical_point">Punto físico</option>
              </NativeSelect>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {mode === "create" ? "Guardar vendedor" : "Actualizar vendedor"}
              </Button>
              {mode === "update" && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          {formMessage && (
            <Alert variant={formError ? "destructive" : "success"} className="mt-4">
              <AlertDescription>{formMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Vendedores registrados</CardTitle>
            <CardDescription>Solo vendedores activos aparecen en ventas y asignación de lotes.</CardDescription>
          </div>
          <div className="w-full space-y-2 sm:w-44">
            <Label htmlFor="status-filter">Estado</Label>
            <NativeSelect
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </NativeSelect>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">No hay vendedores registrados.</p>
          ) : (
            <>
              <div className="hidden lg:block">
                <ResponsiveScrollArea minWidth="720px">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((seller) => (
                        <TableRow key={seller.id}>
                          <TableCell className="font-medium">{seller.name}</TableCell>
                          <TableCell>
                            <p>{seller.phone}</p>
                            <p className="text-xs text-muted-foreground">{seller.email}</p>
                          </TableCell>
                          <TableCell>{SELLER_TYPE_LABELS[seller.type]}</TableCell>
                          <TableCell>
                            <Badge variant={seller.active ? "default" : "secondary"}>
                              {seller.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => startEdit(seller)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </Button>
                              <form method="POST" className="inline">
                                <input type="hidden" name="seller_id" value={seller.id} />
                                <input type="hidden" name="action" value={seller.active ? "deactivate" : "activate"} />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className={seller.active ? "text-destructive hover:text-destructive" : ""}
                                >
                                  {seller.active ? "Desactivar" : "Reactivar"}
                                </Button>
                              </form>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveScrollArea>
              </div>

              <div className="divide-y lg:hidden">
                {filtered.map((seller) => (
                  <article key={seller.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{seller.name}</p>
                        <p className="text-sm text-muted-foreground">{SELLER_TYPE_LABELS[seller.type]}</p>
                      </div>
                      <Badge variant={seller.active ? "default" : "secondary"}>
                        {seller.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>{seller.phone}</p>
                      <p className="break-all text-muted-foreground">{seller.email}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" size="sm" className="w-full sm:flex-1" onClick={() => startEdit(seller)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <form method="POST" className="w-full sm:flex-1">
                        <input type="hidden" name="seller_id" value={seller.id} />
                        <input type="hidden" name="action" value={seller.active ? "deactivate" : "activate"} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className={`w-full ${seller.active ? "text-destructive hover:text-destructive" : ""}`}
                        >
                          {seller.active ? "Desactivar" : "Reactivar"}
                        </Button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
