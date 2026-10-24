# @pikkustudio/blob

Studio's animated blob character: a canvas-drawn shape that morphs between named poses (with eyes that can look around and a speaking state).

- `Blob` (from `src/Blob.tsx`) is the React component; it renders a `<canvas>` and takes `pose`, `size`, `fill`, `stroke`, `lookX`/`lookY`, `motion` and `speaking`.
- `src/core.ts` defines the shape model and poses, `src/characters.ts` the drawings, `src/motion.ts` the morphing, and `src/render.ts` the drawing code.
- Subpaths `./core`, `./characters`, `./render` and `./motion` are exported separately; the main entry re-exports the component plus core, render and motion.
- The package ships TypeScript source (no build step) and needs React 19 as a peer dependency. It has no tests.
