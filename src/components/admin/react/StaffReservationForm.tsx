import { useEffect, useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StaffReservationFormProps {
  reserveMessage?: string;
  reserveError?: boolean;
}

export function StaffReservationForm({ reserveMessage, reserveError }: StaffReservationFormProps) {
  const [ticketCodes, setTicketCodes] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reserveCode = params.get("reserve");
    if (reserveCode) {
      setTicketCodes(reserveCode.trim().toUpperCase());
    }
  }, []);

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookmarkPlus className="h-4 w-4" />
          Reserva manual (admin)
        </CardTitle>
        <CardDescription>
          Reserve boletos de lotes asignados u otros disponibles. Acepta códigos como{" "}
          <span className="font-mono">481</span> o <span className="font-mono">PF-000481</span>, separados por coma o
          línea.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form method="POST" className="space-y-4">
          <input type="hidden" name="action" value="create_reservation" />

          <div className="space-y-2">
            <Label htmlFor="staff-reserve-codes">Códigos de boleto *</Label>
            <textarea
              id="staff-reserve-codes"
              name="ticket_codes"
              required
              value={ticketCodes}
              onChange={(event) => setTicketCodes(event.target.value)}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[88px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              placeholder={"PF-000481\nPF-000297"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="staff-reserve-buyer-name">Nombre comprador *</Label>
              <Input id="staff-reserve-buyer-name" name="buyer_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-reserve-buyer-phone">Teléfono *</Label>
              <Input id="staff-reserve-buyer-phone" name="buyer_phone" required type="tel" autoComplete="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-reserve-buyer-email">Correo</Label>
              <Input id="staff-reserve-buyer-email" name="buyer_email" type="email" autoComplete="email" />
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto">
            Crear reserva
          </Button>

          {reserveMessage ? (
            <Alert variant={reserveError ? "destructive" : "default"}>
              <AlertDescription>{reserveMessage}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
