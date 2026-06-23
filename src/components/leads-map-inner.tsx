"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Lead } from "@/types/lead";
import { getTierStyle } from "@/lib/tier-colors";

const PANAMA_CITY_CENTER: [number, number] = [9.0, -79.5];

interface LeadsMapInnerProps {
  leads: Lead[];
}

export default function LeadsMapInner({ leads }: LeadsMapInnerProps) {
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
      {leads.map((lead) => {
        if (typeof lead.latitud !== "number" || typeof lead.longitud !== "number") {
          return null;
        }
        const style = getTierStyle(lead.tier);
        return (
          <CircleMarker
            key={lead.id}
            center={[lead.latitud, lead.longitud]}
            radius={7}
            pathOptions={{
              color: style.mapColor,
              fillColor: style.mapColor,
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{lead.nombre}</p>
                <p className="text-xs text-gray-500">{lead.rubro}</p>
                <p className="mt-1 text-xs">
                  {style.label}
                  {typeof lead.puntaje_total === "number" && ` · ${Math.round(lead.puntaje_total)} pts`}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
