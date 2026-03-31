import { useCallback } from 'react'
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const L_ICON = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const L_ICON_2X = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const L_SHADOW = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: L_ICON,
  iconRetinaUrl: L_ICON_2X,
  shadowUrl: L_SHADOW,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

type Props = {
  position: [number, number]
  onPositionChange: (lat: number, lng: number) => void
  disabled?: boolean
  /** Radio de cobertura en km (círculo en el mapa). */
  radiusKm?: number
}

function DragMarker({
  position,
  onPositionChange,
  disabled,
}: {
  position: [number, number]
  onPositionChange: (lat: number, lng: number) => void
  disabled?: boolean
}) {
  return (
    <Marker
      position={position}
      draggable={!disabled}
      eventHandlers={{
        dragend: (e) => {
          const m = e.target
          const p = m.getLatLng()
          onPositionChange(p.lat, p.lng)
        },
      }}
    />
  )
}

function MapEvents({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function SetupWizardMap({ position, onPositionChange, disabled, radiusKm = 5 }: Props) {
  const setPos = useCallback(
    (lat: number, lng: number) => {
      onPositionChange(lat, lng)
    },
    [onPositionChange]
  )

  const radiusM = Math.max(0.5, radiusKm) * 1000

  return (
    <MapContainer
      center={position}
      zoom={12}
      className="z-0 h-64 w-full overflow-hidden rounded-xl border border-stone-200 md:h-80"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={position}
        radius={radiusM}
        pathOptions={{
          color: '#2563eb',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
        }}
      />
      {!disabled && <MapEvents onMove={setPos} />}
      <DragMarker position={position} onPositionChange={setPos} disabled={disabled} />
    </MapContainer>
  )
}
