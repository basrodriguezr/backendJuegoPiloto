INSERT INTO game_configs (client_code, company_code, game_code, config_json)
VALUES (
  'demo',
  'demo',
  'e-instant',
  '{
    "clientCode": "demo",
    "companyCode": "demo",
    "gameCode": "e-instant",
    "money": {
      "currency": "$",
      "decimals": 0,
      "decimalSeparator": ",",
      "thousandSeparator": "."
    },
    "betOptions": {
      "minBet": 200,
      "maxBet": 10000,
      "step": 100
    },
    "modes": [
      {
        "code": "nivel1",
        "enabled": true,
        "weights": [
          { "symbol": "A", "weight": 6 },
          { "symbol": "B", "weight": 6 },
          { "symbol": "C", "weight": 6 },
          { "symbol": "D", "weight": 6 },
          { "symbol": "E", "weight": 2 },
          { "symbol": "F", "weight": 2 },
          { "symbol": "G", "weight": 2 },
          { "symbol": "H", "weight": 2 },
          { "symbol": "I", "weight": 2 },
          { "symbol": "J", "weight": 2 },
          { "symbol": "K", "weight": 2 },
          { "symbol": "L", "weight": 2 },
          { "symbol": "M", "weight": 2 },
          { "symbol": "N", "weight": 2 }
        ],
        "paytable": [
          { "symbol": "A", "minCluster": 3, "win": 0.2 },
          { "symbol": "B", "minCluster": 3, "win": 0.2 },
          { "symbol": "C", "minCluster": 3, "win": 0.2 },
          { "symbol": "D", "minCluster": 3, "win": 0.2 },
          { "symbol": "E", "minCluster": 3, "win": 0.4 },
          { "symbol": "F", "minCluster": 3, "win": 1.0 },
          { "symbol": "G", "minCluster": 3, "win": 2.0 },
          { "symbol": "H", "minCluster": 3, "win": 0.4 },
          { "symbol": "I", "minCluster": 3, "win": 0.1 },
          { "symbol": "J", "minCluster": 3, "win": 0.1 },
          { "symbol": "K", "minCluster": 3, "win": 0.1 },
          { "symbol": "L", "minCluster": 3, "win": 0.1 },
          { "symbol": "M", "minCluster": 3, "win": 0.1 },
          { "symbol": "N", "minCluster": 3, "win": 0.1 }
        ]
      },
      {
        "code": "nivel2",
        "enabled": true,
        "weights": [
          { "symbol": "A", "weight": 6 },
          { "symbol": "B", "weight": 6 },
          { "symbol": "C", "weight": 6 },
          { "symbol": "D", "weight": 6 },
          { "symbol": "E", "weight": 2 },
          { "symbol": "F", "weight": 2 },
          { "symbol": "G", "weight": 2 },
          { "symbol": "H", "weight": 2 },
          { "symbol": "I", "weight": 2 },
          { "symbol": "J", "weight": 2 },
          { "symbol": "K", "weight": 2 },
          { "symbol": "L", "weight": 2 },
          { "symbol": "M", "weight": 2 },
          { "symbol": "N", "weight": 2 }
        ],
        "paytable": [
          { "symbol": "A", "minCluster": 3, "win": 0.2 },
          { "symbol": "B", "minCluster": 3, "win": 0.2 },
          { "symbol": "C", "minCluster": 3, "win": 0.2 },
          { "symbol": "D", "minCluster": 3, "win": 0.2 },
          { "symbol": "E", "minCluster": 3, "win": 0.4 },
          { "symbol": "F", "minCluster": 3, "win": 1.0 },
          { "symbol": "G", "minCluster": 3, "win": 2.0 },
          { "symbol": "H", "minCluster": 3, "win": 0.4 },
          { "symbol": "I", "minCluster": 3, "win": 0.1 },
          { "symbol": "J", "minCluster": 3, "win": 0.1 },
          { "symbol": "K", "minCluster": 3, "win": 0.1 },
          { "symbol": "L", "minCluster": 3, "win": 0.1 },
          { "symbol": "M", "minCluster": 3, "win": 0.1 },
          { "symbol": "N", "minCluster": 3, "win": 0.1 }
        ]
      }
    ],
    "packSizes": [5, 10, 15, 20],
    "board": {
      "rows": 7,
      "cols": 5,
      "symbols": ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"]
    },
    "branding": {
      "logoUrl": "/logo.svg",
      "backgroundUrl": "/bg-texture.svg",
      "primaryColor": "#0ea5e9",
      "accentColor": "#38bdf8",
      "fontFamily": "var(--font-geist-sans)"
    }
  }'::jsonb
)
ON CONFLICT DO NOTHING;
