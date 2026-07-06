/**
 * WeatherBadge — shows real current weather for a FIFA 2026 stadium venue.
 *
 * Fetches from Open-Meteo (free, no API key) via useStadiumWeather hook.
 * Updates every 10 minutes automatically.
 */
import { Wind, Droplets, Thermometer } from "lucide-react";
import { useStadiumWeather } from "@/hooks/useStadiumWeather";
import { STADIUM_COORDS } from "@/services/weatherApi";

interface WeatherBadgeProps {
  stadiumId: string;
  /** Whether to show expanded details (temp + humidity + wind) or compact (emoji + temp only) */
  compact?: boolean;
}

export function WeatherBadge({ stadiumId, compact = false }: WeatherBadgeProps) {
  const { data: weather, isLoading } = useStadiumWeather(stadiumId);
  const venue = STADIUM_COORDS[stadiumId];

  if (isLoading) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground animate-pulse"
        aria-label="Loading weather"
      >
        <span className="size-3 rounded-full bg-muted-foreground/30" />
        Weather loading…
      </span>
    );
  }

  if (!weather) return null;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground"
        aria-label={`Weather: ${weather.conditionLabel}, ${weather.temperature}°C`}
        title={`${weather.conditionLabel} · Feels like ${weather.feelsLike}°C · Humidity ${weather.humidity}% · Wind ${weather.windSpeed} km/h`}
      >
        <span aria-hidden>{weather.conditionEmoji}</span>
        <span className="tabular-nums">{weather.temperature}°C</span>
        {weather.precipitation > 0 && (
          <span className="text-sky-500 tabular-nums">{weather.precipitation}mm</span>
        )}
      </span>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs"
      aria-label={`Weather at ${venue?.name ?? "venue"}: ${weather.conditionLabel}, ${weather.temperature}°C`}
    >
      {/* Condition */}
      <span className="flex items-center gap-1.5 font-medium">
        <span className="text-base" aria-hidden>{weather.conditionEmoji}</span>
        <span>{weather.conditionLabel}</span>
      </span>

      {/* Temperature */}
      <span
        className="flex items-center gap-1 text-muted-foreground"
        title="Temperature / feels like"
      >
        <Thermometer className="size-3" aria-hidden />
        <span className="tabular-nums font-semibold text-foreground">{weather.temperature}°C</span>
        <span className="opacity-60">/ feels {weather.feelsLike}°C</span>
      </span>

      {/* Humidity */}
      <span
        className="flex items-center gap-1 text-muted-foreground"
        title="Relative humidity"
      >
        <Droplets className="size-3 text-sky-400" aria-hidden />
        <span className="tabular-nums">{weather.humidity}%</span>
      </span>

      {/* Wind */}
      <span
        className="flex items-center gap-1 text-muted-foreground"
        title="Wind speed"
      >
        <Wind className="size-3 text-slate-400" aria-hidden />
        <span className="tabular-nums">{weather.windSpeed} km/h</span>
      </span>

      {/* Rain */}
      {weather.precipitation > 0 && (
        <span className="flex items-center gap-1 text-sky-500 font-medium">
          🌧️ {weather.precipitation}mm
        </span>
      )}

      {/* City */}
      {venue && (
        <span className="ml-auto text-[10px] text-muted-foreground/60 italic">
          {venue.city}
        </span>
      )}
    </div>
  );
}
