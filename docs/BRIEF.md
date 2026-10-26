# Jolom sprint brief

Jolom (جولوم / جولوم) is an original product for off-plan investment in Dubai and the Emirates. It is meant to help an investor read an agent’s projects: neighbourhood, price, a written brief, and a score. It is not a rental or resale listing site.

The shape of the product follows two references the brief asked to combine, without copying their private source or Kotook’s marketing text:

- A coloured district map with a side panel (price, count, photograph, story), in the spirit of a Dubai transactions choropleth.
- An off-plan book of projects, developers, areas, compare, and a question desk, in the spirit of a Dubai off-plan discovery site.

Locales are English, Arabic, and Persian. Arabic and Persian are right-to-left.

The map uses MapLibre and the public OpenFreeMap Positron style. District shapes are simplified drawings around real Dubai centres. They are not official cadastral polygons and they are not a transaction dataset. Colours and the panel story can be edited in the browser and are kept in localStorage under `nibras-area-overrides`. Introductions on a project page stay on the device under `nibras-introductions`. Neither is sent to a server.

Sample developers and project names are fictional. Figures are illustrative. Do not replace them with another site’s project blurbs.

This folder is outside `app-multi`, at `code-king/nibras`. The chat that started the work stays attached to the `app-multi` workspace. Cursor does not move an open chat into a new single-folder window.
