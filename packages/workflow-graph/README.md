# @pikkustudio/workflow-graph
Renders a Pikku workflow as an interactive xyflow graph (elkjs layout) with plain React and Tailwind v4 classes.
Use `WorkflowGraphView` with `workflow`, `direction`, `onPaneClick` and `host` (click actions, highlight, run painting).

The consuming app must add this to its Tailwind CSS so the classes are generated:
`@source '<path>/packages/workflow-graph/src';`

Token classes relied on: `bg-card bg-secondary bg-accent text-accent-foreground bg-hero text-hero-ink` (with `data-hue`),
`border-border text-foreground text-ink-2 text-muted-foreground shadow-card rounded-card`, status colours
`success info warning destructive` (plus `-soft` and `-foreground` variants) and `--ring`.
