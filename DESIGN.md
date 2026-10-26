---
name: Jolom
description: The map before you commit. Night garden for the invitation, cool stone for reading, Dakesaz controls for every field.
colors:
  palm-deep: "#062421"
  palm: "#0f7a72"
  brass: "#e4c27a"
  stone: "#eef3f0"
  white: "#ffffff"
  ink: "#12241c"
  mist: "#3e5248"
  line: "#d5dfd8"
  field-border: "#c5d0c9"
  paper: "#e7f2ec"
typography:
  display:
    fontFamily: "LahzehFaNum, Peyda, WagzyDisplay, WagzySans, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "LahzehFaNum, Peyda, WagzyDisplay, WagzySans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "0"
  label:
    fontFamily: "LahzehFaNum, Peyda, WagzyDisplay, WagzySans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
  pin:
    fontFamily: "LahzehFaNum, Peyda, WagzyDisplay, WagzySans, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0"
  micro:
    fontFamily: "LahzehFaNum, Peyda, WagzyDisplay, WagzySans, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0"
  chip:
    fontFamily: "LahzehFaNum, Peyda, WagzyDisplay, WagzySans, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0"
rounded:
  control: "8px"
spacing:
  field: "8px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.palm-deep}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "52px"
  button-night:
    backgroundColor: "{colors.palm-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "52px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "52px"
  select:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "52px"
---

## Overview

Jolom is a viewing room at dusk. The night garden (`palm-deep`) carries the invitation: header, landing opening, closing band, footer, and the desk rail. Cool stone carries reading and work. Fields are white, 52px, 8px radius, with a 3px palm focus ring — the Dakesaz desk grammar, recolored so the public site and the admin are one object.

The first viewport is the offer beside the live map, on the night garden. Interior pages open with a white title band, then stone, then ruled rows. Do not wrap those rows in cards.

## Colors

Palm-deep is the room. Brass is the lantern and is used for the one primary action on a dark field, not as a wash. Palm is for links and the focus ring. Mist is a darkened green, never neutral gray, and stays at least 4.5:1 on stone and white. Area colours on the map stay data, shown as a small swatch.

## Typography

Vazirmatn at 400–700 for English, Arabic, and Persian. Display is 700 with -0.02em tracking and a line-height near 1.25 so Persian marks clear the next line. Body is 16px with 1.75 line-height. Measure stays under 70 characters.

## Layout

Header is full-width night garden and stays sticky. Landing hero is a two-column night field: words on the start side, map on the other, map larger. Scores are a ruled measurement, not a grid of cards. Lists are full-width rows separated by a hairline. The desk is a night rail plus a stone workspace; when a map is open the form and the map sit side by side from the large breakpoint up.

## Elevation & Depth

One shadow, used on open menus and the map panel: offset 12px down, 28px blur, the night green at low opacity. No glow.

## Shapes

Controls, buttons, and images that sit in the page use 8px. Map pins stay round because they are pins. Do not use 24px cards as the page structure.

## Components

Text fields, text areas, and selects share the field border, white fill, and palm focus ring. The select is a custom list, not the operating-system menu. Password fields show an eye on the inline end. Labels sit 8px above the control at 14px medium. Primary actions on stone are night-garden buttons. The single brass button is the map call on a dark field.

## Do's and Don'ts

Do keep the map in the first viewport. Do use the same field on the landing finder, the lead form, the ask box, and the desk. Don't add a kicker above every section. Don't present the score as four equal cards. Don't switch to a serif for English.
