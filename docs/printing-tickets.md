# Impresión de boletos físicos FARECOH

## Objetivo

Generar 500 boletos físicos numerados para el evento Pink Floyd Tribute 2026, cada uno con:

- Código visible: `PF-000001` a `PF-000500`
- `qr_token` único
- `qr_url` único
- Imagen QR PNG individual
- CSV para impresión variable

El QR no valida ingreso automáticamente. Solo abre `/t/{qr_token}` para consultar estado básico del boleto.

## Preparar Supabase

Ejecuta la migración canónica:

```sql
supabase/migrations/001_ticketing_core.sql
```

Esto crea el evento `pink-floyd` y el inventario `PF-000001` … `PF-000500` mediante `create_initial_ticket_inventory()`.

## Variables necesarias

```bash
PUBLIC_SITE_URL=https://farecoh.org
PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` solo se usa localmente o en un entorno seguro. Nunca debe exponerse en navegador.

## Instalar dependencia QR

El script usa `qrcode` para generar PNG. Después de actualizar dependencias:

```bash
pnpm install
```

## Ejecutar generación

```bash
pnpm run generate:ticket-assets
```

El script:

1. Lee los 500 boletos desde Supabase.
2. Valida que no haya códigos repetidos.
3. Valida que no haya `qr_token` repetidos.
4. Completa `qr_token` y `qr_url` si hiciera falta.
5. Genera un PNG por boleto en `public/generated-qr/`.
6. Exporta `exports/tickets-print.csv`.

## CSV generado

Archivo:

```text
exports/tickets-print.csv
```

Columnas:

```csv
code,qr_token,qr_url,qr_image,status
```

Ejemplo:

```csv
PF-000001,abc-token,https://farecoh.org/t/abc-token,/generated-qr/PF-000001.png,available
```

Debe contener 500 filas de datos más la fila de encabezados.

## Usar en Canva Bulk Create

1. Abrir el diseño base del boleto en Canva.
2. Ir a Apps > Bulk Create.
3. Subir `exports/tickets-print.csv`.
4. Vincular campos:
   - `code` al texto visible del boleto.
   - `qr_image` a la imagen QR si Canva permite cargar las imágenes desde una fuente accesible.
   - Alternativamente usar `qr_url` en un componente QR generado por Canva.
5. Revisar 5 a 10 boletos de muestra antes de generar todos.
6. Exportar PDF para imprenta con sangrado si el diseño lo requiere.

## Usar QR PNG

Las imágenes quedan en:

```text
public/generated-qr/PF-000001.png
```

Cada PNG codifica la URL pública:

```text
https://farecoh.org/t/{qr_token}
```

## Campos mínimos del boleto físico

- Logo FARECOH
- Nombre del evento
- Fecha: 08 Agosto 2026
- Hora: 8:00 PM
- Lugar: Escuela Nacional de Música, Tegucigalpa
- Código visible: `PF-000001`
- QR del boleto
- Texto: “Este QR no valida ingreso automáticamente. Validación únicamente en acceso.”

## Enviar a imprenta

Antes de imprimir:

- Confirmar que el CSV tiene 500 filas.
- Confirmar que existen 500 PNG en `public/generated-qr/`.
- Escanear 10 QR al azar.
- Verificar que cada QR abre `/t/{qr_token}`.
- Confirmar que el código impreso coincide con el QR asignado.
- Generar prueba impresa antes del tiraje completo.