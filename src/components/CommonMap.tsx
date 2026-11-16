import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type * as MapLibreGL from 'maplibre-gl';
import {
  Calendar,
  Compass,
  Flag,
  Globe,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { Activity, Category } from '../types/common';
import {
  formatActivityDate,
  formatInr,
  formatTime12h,
  getGoogleMapsDirectionsUrl,
  getTintSurfaceClasses,
} from '../lib/api';
import { AvatarStack, SafeImage } from './BrandAndIcons';
import { Map as MapCanvas, MapMarker, MarkerContent, useMap } from './ui/map';

const DELHI_CENTER: [number, number] = [77.209, 28.6139];

function applyCommonMapPalette(map: MapLibreGL.Map) {
  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    for (const layer of style.layers) {
      const id = layer.id.toLowerCase();
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', '#F4F1E4');
      } else if (layer.type === 'fill') {
        if (id.includes('water')) {
          map.setPaintProperty(layer.id, 'fill-color', '#D7E5E8');
        } else if (id.includes('park') || id.includes('green') || id.includes('grass') || id.includes('wood') || id.includes('forest')) {
          map.setPaintProperty(layer.id, 'fill-color', '#E2E9C5');
        } else if (id.includes('building')) {
          map.setPaintProperty(layer.id, 'fill-color', '#EAE5D5');
          map.setPaintProperty(layer.id, 'fill-opacity', 0.55);
        } else if (id.includes('landuse') || id.includes('landcover')) {
          map.setPaintProperty(layer.id, 'fill-color', '#EEEAD9');
        }
      } else if (layer.type === 'line') {
        if (id.includes('water')) {
          map.setPaintProperty(layer.id, 'line-color', '#C5D9DD');
        } else if (id.includes('highway') || id.includes('motorway') || id.includes('trunk')) {
          map.setPaintProperty(layer.id, 'line-color', '#DFD7BF');
        } else if (id.includes('road') || id.includes('street') || id.includes('path')) {
          map.setPaintProperty(layer.id, 'line-color', '#EAE4D2');
        } else if (id.includes('boundary') || id.includes('admin')) {
          map.setPaintProperty(layer.id, 'line-color', '#CFC8B2');
        }
      } else if (layer.type === 'symbol') {
        map.setPaintProperty(layer.id, 'text-color', '#5A4D3F');
        map.setPaintProperty(layer.id, 'text-halo-color', '#F7F5EE');
      }
    }
  } catch {
    // Ignore minor layer property mismatches across style updates
  }
}

function CommonStyleAdapter({
  onMapReady,
  onTileError,
}: {
  onMapReady?: (map: MapLibreGL.Map) => void;
  onTileError?: () => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map) return;

    const handleStyle = () => applyCommonMapPalette(map);
    const handleError = (e: MapLibreGL.ErrorEvent) => {
      const msg = e?.error?.message?.toLowerCase() || '';
      if (msg.includes('style') || msg.includes('failed to fetch') || msg.includes('network')) {
        onTileError?.();
      }
    };

    map.on('styledata', handleStyle);
    map.on('error', handleError);

    if (isLoaded) {
      applyCommonMapPalette(map);
      onMapReady?.(map);
    }

    return () => {
      map.off('styledata', handleStyle);
      map.off('error', handleError);
    };
  }, [map, isLoaded, onMapReady, onTileError]);

  return null;
}

function MapFallbackCard({
  message,
  onRetry,
  heightClass = 'h-64',
}: {
  message: string;
  onRetry: () => void;
  heightClass?: string;
}) {
  return (
    <div
      className={`${heightClass} w-full rounded-3xl bg-[#E9EDC9]/70 border border-[#D7DEB0] flex flex-col items-center justify-center p-6 text-center`}
    >
      <MapPin className="w-8 h-8 text-[#5A4D3F]" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-[#2B3322]">Map tiles unavailable right now</p>
      <p className="mt-1 text-xs text-[#5A4D3F] max-w-sm">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-[44px] inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-5 py-2 text-xs font-semibold text-[#FEFAE0] hover:bg-[#3B462F]"
      >
        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
        Retry map
      </button>
    </div>
  );
}

interface PinCluster {
  id: string;
  latitude: number;
  longitude: number;
  items: Activity[];
}

function clusterActivitiesByZoom(items: Activity[], zoom: number): PinCluster[] {
  if (zoom >= 12.2 || items.length <= 1) {
    return items.map((item) => ({
      id: item.id,
      latitude: item.latitude!,
      longitude: item.longitude!,
      items: [item],
    }));
  }

  const thresholdDeg = zoom < 10.5 ? 0.04 : 0.022;
  const clusters: PinCluster[] = [];

  for (const item of items) {
    const lat = item.latitude!;
    const lng = item.longitude!;
    let matched: PinCluster | null = null;
    for (const c of clusters) {
      if (Math.abs(c.latitude - lat) <= thresholdDeg && Math.abs(c.longitude - lng) <= thresholdDeg) {
        matched = c;
        break;
      }
    }
    if (matched) {
      const nextCount = matched.items.length + 1;
      matched.latitude = (matched.latitude * matched.items.length + lat) / nextCount;
      matched.longitude = (matched.longitude * matched.items.length + lng) / nextCount;
      matched.items.push(item);
    } else {
      clusters.push({
        id: `cluster-${item.id}`,
        latitude: lat,
        longitude: lng,
        items: [item],
      });
    }
  }

  return clusters;
}

export interface ExploreMapViewProps {
  activities: Activity[];
  categories: Category[];
  activeKind: 'ALL' | 'ACTIVITY' | 'EVENT';
  onKindChange: (kind: 'ALL' | 'ACTIVITY' | 'EVENT') => void;
  activePrice: 'ALL' | 'FREE' | 'PAID';
  onPriceChange: (price: 'ALL' | 'FREE' | 'PAID') => void;
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
  userCoords: { lat: number; lng: number } | null;
  radiusKm: number | null;
  onLocationEnabled: (coords: { lat: number; lng: number } | null, radiusKm: number | null) => void;
  onSearchBounds: (boundsCsv: string | null) => void;
  hasBoundsFilter: boolean;
  onResetFilters: () => void;
}

export function ExploreMapView({
  activities,
  categories,
  activeKind,
  onKindChange,
  activePrice,
  onPriceChange,
  activeCategory,
  onCategoryChange,
  userCoords,
  radiusKm,
  onLocationEnabled,
  onSearchBounds,
  hasBoundsFilter,
  onResetFilters,
}: ExploreMapViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [mapError, setMapError] = useState(false);

  const inPerson = useMemo(
    () =>
      activities.filter(
        (a) =>
          a.activityType === 'IN_PERSON' &&
          typeof a.latitude === 'number' &&
          typeof a.longitude === 'number'
      ),
    [activities]
  );

  const onlineCount = useMemo(
    () => activities.filter((a) => a.activityType === 'ONLINE').length,
    [activities]
  );

  const [selectedId, setSelectedId] = useState<string | null>(inPerson[0]?.id ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(11.4);
  const [sheetSnap, setSheetSnap] = useState<'peek' | 'half' | 'full'>('peek');
  const [pendingBounds, setPendingBounds] = useState<string | null>(null);
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState('');
  const suppressMoveEndRef = useRef(false);

  useEffect(() => {
    if (!inPerson.some((a) => a.id === selectedId)) {
      setSelectedId(inPerson[0]?.id ?? null);
    }
  }, [inPerson, selectedId]);

  const selected = useMemo(
    () => inPerson.find((a) => a.id === selectedId) ?? null,
    [inPerson, selectedId]
  );

  const clusters = useMemo(
    () => clusterActivitiesByZoom(inPerson, zoomLevel),
    [inPerson, zoomLevel]
  );

  const focusActivity = useCallback(
    (activity: Activity) => {
      setSelectedId(activity.id);
      setSheetSnap('half');
      if (
        mapRef.current &&
        typeof activity.latitude === 'number' &&
        typeof activity.longitude === 'number'
      ) {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
        suppressMoveEndRef.current = true;
        mapRef.current.flyTo({
          center: [activity.longitude, activity.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 13.4),
          pitch: prefersReducedMotion ? 0 : isDesktop ? 30 : 0,
          duration: prefersReducedMotion ? 0 : 750,
          essential: true,
        });
      }
    },
    [prefersReducedMotion]
  );

  const handleClusterClick = useCallback(
    (cluster: PinCluster) => {
      if (cluster.items.length === 1) {
        focusActivity(cluster.items[0]);
        return;
      }
      if (!mapRef.current) return;
      suppressMoveEndRef.current = true;
      mapRef.current.flyTo({
        center: [cluster.longitude, cluster.latitude],
        zoom: Math.min(mapRef.current.getZoom() + 2.2, 14.5),
        duration: prefersReducedMotion ? 0 : 600,
      });
    },
    [focusActivity, prefersReducedMotion]
  );

  const handleMapReady = useCallback((map: MapLibreGL.Map) => {
    mapRef.current = map;
    setZoomLevel(map.getZoom());

    const onZoomEnd = () => setZoomLevel(map.getZoom());
    const onMoveEnd = () => {
      setZoomLevel(map.getZoom());
      if (suppressMoveEndRef.current) {
        suppressMoveEndRef.current = false;
        return;
      }
      const b = map.getBounds();
      const csv = `${b.getSouth().toFixed(5)},${b.getWest().toFixed(5)},${b.getNorth().toFixed(5)},${b.getEast().toFixed(5)}`;
      setPendingBounds(csv);
      setShowSearchAreaBtn(true);
    };

    map.on('zoomend', onZoomEnd);
    map.on('moveend', onMoveEnd);
  }, []);

  const handleNearMe = () => {
    setLocationNotice('');
    if (!('geolocation' in navigator)) {
      setLocationNotice('Location access is not supported by this browser. Browsing all Delhi-NCR venues.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onLocationEnabled(coords, radiusKm ?? 10);
        setLocating(false);
        if (mapRef.current) {
          suppressMoveEndRef.current = true;
          mapRef.current.flyTo({
            center: [coords.lng, coords.lat],
            zoom: 12.6,
            duration: prefersReducedMotion ? 0 : 800,
          });
        }
      },
      () => {
        setLocating(false);
        setLocationNotice('Location permission declined — showing all Delhi-NCR gatherings instead.');
      },
      { timeout: 9000 }
    );
  };

  const eventCount = activities.filter((a) => a.kind === 'EVENT').length;
  const activityCount = activities.filter((a) => a.kind === 'ACTIVITY').length;
  const freeCount = activities.filter((a) => a.isFree).length;
  const paidCount = activities.filter((a) => !a.isFree && a.minPriceInr > 0).length;

  const sheetHeightClass =
    sheetSnap === 'full'
      ? 'max-h-[72vh]'
      : sheetSnap === 'half'
      ? 'max-h-[44vh]'
      : 'max-h-[156px]';

  return (
    <div className="space-y-3">
      {locationNotice && (
        <div
          role="status"
          className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] px-4 py-2.5 text-xs font-medium text-[#5A4D3F] flex items-center justify-between gap-3"
        >
          <span>{locationNotice}</span>
          <button
            type="button"
            onClick={() => setLocationNotice('')}
            aria-label="Dismiss notice"
            className="p-1 text-[#2B3322]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative rounded-3xl overflow-hidden border border-[#D7DEB0] bg-[#EFECE0] h-[640px] lg:h-[680px] shadow-sm">
        {mapError ? (
          <MapFallbackCard
            heightClass="h-full"
            message="The map tiles could not load right now. You can retry or switch back to the list view."
            onRetry={() => {
              setMapError(false);
              setMapKey((k) => k + 1);
            }}
          />
        ) : (
          <MapCanvas
            key={mapKey}
            center={
              selected && selected.longitude && selected.latitude
                ? [selected.longitude, selected.latitude]
                : DELHI_CENTER
            }
            zoom={11.4}
            maxZoom={17}
            minZoom={9}
            className="h-full w-full"
          >
            <CommonStyleAdapter
              onMapReady={handleMapReady}
              onTileError={() => setMapError(true)}
            />

            {clusters.map((cluster) => {
              const isSingle = cluster.items.length === 1;
              if (!isSingle) {
                return (
                  <MapMarker
                    key={cluster.id}
                    latitude={cluster.latitude}
                    longitude={cluster.longitude}
                    onClick={() => handleClusterClick(cluster)}
                  >
                    <MarkerContent>
                      <button
                        type="button"
                        aria-label={`${cluster.items.length} gatherings in this area. Click to zoom in.`}
                        className="min-w-[44px] min-h-[44px] rounded-full bg-[#2B3322] text-[#FEFAE0] border-2 border-[#FEFAE0] shadow-lg flex items-center justify-center text-xs font-bold tabular-nums hover:scale-105 transition-transform"
                      >
                        {cluster.items.length}
                      </button>
                    </MarkerContent>
                  </MapMarker>
                );
              }

              const act = cluster.items[0];
              const tint = getTintSurfaceClasses(act.tintColor);
              const isSelected = act.id === selectedId;
              const isHovered = act.id === hoveredId;
              const isEvent = act.kind === 'EVENT';

              return (
                <MapMarker
                  key={act.id}
                  latitude={cluster.latitude}
                  longitude={cluster.longitude}
                  onClick={() => focusActivity(act)}
                >
                  <MarkerContent>
                    <div className="relative flex items-center justify-center">
                      {isSelected && !prefersReducedMotion && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 -m-1.5 rounded-full bg-[#D4A373]/40 animate-ping"
                        />
                      )}
                      <motion.button
                        type="button"
                        aria-label={`${act.title} at ${act.neighborhood}`}
                        animate={{
                          scale: isSelected ? 1.2 : isHovered ? 1.12 : 1,
                        }}
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 360, damping: 24 }
                        }
                        style={{
                          backgroundColor: isSelected ? '#2B3322' : tint.pinHex,
                        }}
                        className={`relative rounded-full border-2 border-[#FEFAE0] shadow-md flex items-center justify-center text-[#FEFAE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3322] ${
                          isEvent ? 'w-10 h-10' : 'w-8 h-8'
                        }`}
                      >
                        {isEvent ? (
                          <Flag className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FEFAE0]" />
                        )}
                      </motion.button>
                    </div>
                  </MarkerContent>
                </MapMarker>
              );
            })}
          </MapCanvas>
        )}

        {/* Top Floating Liquid-Glass Filter Chips */}
        <div className="pointer-events-none absolute top-3 inset-x-3 z-20 flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              {
                key: 'kind-all',
                label: `All (${activities.length})`,
                active: activeKind === 'ALL' && activePrice === 'ALL' && activeCategory === 'all',
                onClick: () => {
                  onKindChange('ALL');
                  onPriceChange('ALL');
                  onCategoryChange('all');
                },
              },
              {
                key: 'kind-event',
                label: `Events (${eventCount})`,
                active: activeKind === 'EVENT',
                onClick: () => onKindChange(activeKind === 'EVENT' ? 'ALL' : 'EVENT'),
              },
              {
                key: 'kind-activity',
                label: `Activities (${activityCount})`,
                active: activeKind === 'ACTIVITY',
                onClick: () => onKindChange(activeKind === 'ACTIVITY' ? 'ALL' : 'ACTIVITY'),
              },
              {
                key: 'price-free',
                label: `Free (${freeCount})`,
                active: activePrice === 'FREE',
                onClick: () => onPriceChange(activePrice === 'FREE' ? 'ALL' : 'FREE'),
              },
              {
                key: 'price-paid',
                label: `Paid (${paidCount})`,
                active: activePrice === 'PAID',
                onClick: () => onPriceChange(activePrice === 'PAID' ? 'ALL' : 'PAID'),
              },
              ...categories.slice(0, 6).map((cat) => ({
                key: `cat-${cat.slug}`,
                label: cat.name,
                active: activeCategory === cat.slug,
                onClick: () => onCategoryChange(activeCategory === cat.slug ? 'all' : cat.slug),
              })),
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClick}
                className={`min-h-[40px] shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shadow-sm ${
                  chip.active
                    ? 'bg-[#2B3322] text-[#FEFAE0] border border-[#2B3322]'
                    : 'liquid-glass text-[#2B3322] hover:bg-[#FEFAE0]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Search This Area + Radius Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="pointer-events-auto flex items-center gap-2">
              {showSearchAreaBtn && pendingBounds && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchBounds(pendingBounds);
                    setShowSearchAreaBtn(false);
                  }}
                  className="min-h-[40px] liquid-glass inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-[#2B3322] shadow-md hover:bg-[#FEFAE0]"
                >
                  <Search className="w-3.5 h-3.5" aria-hidden="true" />
                  Search this area
                </button>
              )}
              {hasBoundsFilter && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchBounds(null);
                    setShowSearchAreaBtn(false);
                  }}
                  className="min-h-[40px] rounded-full bg-[#2B3322] text-[#FEFAE0] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Clear map area
                </button>
              )}
            </div>

            {userCoords && (
              <div className="pointer-events-auto liquid-glass rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                <span className="text-[11px] font-semibold text-[#2B3322] px-2">Radius:</span>
                {[1, 3, 5, 10].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => onLocationEnabled(userCoords, km)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      radiusKm === km
                        ? 'bg-[#2B3322] text-[#FEFAE0]'
                        : 'text-[#5A4D3F] hover:text-[#2B3322]'
                    }`}
                  >
                    {km} km
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onLocationEnabled(null, null)}
                  aria-label="Clear location filter"
                  className="p-1 rounded-full text-[#5A4D3F] hover:text-[#2B3322]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Left Floating Synced List Panel */}
        <div className="hidden md:flex flex-col w-80 lg:w-[340px] absolute top-18 bottom-4 left-3 z-20 rounded-3xl liquid-glass shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2B3322]/10 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#2B3322] tabular-nums">
                {inPerson.length} venue{inPerson.length === 1 ? '' : 's'} on map
              </p>
              {onlineCount > 0 && (
                <p className="text-[11px] text-[#5A4D3F]">
                  + {onlineCount} online session{onlineCount === 1 ? '' : 's'} in list view
                </p>
              )}
            </div>
            {userCoords && (
              <span className="text-[11px] font-medium text-[#5A4D3F]">By distance</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {inPerson.length === 0 ? (
              <div className="p-5 text-center space-y-3">
                <Compass className="w-7 h-7 mx-auto text-[#5A4D3F]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[#2B3322]">No venues in this area</p>
                <p className="text-xs text-[#5A4D3F]">
                  Zoom out, widen your radius, or reset filters to see Delhi-NCR gatherings.
                </p>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="min-h-[44px] rounded-full bg-[#2B3322] px-4 py-2 text-xs font-semibold text-[#FEFAE0]"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              inPerson.map((act) => {
                const isSelected = act.id === selectedId;
                const tint = getTintSurfaceClasses(act.tintColor);
                return (
                  <div
                    key={act.id}
                    onMouseEnter={() => setHoveredId(act.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => focusActivity(act)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        focusActivity(act);
                      }
                    }}
                    className={`rounded-2xl p-2.5 cursor-pointer transition-all border ${
                      isSelected
                        ? `${tint.bg} border-[#2B3322] shadow-sm`
                        : 'bg-[#FEFAE0]/85 border-[#E4DEC3] hover:bg-[#FEFAE0]'
                    }`}
                  >
                    <div className="flex gap-2.5 items-start">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#E9EDC9]">
                        <SafeImage
                          src={act.imageUrl}
                          alt={act.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#5A4D3F]">
                          <span>{act.kind === 'EVENT' ? 'Event' : 'Activity'}</span>
                          <span>
                            {act.kind === 'EVENT'
                              ? act.isFree
                                ? 'Free'
                                : `From ${formatInr(act.minPriceInr)}`
                              : 'Free'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-[#2B3322] line-clamp-2">
                          {act.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#5A4D3F] truncate">
                          {act.neighborhood}
                          {typeof act.distanceKm === 'number' ? ` · ${act.distanceKm} km` : ''}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-[#2B3322] tabular-nums">
                            {act.participantCount} going
                          </span>
                          <Link
                            to={`/activities/${act.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-semibold text-[#2B3322] underline underline-offset-2"
                          >
                            View details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Liquid-Glass Map Controls (44px hit targets) */}
        <div className="absolute right-3 top-20 md:top-auto md:bottom-5 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleNearMe}
            disabled={locating}
            aria-label="Find gatherings near me"
            title="Near me"
            className={`min-h-[44px] min-w-[44px] rounded-2xl liquid-glass flex items-center justify-center text-[#2B3322] shadow-md hover:bg-[#FEFAE0] disabled:opacity-60 ${
              userCoords ? 'ring-2 ring-[#2B3322]' : ''
            }`}
          >
            <LocateFixed className={`w-5 h-5 ${locating ? 'animate-pulse' : ''}`} />
          </button>

          <div className="rounded-2xl liquid-glass shadow-md overflow-hidden flex flex-col divide-y divide-[#2B3322]/10">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomTo(mapRef.current.getZoom() + 1, { duration: 250 })}
              aria-label="Zoom in"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#2B3322] hover:bg-[#FEFAE0]"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomTo(mapRef.current.getZoom() - 1, { duration: 250 })}
              aria-label="Zoom out"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#2B3322] hover:bg-[#FEFAE0]"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Liquid-Glass Draggable Snap Bottom Sheet */}
        <motion.div
          layout={!prefersReducedMotion}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 320, damping: 32 }
          }
          className={`md:hidden absolute bottom-2.5 inset-x-2.5 z-20 rounded-3xl liquid-glass shadow-xl flex flex-col overflow-hidden ${sheetHeightClass}`}
        >
          <button
            type="button"
            aria-label="Toggle map sheet size"
            onClick={() =>
              setSheetSnap((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'))
            }
            className="w-full pt-2.5 pb-1.5 flex flex-col items-center gap-1"
          >
            <span className="w-10 h-1 rounded-full bg-[#2B3322]/30" />
            <span className="text-[11px] font-medium text-[#5A4D3F]">
              {inPerson.length} nearby venue{inPerson.length === 1 ? '' : 's'} · Tap to{' '}
              {sheetSnap === 'full' ? 'collapse' : 'expand'}
            </span>
          </button>

          <div className="flex-1 overflow-y-auto px-3.5 pb-3.5 space-y-3">
            {selected ? (
              <div className="rounded-2xl bg-[#FEFAE0]/95 border border-[#D7DEB0] p-3 flex gap-3 items-start">
                <div className="w-18 h-18 rounded-xl overflow-hidden shrink-0 bg-[#E9EDC9]">
                  <SafeImage
                    src={selected.imageUrl}
                    alt={selected.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#5A4D3F]">
                    <span>
                      {selected.kind === 'EVENT' ? 'Event' : 'Activity'} · {selected.category.name}
                    </span>
                    <span className="text-[#2B3322]">
                      {selected.isFree ? 'Free' : `From ${formatInr(selected.minPriceInr)}`}
                    </span>
                  </div>
                  <h3 className="mt-0.5 text-sm font-bold text-[#2B3322] line-clamp-1">
                    {selected.title}
                  </h3>
                  <p className="text-xs text-[#5A4D3F] truncate">
                    {formatActivityDate(selected.date)} · {formatTime12h(selected.startTime)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <AvatarStack
                      users={selected.participants}
                      totalCount={selected.participantCount}
                    />
                    <Link
                      to={`/activities/${selected.id}`}
                      className="min-h-[36px] inline-flex items-center rounded-full bg-[#2B3322] px-3.5 py-1.5 text-xs font-semibold text-[#FEFAE0]"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-center text-[#5A4D3F] py-2">
                No venues matched in this view.
              </p>
            )}

            {sheetSnap !== 'peek' && inPerson.length > 1 && (
              <div className="space-y-2 pt-1">
                {inPerson
                  .filter((a) => a.id !== selected?.id)
                  .slice(0, 8)
                  .map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => focusActivity(act)}
                      className="w-full text-left rounded-2xl bg-[#FEFAE0]/90 border border-[#E4DEC3] p-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#2B3322] truncate">{act.title}</p>
                        <p className="text-[11px] text-[#5A4D3F] truncate">
                          {act.neighborhood} · {act.participantCount} going
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#2B3322] shrink-0">
                        {act.isFree ? 'Free' : formatInr(act.minPriceInr)}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function MiniVenueMap({
  latitude,
  longitude,
  title,
  address,
  tintColor = 'sage',
}: {
  latitude: number | null;
  longitude: number | null;
  title: string;
  address: string;
  tintColor?: string;
}) {
  const [mapError, setMapError] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  if (latitude === null || longitude === null) {
    return null;
  }

  const tint = getTintSurfaceClasses(tintColor);
  const directionsUrl = getGoogleMapsDirectionsUrl(latitude, longitude, address || title);

  return (
    <div className="space-y-3">
      <div className="relative h-52 w-full rounded-2xl overflow-hidden border border-[#D7DEB0] bg-[#EFECE0]">
        {mapError ? (
          <MapFallbackCard
            heightClass="h-full"
            message="Venue map preview could not load right now."
            onRetry={() => {
              setMapError(false);
              setMapKey((k) => k + 1);
            }}
          />
        ) : (
          <MapCanvas
            key={mapKey}
            center={[longitude, latitude]}
            zoom={14}
            interactive={true}
            className="h-full w-full"
          >
            <CommonStyleAdapter onTileError={() => setMapError(true)} />
            <MapMarker latitude={latitude} longitude={longitude}>
              <MarkerContent>
                <div
                  style={{ backgroundColor: tint.pinHex }}
                  className="w-9 h-9 rounded-full border-2 border-[#FEFAE0] shadow-lg flex items-center justify-center text-[#FEFAE0]"
                >
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </div>
              </MarkerContent>
            </MapMarker>
          </MapCanvas>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#5A4D3F] leading-relaxed">{address}</p>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#E9EDC9] border border-[#D7DEB0] px-4 py-1.5 text-xs font-semibold text-[#2B3322] hover:bg-[#CCD5AE] transition-colors whitespace-nowrap"
        >
          <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
          Get directions
        </a>
      </div>
    </div>
  );
}

export function ListingsPreviewMap({
  activities,
  heading = 'Gathering venues',
}: {
  activities: Activity[];
  heading?: string;
}) {
  const [mapError, setMapError] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const venueItems = useMemo(
    () =>
      activities.filter(
        (a) =>
          a.activityType === 'IN_PERSON' &&
          typeof a.latitude === 'number' &&
          typeof a.longitude === 'number'
      ),
    [activities]
  );

  if (venueItems.length === 0) return null;

  const avgLng =
    venueItems.reduce((sum, a) => sum + (a.longitude ?? 0), 0) / venueItems.length;
  const avgLat =
    venueItems.reduce((sum, a) => sum + (a.latitude ?? 0), 0) / venueItems.length;
  const activeItem = venueItems.find((v) => v.id === activeId) ?? venueItems[0];

  return (
    <section className="rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] p-5 sm:p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[#2B3322]">{heading}</h2>
        <span className="text-xs text-[#5A4D3F]">
          Public event &amp; activity venues only
        </span>
      </div>

      <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-[#D7DEB0] bg-[#EFECE0]">
        {mapError ? (
          <MapFallbackCard
            heightClass="h-full"
            message="Venue map could not load right now."
            onRetry={() => {
              setMapError(false);
              setMapKey((k) => k + 1);
            }}
          />
        ) : (
          <MapCanvas key={mapKey} center={[avgLng, avgLat]} zoom={11.5} className="h-full w-full">
            <CommonStyleAdapter onTileError={() => setMapError(true)} />
            {venueItems.map((act) => {
              const tint = getTintSurfaceClasses(act.tintColor);
              const isSelected = act.id === activeItem?.id;
              return (
                <MapMarker
                  key={act.id}
                  latitude={act.latitude!}
                  longitude={act.longitude!}
                  onClick={() => setActiveId(act.id)}
                >
                  <MarkerContent>
                    <button
                      type="button"
                      aria-label={`${act.title} at ${act.neighborhood}`}
                      style={{ backgroundColor: isSelected ? '#2B3322' : tint.pinHex }}
                      className="w-8 h-8 rounded-full border-2 border-[#FEFAE0] shadow-md flex items-center justify-center text-[#FEFAE0] transition-transform hover:scale-110"
                    >
                      <MapPin className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </MarkerContent>
                </MapMarker>
              );
            })}
          </MapCanvas>
        )}

        {activeItem && !mapError && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 z-10 rounded-2xl liquid-glass p-3 shadow-md flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#2B3322] truncate">{activeItem.title}</p>
              <p className="text-[11px] text-[#5A4D3F] truncate">
                {activeItem.venueName || activeItem.neighborhood}
              </p>
            </div>
            <Link
              to={`/activities/${activeItem.id}`}
              className="shrink-0 rounded-full bg-[#2B3322] px-3 py-1.5 text-xs font-semibold text-[#FEFAE0]"
            >
              View
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPickerMap({
  latitude,
  longitude,
  onCoordinatesChange,
  onAddressPicked,
}: {
  latitude: number;
  longitude: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  onAddressPicked?: (displayName: string) => void;
}) {
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [mapError, setMapError] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(
          `${trimmed}, Delhi NCR`
        )}`
      );
      if (!res.ok) throw new Error('Geocoder unavailable');
      const data = (await res.json()) as NominatimResult[];
      setResults(data);
    } catch {
      setSearchError('Address lookup could not connect — drag the pin directly on the map instead.');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 3) {
        runSearch(query);
      } else {
        setResults([]);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const handleSelectResult = (item: NominatimResult) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    onCoordinatesChange(lat, lng);
    onAddressPicked?.(item.display_name);
    setResults([]);
    setQuery(item.display_name.split(',').slice(0, 3).join(', '));
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14.5, duration: 700 });
  };

  return (
    <div className="space-y-3 rounded-2xl bg-[#F7F5EE] border border-[#D7DEB0] p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#2B3322]">
          Pin exact meeting venue on map
        </span>
        <span className="text-[11px] text-[#5A4D3F] tabular-nums">
          {latitude.toFixed(4)}, {longitude.toFixed(4)} · Drag pin to fine-tune
        </span>
      </div>

      {/* Nominatim Search */}
      <div className="relative">
        <Search
          className="w-4 h-4 text-[#5A4D3F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Delhi-NCR venue or landmark (e.g. India Habitat Centre, Sunder Nursery)..."
          className="w-full rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] pl-10 pr-24 py-2.5 text-xs text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => runSearch(query)}
          disabled={searching || query.trim().length < 3}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#E9EDC9] px-3 py-1 text-[11px] font-semibold text-[#2B3322] hover:bg-[#CCD5AE] disabled:opacity-50"
        >
          {searching ? 'Finding...' : 'Search'}
        </button>
      </div>

      {searchError && <p className="text-xs text-[#8C3B2B]">{searchError}</p>}

      {results.length > 0 && (
        <ul className="rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] divide-y divide-[#E4DEC3] max-h-44 overflow-y-auto">
          {results.map((item) => (
            <li key={item.place_id}>
              <button
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left px-3 py-2 text-xs text-[#2B3322] hover:bg-[#E9EDC9]/70 transition-colors"
              >
                {item.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-[#D7DEB0] bg-[#EFECE0]">
        {mapError ? (
          <MapFallbackCard
            heightClass="h-full"
            message="Map tiles could not load, but your selected coordinates are saved."
            onRetry={() => {
              setMapError(false);
              setMapKey((k) => k + 1);
            }}
          />
        ) : (
          <MapCanvas
            key={mapKey}
            center={[longitude, latitude]}
            zoom={13.5}
            className="h-full w-full"
          >
            <CommonStyleAdapter
              onMapReady={(m) => {
                mapRef.current = m;
              }}
              onTileError={() => setMapError(true)}
            />
            <MapMarker
              latitude={latitude}
              longitude={longitude}
              draggable={true}
              onDragEnd={({ lat, lng }) => onCoordinatesChange(lat, lng)}
            >
              <MarkerContent>
                <div className="w-10 h-10 rounded-full bg-[#2B3322] text-[#FEFAE0] border-2 border-[#FEFAE0] shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </div>
              </MarkerContent>
            </MapMarker>
          </MapCanvas>
        )}
      </div>

      <p className="text-[11px] text-[#5A4D3F]">
        Place search powered by OpenStreetMap Nominatim.
      </p>
    </div>
  );
}
