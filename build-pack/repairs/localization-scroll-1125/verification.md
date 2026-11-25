Replaces the homepage video-localization panel in its existing position. The desktop image holds while the English caption changes to Spanish, then pulls back to show the player. Mobile, short viewports and reduced motion use inline tutorial frames. All three existing guide destinations are retained.

## Runtime evidence

The screenshots in this directory pair the public homepage before the change with the local production build after it. Desktop was captured at 1440 × 900 and mobile at 390 × 844. The desktop sequence is numbered in scroll order.

Playwright confirmed the Spanish caption opacity changed from 0 to 1 and returned to 0 on reverse scroll. The close crop scaled from 1.18 to 1.00. Mobile and reduced-motion layouts displayed inline figures. All three descriptions and links were exposed to the accessibility tree in each mode. Keyboard focus advanced to the comparison link.

The workflow gate, lint, typecheck, targeted public discovery tests, public-site validation and production build passed. Lint reported 17 warnings elsewhere. The Impeccable launcher supported detect but returned unknown command for critique and audit. Separate design and accessibility assessments identified clipped toolbar text and hidden image descriptions. Both corrections were confirmed against the production build.
