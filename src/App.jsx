import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Filter,
  Heart,
  HardDrive,
  Languages,
  MapPin,
  MoveHorizontal,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { MetallicWordmark } from "@/components/brand/MetallicWordmark"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { SpecularButton } from "@/components/ui/specular-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { events, feedMeta, filterOptions, monitoredSponsors, REFERENCE_DATE } from "@/data/events"
import {
  APP_LANGUAGES,
  APP_LANGUAGE_STORAGE_KEY,
  HOME_COPY,
  LANDING_COPY,
  LANGUAGE_LOCALES,
} from "@/data/i18n"

const ALL_REMOTE_MODES = ["remote", "in-person"]
const SAVED_EVENTS_STORAGE_KEY = "hackdeck:saved-events:v1"
const SAVED_EVENTS_FILE_VERSION = 1
const MAX_SAVED_IMPORT_BYTES = 1_000_000
const EVENTS_BY_ID = new Map(events.map((event) => [event.id, event]))

const DEFAULT_FILTERS = {
  hostTypes: [...filterOptions.hostTypes],
  countries: [...filterOptions.countries],
  remoteModes: [...ALL_REMOTE_MODES],
  dateWindow: "any",
  deadlineWindow: "any",
  minPrize: "0",
  eligibility: "all",
  format: "all",
  statuses: [...filterOptions.statuses],
}

const STATUS_META = {
  "Closing soon": { className: "closing", short: "Closing soon" },
  "Open now": { className: "open", short: "Open" },
  Upcoming: { className: "upcoming", short: "Upcoming" },
  "Applications closed": { className: "closed", short: "Closed" },
}

function isoDate(value) {
  return new Date(`${value}T12:00:00Z`)
}

function daysBetween(from, to) {
  return Math.ceil((isoDate(to) - isoDate(from)) / 86_400_000)
}

function formatDate(value, language, includeYear = false) {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language] || LANGUAGE_LOCALES.en, {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(isoDate(value))
}

function formatPrize(value, label, copy) {
  if (label) return label
  if (!value) return copy.noCashPrize
  if (value >= 1_000_000) return `$${Math.round(value / 100_000) / 10}m+`
  if (value >= 1000) return `$${Math.round(value / 1000)}k+`
  return `$${value.toLocaleString("en-US")}`
}

function summarizeSelection(values, allValues, singularMap = {}) {
  if (values.length === allValues.length) return "All"
  if (values.length === 0) return "None"
  if (values.length === 1) return singularMap[values[0]] || values[0]
  return `${values.length} selected`
}

function toggleArrayValue(values, value, allValues) {
  const next = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
  return next.length ? next : [...allValues]
}

function savedEventSnapshot(event, savedAt = new Date().toISOString()) {
  return {
    eventId: event.id,
    title: event.title,
    host: event.host,
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
    sourceUrl: event.url,
    savedAt,
  }
}

function normalizeSavedEvent(value) {
  const eventId = typeof value === "string" ? value : value?.eventId || value?.id
  if (typeof eventId !== "string" || !eventId.trim()) return null

  const currentEvent = EVENTS_BY_ID.get(eventId)
  if (currentEvent) {
    const savedAt = typeof value?.savedAt === "string" ? value.savedAt : undefined
    return savedEventSnapshot(currentEvent, savedAt)
  }

  if (!value || typeof value !== "object" || typeof value.title !== "string") return null
  return {
    eventId,
    title: value.title.slice(0, 240),
    host: typeof value.host === "string" ? value.host.slice(0, 160) : "",
    location: typeof value.location === "string" ? value.location.slice(0, 160) : "",
    startDate: typeof value.startDate === "string" ? value.startDate : "",
    endDate: typeof value.endDate === "string" ? value.endDate : "",
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl.slice(0, 2048) : "",
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
  }
}

function savedEventsPayload(records) {
  return {
    app: "HACKdeck",
    version: SAVED_EVENTS_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    items: [...records.values()],
  }
}

function savedRecordsFromText(text) {
  const parsed = JSON.parse(text)
  const items = Array.isArray(parsed) ? parsed : parsed?.items
  if (!Array.isArray(items)) throw new Error("Invalid HACKdeck saves file")
  if (!Array.isArray(parsed) && (parsed.app !== "HACKdeck" || parsed.version !== SAVED_EVENTS_FILE_VERSION)) {
    throw new Error("Unsupported HACKdeck saves file")
  }
  if (items.length > 5_000) throw new Error("HACKdeck saves file contains too many items")

  const records = new Map()
  for (const item of items) {
    const record = normalizeSavedEvent(item)
    if (record) records.set(record.eventId, record)
  }
  return records
}

function loadSavedRecords() {
  try {
    const stored = window.localStorage.getItem(SAVED_EVENTS_STORAGE_KEY)
    return stored ? savedRecordsFromText(stored) : new Map()
  } catch {
    return new Map()
  }
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [query])

  return matches
}

function LandingPage({ onStart, language, onLanguageChange }) {
  const copy = LANDING_COPY[language]

  return (
    <main className="landing-page">
      <section className="landing-shell" aria-labelledby="landing-title">
        <div className="landing-language">
          <span className="landing-language-label"><Languages aria-hidden="true" />{copy.language}</span>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="landing-language-select" aria-label={copy.language}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APP_LANGUAGES.map((option) => (
                <SelectItem className="landing-language-option" key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="landing-hero">
          <h1 id="landing-title" className="visually-hidden">HACKdeck</h1>
          <div className="landing-wordmark-heading" aria-hidden="true">
            <MetallicWordmark />
          </div>
          <div className="landing-message">
            <h2>{copy.headline.map((line) => <span key={line}>{line}</span>)}</h2>
            <p>{copy.description}</p>
          </div>
          <SpecularButton className="landing-start-button" size="md" radius={12} autoAnimate onClick={onStart}>
            {copy.start}<ArrowRight aria-hidden="true" />
          </SpecularButton>
        </div>

        <footer className="landing-footer">
          <div className="landing-metrics" aria-label="HACKdeck coverage">
            <div><strong>{events.length}</strong><span>{copy.live}</span></div>
            <div><strong>{feedMeta.sourceCount}</strong><span>{copy.sources}</span></div>
            <div><strong>{copy.global}</strong><span>{copy.remote}</span></div>
          </div>
          <div className="landing-tracks" aria-hidden="true">
            {copy.tracks.map((track, index) => (
              <span key={track}>{track}{index < copy.tracks.length - 1 ? <i /> : null}</span>
            ))}
          </div>
        </footer>
      </section>
    </main>
  )
}

function CompactSelect({ label, value, options, onValueChange, active = false }) {
  return (
    <div className="compact-filter">
      <span className="compact-filter-label">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="compact-select" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active ? <span className="active-filter-dot" aria-label="Filter active" /> : null}
    </div>
  )
}

function FilterCheckbox({ id, checked, onCheckedChange, children, count }) {
  return (
    <label className="filter-checkbox" htmlFor={id}>
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <span>{children}</span>
      {typeof count === "number" ? <span className="filter-count">{count}</span> : null}
    </label>
  )
}

function FilterGroup({ title, children, className = "" }) {
  return (
    <div className={`filter-group ${className}`}>
      <p>{title}</p>
      <div className="filter-group-body">{children}</div>
    </div>
  )
}

function StatusBadge({ status, copy }) {
  const meta = STATUS_META[status]
  return <Badge className={`status-badge ${meta.className}`}>{copy.statusShort[status] || meta.short}</Badge>
}

function SourceBadge({ verified, sourceType = "Official", copy }) {
  if (!verified) return null
  return <Badge className={`source-badge ${sourceType === "Community" ? "community" : ""}`}><Check />{sourceType === "Community" ? copy.community : copy.official}</Badge>
}

function EventCard({ event, selected, saved, onSelect, onSave, onView, copy, language }) {
  const deadlineDays = event.deadline ? daysBetween(REFERENCE_DATE, event.deadline) : null
  return (
    <Card
      className={`event-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      data-event-id={event.id}
    >
      <CardHeader className="event-card-header">
        <div className="card-status-row">
          <div className="card-badges">
            <StatusBadge status={event.status} copy={copy} />
            <SourceBadge verified={event.verified} sourceType={event.sourceType} copy={copy} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`heart-button ${saved ? "saved" : ""}`}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onSave()
            }}
            aria-label={saved ? copy.removeSavedAria(event.title) : copy.saveAria(event.title)}
            aria-pressed={saved}
          >
            <Heart fill={saved ? "currentColor" : "none"} />
          </Button>
        </div>
        <CardTitle className="event-title">
          <button type="button" onClick={onSelect}>{event.title}</button>
        </CardTitle>
        <CardDescription className="event-host">
          {event.host}<span>•</span>{copy.hostTypeSingle[event.hostType] || event.hostType}
        </CardDescription>
      </CardHeader>

      <CardContent className="event-card-content">
        <div className="event-meta-row"><MapPin />{event.location}</div>
        <div className="event-meta-row"><CalendarDays />{formatDate(event.startDate, language)} – {formatDate(event.endDate, language, true)}</div>

        <div className="event-divider" />

        <div className={selected ? "selected-metrics" : "compact-metrics"}>
          <div className="metric">
            <span>{copy.applicationDeadline}</span>
            <strong>{event.deadlineLabel || (event.deadline ? formatDate(event.deadline, language, true) : copy.notPosted)}</strong>
            <em className={event.status === "Applications closed" || deadlineDays < 0 ? "muted-text" : event.status === "Closing soon" ? "amber-text" : "green-text"}>{event.deadlineNote || (deadlineDays === null ? copy.monitorActive : deadlineDays < 0 ? copy.deadlinePassed : copy.daysLeft(deadlineDays))}</em>
          </div>
          <div className="metric">
            <span>{copy.prizePool}</span>
            <strong>{formatPrize(event.prizePool, event.prizeLabel, copy)}</strong>
          </div>
          {selected ? (
            <>
              <div className="metric">
                <span>{copy.eligibilityLabel}</span>
                <strong>{copy.eligibility[event.eligibility] || event.eligibility}</strong>
              </div>
              <div className="metric">
                <span>{copy.formatLabel}</span>
                <strong>{copy.formats[event.format] || event.format}</strong>
              </div>
              <div className="metric">
                <span>{copy.statusLabel}</span>
                <strong className={`inline-status ${event.status === "Applications closed" ? "closed-status" : ""}`}><span className="status-dot" />{copy.statuses[event.status] || event.status}</strong>
              </div>
              <div className="metric">
                <span>{copy.hostType}</span>
                <strong>{copy.hostTypeSingle[event.hostType] || event.hostType}</strong>
              </div>
            </>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="event-card-footer">
        {selected ? (
          <>
            <Button className="view-event-button" onClick={(clickEvent) => { clickEvent.stopPropagation(); onView() }}>
              {copy.viewEvent} <ArrowRight />
            </Button>
            <Button variant="outline" aria-pressed={saved} onClick={(clickEvent) => { clickEvent.stopPropagation(); onSave() }}>
              <Heart fill={saved ? "currentColor" : "none"} />{saved ? copy.savedLabel : copy.save}
            </Button>
          </>
        ) : (
          <div className="compact-card-footer">
            <span className={event.status === "Applications closed" ? "closed-status" : ""}><span className="status-dot" />{copy.statusShort[event.status] || event.status}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={(clickEvent) => { clickEvent.stopPropagation(); onSave() }}
              aria-label={saved ? copy.removeSavedAria(event.title) : copy.saveAria(event.title)}
              aria-pressed={saved}
            >
              <Heart fill={saved ? "currentColor" : "none"} />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

function DetailRail({ event, saved, onClose, onSave, onView, copy, language }) {
  const isSheet = useMediaQuery("(max-width: 1040px)")
  const closeButtonRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!event || !isSheet) return undefined
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
    const previousRootOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    return () => {
      document.documentElement.style.overflow = previousRootOverflow
      document.body.style.overflow = previousBodyOverflow
      if (dialog?.open) dialog.close()
    }
  }, [event?.id, isSheet])

  if (!event) return null
  const deadlineDays = event.deadline ? daysBetween(REFERENCE_DATE, event.deadline) : null

  const rail = (
    <aside
      className="detail-rail"
      aria-label={copy.detailsFor(event.title)}
    >
      <div className="detail-topline">
        <div className="card-badges">
          <StatusBadge status={event.status} copy={copy} />
          <SourceBadge verified={event.verified} sourceType={event.sourceType} copy={copy} />
        </div>
        <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label={copy.closeDetails}><X /></Button>
      </div>
      <h2>{event.title}</h2>
      <p className="detail-host">{event.host}<span>•</span>{copy.hostTypeSingle[event.hostType] || event.hostType}</p>
      <div className="detail-meta"><MapPin />{event.location}</div>
      <div className="detail-meta"><CalendarDays />{formatDate(event.startDate, language)} – {formatDate(event.endDate, language, true)}</div>

      <section className="detail-section">
        <span>{copy.applicationDeadline}</span>
        <strong>{event.deadlineLabel || (event.deadline ? formatDate(event.deadline, language, true) : copy.notPosted)}</strong>
        <em className={event.status === "Applications closed" || deadlineDays < 0 ? "muted-text" : event.status === "Closing soon" ? "amber-text" : "green-text"}>{event.deadlineNote || (deadlineDays === null ? copy.monitorActive : deadlineDays < 0 ? copy.deadlinePassed : copy.daysLeft(deadlineDays))}</em>
        <small>{event.deadlineTimeNote || copy.localTimeDefault}</small>
      </section>
      <section className="detail-section">
        <span>{copy.aboutEligibility}</span>
        <p>{event.about}</p>
        <small>{copy.eligibility[event.eligibility] || event.eligibility} · {event.teamSize || copy.teamsDefault}.</small>
      </section>
      <section className="detail-section compact-detail-section">
        <span>{copy.formatLabel}</span>
        <strong>{copy.formats[event.format] || event.format}{event.remote ? ` · ${copy.remoteFriendly}` : ""}</strong>
      </section>
      {event.ecosystem?.length ? (
        <section className="detail-section ecosystem-section">
          <span>{copy.sponsorStack}</span>
          <div className="ecosystem-chips">{event.ecosystem.map((name) => <Badge key={name}>{name}</Badge>)}</div>
        </section>
      ) : null}
      <section className="detail-section">
        <span>{copy.whatToBuild}</span>
        <p>{event.buildPrompt}</p>
      </section>

      <div className="detail-actions">
        <Button onClick={onView}>{copy.viewEvent} <ArrowRight /></Button>
        <Button variant="outline" aria-pressed={saved} onClick={onSave}>
          <Heart fill={saved ? "currentColor" : "none"} />{saved ? copy.savedLabel : copy.saveEvent}
        </Button>
      </div>
    </aside>
  )

  if (!isSheet) return rail
  return (
    <dialog
      ref={dialogRef}
      className="detail-sheet-dialog"
      aria-label={copy.detailsFor(event.title)}
      onCancel={(cancelEvent) => {
        cancelEvent.preventDefault()
        cancelEvent.stopPropagation()
        onClose()
      }}
      onPointerDown={(pointerEvent) => {
        if (pointerEvent.target === pointerEvent.currentTarget) onClose()
      }}
    >
      {rail}
    </dialog>
  )
}

function Timeline({ timelineEvents, selectedId, copy, language }) {
  const rangeStart = timelineEvents.reduce((earliest, event) => event.startDate < earliest ? event.startDate : earliest, timelineEvents[0].startDate)
  const rangeEnd = timelineEvents.reduce((latest, event) => event.endDate > latest ? event.endDate : latest, timelineEvents[0].endDate)

  return (
    <section className="timeline chronology-timeline" aria-label={copy.timelineAria(formatDate(rangeStart, language, true), formatDate(rangeEnd, language, true))}>
      <div className="timeline-overview">
        <div>
          <strong>{copy.chronologicalRunway}</strong>
          <span>{formatDate(rangeStart, language, true)} – {formatDate(rangeEnd, language, true)}</span>
        </div>
        <small>{copy.everyDetected}</small>
      </div>
      <div className="timeline-events">
        {timelineEvents.map((event) => {
          const statusClass = STATUS_META[event.status]?.className || "upcoming"
          return (
            <article
              className={`timeline-event ${statusClass} ${event.id === selectedId ? "selected" : ""}`}
              key={event.id}
              aria-current={event.id === selectedId ? "true" : undefined}
            >
              <div className="timeline-event-dates">
                <strong>{formatDate(event.startDate, language, true)}</strong>
                <span>{copy.to} {formatDate(event.endDate, language, true)}</span>
              </div>
              <div className="timeline-event-track" aria-hidden="true"><i /></div>
              <p>{event.title}</p>
              <small>{event.location}</small>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function Tracker({ language, onLanguageChange }) {
  const copy = HOME_COPY[language] || HOME_COPY.en
  const headingRef = useRef(null)
  const searchRef = useRef(null)
  const dataMenuButtonRef = useRef(null)
  const importFileRef = useRef(null)
  const runwayScrollRef = useRef(null)
  const runwayDragRef = useRef(null)
  const suppressRunwayClickRef = useRef(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [searchQuery, setSearchQuery] = useState("")
  const [view, setView] = useState("runway")
  const [allFiltersOpen, setAllFiltersOpen] = useState(() => window.innerWidth > 760)
  const [selectedId, setSelectedId] = useState(() => events.slice().sort((first, second) => first.startDate.localeCompare(second.startDate) || first.endDate.localeCompare(second.endDate) || first.title.localeCompare(second.title))[0]?.id || null)
  const [savedRecords, setSavedRecords] = useState(loadSavedRecords)
  const [savedOnly, setSavedOnly] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dataMenuOpen, setDataMenuOpen] = useState(false)
  const [notice, setNotice] = useState("")
  const [storageIssue, setStorageIssue] = useState("")
  const [runwayDragging, setRunwayDragging] = useState(false)

  const activeSavedCount = useMemo(
    () => events.reduce((count, event) => count + (savedRecords.has(event.id) ? 1 : 0), 0),
    [savedRecords],
  )
  const archivedSavedRecords = useMemo(
    () => [...savedRecords.values()].filter((record) => !EVENTS_BY_ID.has(record.eventId)),
    [savedRecords],
  )

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_EVENTS_STORAGE_KEY, JSON.stringify(savedEventsPayload(savedRecords)))
      setStorageIssue("")
    } catch {
      setStorageIssue(copy.storageIssue)
    }
  }, [copy.storageIssue, savedRecords])

  useEffect(() => {
    function focusSearch(event) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [])

  const filteredEvents = useMemo(() => {
    const reference = isoDate(REFERENCE_DATE)
    const dateLimit = filters.dateWindow === "any" ? null : new Date(reference)
    if (dateLimit) dateLimit.setUTCDate(dateLimit.getUTCDate() + Number(filters.dateWindow))
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return events.filter((event) => {
      if (savedOnly && !savedRecords.has(event.id)) return false
      if (!filters.hostTypes.includes(event.hostType)) return false
      const eventCountries = event.countries || [event.country]
      if (!eventCountries.some((country) => filters.countries.includes(country))) return false
      const eventRemoteMode = event.remote ? "remote" : "in-person"
      if (!filters.remoteModes.includes(eventRemoteMode)) return false
      if (dateLimit && isoDate(event.startDate) > dateLimit) return false
      if (filters.deadlineWindow !== "any") {
        const deadlineDays = event.deadline ? daysBetween(REFERENCE_DATE, event.deadline) : null
        if (deadlineDays === null || deadlineDays < 0 || deadlineDays > Number(filters.deadlineWindow)) return false
      }
      if (event.prizePool < Number(filters.minPrize)) return false
      if (filters.eligibility !== "all" && event.eligibility !== filters.eligibility) return false
      if (filters.format !== "all" && event.format !== filters.format) return false
      if (!filters.statuses.includes(event.status)) return false
      if (normalizedSearch) {
        const haystack = [event.title, event.host, event.location, event.hostType, event.tagline, ...(event.ecosystem || [])].join(" ").toLowerCase()
        if (!haystack.includes(normalizedSearch)) return false
      }
      return true
    }).sort((first, second) => first.startDate.localeCompare(second.startDate) || first.endDate.localeCompare(second.endDate) || first.title.localeCompare(second.title))
  }, [filters, savedOnly, savedRecords, searchQuery])

  useEffect(() => {
    if (filteredEvents.length && !filteredEvents.some((event) => event.id === selectedId)) {
      setSelectedId(filteredEvents[0].id)
    }
  }, [filteredEvents, selectedId])

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 760px)")
    const collapseShelfOnMobile = (query) => {
      if (query.matches) setAllFiltersOpen(false)
    }
    collapseShelfOnMobile(mobileQuery)
    mobileQuery.addEventListener("change", collapseShelfOnMobile)
    return () => mobileQuery.removeEventListener("change", collapseShelfOnMobile)
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(""), 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape" || event.defaultPrevented) return
      if (dataMenuOpen) {
        setDataMenuOpen(false)
        dataMenuButtonRef.current?.focus()
        return
      }
      if (detailOpen) closeDetails()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [dataMenuOpen, detailOpen, selectedId])

  const selectedEvent = filteredEvents.find((event) => event.id === selectedId) || filteredEvents[0] || null

  const sponsorCounts = useMemo(() => Object.fromEntries(monitoredSponsors.map((name) => [
    name,
    events.filter((event) => [event.host, ...(event.ecosystem || [])].some((value) => value.toLowerCase().includes(name.toLowerCase()))).length,
  ])), [])

  function patchFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function setMultiFromCompact(key, value, allValues) {
    patchFilter(key, value === "all" ? [...allValues] : [value])
  }

  function toggleFilterValue(key, value, allValues) {
    setFilters((current) => ({
      ...current,
      [key]: toggleArrayValue(current[key], value, allValues),
    }))
  }

  function resetFilters() {
    setFilters({
      ...DEFAULT_FILTERS,
      hostTypes: [...DEFAULT_FILTERS.hostTypes],
      countries: [...DEFAULT_FILTERS.countries],
      remoteModes: [...DEFAULT_FILTERS.remoteModes],
      statuses: [...DEFAULT_FILTERS.statuses],
    })
    setSearchQuery("")
    setSavedOnly(false)
    setNotice(copy.filtersReset)
  }

  function toggleSaved(event) {
    const removing = savedRecords.has(event.id)
    setSavedRecords((current) => {
      const next = new Map(current)
      if (next.has(event.id)) next.delete(event.id)
      else next.set(event.id, savedEventSnapshot(event))
      return next
    })
    setNotice(removing ? copy.removedFromSaves(event.title) : copy.savedOnDeviceNotice(event.title))
  }

  function exportSavedEvents() {
    if (!savedRecords.size) {
      setNotice(copy.saveBeforeExport)
      return
    }

    const blob = new Blob([JSON.stringify(savedEventsPayload(savedRecords), null, 2)], { type: "application/json" })
    const href = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = href
    link.download = `hackdeck-saves-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(href), 0)
    setNotice(copy.exported(savedRecords.size))
  }

  async function importSavedEvents(changeEvent) {
    const file = changeEvent.target.files?.[0]
    changeEvent.target.value = ""
    if (!file) return
    if (file.size > MAX_SAVED_IMPORT_BYTES) {
      setNotice(copy.backupTooLarge)
      return
    }

    try {
      const imported = savedRecordsFromText(await file.text())
      if (!imported.size) {
        setNotice(copy.noValidSaves)
        return
      }
      setSavedRecords((current) => new Map([...current, ...imported]))
      setNotice(copy.imported(imported.size))
    } catch {
      setNotice(copy.invalidBackup)
    }
  }

  function handleSelect(id) {
    if (suppressRunwayClickRef.current) return
    setSelectedId(id)
    setDetailOpen(true)
  }

  function startRunwayDrag(pointerEvent) {
    if (pointerEvent.button !== 0 || pointerEvent.target.closest("button, a, input, select, textarea, [role='button']")) return
    const scroller = runwayScrollRef.current
    if (!scroller) return
    runwayDragRef.current = {
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startScrollLeft: scroller.scrollLeft,
      moved: false,
    }
    scroller.setPointerCapture(pointerEvent.pointerId)
  }

  function moveRunwayDrag(pointerEvent) {
    const drag = runwayDragRef.current
    const scroller = runwayScrollRef.current
    if (!drag || !scroller || drag.pointerId !== pointerEvent.pointerId) return
    const distance = pointerEvent.clientX - drag.startX
    if (!drag.moved && Math.abs(distance) < 5) return
    if (!drag.moved) {
      drag.moved = true
      setRunwayDragging(true)
    }
    scroller.scrollLeft = drag.startScrollLeft - distance
    pointerEvent.preventDefault()
  }

  function endRunwayDrag(pointerEvent) {
    const drag = runwayDragRef.current
    const scroller = runwayScrollRef.current
    if (!drag || drag.pointerId !== pointerEvent.pointerId) return
    if (drag.moved) {
      suppressRunwayClickRef.current = true
      window.setTimeout(() => {
        suppressRunwayClickRef.current = false
      }, 0)
    }
    if (scroller?.hasPointerCapture(pointerEvent.pointerId)) {
      scroller.releasePointerCapture(pointerEvent.pointerId)
    }
    runwayDragRef.current = null
    setRunwayDragging(false)
  }

  function handleRunwayKeyDown(keyboardEvent) {
    if (!runwayScrollRef.current || !["ArrowLeft", "ArrowRight"].includes(keyboardEvent.key)) return
    keyboardEvent.preventDefault()
    runwayScrollRef.current.scrollBy({
      left: keyboardEvent.key === "ArrowRight" ? 320 : -320,
      behavior: "smooth",
    })
  }

  function handleView(event) {
    if (event.verified) {
      setNotice(copy.openingListing(event.sourceType === "Community" ? copy.community : copy.official, event.host))
      const sourceWindow = window.open(event.url, "_blank")
      if (sourceWindow) sourceWindow.opener = null
      return
    }
    setNotice(copy.mockedLink(event.title))
  }

  function closeDetails() {
    setDetailOpen(false)
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-event-id="${selectedId}"] .event-title button`)?.focus()
    })
  }

  const compactHostValue = filters.hostTypes.length === filterOptions.hostTypes.length ? "all" : filters.hostTypes.length === 1 ? filters.hostTypes[0] : "mixed"
  const compactCountryValue = filters.countries.length === filterOptions.countries.length ? "all" : filters.countries.length === 1 ? filters.countries[0] : "mixed"
  const compactRemoteValue = filters.remoteModes.length === ALL_REMOTE_MODES.length ? "all" : filters.remoteModes.length === 1 ? filters.remoteModes[0] : "mixed"
  const compactStatusValue = filters.statuses.length === filterOptions.statuses.length ? "all" : filters.statuses.length === 1 ? filters.statuses[0] : "mixed"

  const hostOptions = [
    { value: "all", label: copy.all },
    ...(filters.hostTypes.length > 1 && filters.hostTypes.length < filterOptions.hostTypes.length ? [{ value: "mixed", label: copy.selected(filters.hostTypes.length), disabled: true }] : []),
    ...filterOptions.hostTypes.map((value) => ({
      value,
      label: copy.hostTypes[value] || value,
    })),
  ]
  const countryOptions = [
    { value: "all", label: copy.worldwide },
    ...(filters.countries.length > 1 && filters.countries.length < filterOptions.countries.length ? [{ value: "mixed", label: copy.selected(filters.countries.length), disabled: true }] : []),
    ...filterOptions.countries.map((value) => ({ value, label: copy.countries[value] || value })),
  ]
  const remoteOptions = [
    { value: "all", label: copy.all },
    ...(filters.remoteModes.length > 1 && filters.remoteModes.length < ALL_REMOTE_MODES.length ? [{ value: "mixed", label: copy.selected(filters.remoteModes.length), disabled: true }] : []),
    { value: "remote", label: copy.remoteModes.remote },
    { value: "in-person", label: copy.remoteModes["in-person"] },
  ]
  const statusOptions = [
    { value: "all", label: copy.allStatuses },
    ...(filters.statuses.length > 1 && filters.statuses.length < filterOptions.statuses.length ? [{ value: "mixed", label: copy.selected(filters.statuses.length), disabled: true }] : []),
    ...filterOptions.statuses.map((value) => ({ value, label: copy.statuses[value] || value })),
  ]

  return (
    <main className="tracker-page">
      <nav className="top-nav" aria-label={copy.mainNavigation}>
        <a className="brand-lockup" href="#dashboard" aria-label={copy.brandAria}>
          <span>HACKDECK</span>
          <span className="live-label"><span className="status-dot" />{copy.live}</span>
        </a>

        <div className="nav-actions">
          <div className="dashboard-language">
            <Languages aria-hidden="true" />
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="dashboard-language-select" aria-label={copy.language}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_LANGUAGES.map((option) => (
                  <SelectItem className="dashboard-language-option" key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="global-search" htmlFor="event-search">
            <Search aria-hidden="true" />
            <Input
              id="event-search"
              ref={searchRef}
              aria-label={copy.searchAria}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
            <kbd aria-hidden="true">Ctrl K</kbd>
          </label>
          <span className="nav-divider" aria-hidden="true" />
          <Button
            variant="outline"
            className={`saved-nav-button ${savedOnly ? "active" : ""}`}
            onClick={() => setSavedOnly((current) => !current)}
            aria-pressed={savedOnly}
          >
            {copy.saved} <Heart fill={savedOnly ? "currentColor" : "none"} /> {activeSavedCount}
          </Button>
          <span className="nav-divider" aria-hidden="true" />
          <div className="save-data-menu-wrap">
            <Button
              variant="ghost"
              className="save-data-button"
              ref={dataMenuButtonRef}
              aria-label={copy.backupAria}
              onClick={() => setDataMenuOpen((current) => !current)}
              aria-expanded={dataMenuOpen}
              aria-haspopup="dialog"
            >
              <HardDrive />{copy.backup}<ChevronDown />
            </Button>
            {dataMenuOpen ? (
              <div className="save-data-menu" role="dialog" aria-label={copy.backupDialogAria}>
                <div className="save-data-summary">
                  <span className="save-data-icon"><Bookmark /></span>
                  <div>
                    <strong>{copy.savedOnDevice}</strong>
                    <span>{copy.noAccount}</span>
                  </div>
                </div>
                <div className="save-data-counts">
                  <div><strong>{savedRecords.size}</strong><span>{copy.totalSaved}</span></div>
                  <div><strong>{activeSavedCount}</strong><span>{copy.inLiveFeed}</span></div>
                </div>
                <div className="save-data-actions">
                  <Button variant="outline" onClick={exportSavedEvents}><Download />{copy.exportJson}</Button>
                  <Button variant="outline" onClick={() => importFileRef.current?.click()}><Upload />{copy.importJson}</Button>
                  <input
                    ref={importFileRef}
                    className="visually-hidden"
                    type="file"
                    accept="application/json,.json"
                    onChange={importSavedEvents}
                    tabIndex="-1"
                    aria-hidden="true"
                  />
                </div>
                {archivedSavedRecords.length ? (
                  <div className="save-data-archive">
                    <span>{copy.savedArchive}</span>
                    <ul>
                      {archivedSavedRecords.slice(0, 3).map((record) => <li key={record.eventId}>{record.title}</li>)}
                    </ul>
                    {archivedSavedRecords.length > 3 ? <small>{copy.moreInExport(archivedSavedRecords.length - 3)}</small> : null}
                  </div>
                ) : null}
                <p className={storageIssue ? "save-data-status error" : "save-data-status"} role={storageIssue ? "alert" : "status"}>
                  {storageIssue || copy.backupHint}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      <div id="dashboard" className="dashboard-shell">
        <header className="dashboard-heading">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 ref={headingRef} tabIndex="-1">{copy.heading}</h1>
            <div className="view-toggle" aria-label={copy.dashboardView}>
              <Button variant="ghost" className={view === "deck" ? "active" : ""} onClick={() => setView("deck")} aria-pressed={view === "deck"}>{copy.deck}</Button>
              <Button variant="ghost" className={view === "runway" ? "active" : ""} onClick={() => setView("runway")} aria-pressed={view === "runway"}>{copy.runway}</Button>
            </div>
          </div>
          <div className="result-actions">
            <span aria-live="polite">{copy.results(filteredEvents.length)}</span>
            <Button variant="outline" onClick={resetFilters}>{copy.reset} <RotateCcw /></Button>
          </div>
        </header>

        <section className="sponsor-radar" aria-label={copy.sponsorSourcesAria}>
          <div className="radar-summary">
            <div><Sparkles aria-hidden="true" /><span><strong>{copy.sponsorRadar}</strong>{copy.monitoredSources(feedMeta.sourceCount)}</span></div>
          </div>
          <div className="sponsor-strip">
            {monitoredSponsors.map((name) => (
              <button
                type="button"
                className={`sponsor-chip ${sponsorCounts[name] ? "has-events" : ""} ${searchQuery.trim().toLowerCase() === name.toLowerCase() ? "selected" : ""}`}
                key={name}
                onClick={() => setSearchQuery((current) => current.trim().toLowerCase() === name.toLowerCase() ? "" : name)}
                aria-pressed={searchQuery.trim().toLowerCase() === name.toLowerCase()}
                aria-label={copy.sponsorFilterAria(name, sponsorCounts[name])}
              >
                {name}<small>{sponsorCounts[name] || copy.watch}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="filter-zone" aria-label={copy.filtersAria}>
          <div className="filter-toolbar">
            <CompactSelect label={copy.labels.host} value={compactHostValue} options={hostOptions} onValueChange={(value) => setMultiFromCompact("hostTypes", value, filterOptions.hostTypes)} active={filters.hostTypes.length !== filterOptions.hostTypes.length} />
            <CompactSelect label={copy.labels.location} value={compactCountryValue} options={countryOptions} onValueChange={(value) => setMultiFromCompact("countries", value, filterOptions.countries)} active={filters.countries.length !== filterOptions.countries.length} />
            <CompactSelect label={copy.labels.remote} value={compactRemoteValue} options={remoteOptions} onValueChange={(value) => setMultiFromCompact("remoteModes", value, ALL_REMOTE_MODES)} active={filters.remoteModes.length !== ALL_REMOTE_MODES.length} />
            <CompactSelect label={copy.labels.eventDate} value={filters.dateWindow} options={["30", "60", "90", "180", "any"].map((value) => ({ value, label: copy.dateWindows[value] }))} onValueChange={(value) => patchFilter("dateWindow", value)} active={filters.dateWindow !== "any"} />
            <CompactSelect label={copy.labels.deadline} value={filters.deadlineWindow} options={["any", "7", "30"].map((value) => ({ value, label: copy.deadlineWindows[value] }))} onValueChange={(value) => patchFilter("deadlineWindow", value)} active={filters.deadlineWindow !== "any"} />
            <CompactSelect label={copy.labels.prize} value={filters.minPrize} options={filterOptions.prizePools.map((option) => ({ value: String(option.min), label: option.min === 0 ? copy.anyPrize : option.label }))} onValueChange={(value) => patchFilter("minPrize", value)} active={filters.minPrize !== "0"} />
            <CompactSelect label={copy.labels.eligibility} value={filters.eligibility} options={[{ value: "all", label: copy.allBuilders }, ...filterOptions.eligibility.map((value) => ({ value, label: copy.eligibility[value] || value }))]} onValueChange={(value) => patchFilter("eligibility", value)} active={filters.eligibility !== "all"} />
            <CompactSelect label={copy.labels.format} value={filters.format} options={[{ value: "all", label: copy.allFormats }, ...filterOptions.formats.map((value) => ({ value, label: copy.formats[value] || value }))]} onValueChange={(value) => patchFilter("format", value)} active={filters.format !== "all"} />
            <CompactSelect label={copy.labels.status} value={compactStatusValue} options={statusOptions} onValueChange={(value) => setMultiFromCompact("statuses", value, filterOptions.statuses)} active={filters.statuses.length !== filterOptions.statuses.length} />
            <Button variant="outline" className="all-filters-button" onClick={() => setAllFiltersOpen((current) => !current)} aria-expanded={allFiltersOpen}>
              {copy.allFilters} <SlidersHorizontal /><ChevronDown className={allFiltersOpen ? "rotated" : ""} />
            </Button>
          </div>

          {allFiltersOpen ? (
            <div className="filter-shelf">
              <FilterGroup title={copy.labels.host}>
                {filterOptions.hostTypes.map((value) => <FilterCheckbox key={value} id={`host-${value}`} checked={filters.hostTypes.includes(value)} onCheckedChange={() => toggleFilterValue("hostTypes", value, filterOptions.hostTypes)}>{copy.hostTypes[value] || value}</FilterCheckbox>)}
              </FilterGroup>
              <FilterGroup title={copy.labels.location}>
                {filterOptions.countries.map((value) => <FilterCheckbox key={value} id={`country-${value}`} checked={filters.countries.includes(value)} onCheckedChange={() => toggleFilterValue("countries", value, filterOptions.countries)}>{copy.countries[value] || value}</FilterCheckbox>)}
              </FilterGroup>
              <FilterGroup title={copy.labels.remote} className="remote-filter-group">
                <FilterCheckbox id="remote-yes" checked={filters.remoteModes.includes("remote")} onCheckedChange={() => toggleFilterValue("remoteModes", "remote", ALL_REMOTE_MODES)}>{copy.remoteModes.remote}</FilterCheckbox>
                <FilterCheckbox id="remote-no" checked={filters.remoteModes.includes("in-person")} onCheckedChange={() => toggleFilterValue("remoteModes", "in-person", ALL_REMOTE_MODES)}>{copy.remoteModes["in-person"]}</FilterCheckbox>
              </FilterGroup>
              <FilterGroup title={copy.labels.eventDate}>
                <Select value={filters.dateWindow} onValueChange={(value) => patchFilter("dateWindow", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["30", "60", "90", "180", "any"].map((value) => <SelectItem key={value} value={value}>{copy.dateWindows[value]}</SelectItem>)}</SelectContent>
                </Select>
              </FilterGroup>
              <FilterGroup title={copy.labels.deadline}>
                <Select value={filters.deadlineWindow} onValueChange={(value) => patchFilter("deadlineWindow", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["any", "7", "30"].map((value) => <SelectItem key={value} value={value}>{copy.deadlineWindows[value]}</SelectItem>)}</SelectContent>
                </Select>
              </FilterGroup>
              <FilterGroup title={copy.labels.prize}>
                <Select value={filters.minPrize} onValueChange={(value) => patchFilter("minPrize", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{filterOptions.prizePools.map((option) => <SelectItem key={option.min} value={String(option.min)}>{option.min === 0 ? copy.anyPrize : option.label}</SelectItem>)}</SelectContent>
                </Select>
              </FilterGroup>
              <FilterGroup title={copy.labels.eligibility}>
                <Select value={filters.eligibility} onValueChange={(value) => patchFilter("eligibility", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{copy.allBuilders}</SelectItem>{filterOptions.eligibility.map((value) => <SelectItem key={value} value={value}>{copy.eligibility[value] || value}</SelectItem>)}</SelectContent>
                </Select>
              </FilterGroup>
              <FilterGroup title={copy.labels.format}>
                <Select value={filters.format} onValueChange={(value) => patchFilter("format", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{copy.allFormats}</SelectItem>{filterOptions.formats.map((value) => <SelectItem key={value} value={value}>{copy.formats[value] || value}</SelectItem>)}</SelectContent>
                </Select>
              </FilterGroup>
              <FilterGroup title={copy.labels.status}>
                {filterOptions.statuses.map((value) => <FilterCheckbox key={value} id={`status-${value}`} checked={filters.statuses.includes(value)} onCheckedChange={() => toggleFilterValue("statuses", value, filterOptions.statuses)}>{copy.statuses[value] || value}</FilterCheckbox>)}
              </FilterGroup>
              <div className="filter-shelf-actions">
                <Button variant="ghost" onClick={resetFilters}>{copy.reset} <RotateCcw /></Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className={`event-workspace ${view}-view ${detailOpen && selectedEvent ? "has-detail" : "detail-closed"}`} aria-label={copy.resultsAria}>
          <div className="cards-viewport">
            {filteredEvents.length ? (
              view === "runway" ? (
                <div className="runway-surface">
                  <div
                    className={`runway-scroll-shell ${runwayDragging ? "is-dragging" : ""}`}
                    ref={runwayScrollRef}
                    tabIndex="0"
                    role="region"
                    aria-label={copy.fullRunwayAria(filteredEvents.length)}
                    onPointerDown={startRunwayDrag}
                    onPointerMove={moveRunwayDrag}
                    onPointerUp={endRunwayDrag}
                    onPointerCancel={endRunwayDrag}
                    onKeyDown={handleRunwayKeyDown}
                  >
                    <div className="runway-scroll-content">
                      <Timeline timelineEvents={filteredEvents} selectedId={selectedEvent?.id} copy={copy} language={language} />
                      <div className="runway-drag-hint" aria-hidden="true">
                        <MoveHorizontal />
                        <span>{copy.dragHint}</span>
                        <small>{copy.verifiedNoCutoff(filteredEvents.length)}</small>
                      </div>
                      <div className="runway-cards">
                        {filteredEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            selected={event.id === selectedEvent?.id}
                            saved={savedRecords.has(event.id)}
                            onSelect={() => handleSelect(event.id)}
                            onSave={() => toggleSaved(event)}
                            onView={() => handleView(event)}
                            copy={copy}
                            language={language}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="deck-grid">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      selected={event.id === selectedEvent?.id}
                      saved={savedRecords.has(event.id)}
                      onSelect={() => handleSelect(event.id)}
                      onSave={() => toggleSaved(event)}
                      onView={() => handleView(event)}
                      copy={copy}
                      language={language}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="empty-state">
                <Filter />
                <h2>{copy.emptyTitle}</h2>
                <p>{copy.emptyDescription}</p>
                <Button onClick={resetFilters}>{copy.resetFilters}</Button>
              </div>
            )}
          </div>

          {detailOpen && selectedEvent ? (
            <DetailRail
              event={selectedEvent}
              saved={savedRecords.has(selectedEvent.id)}
              onClose={closeDetails}
              onSave={() => toggleSaved(selectedEvent)}
              onView={() => handleView(selectedEvent)}
              copy={copy}
              language={language}
            />
          ) : null}
        </section>
      </div>

      {notice ? <div className="notice-toast" role="status"><Check />{notice}</div> : null}
    </main>
  )
}

export function App() {
  const [showTracker, setShowTracker] = useState(() => window.location.hash === "#dashboard")
  const [language, setLanguage] = useState(() => {
    try {
      const stored = window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)
      return LANDING_COPY[stored] ? stored : "en"
    } catch {
      return "en"
    }
  })

  useEffect(() => {
    document.documentElement.classList.add("dark")
    return () => document.documentElement.classList.remove("dark")
  }, [])

  useEffect(() => {
    document.documentElement.lang = LANGUAGE_LOCALES[language] || LANGUAGE_LOCALES.en
    try {
      window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Language preference is optional; both public screens remain fully usable.
    }
  }, [language])

  useEffect(() => {
    const syncScreenWithHash = () => setShowTracker(window.location.hash === "#dashboard")
    window.addEventListener("hashchange", syncScreenWithHash)
    return () => window.removeEventListener("hashchange", syncScreenWithHash)
  }, [])

  function enterTracker() {
    if (window.location.hash !== "#dashboard") window.location.hash = "dashboard"
    setShowTracker(true)
  }

  return showTracker
    ? <Tracker language={language} onLanguageChange={setLanguage} />
    : <LandingPage onStart={enterTracker} language={language} onLanguageChange={setLanguage} />
}
