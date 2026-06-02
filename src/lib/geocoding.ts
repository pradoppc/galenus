export interface GeocodingResult {
  lat: number
  lng: number
  displayName: string
}

export async function geocodeAddress(query: string): Promise<GeocodingResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Galenus/1.0 (galenusmed.com.br)' },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data.length) return null

  return {
    lat:         parseFloat(data[0].lat),
    lng:         parseFloat(data[0].lon),
    displayName: data[0].display_name,
  }
}
