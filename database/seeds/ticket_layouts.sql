INSERT INTO public.ticket_layout_configs (layout_type, template_path, config, updated_by)
VALUES
  (
    'physical',
    '/templates/ticket-pink-floyd.png',
    '{
      "templateWidth": 2000,
      "templateHeight": 800,
      "codeFontSize": 36,
      "codeBoxes": [
        { "x": 190, "y": 366, "width": 200, "height": 40 },
        { "x": 1610, "y": 366, "width": 200, "height": 40 }
      ],
      "qrBoxes": [
        { "x": 167, "y": 468, "width": 230, "height": 230 },
        { "x": 1603, "y": 468, "width": 230, "height": 230 }
      ]
    }'::jsonb,
    'init'
  ),
  (
    'digital',
    '/templates/digital-ticket.png',
    '{
      "templateWidth": 1080,
      "templateHeight": 1920,
      "codeFontSize": 34,
      "codeBoxes": [
        { "x": 340, "y": 1400, "width": 400, "height": 80 }
      ],
      "qrBoxes": [
        { "x": 360, "y": 910, "width": 360, "height": 360 }
      ]
    }'::jsonb,
    'init'
  )
ON CONFLICT (layout_type) DO NOTHING;

