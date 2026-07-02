export const TEMPLATE_DPI = 300;
export const CM_TO_TEMPLATE_PIXELS = TEMPLATE_DPI / 2.54;
/** Physical QR size on template (px at 300 DPI), minus 5px trim per side for print fit. */
export const QR_WIDTH_POINTS = 2.5 * CM_TO_TEMPLATE_PIXELS - 5;
export const QR_HEIGHT_POINTS = 2.4 * CM_TO_TEMPLATE_PIXELS - 5;
