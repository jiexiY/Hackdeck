import "./metallic-wordmark.css"

export function MetallicWordmark() {
  return (
    <div className="metallic-wordmark" role="img" aria-label="HACKdeck">
      <span className="metallic-wordmark__fallback" aria-hidden="true"><strong>HACK</strong>deck</span>
    </div>
  )
}
