# QR WiFi Join Card Generator

Generate a printable WiFi join card with an embedded QR code holding network credentials for one-tap guest connection.

**Live:** [qr-wifi-join-card-generator.itsjust.tools](https://qr-wifi-join-card-generator.itsjust.tools)

## Features

- WiFi QR payload (`WIFI:` string) auto-built per iOS/Android/Windows escaping rules
- Password masking toggle with reveal
- Network type selector WPA / WEP / open
- Hidden network flag
- Print-ready A5-style card with optional SSID/password text on the card
- Card color and logo text customization
- Copy the WiFi payload string for embedding elsewhere
- Saved card history with shareable URL state

## WiFi payload escaping

Special characters in the SSID/password (`;` `:` `,` `\` `"`) are escaped with a
backslash, per the `WIFI:` QR payload spec adopted by Android, iOS and Windows.
Open networks omit the password field entirely; hidden networks add `H:true`.

## Keyboard shortcuts

| Key | Action            |
| --- | ----------------- |
| `C` | Copy WiFi payload |

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-qr-wifi-join-card-generator .
docker run -p 3000:3000 itsjust-qr-wifi-join-card-generator
```

## License

MIT — see [LICENSE](LICENSE).
