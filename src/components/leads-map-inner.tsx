"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Lead } from "@/types/lead";
import { getTierStyle } from "@/lib/tier-colors";

const PANAMA_CITY_CENTER: [number, number] = [9.0, -79.5];

interface DragRect {
  x1: number; y1: number;
  x2: number; y2: number;
}

interface LeadsMapInnerProps {
  leads: Lead[];
  brushMode: boolean;
  selectedIds: Set<string>;
  onBrushSelect: (leads: Lead[]) => void;
}

// Pin HTML with three visual states
function makePin(color: string, delayMs: number, state: "normal" | "sel" | "dim" = "normal") {
  const cls = state === "sel" ? " map-pin--sel" : state === "dim" ? " map-pin--dim" : "";
  const size = state === "sel" ? 20 : 16;
  const anchor = state === "sel" ? 10 : 8;
  return L.divIcon({
    className: "map-pin-icon",
    html: `<span class="map-pin${cls}" style="--pin:${color};animation-delay:${delayMs}ms"></span>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -10],
  });
}

// Inner component that uses useMap() — must be inside <MapContainer>
interface BrushControllerProps {
  brushMode: boolean;
  points: Lead[];
  onBrushSelect: (leads: Lead[]) => void;
  onDragRect: (rect: DragRect | null) => void;
}

function BrushController({ brushMode, points, onBrushSelect, onDragRect }: BrushControllerProps) {
  const map = useMap();
  const startPxRef = useRef<{ x: number; y: number } | null>(null);

  const getContainerPoint = useCallback((e: MouseEvent, container: HTMLElement) => {
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  useEffect(() => {
    if (!brushMode) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      onDragRect(null);
      startPxRef.current = null;
      return;
    }

    map.dragging.disable();

    const container = map.getContainer();

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return;
      startPxRef.current = getContainerPoint(e, container);
    }

    function onMouseMove(e: MouseEvent) {
      if (!startPxRef.current) return;
      const curr = getContainerPoint(e, container);
      onDragRect({ x1: startPxRef.current.x, y1: startPxRef.current.y, x2: curr.x, y2: curr.y });
    }

    function onMouseUp(e: MouseEvent) {
      if (!startPxRef.current) return;
      const endPx = getContainerPoint(e, container);
      const start = startPxRef.current;
      startPxRef.current = null;

      // Convert corner pixels → lat/lng bounds
      const p1 = map.containerPointToLatLng(L.point(start.x, start.y));
      const p2 = map.containerPointToLatLng(L.point(endPx.x, endPx.y));
      const bounds = L.latLngBounds(p1, p2);

      const selected = points.filter(
        (l) =>
          typeof l.latitud === "number" &&
          typeof l.longitud === "number" &&
          bounds.contains(L.latLng(l.latitud, l.longitud))
      );

      onBrushSelect(selected);
      onDragRect(null);
    }

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [brushMode, map, points, onBrushSelect, onDragRect, getContainerPoint]);

  return null;
}

export default function LeadsMapInner({
  leads,
  brushMode,
  selectedIds,
  onBrushSelect,
}: LeadsMapInnerProps) {
  const [dragRect, setDragRect] = useState<DragRect | null>(null);

  const points = useMemo(
    () => leads.filter((l) => typeof l.latitud === "number" && typeof l.longitud === "number"),
    [leads]
  );

  const hasSelection = selectedIds.size > 0;

  // Rect style (absolute overlay on top of the map container)
  const rectStyle = dragRect
    ? {
        left: Math.min(dragRect.x1, dragRect.x2),
        top: Math.min(dragRect.y1, dragRect.y2),
        width: Math.abs(dragRect.x2 - dragRect.x1),
        height: Math.abs(dragRect.y2 - dragRect.y1),
      }
    : null;

  return (
    <div className={`relative h-full w-full ${brushMode ? "cursor-crosshair" : ""}`}>
      <MapContainer
        center={PANAMA_CITY_CENTER}
        zoom={12}
        scrollWheelZoom={!brushMode}
        className="h-full w-full rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <BrushController
          brushMode={brushMode}
          points={points}
          onBrushSelect={onBrushSelect}
          onDragRect={setDragRect}
        />

        {points.map((lead, i) => {
          const style = getTierStyle(lead.tier);
          const delay = 80 + Math.min(i, 24) * 35;
          const pinState: "normal" | "sel" | "dim" = !hasSelection
            ? "normal"
            : selectedIds.has(lead.id)
            ? "sel"
            : "dim";

          return (
            <Marker
              key={`${lead.id}-${pinState}`}
              position={[lead.latitud as number, lead.longitud as number]}
              icon={makePin(style.mapColor, delay, pinState)}
              eventHandlers={{
                mouseover: (e) => !brushMode && e.target.openPopup(),
                mouseout: (e) => e.target.closePopup(),
              }}
            >
              <Popup autoPan={false} closeButton={false}>
                <div className="text-sm">
                  <p className="font-semibold">{lead.nombre}</p>
                  <p className="text-xs text-gray-500">{lead.rubro}</p>
                  <p className="mt-1 text-xs tabular-nums">
                    {style.label}
                    {typeof lead.puntaje_total === "number" &&
                      ` · ${Math.round(lead.puntaje_total)} pts`}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Selection rectangle overlay */}
      {brushMode && rectStyle && (
        <div
          className="pointer-events-none absolute z-500 rounded-sm border-2 border-teal-500"
          style={{
            ...rectStyle,
            backgroundColor: "rgba(13, 148, 136, 0.12)",
          }}
        />
      )}
    </div>
  );
}
