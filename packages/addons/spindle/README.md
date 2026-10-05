# @pikku/extension-spindle

Spindle's library inside Pikku Studio: upload assets, file them into knowledge bases. Single owner, so no org column; every table is `spindle_`-prefixed (`db/sqlite/0001-spindle.sql`).

Ported so far: assets, knowledge bases, placements, and the owner-decision half of proposals (accept, redirect, dismiss). Passage search is ported too: FTS5 with stemming for words, embeddings stored as blobs and ranked by cosine in code for meaning (no vector extension), fused by reciprocal rank. Reading files is ported too: pdftotext, ffprobe, whisper-cli and ffmpeg run through Studio's tools (registered in its tool manifest, so a missing one reports how to install it), as one `spindleExtractAsset` call rather than workflows. Not yet ported: summarise and categorise (they need a model), the AI grouping that creates proposals, ask-the-library, and the remaining screens.
