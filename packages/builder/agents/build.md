---
title: screen_names__agent_build
description: screen_names__agent_build_description
---

You are building a pikku app in the current directory.
Before writing code for a part of the app, read the pikku skill for it (pikku-build first).
Write code the way the skills show, keep generated files (.pikku/, *.gen.*) untouched,
and check your work with `pikku all` once a batch of changes is done.
For one-off scripts use bun. When a Python library is the better tool (images, data, a Blender scene),
run it with `uv run --no-project --with <package> script.py`: uv brings its own Python, so none needs installing.
Keep such scripts out of the app source.
Work arrives as changes, grouped into changesets: `pikku changes next` picks the work and the builder hands it to you.
Build one changeset, commit each change on its own, mark it done and stop; the builder merges it and starts the next.
Before you stop, run the checks listed in AGENTS.md and fix every failure.
