# UI & PWA Verification Report (2026-11-25)

- Viewports tested: 360x800, 412x915
- Routes verified: /, /chapters, /study, /drills, /cbt, /stats
- Screenshots saved under: `docs/verification/2026-11-25/`
- External network requests: 0
- Console/page errors: 0
- Shader mode detected on /: eco
- Visibility pause rAF delta: visible=21, hidden=0
- Persistence round-trip (SRS -> Export -> Reset -> Import): PASS (1 states restored)
- Offline reload across all 6 routes: PASS
- Axe color-contrast (WebGL + ecoMode): PASS
- Touch targets >= 48px & zero horizontal overflow: PASS

## Addendum A Section 9.2 Visual Rubric
1. Display title present on Home, Chapters, Drills, CBT, Stats: YES
2. Dark high-contrast card on Home, Chapters, CBT summary, Stats / Drills: YES
3. Filters/toggles use Chip or SegmentedControl (selected = black fill): YES
4. Circular CTAs are 48px ArrowButtons: YES
5. Radii follow Section 4 (28px hero, 20px card, 14px icon, 980px chip); shadows <= 12%: YES
6. No forbidden out-of-scope reference features (avatars, teachers, payments, maps, bell): YES
7. Furigana >= 10px readable in On/Peek/Off modes: YES
8. Japanese text has letter-spacing 0: YES
9. BottomDock hidden during /study, active drills, and active CBT runs; visible elsewhere: YES
10. ecoMode matches normal layout: YES
11. Brand palette + verified contrast pairings follow Section 2.1/2.2: YES
12. Backdrop renders soft lavender/petal wedges and glaucous/violet corners in both WebGL and ecoMode: YES
13. Sparkle appears only in icon squares, BottomDock FAB, pass badge, All caught up, and empty states: YES

## Status: ALL CHECKS PASSED
