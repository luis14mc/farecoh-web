# Entrega móvil de boletos digitales

Flujo optimizado para staff en Android/iPhone desde **`/admin/delivery`**.

## Objetivo

Entregar imágenes PNG individuales por boleto, **sin depender de ZIP** en el flujo principal móvil.

## Por grupo de comprador

Cada tarjeta muestra:

- Nombre del comprador
- Teléfono
- Cantidad de boletos
- Lista de códigos (`PF-000151`, etc.)
- Botón **Descargar imagen** por boleto
- Acciones de grupo (en este orden):
  1. **Descargar todas las imágenes**
  2. **Abrir WhatsApp**
  3. **Copiar mensaje**

## Descarga secuencial (sin ZIP)

**Descargar todas las imágenes**:

1. Requiere interacción del usuario (clic en el botón)
2. Descarga un PNG por boleto, en secuencia
3. Pausa breve entre descargas (~600 ms)
4. Muestra progreso: `Descargando 1 de 3`, etc.
5. Al terminar: `3 imágenes descargadas.`

Nombres de archivo:

```
farecoh-digital-PF-000151.png
farecoh-digital-PF-000152.png
farecoh-digital-PF-000153.png
```

Si el navegador bloquea descargas automáticas múltiples, se muestra aviso y los botones individuales permanecen visibles.

## WhatsApp — adjunto manual

WhatsApp **no** permite adjuntar archivos desde un enlace web.

### Flujo recomendado

1. **Descargar todas las imágenes** (o cada una por separado)
2. **Abrir WhatsApp** — abre chat con mensaje prellenado
3. **Adjuntar manualmente** los PNG descargados
4. Enviar

Instrucción visible en pantalla:

> Primero descargue las imágenes. Luego abra WhatsApp y adjúntelas manualmente al mensaje.

### Contenido del mensaje

El mensaje incluye **solo números de boleto**, por ejemplo:

```
Hola {buyerName} 👋

Tu compra para el Tributo a Pink Floyd ha sido confirmada.

Boletos:
- PF-000151
- PF-000152

Adjuntamos tus boletos digitales.
...
```

**No incluye:**

- URLs públicas `/t/{qr_token}`
- Valor de `qr_token`
- Enlaces de verificación

## Ver boleto (admin)

Acción separada **Ver boleto** (icono enlace) abre la imagen en nueva pestaña para revisión interna. No forma parte del mensaje de WhatsApp.

## Seguridad e identidad del boleto

- Las imágenes se generan leyendo `qr_token` desde la base de datos
- No se acepta `qr_token` en la petición del cliente
- Boletos vendidos existentes conservan su QR y URL pública originales

## API

```
GET /api/delivery/digital-ticket/{ticketCode}?download=true
```

Respuesta: `image/png` con `Content-Disposition: attachment`.

## Verificación

```bash
pnpm verify:ticket-immutability
pnpm test
```

Comprobar manualmente:

- [ ] Mensaje WhatsApp sin URLs `/t/`
- [ ] Cada PNG tiene nombre `farecoh-digital-PF-XXXXXX.png`
- [ ] QR escaneado abre el boleto original vendido
