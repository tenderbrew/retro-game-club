# Artwork acceptance — required before publication

This contract applies to monthly and bonus rollovers, artwork replacements, and bot-driven website updates. Follow it before calling visual work complete. Passing `tools/audit.js`, successful image decoding, and a worker's report do not establish visual acceptance.

## Retail-case identity

- Require an authentic complete retail case/front-cover scan or original packshot for the selected game and platform, retaining genuine console markings, borders, title and rating marks. If an acceptable complete source cannot be verified, report the source blocker; do not substitute art or call the visual update complete.
- Do not substitute promotional key art, a remaster illustration, a naked art crop, or a fan-made packaging mockup. Never fabricate console branding or a case frame.
- Confirm the edition from the actual image and source page, not the filename. Preserve the full front and its aspect ratio. Display artwork does not silently change the eligible versions or trophy rules.
- Keep the original source file, source-page and image URLs, edition/region, dimensions, and source/output hashes in the private task evidence. Update public credits accurately; do not leave credits for a superseded asset.

## Exact accepted matte

- Match accepted past-month covers side by side. The standard is the existing full 800×800 dark-red plaid, not merely a similar color.
- Reuse a complete accepted donor canvas from Git. Never tile a sampled patch, redraw the plaid, synthesize a replacement pattern, or resize its weave. Record the donor path and revision.
- Keep the established outer margins: approximately 720px artwork width inside an 800px canvas, centered and aspect-preserving. Use the accepted tall-case black fitting-mat convention when appropriate; do not stretch or crop the case to fill a square.
- Prove all pixels outside the declared overlay rectangle equal the donor exactly. Confirm the overlay completely covers the donor's original artwork; no donor art, seams or exposed fragments may remain. If the geometry cannot satisfy both, select another accepted donor rather than inventing background pixels.
- Inspect the full-size final PNG and a contact sheet alongside at least two accepted covers. Matching dimensions or mean color is not enough.

## Gameplay and copy

- Select a clear, colorful, spoiler-light gameplay hero with a recognizable subject and meaningful setting. Show what is distinctive about the game rather than a dull wall, a title screen, menu, video thumbnail or cover crop.
- Preserve screenshot proportions and assess the actual responsive crop. Reject unclear subjects, large empty regions, boss/reveal spoilers and near-duplicate gallery frames.
- Keep approved short copy exact. Do not append an extra slogan or explanatory clause to an approved tagline. Rough trophy prose may be polished only while retaining every supplied gameplay condition and quantity.

## Every consumer

- Inventory every reference to replaced assets, including archive monthly/bonus cards, homepage hero and bonus callouts, small game covers, CSS game-hero backgrounds, metadata, and any trophy/sidebar use.
- Use a descriptive versioned replacement filename when changing an already published image, and update every intended reference so existing browser caches cannot retain the rejected art. Remove an old asset only after no consumers remain.
- Check the exact replacement files and actual rendered uses on desktop, tablet and phone. Test widths around any affected CSS breakpoint; record requested/actual widths, document overflow, broken/pending images, and the observed case/hero composition.
- Preserve unrelated accepted artwork, CSS, results, standings, gallery content, and automation. Do not repair a local asset mismatch by redesigning all previous covers or weakening a test.

## Independent acceptance

- Freeze the final candidate and file hashes. An independent reviewer must inspect the original case identity, full-size matte comparison, all changed asset types, relevant rendered surfaces, source credits, and approved copy. Review is not satisfied by the author's own reread or a summary saying the images decode.
- After a correction, review the bounded changed portion and bind acceptance to the final hashes. Do not reuse a verdict for earlier bytes without proving the exact delta.
- Run `node tools/audit.js`, `node tools/test-hermes-context.js`, applicable trophy/speedrun tests, and both `git diff --check` and `git diff --cached --check` after staging the exact intended paths. The unstaged command alone does not inspect newly created files.
- Keep a private evidence checklist with source identities, donor/overlay proof, reference census, side-by-side images, browser results, reviewer verdict and final hashes. A missing or failed visual check blocks publication; report a blocker instead of substituting plausible artwork or declaring completion.
- The context test checks that this contract stays linked from the workflow entry points; it does not validate pixels or prove that manual acceptance happened. Keep that boundary explicit.
- Publication still requires authorization. After an authorized push, verify the exact remote commit, successful deployment and live content/images. Treat implemented, independently accepted and live as separate states.
