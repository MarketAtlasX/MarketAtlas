interface CommandGroup {
  label: string
  color: string
  commands: { text: string; example: string }[]
}

const COMMAND_GROUPS: CommandGroup[] = [
  {
    label: 'GLOBE CONTROL',
    color: 'var(--accent)',
    commands: [
      { text: 'Focus on a country', example: '"Focus on Taiwan"' },
      { text: 'Show geopolitical risk', example: '"Show risk heatmap"' },
      { text: 'Zoom out to world', example: '"Zoom out" or "Show the world"' },
      { text: 'Show supply chain routes', example: '"Show routes from China to Germany"' },
      { text: 'Show conflict zones', example: '"Show conflict in the Middle East"' },
    ],
  },
  {
    label: 'MARKET INTELLIGENCE',
    color: 'var(--positive)',
    commands: [
      { text: 'Open a stock', example: '"Show me NVIDIA"' },
      { text: 'Compare assets', example: '"Compare gold vs oil"' },
      { text: 'Open sector analysis', example: '"Show semiconductor stocks"' },
      { text: 'Geopolitical impact', example: '"What is TSMC\'s Taiwan risk?"' },
      { text: 'Commodity routes', example: '"Show oil pipeline routes"' },
    ],
  },
  {
    label: 'EVENTS & ALERTS',
    color: 'var(--warning)',
    commands: [
      { text: 'Show events in a region', example: '"Show events in Europe"' },
      { text: 'Geopolitical tensions', example: '"What tensions affect semiconductors?"' },
      { text: 'Supply chain disruptions', example: '"Supply chain risk for Japan"' },
      { text: 'Conflict impact', example: '"How does Ukraine conflict affect energy?"' },
    ],
  },
  {
    label: 'ANALYSIS & SIMULATION',
    color: '#b98cff',
    commands: [
      { text: 'Run a scenario', example: '"Simulate a Taiwan blockade"' },
      { text: 'Trace exposure networks', example: '"Show APPLE\'s supply network"' },
      { text: 'Search intelligence memory', example: '"Find historical analogues for Iran sanctions"' },
      { text: 'Knowledge graph', example: '"Show the NVIDIA supply graph"' },
    ],
  },
]

export function AtlasCommandGuide({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {COMMAND_GROUPS.map(group =>
          group.commands.slice(0, 2).map(cmd => (
            <span
              key={cmd.example}
              className="inline-block rounded border border-[var(--line)] px-2 py-0.5 text-[9px] font-mono text-[var(--text-lo)] tracking-wide"
            >
              {cmd.example}
            </span>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {COMMAND_GROUPS.map(group => (
        <div key={group.label}>
          <div
            className="text-[8px] font-mono tracking-[0.22em] mb-1.5 font-semibold"
            style={{ color: group.color }}
          >
            {group.label}
          </div>
          <div className="space-y-1">
            {group.commands.map(cmd => (
              <div key={cmd.example} className="flex items-start gap-2">
                <span
                  className="mt-0.5 h-1 w-1 shrink-0 rounded-full"
                  style={{ background: group.color, opacity: 0.6 }}
                />
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--text-mid)] leading-tight">{cmd.text}</p>
                  <p className="text-[9px] font-mono text-[var(--text-lo)] leading-tight mt-0.5 italic">{cmd.example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
