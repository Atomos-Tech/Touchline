/**
 * Volunteer Shifts — personal shift schedule and check-in/out.
 *
 * Displays the volunteer's shift schedule for match day.
 * Check-in/out times are tracked in component state (would persist to API).
 *
 * TEST MOUNTING POINT: formatShiftTime, getShiftStatus are pure functions.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle2, MapPin, User, Coffee } from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/volunteer/shifts")({
  head: () => ({
    meta: [
      { title: "My Shifts — Touchline Volunteer" },
      { name: "description", content: "Personal shift schedule and check-in management for FIFA 2026 volunteers." },
    ],
  }),
  component: ShiftsPage,
});

// ---------------------------------------------------------------------------
// Types and data
// ---------------------------------------------------------------------------

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  location: string;
  supervisor: string;
  notes?: string;
}

/** Pure: format 24h time string. TEST MOUNTING POINT. */
export function formatShiftTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Pure: determine shift status relative to now. TEST MOUNTING POINT. */
export function getShiftStatus(date: string, start: string, end: string): "upcoming" | "active" | "completed" {
  const now = new Date();
  // Use YYYY-MM-DD ISO format which sorts correctly alphabetically
  const todayISO = now.toISOString().split("T")[0];
  const shiftDateISO = new Date(date).toISOString().split("T")[0];

  if (shiftDateISO < todayISO) return "completed";
  if (shiftDateISO > todayISO) return "upcoming";

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (nowMin < startMin) return "upcoming";
  if (nowMin > endMin) return "completed";
  return "active";
}

// Simulated shift schedule
const TODAY = new Date().toISOString().split("T")[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split("T")[0];
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split("T")[0];

const MY_SHIFTS: Shift[] = [
  {
    id: "s1",
    date: YESTERDAY,
    startTime: "16:00",
    endTime: "22:00",
    role: "Gate Marshal",
    location: "Gate A — North Entrance",
    supervisor: "Maria Santos",
    notes: "Oversee fan entry flow and ticket scanning support.",
  },
  {
    id: "s2",
    date: TODAY,
    startTime: "14:00",
    endTime: "21:30",
    role: "Crowd Flow Officer",
    location: "Main Concourse — Levels 1 & 2",
    supervisor: "James Okonkwo",
    notes: "Monitor crowd density, guide fans, coordinate with Operations on radio Ch.2.",
  },
  {
    id: "s3",
    date: TOMORROW,
    startTime: "10:00",
    endTime: "17:00",
    role: "Information Desk",
    location: "Gate C — South Lobby",
    supervisor: "Maria Santos",
    notes: "Fan assistance: navigation, lost items, accessibility queries.",
  },
];

const STATUS_STYLES: Record<string, string> = {
  active: "border-pitch/50 bg-pitch/10",
  upcoming: "border-border",
  completed: "border-border opacity-60",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-pitch/20 text-pitch border-pitch/40",
  upcoming: "bg-muted text-muted-foreground",
  completed: "bg-secondary text-secondary-foreground",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ShiftsPage() {
  const [checkedIn, setCheckedIn] = useState<Record<string, string>>({});
  const [checkedOut, setCheckedOut] = useState<Record<string, string>>({});

  const shifts = useMemo(() =>
    MY_SHIFTS.map((s) => ({
      ...s,
      status: getShiftStatus(s.date, s.startTime, s.endTime),
    })),
    [],
  );

  const activeShift = shifts.find((s) => s.status === "active");
  const totalHours = MY_SHIFTS.reduce((acc, s) => {
    const [sh] = s.startTime.split(":").map(Number);
    const [eh] = s.endTime.split(":").map(Number);
    return acc + (eh - sh);
  }, 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-live">Volunteer Mode</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl flex items-center gap-3">
          <Calendar className="size-8 text-live" aria-hidden />
          My Shift Schedule
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your personal shift assignments for FIFA World Cup 2026 match days.
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{MY_SHIFTS.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-pitch">{totalHours}h</p>
            <p className="text-xs text-muted-foreground mt-1">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-live">{shifts.filter((s) => s.status === "completed").length}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Active shift highlight */}
      {activeShift && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-pitch/50 bg-pitch/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-pitch text-base">
                <span className="live-dot" aria-hidden />
                Active Shift Right Now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{activeShift.role}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="size-3" aria-hidden /> {activeShift.location}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="size-3" aria-hidden />
                    {formatShiftTime(activeShift.startTime)} – {formatShiftTime(activeShift.endTime)}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <User className="size-3" aria-hidden /> Supervisor: {activeShift.supervisor}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {!checkedIn[activeShift.id] ? (
                    <Button
                      size="sm"
                      className="bg-pitch text-pitch-foreground hover:bg-pitch/90"
                      onClick={() => setCheckedIn((p) => ({ ...p, [activeShift.id]: new Date().toLocaleTimeString() }))}
                      id="check-in-btn"
                    >
                      Check In
                    </Button>
                  ) : !checkedOut[activeShift.id] ? (
                    <>
                      <Badge variant="outline" className="text-xs border-pitch/40 text-pitch">
                        <CheckCircle2 className="size-3 mr-1" aria-hidden /> Checked in {checkedIn[activeShift.id]}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-live/40 text-live hover:bg-live/10"
                        onClick={() => setCheckedOut((p) => ({ ...p, [activeShift.id]: new Date().toLocaleTimeString() }))}
                        id="check-out-btn"
                      >
                        Check Out
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-xs border-muted-foreground/30">
                      Completed {checkedOut[activeShift.id]}
                    </Badge>
                  )}
                </div>
              </div>
              {activeShift.notes && (
                <p className="text-sm text-muted-foreground border-t border-pitch/20 pt-3">{activeShift.notes}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* All shifts */}
      <section aria-labelledby="all-shifts-heading">
        <h2 id="all-shifts-heading" className="text-xl font-semibold mb-4">All Shifts</h2>
        <ul className="space-y-3" aria-label="All shift assignments">
          {shifts.map((shift, i) => (
            <motion.li
              key={shift.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={`border ${STATUS_STYLES[shift.status]}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{shift.role}</p>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[shift.status]}`}>
                          {shift.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" aria-hidden />
                        {new Date(shift.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        <Clock className="size-3 ml-2" aria-hidden />
                        {formatShiftTime(shift.startTime)} – {formatShiftTime(shift.endTime)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden /> {shift.location}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="size-3" aria-hidden /> {shift.supervisor}
                      </p>
                    </div>
                    {shift.status === "completed" && (
                      <CheckCircle2 className="size-5 text-pitch shrink-0" aria-hidden />
                    )}
                    {shift.status === "active" && (
                      <Coffee className="size-5 text-pitch shrink-0 animate-pulse" aria-hidden />
                    )}
                  </div>
                  {shift.notes && (
                    <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">{shift.notes}</p>
                  )}
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </ul>
      </section>
    </div>
  );
}
