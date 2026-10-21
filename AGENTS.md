# Agent Policy

## Production ownership — explicit user instruction, 21 October 2026

- Codex is responsible for Phase 1: research, complete voice-over script, scene planning, consistent image prompts and a clear handoff package.
- The user performs Phase 2 with their own AI tools: all image, thumbnail and voice/audio generation. Codex must not call image-generation or text-to-speech services, create alternative production images/audio, or choose a different generator on its own.
- Codex is responsible for Phase 3: assemble, align, render and validate the final images and audio supplied by the user. Never generate replacements for missing assets.
- Generated Flow instructions address the user's image-generation tool. They do not authorize Codex to execute image generation.
- Keep the established channel visual style. Changes to script quality, scene logic or prompt clarity must not silently introduce a new illustration style.
- Do not independently select or start a new production topic. Agree on the topic with the user first.
- The unsolicited Apollo 13 draft is not an approved production or a style reference.

## Evidence for future productions

New schema-5 projects require `creativeEvidenceVersion=1` and the process in `channel/23-RESEARCH-AND-SCENE-EVIDENCE.md`.
Record sources, claim support and historical visual references before approval. Record script review before scene planning. Preserve declared entity states across scenes. Bind script, sequence and image reviews to their current fingerprints. Never generate APPROVED states, scores or visual observations as a substitute for actually reviewing the corresponding material. Use the current template and CLI for new projects; project-specific legacy generators are historical artifacts, not templates.

## Preproduction quality is mandatory for new projects

For every AI/coding agent working in this repository, new productions with `preproductionQualityGateVersion >= 1` must pass:

- `99-technik/TOPIC_SCORECARD.json`
- `99-technik/STORY_QC.json`

Do not treat a successful duplicate check as topic approval. New Topic Scorecards (schema >= 2) must also prove a concrete historical story core, human/societal stakes, event progression, and must reject mechanism-only framing.

## Script-first and whole-video coherence are mandatory

For new productions with `wholeVideoCoherenceGateVersion >= 1`:

- Write and approve the complete natural voice-over prose before planning visuals.
- Do not build a script by writing one sentence per planned image.
- Run/read the script as one continuous spoken text and remove staccato/list-like rhythm.
- Only after the script is approved, derive Story Beats and Scene Cards.
- Complete `99-technik/WHOLE_VIDEO_QC.json` and set it to APPROVED only after the full script and visual sequence have been reviewed as one experience.
- Normally allow at most two `explanationOnly=true` visuals in a row and keep `explanationOnlyVisualShare <= 0.35`.
- After abstract explanation, return to a concrete historical person, group, place, object, event or visible consequence.

See `channel/17-WHOLE-VIDEO-COHERENCE-GATE.md`.

## Visible text policy

- For future productions with `coverPolicy.firstSceneIsCover=false`, Bild 01 is a normal narration scene and MUST NOT contain thumbnail text. All BILD 01–NN default to `NO_VISIBLE_TEXT`.
- The cover belongs only to `00-bildprompts/thumbnail.png` and must pass independent visual QC + SHA-256 before Phase 3. New projects use `figureReviewGateVersion=1`.
- Only legacy projects with `firstSceneIsCover=true` allow the exact cover text on Bild 01.
- A non-cover image may contain visible text only if its Scene Card explicitly uses `visibleTextPolicy=EDITORIAL_TEXT` and defines both `editorialText` and `editorialTextPurpose`.
- Approved editorial text is limited to one short useful orientation unit such as a year, date, place, time jump or short comparison. Render exactly the approved text and nothing else.
- `BILD`, `IMAGE`, `SCENE`, image numbers, internal prompt metadata, watermarks and pseudo-writing are always hard failures.

## Phase 2 requires real visual review

For every AI/coding agent working in this repository, new productions must pass a real image review before Phase 3.

- Inspect every final image against its assigned narration and Scene Card.
- Reject images that are merely related but do not support the current sentence/beat.
- Reject visually boring repetition and sequences that feel like unrelated illustrations.
- Reject accidental weirdness, exaggerated cartoon expressions, oversized heads, clone-like officers, implausible body proportions, fused/extra fingers, impossible grips, period-inaccurate clothing or confusing compositions. For figure-gated projects explicitly record whether prominent people are visible and pass all six human-quality checks.
- Verify visible text against the Scene Card: in new projects, no cover text on any story scene; only approved editorial text when explicitly allowed. Review the separate thumbnail independently and verify its approved hash.
- Record narration support, visual interest and style consistency at >= 8/10 per image in `99-technik/PHASE2_VISUAL_QC.json`.
- Record the exact `fileName` and SHA-256 of each reviewed image for hash-gated productions.
- Replacing an image after review invalidates Phase 2.
- Do not enter Phase 3 until `PHASE2_VISUAL_QC.json` is fully APPROVED.

## Phase 3 uses existing images only

- Phase 3 may only consume already existing final images from `00-bildprompts/images/`.
- Never generate, regenerate, edit, replace, delete, rename or add images during Phase 3.
- Never call an image-generation service as a fallback during Phase 3.
- Missing, invalid, misnamed or changed images cause an immediate abort.
- Report the exact asset error instead of repairing it automatically.
- `99-technik/PHASE3_IMAGE_LOCK.json` is authoritative. After lock creation the image folder is read-only until Phase 3 ends.

User phrases such as `fang an`, `start`, `mach Phase 3`, or `render das Video` authorize assembly/rendering from existing assets only, never image generation.
