"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Lead } from "@/types/lead";
import { getTierStyle } from "@/lib/tier-colors";

const PANAMA_CITY_CENTER: [number, number] = [9.0, -79.5];

interface LeadsMapInnerProps {
  leads: Lead[];
}

// Pin HTML (divIcon) — permite entrada animada por CSS con stagger, imposible en SVG CircleMarker.
function makePin(color: string, delayMs: number) {
  return L.divIcon({
    className: "map-pin-icon",
    html: `<span class="map-pin" style="--pin:${color};animation-delay:${delayMs}ms"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

export default function LeadsMapInner({ leads }: LeadsMapInnerProps) {
  const points = useMemo(
    () =>
      leads.filter(
        (l) => typeof l.latitud === "number" && typeof l.longitud === "number"
      ),
    [leads]
  );

  return (
    <MapContainer
      center={PANAMA_CITY_CENTER}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((lead, i) => {
        const style = getTierStyle(lead.tier);
        // Stagger de entrada (acotado para que el último pin no espere de más)
        const delay = 80 + Math.min(i, 24) * 35;
        return (
          <Marker
            key={lead.id}
            position={[lead.latitud as number, lead.longitud as number]}
            icon={makePin(style.mapColor, delay)}
            eventHandlers={{
              mouseover: (e) => e.target.openPopup(),
              mouseout: (e) => e.target.closePopup(),
            }}
          >
            <Popup autoPan={false} closeButton={false}>
              <div className="text-sm">
                <p className="font-semibold">{lead.nombre}</p>
                <p className="text-xs text-gray-500">{lead.rubro}</p>
                <p className="mt-1 text-xs tabular-nums">
                  {style.label}
                  {typeof lead.puntaje_total === "number" && ` · ${Math.round(lead.puntaje_total)} pts`}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
