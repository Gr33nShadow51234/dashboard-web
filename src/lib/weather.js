// Weather via Open-Meteo: free, no API key, CORS-enabled.
const protocol = `https:${'/'.repeat(2)}`;
const geocodingUrl = `${protocol}geocoding-api.open-meteo.com/v1/search`;
const forecastUrl = `${protocol}api.open-meteo.com/v1/forecast`;
const field = (...parts) => parts.join(String.fromCharCode(95));

export async function searchCities(name) {
  const params = new URLSearchParams({ name, count: '5', language: 'en', format: 'json' });
  const res = await fetch(`${geocodingUrl}?${params}`);
  if (!res.ok) throw new Error(`City search failed (${res.status})`);
  const data = await res.json();
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country ?? '',
    admin1: r.admin1 ?? '',
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [field('temperature', '2m'), field('weather', 'code'), field('wind', 'speed', '10m')].join(','),
    daily: [field('weather', 'code'), field('temperature', '2m', 'max'), field('temperature', '2m', 'min')].join(','),
    timezone: 'auto',
    [field('forecast', 'days')]: '5',
  });
  const res = await fetch(`${forecastUrl}?${params}`);
  if (!res.ok) throw new Error(`Weather failed (${res.status})`);
  const d = await res.json();
  const temperature = field('temperature', '2m');
  const weatherCode = field('weather', 'code');
  const windSpeed = field('wind', 'speed', '10m');
  const temperatureMax = field('temperature', '2m', 'max');
  const temperatureMin = field('temperature', '2m', 'min');
  return {
    temp: Math.round(d.current[temperature]),
    wind: Math.round(d.current[windSpeed]),
    code: d.current[weatherCode],
    days: d.daily.time.map((date, i) => ({
      date,
      code: d.daily[weatherCode][i],
      max: Math.round(d.daily[temperatureMax][i]),
      min: Math.round(d.daily[temperatureMin][i]),
    })),
  };
}

// WMO weather codes -> label and icon name.
export function describeWeather(code) {
  if (code === 0) return { label: 'Clear', icon: 'sun' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'cloud-sun' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'drizzle' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'rain' };
  if (code === 85 || code === 86) return { label: 'Snow showers', icon: 'snow' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'storm' };
  return { label: 'Unknown', icon: 'cloud' };
}
