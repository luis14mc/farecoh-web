-- Refresh digital layout defaults for 1050×1890 template (additive update only).
UPDATE public.ticket_layout_configs
SET
  template_path = '/templates/digital-ticket.png',
  config = '{
    "templatePath": "/templates/digital-ticket.png",
    "templateWidth": 1050,
    "templateHeight": 1890,
    "codeFontSize": 34,
    "codeBoxes": [
      { "id": "ticket-code", "x": 331, "y": 1378, "width": 389, "height": 79, "fontSize": 34 }
    ],
    "qrBoxes": [
      { "id": "ticket-qr", "x": 350, "y": 896, "width": 350, "height": 354 }
    ]
  }'::jsonb,
  updated_at = now(),
  updated_by = 'migration-digital-layout-1050'
WHERE layout_type = 'digital'
  AND (config->>'templateWidth')::int = 1080;

NOTIFY pgrst, 'reload schema';
