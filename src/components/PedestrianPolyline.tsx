import React, { useEffect, useState } from 'react';
import { Polyline } from 'react-leaflet';
import L from 'leaflet';

export const PedestrianPolyline = ({ 
  waypoints, color, weight, opacity, dashArray, onClick, children 
}: { 
  waypoints: [number, number][], 
  color: string, 
  weight: number, 
  opacity: number, 
  dashArray?: string, 
  onClick?: (e: any) => void,
  children?: React.ReactNode
}) => {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const waypointsString = JSON.stringify(waypoints);

  useEffect(() => {
    let isMounted = true;
    if (waypoints.length < 2) {
      setRoute(waypoints);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setRoute([]);

    const fetchRoute = async () => {
      try {
        const validWaypoints = waypoints.filter(p => p && p[0] != null && p[1] != null);
        if (validWaypoints.length < 2) {
          setRoute(validWaypoints);
          setIsLoading(false);
          return;
        }

        const coords = validWaypoints.map(p => `${p[1]},${p[0]}`).join(';');
        const res = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0 && isMounted) {
          const coordinates = data.routes[0].geometry.coordinates;
          const latLngs: [number, number][] = coordinates.map((c: number[]) => [c[1], c[0]]);
          setRoute(latLngs);
        } else if (isMounted) {
           setRoute(validWaypoints);
        }
      } catch (err) {
        console.error("Failed to fetch pedestrian route:", err);
        if (isMounted) setRoute(waypoints.filter(p => p && p[0] != null && p[1] != null));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRoute();
    return () => { isMounted = false; };
  }, [waypointsString]);

  // While loading, or if calculation fails/is short, show straight lines
  const displayRoute = route.length > 0 ? route : waypoints;

  // Render straight lines with some transparency while loading to indicate "draft" state
  const currentOpacity = isLoading ? opacity * 0.5 : opacity;

  return (
    <Polyline 
      positions={displayRoute} 
      color={color} 
      weight={weight} 
      opacity={currentOpacity} 
      dashArray={isLoading ? '5, 10' : dashArray}
      eventHandlers={onClick ? { click: onClick } : undefined}
    >
      {children}
    </Polyline>
  );
};
