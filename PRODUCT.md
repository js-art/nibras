# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A Persian-, Arabic-, or English-reading investor, often with an agent, deciding whether an off-plan home in the Emirates or Oman is worth a closer look. A second user is the editor who keeps the public map true: cities, area shapes, projects, payment terms, phone numbers, and search suggestions.

## Product Purpose

Jolom puts off-plan projects on a map so the investor can read the neighbourhood, the price, and a written brief before committing. Success is a person opening the map, finding a place, and contacting the project — or an editor saving a shape that the public map then shows.

## Positioning

The map is the catalogue. Area colour, project boundary, price, and the written brief are one object, editable from a locked desk. Figures in the sample book are fictional and must stay labelled as readings, not promised yields.

## Operating Context

Locales are English, Arabic, and Persian, with Arabic and Persian reading right to left. The public map covers Emirates cities (Dubai, Sharjah, Abu Dhabi, Ras Al Khaimah) and Oman cities (Muscat, Salalah, Sohar). Prices are AED or OMR by country. The desk is gated by named admin users (hashed passwords in Postgres). Atlas, site content, and users persist in PostgreSQL via Prisma; public and admin clients use `/api/v1` (legacy `/api/*` aliases remain).

## Capabilities and Constraints

Public routes: landing, map, projects, areas, developers, compare, and ask. The ask desk answers only from the on-site catalogue. The map supports search suggestions, area and project detail, hover price, and drawing a boundary. The desk creates and edits cities, areas, developers, projects, and suggestions, including polygon corners. Do not invent live market prices, customers, or yields.

## Brand Commitments

The name is Jolom. Voice stays specific and unhyped. Persian and Arabic share Vazirmatn with the Latin UI so the brand does not change face between languages. Form controls follow the Dakesaz desk: 52px fields, 8px corners, a 3px focus ring, and a custom select. The mark stays simple and map-led.

## Evidence on Hand

Sample areas, projects, developers, and photos already live in the catalogue and the atlas seed. Phone numbers and prices there are fictional. No testimonials or press.

## Product Principles

- Show the place before the claim.
- One control language on the public site and the desk.
- Trilingual type is one family.
- A number is a reading, not a promise.
- The desk is locked; the map is public.
