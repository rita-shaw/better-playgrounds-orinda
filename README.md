# Better Playgrounds for Orinda

A one-page positive community petition asking Orinda to work with residents on a better, community-informed playground alternative before choosing either current design.

## Included

- Static HTML/CSS/JS suitable for Vercel
- Google Form link for private supporter name, ZIP code, optional address, optional email for playground-status updates, optional comment, optional public name, and explicit name-display consent
- Positive petition framing with context about the two current options, missing sandbox, and natural-play goals
- Council-facing “What we’re asking for” decision request near the top of the page
- Public-survey context section showing the City’s Concept A and Concept B images plus inclusive-play examples, with links to the SurveyMonkey page and City source documents
- Persistent floating petition CTA that links directly to the Google Form
- Gemini-generated hero concept illustration with explicit non-official labeling
- Gemini-generated concept-drawing gallery with explicit non-official labeling
- Accessible, rotating approved-comments carousel with manual controls and reduced-motion support
- Reference links to the Outpost playscape at Presidio Tunnel Tops

## Data privacy

The site reads only the separate Google Sheets `Public Counter` tab. That tab publishes the aggregate count plus rows generated from the private response tab only when the moderator enters `YES` in column H (`Approved for public display? (type YES)`) and the respondent has checked `Yes, I agree` in the form's consent question. Each public comment row is formatted as `comment||public name`; names are replaced with `Anonymous Orinda resident` unless the respondent explicitly supplied and consented to a public name. Email addresses supplied for playground-status updates are used for that outreach only and never enter the public tab. Addresses, ZIP codes, raw names, and unapproved comments never enter the published tab.

## Referenced photos

The Presidio Tunnel Tops images are externally hosted by the Golden Gate National Parks Conservancy / Presidio Trust and link back to the source article. They are shown as credited inspiration, not as campaign-owned assets:

- [Kids can grow with nature at the Outpost playscape](https://www.parksconservancy.org/article/kids-can-grow-nature-outpost-playscape-presidio-tunnel-tops-playground)

Before using the site for a long-term public campaign, confirm permission or replace the remote photos with images that have an explicit reuse license.

## Local preview

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.
