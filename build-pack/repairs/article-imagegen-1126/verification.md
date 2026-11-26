# Article hero and motion verification

The local Dext preview uses the receipt-and-ledger artwork from the ChatGPT ImageGen request. The image contains paper documents, ink markings and a ledger. The preview uses the Dext article as a design fixture. The withdrawn import and its publication state remain outside this change.

| Viewport | Before | After |
| --- | --- | --- |
| Desktop, 1440 × 900 | [Original layout](before-desktop.webp) | [Revised layout](after-desktop.webp) |
| Mobile, 390 × 844 | [Original layout](before-mobile.webp) | [Revised layout](after-mobile.webp) |

The original desktop image began about 380 px from the top. In the revised page its top edge sits at 137 px, beside the heading. On mobile the image follows the heading at 315 px and the approved answer begins at 785 px. Both viewports displayed the decoded artwork without horizontal overflow.

The Chromium recordings sampled 36 distinct hero transforms with normal motion and one with reduced motion. The 1440 × 900 videos recorded for the owner lasted 24.84 s and 15.16 s respectively. Both modes completed without page errors. The browser measurements and visual inspection apply to this local candidate. The automated article workflow separately requires a model review of the actual image and rendered composition before a new article can proceed.

The exact ImageGen provider call is a supervised input. The service compares retained tool output and image hashes, derives the published WebP from the original PNG, and sends the derived pixels to the visual reviewer. ImageGen supplies no provider-signed receipt.
