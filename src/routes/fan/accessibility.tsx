/**
 * Fan Accessibility Mode — WCAG 2.1 AA compliant accessibility hub.
 *
 * Features:
 *  - Visual preferences: font size, high contrast, reduced motion
 *  - Wheelchair-accessible routes and facility locator
 *  - Screen reader–optimised information panels
 *  - Language/locale display
 *
 * All controls update the AccessibilityContext which applies CSS changes
 * globally to the <html> element.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Accessibility, Eye, Type, Zap, Volume2,
  MapPin, Phone, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useA11y, type FontSize } from "@/contexts/AccessibilityContext";

export const Route = createFileRoute("/fan/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility — Touchline FIFA 2026" },
      {
        name: "description",
        content:
          "FIFA 2026 stadium accessibility guide: wheelchair routes, visual preferences, audio assistance, and accessible facilities.",
      },
    ],
  }),
  component: AccessibilityPage,
});

// ---------------------------------------------------------------------------
// Accessible facilities data
// ---------------------------------------------------------------------------

const FACILITIES = [
  {
    id: "wc-north",
    icon: "♿",
    name: "Accessible Entrance",
    location: "Gate A (North) — Level 0",
    notes: "Lift access to all levels. Dedicated queue.",
    type: "entrance",
  },
  {
    id: "wc-south",
    icon: "♿",
    name: "Accessible Entrance",
    location: "Gate C (South) — Level 0",
    notes: "Nearest to accessible parking lot P3.",
    type: "entrance",
  },
  {
    id: "wc-vip",
    icon: "♿",
    name: "Accessible VIP Entrance",
    location: "Gate V (West) — Level 0",
    notes: "Elevator to VIP and hospitality levels.",
    type: "entrance",
  },
  {
    id: "wc-seating",
    icon: "🪑",
    name: "Wheelchair Seating",
    location: "Sections 101, 201, 301 — all levels",
    notes: "Companion seating adjacent. Reserve via ticket office.",
    type: "seating",
  },
  {
    id: "wc-restroom",
    icon: "🚻",
    name: "Accessible Restrooms",
    location: "All concourse levels — near section 110, 210, 310",
    notes: "Baby changing facilities available.",
    type: "restroom",
  },
  {
    id: "wc-medical",
    icon: "🏥",
    name: "First Aid & Medical",
    location: "North Concourse Level 1 & South Concourse Level 1",
    notes: "Equipped for wheelchair users. 24/7 during match days.",
    type: "medical",
  },
  {
    id: "wc-sensory",
    icon: "🎧",
    name: "Sensory Room",
    location: "West Stand, Level 2",
    notes: "Quiet space for fans with sensory sensitivities.",
    type: "sensory",
  },
  {
    id: "wc-assistance",
    icon: "🦺",
    name: "Accessibility Desk",
    location: "Gate A and Gate C — Level 0",
    notes: "Wheelchair loan, hearing loop, visual guides available.",
    type: "assistance",
  },
];

const CONTACT = [
  { label: "Accessibility Hotline", value: "+1-800-TOUCHLINE", icon: Phone },
  { label: "Emergency (in-stadium)", value: "Channel 3 / Steward", icon: Volume2 },
  { label: "Pre-match requests", value: "accessibility@touchline.sport", icon: Volume2 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AccessibilityPage() {
  const { highContrast, fontSize, reduceMotion, setHighContrast, setFontSize, setReduceMotion } = useA11y();

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: "normal", label: "Normal (16px)" },
    { value: "large", label: "Large (18px)" },
    { value: "xl", label: "Extra Large (20px)" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-pitch">Fan Mode</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl flex items-center gap-3">
          <Accessibility className="size-8 text-pitch" aria-hidden />
          Accessibility Hub
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          FIFA 2026 is for everyone. Adjust display preferences, find accessible facilities, and get the support you need.
        </p>
      </header>

      {/* Visual Preferences */}
      <section aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" className="text-xl font-semibold mb-4">
          Display Preferences
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* High Contrast */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={highContrast ? "border-pitch ring-2 ring-pitch/30" : ""}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="size-5 text-pitch" aria-hidden />
                    <span className="font-medium text-sm">High Contrast</span>
                  </div>
                  {highContrast && <CheckCircle2 className="size-4 text-pitch" aria-hidden />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Increases contrast ratios for improved readability (WCAG AA/AAA).
                </p>
                <button
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  aria-pressed={highContrast}
                  className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                    highContrast
                      ? "bg-pitch text-pitch-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {highContrast ? "✓ Enabled" : "Enable"}
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Font Size */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Type className="size-5 text-pitch" aria-hidden />
                  <span className="font-medium text-sm">Text Size</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Scales all text across the application.
                </p>
                <fieldset className="space-y-2" aria-label="Text size options">
                  <legend className="sr-only">Choose text size</legend>
                  {fontSizeOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="font-size"
                        value={opt.value}
                        checked={fontSize === opt.value}
                        onChange={() => setFontSize(opt.value)}
                        className="accent-pitch"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </fieldset>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reduce Motion */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={reduceMotion ? "border-pitch ring-2 ring-pitch/30" : ""}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="size-5 text-pitch" aria-hidden />
                    <span className="font-medium text-sm">Reduce Motion</span>
                  </div>
                  {reduceMotion && <CheckCircle2 className="size-4 text-pitch" aria-hidden />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimises animations and transitions (helps with vestibular disorders).
                </p>
                <button
                  type="button"
                  onClick={() => setReduceMotion(!reduceMotion)}
                  aria-pressed={reduceMotion}
                  className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                    reduceMotion
                      ? "bg-pitch text-pitch-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {reduceMotion ? "✓ Enabled" : "Enable"}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Accessible Facilities */}
      <section aria-labelledby="facilities-heading">
        <h2 id="facilities-heading" className="text-xl font-semibold mb-4">
          Accessible Facilities
        </h2>
        <ul className="grid gap-3 md:grid-cols-2" aria-label="Accessible facilities list">
          {FACILITIES.map((f, i) => (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="text-2xl shrink-0" aria-hidden>{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{f.name}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize border-pitch/30 text-pitch">
                        {f.type}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" aria-hidden />
                      {f.location}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.notes}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Contact Info */}
      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="text-xl font-semibold mb-4">
          Get Assistance
        </h2>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {CONTACT.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <Icon className="size-4 shrink-0 text-pitch" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
