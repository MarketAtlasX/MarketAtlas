export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180)
  const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180)
    - Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180) / Math.PI
}

export function destinationPoint(lat: number, lng: number, bearingDeg: number, distKm: number) {
  const R = 6371
  const br = (bearingDeg * Math.PI) / 180
  const l1 = (lat * Math.PI) / 180
  const l2 = (lng * Math.PI) / 180
  const lat2 = Math.asin(Math.sin(l1) * Math.cos(distKm / R) + Math.cos(l1) * Math.sin(distKm / R) * Math.cos(br))
  const lng2 = l2 + Math.atan2(
    Math.sin(br) * Math.sin(distKm / R) * Math.cos(l1),
    Math.cos(distKm / R) - Math.sin(l1) * Math.sin(lat2),
  )
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI }
}

export function getZoomLevel(code: string): number {
  const small = ['HK', 'SG', 'QA', 'KW', 'MU', 'IL', 'BE', 'CH', 'NL', 'DK', 'IE', 'AT']
  if (small.includes(code)) return 9
  const large = ['US', 'CN', 'RU', 'CA', 'AU', 'BR', 'IN']
  if (large.includes(code)) return 4
  return 5
}
