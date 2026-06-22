# Canva Bulk Create - Boletos FARECOH Pink Floyd

## Objetivo

Usar un CSV con 500 filas para crear boletos variables en Canva. El diseño del boleto se hace en Canva; el sistema solo entrega datos.

Archivo generado:

```text
exports/canva-tickets-pink-floyd.csv
```

Columnas:

```csv
code,qr_url,status,batch_name,assigned_to
```

## Generar CSV

Ejecutar con el dominio público final:

```bash
PUBLIC_SITE_URL=https://farecoh.org pnpm run export:canva-tickets
```

Esto genera 500 filas:

```csv
PF-000001,https://farecoh.org/t/{qr_token},available,LOTE GENERAL 001,
PF-000002,https://farecoh.org/t/{qr_token},available,LOTE GENERAL 001,
```

## Paso a paso en Canva

1. Diseñar el boleto en Canva con el estilo final de imprenta.
2. Abrir Apps > Bulk Create.
3. Subir `exports/canva-tickets-pink-floyd.csv`.
4. Insertar el campo `code` en el área del código visible del boleto.
5. Crear un QR en Canva usando el campo `qr_url` como fuente del enlace.
6. Generar los 500 boletos desde Bulk Create.
7. Revisar una muestra de boletos: primero, mitad y último rango.
8. Exportar PDF para imprenta desde Canva.

## Campos mínimos recomendados del boleto

- Código visible: `code`
- QR generado desde: `qr_url`
- Evento: Tributo a Pink Floyd 2026
- Fecha: 08 Agosto 2026
- Hora: 8:00 PM
- Lugar: Escuela Nacional de Música, Tegucigalpa
- Nota: El QR consulta estado, no valida ingreso automáticamente.

## Control antes de imprenta

- Confirmar que el CSV tiene 500 filas de datos.
- Confirmar que cada `code` es único.
- Confirmar que cada `qr_url` es único.
- Escanear al menos 10 QR al azar.
- Verificar que el código impreso coincide con el QR de la misma fila.