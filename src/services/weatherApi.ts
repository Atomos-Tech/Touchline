/**
 * Open-Meteo Weather Service
 *
 * Uses the Open-Meteo API (https://open-meteo.com/) — completely free,
 * no API key required, updates every 15 minutes.
 *
 * Provides real current weather for all 16 FIFA 2026 host stadiums.
 *
 * TEST MOUNTING POINT: wmoCodeToCondition, formatTemperature, fetchStadiumWeather
 * are independently testable. Mock fetch() in unit tests.
 */

export interface StadiumWeather {
  stadiumId: string;
  temperature: number; // °C
  feelsLike: number;   // °C
  humidity: number;    // %
  windSpeed: number;   // km/h
  precipitation: number; // mm
  conditionCode: number; // WMO code
  conditionLabel: string;
  conditionEmoji: string;
  isDaytime: boolean;
  fetchedAt: string; // ISO
}

// ---------------------------------------------------------------------------
// Stadium coordinates — FIFA 2026 host venues
// ---------------------------------------------------------------------------

export const STADIUM_COORDS: Record<
  string,
  { lat: number; lon: number; timezone: string; city: string; name: string }
> = {
  "1":  { lat: 40.8135,  lon: -74.0745,   timezone: "America/New_York",    city: "East Rutherford, NJ", name: "MetLife Stadium" },
  "2":  { lat: 33.9535,  lon: -118.3390,  timezone: "America/Los_Angeles", city: "Inglewood, CA",        name: "SoFi Stadium" },
  "3":  { lat: 32.7473,  lon: -97.0944,   timezone: "America/Chicago",     city: "Arlington, TX",        name: "AT&T Stadium" },
  "4":  { lat: 19.3029,  lon: -99.1506,   timezone: "America/Mexico_City", city: "Mexico City, MX",      name: "Estadio Azteca" },
  "5":  { lat: 43.6333,  lon: -79.4167,   timezone: "America/Toronto",     city: "Toronto, ON",          name: "BMO Field" },
  "6":  { lat: 33.7553,  lon: -84.4006,   timezone: "America/New_York",    city: "Atlanta, GA",          name: "Mercedes-Benz Stadium" },
  "7":  { lat: 37.4032,  lon: -121.9698,  timezone: "America/Los_Angeles", city: "Santa Clara, CA",      name: "Levi's Stadium" },
  "8":  { lat: 34.1614,  lon: -118.1676,  timezone: "America/Los_Angeles", city: "Pasadena, CA",         name: "Rose Bowl" },
  "9":  { lat: 42.0909,  lon: -71.2643,   timezone: "America/New_York",    city: "Foxborough, MA",       name: "Gillette Stadium" },
  "10": { lat: 25.9580,  lon: -80.2389,   timezone: "America/New_York",    city: "Miami Gardens, FL",    name: "Hard Rock Stadium" },
  "11": { lat: 39.0489,  lon: -94.4839,   timezone: "America/Chicago",     city: "Kansas City, MO",      name: "Arrowhead Stadium" },
  "12": { lat: 49.2767,  lon: -123.1115,  timezone: "America/Vancouver",   city: "Vancouver, BC",        name: "BC Place" },
  "13": { lat: 36.0909,  lon: -115.1833,  timezone: "America/Los_Angeles", city: "Las Vegas, NV",        name: "Allegiant Stadium" },
  "14": { lat: 29.6847,  lon: -95.4107,   timezone: "America/Chicago",     city: "Houston, TX",          name: "NRG Stadium" },
  "15": { lat: 39.9008,  lon: -75.1675,   timezone: "America/New_York",    city: "Philadelphia, PA",     name: "Lincoln Financial Field" },
  "16": { lat: 30.3872,  lon: -97.7192,   timezone: "America/Chicago",     city: "Austin, TX",           name: "Q2 Stadium" },
};

// ---------------------------------------------------------------------------
// WMO Weather Interpretation Codes → emoji + label
// https://open-meteo.com/en/docs#weathervariables
// TEST MOUNTING POINT: pure lookup table, parameterize in tests
// ---------------------------------------------------------------------------

interface WeatherCondition {
  emoji: string;
  label: string;
}

/**
 * Map WMO weather code to a human-readable label and emoji.
 * TEST MOUNTING POINT: pure function — exhaustive mapping test recommended.
 */
export function wmoCodeToCondition(code: number): WeatherCondition {
  if (code === 0)  return { emoji: "☀️",  label: "Clear sky" };
  if (code === 1)  return { emoji: "🌤️",  label: "Mainly clear" };
  if (code === 2)  return { emoji: "⛅",  label: "Partly cloudy" };
  if (code === 3)  return { emoji: "☁️",  label: "Overcast" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Fog" };
  if (code >= 51 && code <= 55)  return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 56 && code <= 57)  return { emoji: "🌨️", label: "Freezing drizzle" };
  if (code >= 61 && code <= 63)  return { emoji: "🌧️", label: "Rain" };
  if (code === 65) return { emoji: "🌧️", label: "Heavy rain" };
  if (code >= 66 && code <= 67)  return { emoji: "🌨️", label: "Freezing rain" };
  if (code >= 71 && code <= 75)  return { emoji: "❄️",  label: "Snow" };
  if (code === 77) return { emoji: "🌨️", label: "Snow grains" };
  if (code >= 80 && code <= 82)  return { emoji: "🌦️", label: "Rain showers" };
  if (code >= 83 && code <= 84)  return { emoji: "🌨️", label: "Snow showers" };
  if (code === 85 || code === 86) return { emoji: "❄️", label: "Heavy snow showers" };
  if (code === 95) return { emoji: "⛈️",  label: "Thunderstorm" };
  if (code >= 96 && code <= 99)  return { emoji: "⛈️",  label: "Thunderstorm w/ hail" };
  return { emoji: "🌡️", label: "Unknown" };
}

// ---------------------------------------------------------------------------
// In-memory cache: stadiumId → { data, fetchedAt }
// ---------------------------------------------------------------------------

const _cache = new Map<string, { data: StadiumWeather; ts: number }>();
const CACHE_TTL = 10 * 60_000; // 10 minutes (Open-Meteo updates every 15 min)

/**
 * Fetch current weather for a single stadium by its FIFA API stadium_id.
 * Results are cached for 10 minutes to avoid hammering the API.
 * Falls back gracefully if the network call fails.
 *
 * TEST MOUNTING POINT: mock global fetch; verify cache hit avoids second call.
 */
export async function fetchStadiumWeather(
  stadiumId: string,
): Promise<StadiumWeather | null> {
  const now = Date.now();
  const cached = _cache.get(stadiumId);
  if (cached && now - cached.ts < CACHE_TTL) return cached.data;

  const venue = STADIUM_COORDS[stadiumId];
  if (!venue) return null;

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(venue.lat));
    url.searchParams.set("longitude", String(venue.lon));
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,precipitation,is_day",
    );
    url.searchParams.set("timezone", venue.timezone);
    url.searchParams.set("wind_speed_unit", "kmh");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);

    const json = (await res.json()) as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        weather_code: number;
        wind_speed_10m: number;
        relative_humidity_2m: number;
        precipitation: number;
        is_day: 0 | 1;
      };
    };

    const c = json.current;
    const cond = wmoCodeToCondition(c.weather_code);

    const data: StadiumWeather = {
      stadiumId,
      temperature: Math.round(c.temperature_2m * 10) / 10,
      feelsLike: Math.round(c.apparent_temperature * 10) / 10,
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      precipitation: c.precipitation,
      conditionCode: c.weather_code,
      conditionLabel: cond.label,
      conditionEmoji: cond.emoji,
      isDaytime: c.is_day === 1,
      fetchedAt: new Date().toISOString(),
    };

    _cache.set(stadiumId, { data, ts: now });
    return data;
  } catch (err) {
    console.error(`[weatherApi] fetch failed for stadium ${stadiumId}:`, err);
    return cached?.data ?? null; // return stale cache if available
  }
}

/**
 * Batch-fetch weather for multiple stadiums in parallel.
 * Returns a map of stadiumId → StadiumWeather.
 */
export async function fetchWeatherForStadiums(
  stadiumIds: string[],
): Promise<Map<string, StadiumWeather>> {
  const unique = [...new Set(stadiumIds)];
  const results = await Promise.allSettled(
    unique.map((id) => fetchStadiumWeather(id)),
  );

  const map = new Map<string, StadiumWeather>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      map.set(unique[i], r.value);
    }
  });
  return map;
}
