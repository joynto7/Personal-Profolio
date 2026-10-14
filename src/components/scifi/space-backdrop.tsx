/** Fixed deep-space backdrop behind every page: nebula glow, two drifting star layers and a horizon grid. */
export function SpaceBackdrop() {
  return (
    <div aria-hidden className="sf-backdrop">
      <div className="sf-nebula" />
      <div className="sf-stars far" />
      <div className="sf-stars" />
      <div className="sf-grid" />
    </div>
  );
}
