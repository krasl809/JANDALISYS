import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import { Box, Typography, Paper, Chip, useTheme, LinearProgress, Card } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ContractSummary } from '../../types/contracts';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import ReactDOMServer from 'react-dom/server';

// Fix for default marker icon - we will use custom DivIcons instead
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ShipmentMapProps {
  contracts: ContractSummary[];
}

// Mock Ports Data
const PORTS = {
    'SANTOS': { lat: -23.9618, lng: -46.3322, name: 'Santos, Brazil' },
    'ROTTERDAM': { lat: 51.9244, lng: 4.4777, name: 'Rotterdam, Netherlands' },
    'SHANGHAI': { lat: 31.2304, lng: 121.4737, name: 'Shanghai, China' },
    'JEBEL_ALI': { lat: 25.0236, lng: 55.0403, name: 'Jebel Ali, UAE' },
    'JEDDAH': { lat: 21.4858, lng: 39.1925, name: 'Jeddah, KSA' },
    'SINGAPORE': { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
    'ODESSA': { lat: 46.4825, lng: 30.7233, name: 'Odessa, Ukraine' },
    'CONSTANTA': { lat: 44.1792, lng: 28.6121, name: 'Constanta, Romania' }
 };
 
 // Mock Data for Demo
 const DEMO_DATA: ContractSummary[] = [
    {
        id: 'mock-1',
        no: 'CNT-2025-001',
        type: 'Import',
        client: 'Global Foods Ltd',
        commodity: 'Wheat',
        qty: 50000,
        value: 12500000,
        status: 'Active',
        progress: 75
    },
    {
        id: 'mock-2',
        no: 'CNT-2025-004',
        type: 'Export',
        client: 'Middle East Grains',
        commodity: 'Barley',
        qty: 35000,
        value: 8200000,
        status: 'Pending',
        progress: 30
    },
     {
        id: 'mock-3',
        no: 'CNT-2025-009',
        type: 'Import',
        client: 'Asian Rice Corp',
        commodity: 'Rice',
        qty: 25000,
        value: 15000000,
        status: 'Active',
        progress: 60
    },
    {
        id: 'mock-4',
        no: 'CNT-2025-012',
        type: 'Export',
        client: 'Euro Ag',
        commodity: 'Corn',
        qty: 60000,
        value: 11000000,
        status: 'Active',
        progress: 15
    },
    {
        id: 'mock-5',
        no: 'CNT-2025-015',
        type: 'Import',
        client: 'North African Mills',
        commodity: 'Soybeans',
        qty: 40000,
        value: 18000000,
        status: 'Active',
        progress: 90
    }
];

 // Helper to generate deterministic mock route based on contract ID
const getMockRoute = (contract: ContractSummary) => {
  // Simple hash function for deterministic selection
  let hash = 0;
  const str = contract.id + contract.no;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  
  // Select Origin and Destination based on hash
  const portKeys = Object.keys(PORTS);
  const originIndex = absHash % portKeys.length;
  const destIndex = (absHash >> 3) % portKeys.length;
  
  // Ensure origin != dest
  const originKey = portKeys[originIndex];
  const destKey = portKeys[destIndex === originIndex ? (destIndex + 1) % portKeys.length : destIndex];
  
  const origin = PORTS[originKey as keyof typeof PORTS];
  const dest = PORTS[destKey as keyof typeof PORTS];
  
  // Calculate progress based on contract progress or random
  const progress = contract.progress || ((absHash % 80) + 10); // 10% to 90% if not set
  
  // Calculate current ship position (linear interpolation for simplicity, though earth is spherical)
  // In a real app, use geodesic interpolation
  const currentLat = origin.lat + (dest.lat - origin.lat) * (progress / 100);
  const currentLng = origin.lng + (dest.lng - origin.lng) * (progress / 100);

  const toRad = (value: number) => (value * Math.PI) / 180;
  const toDeg = (value: number) => (value * 180) / Math.PI;
  const originLat = toRad(origin.lat);
  const originLng = toRad(origin.lng);
  const destLat = toRad(dest.lat);
  const destLng = toRad(dest.lng);
  const y = Math.sin(destLng - originLng) * Math.cos(destLat);
  const x = Math.cos(originLat) * Math.sin(destLat) -
            Math.sin(originLat) * Math.cos(destLat) * Math.cos(destLng - originLng);
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;

  return {
    origin,
    dest,
    current: { lat: currentLat, lng: currentLng },
    progress,
    bearing
  };
};

const createShipIcon = (color: string, bearing: number = 0) => {
    return L.divIcon({
        className: 'custom-ship-icon',
        html: ReactDOMServer.renderToString(
            <Box sx={{ 
                position: 'relative',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'translate(-24px, -24px)'
            }}>
                <Box sx={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    right: 6,
                    bottom: 6,
                    borderRadius: '50%',
                    bgcolor: color,
                    opacity: 0.25,
                    animation: 'pulse-ring 2.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite'
                }} />
                <Box sx={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    right: 6,
                    bottom: 6,
                    borderRadius: '50%',
                    bgcolor: color,
                    opacity: 0.2,
                    animation: 'pulse-ring 2.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
                    animationDelay: '1.2s'
                }} />
                <Box sx={{
                    position: 'relative',
                    width: 34,
                    height: 34,
                    bgcolor: 'white',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
                    border: `2px solid ${color}`,
                    zIndex: 2,
                    animation: 'ship-bob 1.6s ease-in-out infinite'
                }}>
                    <Box sx={{ transform: `rotate(${bearing}deg)`, transition: 'transform 0.3s ease-out' }}>
                        <Box
                            component="svg"
                            viewBox="0 0 64 64"
                            sx={{ width: 22, height: 22, color }}
                        >
                            <path
                                d="M32 6 L40 14 L40 24 L54 38 L54 46 L32 58 L10 46 L10 38 L24 24 L24 14 Z"
                                fill="currentColor"
                            />
                            <path
                                d="M32 12 L36 16 L36 22 L32 26 L28 22 L28 16 Z"
                                fill="rgba(255,255,255,0.7)"
                            />
                            <path
                                d="M18 40 L32 50 L46 40"
                                stroke="rgba(255,255,255,0.8)"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>
        ),
        iconSize: [48, 48],
        iconAnchor: [24, 24]
    });
};

const createPortIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-port-icon',
        html: ReactDOMServer.renderToString(
            <Box sx={{ 
                color: color, 
                bgcolor: 'white',
                borderRadius: '50%',
                width: 12,
                height: 12,
                border: `2px solid ${color}`,
                transform: 'translate(-6px, -6px)'
            }} />
        ),
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
};

const ShipmentMap: React.FC<ShipmentMapProps> = ({ contracts }) => {
  const theme = useTheme();
  
  // Filter only active or pending contracts for the map
  const activeContracts = contracts.filter(c => 
    ['Active', 'Pending', 'Shipping'].includes(c.status)
  );

  // Combine real contracts with demo data for visualization
  const displayContracts = [...activeContracts, ...DEMO_DATA];

  return (
    <Card 
        sx={{ 
            height: 400, 
            width: '100%', 
            overflow: 'hidden', 
            borderRadius: '12px', 
            mb: 4,
            boxShadow: theme.shadows[3],
            border: `1px solid ${theme.palette.divider}`,
            position: 'relative'
        }}
    >
      <Box sx={{ 
          position: 'absolute', 
          top: 12, 
          left: 12, 
          zIndex: 1000, 
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(6px)',
          px: 2, 
          py: 0.75, 
          borderRadius: '20px',
          boxShadow: theme.shadows[4],
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1
      }}>
          <DirectionsBoatIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight="bold" color={theme.palette.text.primary}>
             Live Shipments Tracker
          </Typography>
      </Box>

      <MapContainer 
        center={[25, 45]} 
        zoom={3} 
        style={{ height: '100%', width: '100%', background: theme.palette.background.default }}
        scrollWheelZoom={false}
      >
        <style>
            {`
            @keyframes pulse-ring {
                0% { transform: scale(0.6); opacity: 0.55; }
                100% { transform: scale(2.4); opacity: 0; }
            }
            @keyframes ship-bob {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-2px); }
                100% { transform: translateY(0px); }
            }
            `}
        </style>
        {/* Map Tiles: Esri Dark Gray for Dark Mode (Professional Slate), CartoDB Positron for Light Mode */}
        {theme.palette.mode === 'dark' ? (
            <>
                <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={16}
                />
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={16}
                />
            </>
        ) : (
            <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
        )}
        
        {displayContracts.map((contract) => {
          const route = getMockRoute(contract);
          const color = contract.status === 'Active' ? theme.palette.primary.main : theme.palette.warning.main;
          
          return (
            <React.Fragment key={contract.id}>
                {/* Route Line */}
                <Polyline 
                    positions={[
                        [route.origin.lat, route.origin.lng],
                        [route.dest.lat, route.dest.lng]
                    ]}
                    pathOptions={{ 
                        color: color, 
                        weight: 2, 
                        opacity: 0.4, 
                        dashArray: '5, 10' 
                    }}
                />
                
                {/* Origin Port */}
                <Marker 
                    position={[route.origin.lat, route.origin.lng]}
                    icon={createPortIcon(theme.palette.text.secondary)}
                >
                    <Popup closeButton={false}>
                        <Typography variant="caption" fontWeight="bold">Origin: {route.origin.name}</Typography>
                    </Popup>
                </Marker>

                {/* Destination Port */}
                <Marker 
                    position={[route.dest.lat, route.dest.lng]}
                    icon={createPortIcon(theme.palette.text.secondary)}
                >
                     <Popup closeButton={false}>
                        <Typography variant="caption" fontWeight="bold">Dest: {route.dest.name}</Typography>
                    </Popup>
                </Marker>

                {/* Current Ship Position */}
                <Marker 
                    position={[route.current.lat, route.current.lng]}
                    icon={createShipIcon(color, route.bearing)}
                >
                  <Popup minWidth={200}>
                    <Box sx={{ p: 0.5 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Chip 
                            label={contract.status} 
                            size="small" 
                            color={contract.status === 'Active' ? 'primary' : 'warning'}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                          <Typography variant="caption" color="text.secondary">{contract.no}</Typography>
                      </Box>
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {contract.client}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 1 }}>
                        {contract.commodity} • {contract.qty} MT
                      </Typography>
                      
                      <Box sx={{ mt: 1 }}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="text.secondary">{route.origin.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{route.dest.name}</Typography>
                        </Box>
                        <LinearProgress 
                            variant="determinate" 
                            value={route.progress} 
                            sx={{ 
                                height: 4, 
                                borderRadius: 2,
                                bgcolor: theme.palette.grey[200],
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: color
                                }
                            }} 
                        />
                      </Box>
                    </Box>
                  </Popup>
                </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </Card>
  );
};

export default ShipmentMap;
