import { useNavigate, useSearch } from "@tanstack/react-router";
import { CHANGES, REAL, SETS, byState, type Change } from "./data";
import { Pill } from "./parts";

const DAYS = [
  { day: "Today", ids: ["c1", "c2", "c3", "c4"] },
  { day: "Yesterday", ids: ["c5", "c6"] },
  { day: "Earlier", ids: ["c7", "c8"] },
];

function Entry({
  c,
  open,
  onToggle,
}: {
  c: Change;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="relative flex gap-4 pb-6 pl-1">
      <span
        className="absolute top-3 bottom-0 left-3 w-0.5 bg-border"
        aria-hidden="true"
      />
      <span
        className={`relative z-1 mt-1 size-5 shrink-0 rounded-full border-4 border-background ${c.state === "needs" ? "bg-warning" : c.state === "done" ? "bg-success" : c.state === "working" ? "bg-info" : "bg-input"}`}
      />
      <button
        type="button"
        aria-pressed={open}
        onClick={onToggle}
        className={`flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-[20px] border-[1.5px] bg-card p-5 text-left transition-colors ${open ? "border-primary" : "border-border hover:border-muted-foreground"}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Pill s={c.state} small />
            <span className="text-[13px] text-muted-foreground">
              {c.from} · {REAL[c.id].shortId} · {c.when}
            </span>
          </div>
          <b className="text-[18px] leading-[1.3]">{c.title}</b>
          {c.now ? (
            <span className="text-[15px] text-info-foreground">{c.now}</span>
          ) : null}
          <div className="flex flex-wrap gap-1.5 pt-0.5 text-[13px] text-ink-2">
            <span className="rounded-full bg-secondary px-2.5 py-0.5">
              Part of: {SETS.find((x) => x.id === c.set)?.title}
            </span>
            {REAL[c.id].route ? (
              <span className="rounded-full bg-secondary px-2.5 py-0.5">
                {REAL[c.id].route}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}

export function TimelineMain() {
  const open = (useSearch({ strict: false }) as { change?: string }).change;
  const nav = useNavigate();
  const pick = (id: string) =>
    nav({
      to: ".",
      search: ((p: Record<string, unknown>) =>
        open === id
          ? { ...p, change: undefined }
          : { ...p, change: id, panel: "chat" }) as never,
      replace: true,
    });
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      {DAYS.map(({ day, ids }) => (
        <section key={day} className="flex flex-col gap-3">
          <h2 className="pl-1 text-[22px] font-bold">{day}</h2>
          <ol className="flex flex-col">
            {ids.map((id) => (
              <Entry
                key={id}
                c={CHANGES.find((x) => x.id === id)!}
                open={open === id}
                onToggle={() => pick(id)}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

const STEPS = ["Understood", "Changed on a copy", "Tested", "Ready for you"];

export function TimelineDock() {
  const c = byState("working")[0];
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-secondary px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="size-2.5 animate-pulse rounded-full bg-info" />
        <b className="flex-1 text-[15px]">Pikku is working on</b>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
        <b className="text-[16px] leading-[1.3]">{c.title}</b>
        <p className="text-[14px] text-info-foreground">{c.now}</p>
        <ol className="flex gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li
              key={s}
              title={s}
              className={`h-1.5 flex-1 rounded-full ${i < 2 ? "bg-primary" : "bg-input"}`}
            />
          ))}
        </ol>
        <span className="text-[13px] text-muted-foreground">
          Step 2 of 4 · {STEPS[1]}
        </span>
      </div>
      <span className="text-[14px] text-ink-2">
        <b className="text-warning-foreground">
          {byState("needs").length} changes
        </b>{" "}
        are waiting for you.
      </span>
    </div>
  );
}
