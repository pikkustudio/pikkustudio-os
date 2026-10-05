# @pikku/addon-diffui

A Pikku addon with screens that shows the original mock and its built prototype side by side, light and dark, for every screenshot pair `scripts/compare-screen.mjs` produces.

Reads pairs from `artifacts/diffui/prototype` (`<screen>-<theme>-<state>-original.png` with its `-prototype.png`), or from `DIFFUI_DIR`. Needs the `diffui:read` scope, and owns no tables.
