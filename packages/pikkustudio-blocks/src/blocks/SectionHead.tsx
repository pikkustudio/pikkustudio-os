export function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-[22px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{title}</h2>
      {sub ? <p className="mt-1.5 text-[15px] text-muted-foreground text-pretty">{sub}</p> : null}
    </div>
  )
}
