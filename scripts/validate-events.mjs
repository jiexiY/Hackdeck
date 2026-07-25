import {
  events,
  feedMeta,
  filterOptions,
  monitoredSponsors,
  REFERENCE_DATE,
  sourceCatalog,
} from "../src/data/events.js"

const errors = []
const requireValue = (condition, message) => {
  if (!condition) errors.push(message)
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const requiredFields = [
  "id",
  "title",
  "host",
  "hostType",
  "location",
  "country",
  "startDate",
  "endDate",
  "prizeLabel",
  "eligibility",
  "teamSize",
  "format",
  "status",
  "tagline",
  "about",
  "buildPrompt",
  "url",
]

requireValue(events.length >= 20, "The verified catalog should contain at least 20 live or upcoming events.")
requireValue(new Set(events.map((event) => event.id)).size === events.length, "Event ids must be unique.")
requireValue(new Set(events.map((event) => event.url)).size === events.length, "Event source URLs must be unique.")
requireValue(sourceCatalog.length === feedMeta.sourceCount, "feedMeta.sourceCount must match sourceCatalog.")
requireValue(feedMeta.cadenceMinutes === 30, "The feed refresh cadence must remain 30 minutes.")
requireValue(!Number.isNaN(Date.parse(feedMeta.lastFetchedAt)), "feedMeta.lastFetchedAt must be a valid timestamp.")
requireValue(isoDatePattern.test(REFERENCE_DATE), "REFERENCE_DATE must resolve to YYYY-MM-DD.")

const requestedSponsors = ["OpenAI", "Anthropic", "Google", "Meta", "Cursor", "Lovable"]
for (const sponsor of requestedSponsors) {
  requireValue(monitoredSponsors.includes(sponsor), `Sponsor radar is missing ${sponsor}.`)
}

for (const event of events) {
  for (const field of requiredFields) {
    requireValue(event[field] !== undefined && event[field] !== null && event[field] !== "", `${event.id || "Unknown event"} is missing ${field}.`)
  }

  requireValue(event.verified === true, `${event.id} must be verified before it is exported.`)
  requireValue(["Official", "Community"].includes(event.sourceType || "Official"), `${event.id} has an invalid source type.`)
  requireValue(/^https:\/\//.test(event.url), `${event.id} must link to an HTTPS source.`)
  requireValue(!/example\.com/i.test(event.url), `${event.id} contains a placeholder URL.`)
  requireValue(isoDatePattern.test(event.startDate), `${event.id} has an invalid start date.`)
  requireValue(isoDatePattern.test(event.endDate), `${event.id} has an invalid end date.`)
  requireValue(event.endDate >= event.startDate, `${event.id} ends before it starts.`)
  requireValue(event.endDate >= REFERENCE_DATE, `${event.id} has ended and should be archived.`)
  requireValue(event.deadline === null || isoDatePattern.test(event.deadline), `${event.id} has an invalid deadline.`)
  requireValue(Number.isFinite(event.prizePool) && event.prizePool >= 0, `${event.id} has an invalid prize pool.`)
  requireValue(filterOptions.hostTypes.includes(event.hostType), `${event.id} has an unsupported host type.`)
  requireValue(filterOptions.formats.includes(event.format), `${event.id} has an unsupported format.`)
  requireValue(filterOptions.statuses.includes(event.status), `${event.id} has an unsupported status.`)
  requireValue(filterOptions.eligibility.includes(event.eligibility), `${event.id} has unsupported eligibility.`)

  const countries = event.countries || [event.country]
  requireValue(countries.length > 0, `${event.id} must include at least one location scope.`)
  for (const country of countries) {
    requireValue(filterOptions.countries.includes(country), `${event.id} has unsupported country scope ${country}.`)
  }
}

for (const source of sourceCatalog) {
  requireValue(source.name && /^https:\/\//.test(source.url), "Every monitored source needs a name and HTTPS URL.")
}

if (errors.length) {
  console.error(`Event catalog validation failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Validated ${events.length} events, ${sourceCatalog.length} monitored sources, and a ${feedMeta.cadenceMinutes}-minute cadence.`)
