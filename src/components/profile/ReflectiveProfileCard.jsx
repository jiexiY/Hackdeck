import { useEffect, useId, useRef } from "react"
import { Activity, BadgeCheck, LockKeyhole } from "lucide-react"

import "./reflective-profile-card.css"

function formatJoinedDate(value) {
  if (!value) return "Member"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Member"
  return `Joined ${new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date)}`
}

export function ReflectiveProfileCard({
  name,
  email,
  memberCode,
  joinedAt,
  initials = "HD",
  syncing = false,
  syncError = false,
  className = "",
}) {
  const cardRef = useRef(null)
  const filterId = `hackdeck-reflective-${useId().replace(/:/g, "")}`

  useEffect(() => {
    const card = cardRef.current
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined

    const handlePointerMove = (event) => {
      const bounds = card.getBoundingClientRect()
      card.style.setProperty("--reflect-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`)
      card.style.setProperty("--reflect-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`)
    }
    const reset = () => {
      card.style.setProperty("--reflect-x", "22%")
      card.style.setProperty("--reflect-y", "14%")
    }
    card.addEventListener("pointermove", handlePointerMove, { passive: true })
    card.addEventListener("pointerleave", reset)
    return () => {
      card.removeEventListener("pointermove", handlePointerMove)
      card.removeEventListener("pointerleave", reset)
    }
  }, [])

  return (
    <article
      ref={cardRef}
      className={`reflective-profile-card${className ? ` ${className}` : ""}`}
      aria-label={`HACKdeck profile ID for ${name || email || "signed-in member"}`}
    >
      <svg className="reflective-profile-card__filters" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.08" numOctaves="2" seed="7" result="noise" />
            <feColorMatrix in="noise" type="luminanceToAlpha" result="noiseAlpha" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" result="rippled" />
            <feSpecularLighting in="noiseAlpha" surfaceScale="3" specularConstant="0.68" specularExponent="18" lightingColor="#ffffff" result="light">
              <fePointLight x="70" y="40" z="190" />
            </feSpecularLighting>
            <feComposite in="light" in2="rippled" operator="in" result="lightEffect" />
            <feBlend in="lightEffect" in2="rippled" mode="screen" />
          </filter>
        </defs>
      </svg>

      <div className="reflective-profile-card__material" style={{ filter: `url(#${filterId})` }} aria-hidden="true" />
      <div className="reflective-profile-card__noise" aria-hidden="true" />
      <div className="reflective-profile-card__sheen" aria-hidden="true" />
      <div className="reflective-profile-card__border" aria-hidden="true" />

      <div className="reflective-profile-card__content">
        <header className="reflective-profile-card__header">
          <div className="reflective-profile-card__secure"><LockKeyhole /> HACKdeck member</div>
          <Activity
            className="reflective-profile-card__activity"
            aria-label={syncing ? "Profile syncing" : syncError ? "Profile not synced" : "Profile synced"}
          />
        </header>

        <div className="reflective-profile-card__identity">
          <span className="reflective-profile-card__avatar" aria-hidden="true">{initials}</span>
          <div>
            <span className="reflective-profile-card__eyebrow">Builder identity</span>
            <h2>{name || "HACKdeck member"}</h2>
            <p>{email || "Authenticated account"}</p>
          </div>
        </div>

        <footer className="reflective-profile-card__footer">
          <div>
            <span>Member ID</span>
            <strong>{syncing ? "SYNCING…" : memberCode}</strong>
          </div>
          <div className="reflective-profile-card__verified">
            <BadgeCheck aria-hidden="true" />
            <span>{formatJoinedDate(joinedAt)}</span>
          </div>
        </footer>
      </div>
    </article>
  )
}
