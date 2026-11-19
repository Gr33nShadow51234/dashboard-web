// Weather via Open-Meteo: free, no API key, CORS-enabled.
const GEO\_URL = '[https://geocoding-api.open-meteo.com/v1/search](https://geocoding-api.open-meteo.com/v1/search)';
const FORECAST\_URL = '[https://api.open-meteo.com/v1/forecast](https://api.open-meteo.com/v1/forecast)';

export async function searchCities(name) {
  const params = new URLSearchParams({ name, count: '5', language: 'en', format: 'json' });
  const res = await fetch(`${GEO_URL}?${params}`);
  if (!res.ok) throw new Error(`City search failed (${res.status})`);
  const data = await res.json();
  return (data.results ?? \[\]).map((r) =&gt; ({
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
    current: 'temperature\_2m,weather\_code,wind\_speed\_10m',
    daily: 'weather\_code,temperature\_2m\_max,temperature\_2m\_min',
    timezone: 'auto',
    forecast\_days: '5',
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error(`Weather failed (${res.status})`);
  const d = await res.json();
  return {
    temp: Math.round(d.current.temperature\_2m),
    wind: Math.round(d.current.wind\_speed\_10m),
    code: d.current.weather\_code,
    days: d.daily.time.map((date, i) =&gt; ({
      date,
      code: d.daily.weather\_code\[i\],
      max: Math.round(d.daily.temperature\_2m\_max\[i\]),
      min: Math.round(d.daily.temperature\_2m\_min\[i\]),
    })),
  };
}

// WMO weather codes -&gt; label and icon name.
export function describeWeather(code) {
  if (code === 0) return { label: 'Clear', icon: 'sun' };
  if (code &lt;= 2) return { label: 'Partly cloudy', icon: 'cloud-sun' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'fog' };
  if (code &gt;= 51 &amp;&amp; code &lt;= 57) return { label: 'Drizzle', icon: 'drizzle' };
  if (code &gt;= 61 &amp;&amp; code &lt;= 67) return { label: 'Rain', icon: 'rain' };
  if (code &gt;= 71 &amp;&amp; code &lt;= 77) return { label: 'Snow', icon: 'snow' };
  if (code &gt;= 80 &amp;&amp; code &lt;= 82) return { label: 'Showers', icon: 'rain' };
  if (code === 85 || code === 86) return { label: 'Snow showers', icon: 'snow' };
  if (code &gt;= 95) return { label: 'Thunderstorm', icon: 'storm' };
  return { label: 'Unknown', icon: 'cloud' };
}