# Better Playgrounds for Orinda

A one-page community advocacy site asking Orinda to pursue a better, community-informed playground alternative rather than approve either current design as-is.

## Included

- Static HTML/CSS/JS suitable for Vercel
- Google Form link for private supporter name, ZIP code, and optional address collection
- Public aggregate supporter counter backed by a published Google Sheets count tab
- Accessible, responsive layout with reduced-motion support
- Reference links to the Outpost playscape at Presidio Tunnel Tops

## Data privacy

The site never reads or publishes individual form responses. The public counter reads only the separate Google Sheets `Public Counter` tab, which currently returns a single `Supporters,<count>` row.

## Referenced photos

The Presidio Tunnel Tops images are externally hosted by the Golden Gate National Parks Conservancy / Presidio Trust and link back to the source article. They are shown as credited inspiration, not as campaign-owned assets:

- [Kids can grow with nature at the Outpost playscape](https://www.parksconservancy.org/article/kids-can-grow-nature-outpost-playscape-presidio-tunnel-tops-playground)

Before using the site for a long-term public campaign, confirm permission or replace the remote photos with images that have an explicit reuse license.

## Local preview

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.
