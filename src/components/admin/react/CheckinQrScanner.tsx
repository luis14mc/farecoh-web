import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CheckinQrScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (value: string) => void;
}

type Html5QrcodeInstance = {
  start: (
    cameraIdOrConfig: string | MediaTrackConstraints,
    configuration: unknown,
    qrCodeSuccessCallback: (decodedText: string) => void,
    qrCodeErrorCallback: (errorMessage: string) => void,
  ) => Promise<null>;
  stop: () => Promise<void>;
  clear: () => void;
};

type Html5QrcodeConstructor = new (elementId: string) => Html5QrcodeInstance;

type Html5QrcodeModule = {
  Html5Qrcode: Html5QrcodeConstructor;
};

async function pickRearCameraId(Html5Qrcode: Html5QrcodeConstructor): Promise<string | MediaTrackConstraints> {
  try {
    const cameras = await (Html5Qrcode as unknown as { getCameras: () => Promise<{ id: string; label: string }[]> }).getCameras();
    if (!cameras.length) {
      return { facingMode: "environment" };
    }

    const rear = cameras.find((camera) => /back|rear|environment|trás|trasera/i.test(camera.label));
    return rear?.id ?? cameras[cameras.length - 1].id;
  } catch {
    return { facingMode: "environment" };
  }
}

export function CheckinQrScanner({ open, onOpenChange, onScan }: CheckinQrScannerProps) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `checkin-qr-${reactId}`;
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const scannedRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // Stream may already be stopped.
    }

    try {
      scanner.clear();
    } catch {
      // Container may already be cleared.
    }
  }, []);

  const closeScanner = useCallback(() => {
    void stopScanner();
    onOpenChange(false);
  }, [onOpenChange, stopScanner]);

  useEffect(() => {
    if (!open) {
      scannedRef.current = false;
      setError(null);
      void stopScanner();
      return;
    }

    let active = true;
    scannedRef.current = false;
    setStarting(true);
    setError(null);

    async function startScanner() {
      try {
        const module = (await import("html5-qrcode")) as Html5QrcodeModule;
        if (!active) return;

        const html5Qr = new module.Html5Qrcode(elementId);
        scannerRef.current = html5Qr;

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const edge = Math.min(viewfinderWidth, viewfinderHeight, 320);
            const size = Math.floor(edge * 0.72);
            return { width: size, height: size };
          },
          aspectRatio: 1,
        };

        const onSuccess = (decodedText: string) => {
          if (!active || scannedRef.current) return;
          scannedRef.current = true;

          void stopScanner().then(() => {
            onScan(decodedText.trim());
            onOpenChange(false);
          });
        };

        const camera = await pickRearCameraId(module.Html5Qrcode);

        try {
          await html5Qr.start(camera, config, onSuccess, () => undefined);
        } catch {
          await html5Qr.start({ facingMode: "user" }, config, onSuccess, () => undefined);
        }
      } catch {
        if (active) {
          setError(
            "No se pudo acceder a la cámara. Verifique permisos, use HTTPS en producción o ingrese el código manualmente.",
          );
        }
      } finally {
        if (active) setStarting(false);
      }
    }

    void startScanner();

    return () => {
      active = false;
      void stopScanner();
    };
  }, [open, elementId, onScan, onOpenChange, stopScanner]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else closeScanner();
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b px-4 py-4 text-left">
          <DialogTitle>Escanear QR</DialogTitle>
          <DialogDescription>Apunte la cámara al código QR del boleto.</DialogDescription>
        </DialogHeader>

        <div className="bg-black px-3 py-4">
          <div
            id={elementId}
            className="mx-auto min-h-[240px] w-full max-w-[min(100%,360px)] overflow-hidden rounded-lg [&_video]:!h-auto [&_video]:!max-h-[52dvh] [&_video]:!w-full [&_video]:!object-cover"
          />
          {starting && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/80">
              <Loader2 className="h-4 w-4 animate-spin" />
              Iniciando cámara...
            </div>
          )}
          {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
        </div>

        <DialogFooter className="gap-2 border-t px-4 py-4 sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeScanner}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
