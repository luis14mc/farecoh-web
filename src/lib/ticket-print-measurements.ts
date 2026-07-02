/** Template PNG is exported from Canva at 300 DPI. */
export const TEMPLATE_DPI = 300;

/** Pixels per centimeter on the template at TEMPLATE_DPI. */
export const CM_TO_TEMPLATE_PIXELS = TEMPLATE_DPI / 2.54;

/** Physical QR size on the Canva ticket (cm). Square frame in the design. */
export const QR_SIZE_CM = 2.2;

export function cmToTemplatePixels(cm: number): number {
  return cm * CM_TO_TEMPLATE_PIXELS;
}

/** QR draw size on template (px at 300 DPI): 2.2 cm × 2.2 cm ≈ 259.84 px. */
export const QR_WIDTH_POINTS = cmToTemplatePixels(QR_SIZE_CM);
export const QR_HEIGHT_POINTS = cmToTemplatePixels(QR_SIZE_CM);
