import React, { useEffect, useRef, useMemo, useContext, useState } from 'react';
import { Spinner } from '../../ui/Spinner';
import { ThemeContext } from '../../../contexts/ThemeContext';

// Declare the global `google` object to fix TypeScript errors related to the Google Maps API.
// Using `any` for types because `google` namespace is not available at compile time.
declare global {
    interface Window {
        google: any;
    }
}

interface TopBuyersMapProps {
    salesData: { name: string; value: number; revenue: number; units: number }[];
    locations: Record<string, { lat: number; lng: number }>;
    isLoading: boolean;
    onBuyerSelect: (buyer: string | null) => void;
    selectedBuyer: string | null;
}

interface BuyerLocation {
    name: string;
    lat: number;
    lng: number;
    revenue: number;
    units: number;
    value: number;
}

const TopBuyersMap: React.FC<TopBuyersMapProps> = React.memo(({ 
    salesData, 
    locations, 
    isLoading, 
    onBuyerSelect, 
    selectedBuyer 
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any | null>(null);
    const markersRef = useRef<any[]>([]);
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme === 'dark';
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mapData, setMapData] = useState<BuyerLocation[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);

    const maxRevenue = useMemo(() => 
        Math.max(...mapData.map(d => d.revenue), 1), 
        [mapData]
    );

    // Load Google Maps API
    useEffect(() => {
        if (window.google?.maps) {
            setIsMapLoaded(true);
            return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            const handleLoad = () => setIsMapLoaded(true);
            const handleError = () => setLoadError('Failed to load Google Maps');
            existingScript.addEventListener('load', handleLoad);
            existingScript.addEventListener('error', handleError);
            return () => {
                existingScript.removeEventListener('load', handleLoad);
                existingScript.removeEventListener('error', handleError);
            }
        }

        const script = document.createElement('script');
        const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
        if (!API_KEY) {
            setLoadError('Google Maps API key is not configured.');
            return;
        }

        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
        script.async = true;
        script.defer = true;
        
        const handleLoad = () => setIsMapLoaded(true);
        const handleError = () => setLoadError('Failed to load Google Maps API. Please check your API key.');
        
        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);
        
        document.head.appendChild(script);

        return () => {
             script.removeEventListener('load', handleLoad);
             script.removeEventListener('error', handleError);
        }
    }, []);

    // Geocode buyer names to get exact locations
    useEffect(() => {
        if (!isMapLoaded || isLoading || salesData.length === 0 || !window.google?.maps) return;

        const geocodeBuyers = async () => {
            setIsGeocoding(true);
            const geocoder = new window.google.maps.Geocoder();
            
            const geocodePromises = salesData.map(buyer => 
                new Promise<BuyerLocation | null>(async (resolve) => {
                    try {
                        const searchQuery = `${buyer.name}, Cambodia`;
                        const response = await geocoder.geocode({ address: searchQuery });
                        if (response.results && response.results[0]) {
                            const location = response.results[0].geometry.location;
                            resolve({
                                name: buyer.name,
                                lat: location.lat(),
                                lng: location.lng(),
                                revenue: buyer.revenue,
                                units: buyer.units,
                                value: buyer.value,
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        console.warn(`Could not geocode ${buyer.name}:`, error);
                        resolve(null);
                    }
                    // Add small delay to avoid rate limiting
                    await new Promise(res => setTimeout(res, 50));
                })
            );

            const results = await Promise.all(geocodePromises);
            setMapData(results.filter((r): r is BuyerLocation => r !== null));
            setIsGeocoding(false);
        };

        geocodeBuyers();
    }, [isMapLoaded, salesData, isLoading]);

    // Initialize map once we have geocoded data
    useEffect(() => {
        if (!isMapLoaded || !mapRef.current || mapData.length === 0 || !window.google?.maps) return;
        
        let resizeTimer: number;

        try {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: 12.5657, lng: 104.9282 },
                zoom: 7,
                styles: isDark ? [
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                ] : [],
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
            });

            googleMapRef.current = map;

            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];

            const bounds = new window.google.maps.LatLngBounds();

            mapData.forEach(buyer => {
                const scaleFactor = Math.sqrt(buyer.revenue / maxRevenue);
                const size = Math.max(20, scaleFactor * 60);

                const position = { lat: buyer.lat, lng: buyer.lng };
                bounds.extend(position);

                const marker = new window.google.maps.Marker({
                    position, map, title: buyer.name,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: size / 4,
                        fillColor: '#3B82F6', fillOpacity: 0.8,
                        strokeColor: '#ffffff', strokeWeight: 2,
                    },
                });

                const infoWindow = new window.google.maps.InfoWindow({
                    content: `<div style="padding: 8px; color: #18181b; font-family: Inter, sans-serif;"><strong style="font-size: 14px;">${buyer.name}</strong><br/><span style="font-size: 12px;">Revenue: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(buyer.revenue)}</span><br/><span style="font-size: 12px;">Units: ${buyer.units.toLocaleString()}</span></div>`
                });

                marker.addListener('click', () => {
                    onBuyerSelect(selectedBuyer === buyer.name ? null : buyer.name);
                    infoWindow.open(map, marker);
                });

                markersRef.current.push(marker);
            });

            if (mapData.length > 0) {
                map.fitBounds(bounds);
            }
            
            // Force a resize after a short delay to ensure correct rendering.
            resizeTimer = window.setTimeout(() => {
                if (window.google?.maps?.event && googleMapRef.current) {
                    window.google.maps.event.trigger(googleMapRef.current, 'resize');
                    // Re-center the map after resizing
                    if (mapData.length > 0) {
                        googleMapRef.current.fitBounds(bounds);
                    }
                }
            }, 150);

        } catch (error) {
            console.error('Error initializing map:', error);
            setLoadError('Failed to initialize map');
        }

        return () => {
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }
        };
        
    }, [isMapLoaded, mapData, maxRevenue, isDark, onBuyerSelect, selectedBuyer]);

    // Update markers when selection changes
    useEffect(() => {
        if (!googleMapRef.current || markersRef.current.length === 0) return;

        markersRef.current.forEach((marker, index) => {
            const buyer = mapData[index];
            if (!buyer) return;

            const scaleFactor = Math.sqrt(buyer.revenue / maxRevenue);
            const size = Math.max(20, scaleFactor * 60);

            marker.setIcon({
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: size / 4,
                fillColor: selectedBuyer === buyer.name ? '#2563EB' : '#3B82F6',
                fillOpacity: selectedBuyer && selectedBuyer !== buyer.name ? 0.3 : 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 2,
            });
        });
    }, [selectedBuyer, mapData, maxRevenue]);

    const renderOverlay = (message: string) => (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary-bg/50 dark:bg-dark-secondary-bg/50 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-4 p-4 bg-secondary-bg dark:bg-dark-secondary-bg rounded-lg shadow-md">
                <Spinner size="md" />
                <p className="text-secondary-text dark:text-dark-secondary-text">{message}</p>
            </div>
        </div>
    );
    
    if (loadError) return <div className="flex flex-col items-center justify-center h-[400px] bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/50"><div className="text-red-500 text-sm mb-2">⚠️ {loadError}</div></div>;

    return (
        <div className="relative" aria-label="Map of top buyers" role="figure" tabIndex={0}>
            <div ref={mapRef} className="w-full h-[400px] rounded-lg overflow-hidden border border-border-color dark:border-dark-border-color bg-gray-200 dark:bg-zinc-800" />
            {(isLoading || !isMapLoaded || isGeocoding) && renderOverlay(isLoading ? 'Fetching data...' : isGeocoding ? 'Finding exact locations...' : 'Loading map...')}
            {!isLoading && !isGeocoding && mapData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-secondary-text dark:text-dark-secondary-text">No geocodable locations for buyers</div>
            )}
            {mapData.length > 0 && <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-zinc-800/80 px-2 py-1 rounded-md shadow-md text-xs text-secondary-text dark:text-dark-secondary-text">📍 {mapData.length} location{mapData.length !== 1 ? 's' : ''}</div>}
        </div>
    );
});

TopBuyersMap.displayName = 'TopBuyersMap';

export default TopBuyersMap;