import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Polygon, Marker, Popup, useMapEvents, CircleMarker, useMap, Tooltip } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import { motion, AnimatePresence } from 'motion/react';
import { Map as MapIcon, Users, MapPin, History, Flame, Plus, CheckCircle, AlertCircle, Save, Trash2, Calendar, Clock, ChevronRight, ChevronLeft, Layers, Undo2, Edit3, X, Filter, Package, Search, Pencil, Utensils, Edit, Info, AlertTriangle, Activity, CircleDot } from 'lucide-react';
import L from 'leaflet';
import { Circuit, Distribution, MaraudeEvent, MaraudeTeam, Registration, Report, StockItem, StockCategory } from '../types';
import { cn, formatDisplayDate } from '../lib/utils';
import { PageSkeleton } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, isAfter, isBefore, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

import { PedestrianPolyline } from '../components/PedestrianPolyline';

const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MaraudeMapPage = () => {
  const [events, setEvents] = useState<MaraudeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [associations, setAssociations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'maraudes' | 'analysis' | 'create' | 'edit'>('maraudes');
  const [analyseMode, setAnalyseMode] = useState<'heatmap' | 'markers' | 'bubbles'>('heatmap');
  const [mapStyle, setMapStyle] = useState<keyof typeof mapTiles>("OSM France");
  const [isStyleExpanded, setIsStyleExpanded] = useState(false);
  
  const mapTiles = {
    "OSM Standard": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    "OSM France": "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    "OSM HOT": "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
  };
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'planned' | 'completed'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  
  // Create/Edit Mode State
  const [planDate, setPlanDate] = useState('');
  const [prepLocation, setPrepLocation] = useState('');
  const [prepTime, setPrepTime] = useState('19:00');
  const [startLocation, setStartLocation] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [prepDescription, setPrepDescription] = useState('');
  const [infoDocumentUrl, setInfoDocumentUrl] = useState('');
  const [prepCoords, setPrepCoords] = useState<{lat: number, lng: number} | null>(null);
  const [startCoords, setStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [locationSelecting, setLocationSelecting] = useState<'prep' | 'start' | null>(null);
  
  const [planTeams, setPlanTeams] = useState<{ id?: number, team_name: string, path_data: [number, number][], color: string, path_type?: 'line' | 'zone' | 'pedestrian' }[]>([
    { team_name: 'Équipe 1', path_data: [], color: '#ef4444', path_type: 'line' }
  ]);
  const [globalPathType, setGlobalPathType] = useState<'line' | 'zone' | 'pedestrian'>('line');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [activeTeamIdx, setActiveTeamIdx] = useState<number | null>(null);
  
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  
  const [heatmapRange, setHeatmapRange] = useState({ start: '', end: '' });
  const [appliedHeatmapRange, setAppliedHeatmapRange] = useState({ start: '', end: '' });
  const [heatmapType, setHeatmapType] = useState<'encountered' | 'helped'>('encountered');
  const [mapZoom, setMapZoom] = useState(13);
  const [mapCenter, setMapCenter] = useState<[number, number]>([43.6047, 1.4442]);
  const [distributionModal, setDistributionModal] = useState<{lat: number, lng: number, teamId: number, mobile_meals_delivered?: number} | null>(null);
  const [confirmDistributionModal, setConfirmDistributionModal] = useState<{id: number, requested: number} | null>(null);
  const [distributionType, setDistributionType] = useState<'completed' | 'pending'>('completed');
  const [reportModal, setReportModal] = useState<{ teamId: number, eventId: number, reportId?: number } | null>(null);
  const [expandedVolunteersTeamId, setExpandedVolunteersTeamId] = useState<number | null>(null);
  const [expandedPrepVolunteersId, setExpandedPrepVolunteersId] = useState<number | null>(null);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  const [reportContent, setReportContent] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' | 'info' } | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string, type?: 'danger' | 'warning' | 'info' } | null>(null);
  const [maraudeWarnings, setMaraudeWarnings] = useState<string[]>([]);
  const [peopleHelpedCount, setPeopleHelpedCount] = useState<string>("0");
  const [teamStock, setTeamStock] = useState<StockItem[]>([]);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [bagModal, setBagModal] = useState<number | null>(null); // eventId
  const [mealModal, setMealModal] = useState<number | null>(null); // eventId
  const [mealsPrepared, setMealsPrepared] = useState<number>(0);
  const [mealsDescription, setMealsDescription] = useState<string>('');
  const [unitPerMeal, setUnitPerMeal] = useState<number>(0.4); // Default 0.4L or Kg per meal
  const [unitType, setUnitType] = useState<string>('L');
  const [editingDistributionId, setEditingDistributionId] = useState<number | null>(null);
  const [closeMaraudeModal, setCloseMaraudeModal] = useState<number | null>(null); // eventId
  const [availableStock, setAvailableStock] = useState<StockItem[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [stockSortOrder, setStockSortOrder] = useState<'asc' | 'desc'>('asc');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<number | 'all'>('all');
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [itemsToReturn, setItemsToReturn] = useState<StockItem[]>([]);
  const [allBeneficiaries, setAllBeneficiaries] = useState<any[]>([]);
  const [beneficiaryEntries, setBeneficiaryEntries] = useState<Array<{ id?: number, first_name: string, last_name: string, comment: string, search: string, showDropdown: boolean, direct_help?: boolean, mobile_meal?: boolean }>>([]);
  
  const [showCircuits, setShowCircuits] = useState(true);
  const [showDistributions, setShowDistributions] = useState(true);
  const [showPendingDistributions, setShowPendingDistributions] = useState(true);
  const [showMemberLocations, setShowMemberLocations] = useState(true);
  const [memberLocations, setMemberLocations] = useState<Record<number, { lat: number, lng: number, username: string, avatar_url: string, team_color: string, last_updated: string }>>({});
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [consentModal, setConsentModal] = useState<{ eventId: number, teamId: number } | null>(null);
  const [selectedTeamsForMap, setSelectedTeamsForMap] = useState<number[]>([]);
  const [selectedAssoId, setSelectedAssoId] = useState<number | 'all'>('all');
  const [filterMaraudeStatus, setFilterMaraudeStatus] = useState<'planned' | 'past' | 'all'>('planned');
  const [filterMaraudeStartDate, setFilterMaraudeStartDate] = useState(format(subDays(new Date(), 0), 'yyyy-MM-dd'));
  const [filterMaraudeEndDate, setFilterMaraudeEndDate] = useState(format(subDays(new Date(), -7), 'yyyy-MM-dd'));
  const [showExternalMaraudes, setShowExternalMaraudes] = useState(false);
  const [filterAnalyseType, setFilterAnalyseType] = useState<'helped' | 'all'>('all'); // helped or all (helped + encountered)
  const [isSelectionInitialized, setIsSelectionInitialized] = useState(false);

  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS connected");
      if (user?.association_id) {
        ws.send(JSON.stringify({
          type: 'IDENTIFY',
          userId: user.id,
          associationId: user.association_id
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'LOCATION_UPDATED') {
          setMemberLocations(prev => ({
            ...prev,
            [data.userId]: {
              lat: data.lat,
              lng: data.lng,
              username: data.username,
              avatar_url: data.avatar_url,
              team_color: data.team_color,
              last_updated: new Date().toISOString()
            }
          }));
        }
        if (data.type === 'LOCATION_REMOVED') {
          setMemberLocations(prev => {
            const next = { ...prev };
            delete next[data.userId];
            return next;
          });
        }
      } catch (e) {
        console.error("WS message error:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [user]);

  useEffect(() => {
    const count = parseInt(peopleHelpedCount) || 1;
    setBeneficiaryEntries(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        const newEntries = [...prev];
        for (let i = prev.length; i < count; i++) {
          newEntries.push({ first_name: '', last_name: '', comment: '', search: '', showDropdown: false });
        }
        return newEntries;
      }
      return prev.slice(0, count);
    });
  }, [peopleHelpedCount]);

  useEffect(() => {
    if (!isSharingLocation || !user || !wsRef.current) return;

    let watchId: number;

    const startWatching = () => {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            
            // Find all active maraudes and teams the user is in
            const userRegs = registrations.filter(r => r.user_id === user.id);
            
            userRegs.forEach(reg => {
              const team = events.flatMap(e => e.teams).find(t => t.id === reg.maraude_team_id);
              const event = events.find(e => e.teams.some(t => t.id === reg.maraude_team_id));
              
              if (team && event && event.status !== 'completed') {
                wsRef.current?.send(JSON.stringify({
                  type: 'UPDATE_LOCATION',
                  userId: user.id,
                  eventId: event.id,
                  teamId: team.id,
                  lat: latitude,
                  lng: longitude,
                  username: user.username,
                  avatar_url: user.avatar_url,
                  team_color: team.color,
                  associationId: user.association_id
                }));
              }
            });

            // Check if user has any active maraudes left to share
            const hasActiveMaraude = userRegs.some(reg => {
              const event = events.find(e => e.teams.some(t => t.id === reg.maraude_team_id));
              return event && event.status !== 'completed';
            });

            if (!hasActiveMaraude) {
              setIsSharingLocation(false);
            }
          },
          (error) => {
            console.error("Geolocation error:", error);
            setIsSharingLocation(false);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      }
    };

    startWatching();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (user) {
        wsRef.current?.send(JSON.stringify({
          type: 'STOP_SHARING',
          userId: user.id,
          eventId: registrations.find(r => r.user_id === user.id)?.maraude_team_id ? 
            events.find(e => e.teams.some(t => t.id === registrations.find(r => r.user_id === user.id)?.maraude_team_id))?.id : undefined
        }));
      }
    };
  }, [isSharingLocation, user, registrations, events]);

  useEffect(() => {
    if (selectedEventId) {
      authFetch(`/api/maraude-locations/${selectedEventId}`)
        .then(res => res.json())
        .then(data => {
          const locs: any = {};
          data.forEach((l: any) => {
            locs[l.user_id] = {
              lat: l.lat,
              lng: l.lng,
              username: l.username,
              avatar_url: l.avatar_url,
              team_color: l.team_color,
              last_updated: l.last_updated
            };
          });
          setMemberLocations(locs);
          
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'JOIN_EVENT',
              userId: user?.id,
              eventId: selectedEventId,
              associationId: user?.association_id
            }));
          }
        });
    }
  }, [selectedEventId, user, authFetch]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (events.length > 0 && !isSelectionInitialized) {
      const allTeamIds: number[] = events.flatMap(e => e.teams.map(t => t.id));
      setSelectedTeamsForMap(allTeamIds);
      setIsSelectionInitialized(true);
    }
  }, [events, isSelectionInitialized]);

  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  
  const now = new Date();
  const recentDistributions = distributions.filter(d => {
    if (!d.timestamp) return false;
    const dDate = parseISO(d.timestamp);
    if (appliedHeatmapRange.start && isBefore(dDate, parseISO(appliedHeatmapRange.start))) return false;
    if (appliedHeatmapRange.end && isAfter(dDate, parseISO(appliedHeatmapRange.end))) return false;
    
    // Default to last 30 days if no range applied
    if (!appliedHeatmapRange.start && !appliedHeatmapRange.end) {
      const thirtyDaysAgo = subDays(now, 30);
      return isAfter(dDate, thirtyDaysAgo);
    }
    return true;
  });

  const analysisMaraudeIds = new Set(recentDistributions.map(d => d.maraude_event_id));
  const analysisEvents = events.filter(e => analysisMaraudeIds.has(e.id));

  const toggleEvent = (id: number) => {
    const newId = expandedEventId === id ? null : id;
    setExpandedEventId(newId);
    
    if (newId === null) {
      setSelectedEventId(null);
      setSelectedTeamId(null);
    } else {
      setSelectedEventId(newId);
      setSelectedTeamId(null);
    }
  };

  const fetchData = async () => {
    try {
      const res = await authFetch('/api/maraude/dashboard-summary');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch dashboard summary: ${res.status} ${res.statusText}. Body: ${text.substring(0, 100)}`);
      }
      
      const { 
        events: eventsData, 
        distributions: distributionsData, 
        registrations: regsData, 
        reports: reportsData, 
        categories: catsData, 
        beneficiaries: benData, 
        associations: assoData 
      } = await res.json();
      
      const processedEvents = Array.isArray(eventsData) ? eventsData.map((e: any) => ({
        ...e,
        teams: e.teams?.map((t: any) => {
          let parsedPath = typeof t.path_data === 'string' ? JSON.parse(t.path_data || '[]') : (t.path_data || []);
          
          for (let i = 0; i < 2; i++) {
            if (typeof parsedPath === 'string') {
               try { parsedPath = JSON.parse(parsedPath); } catch {}
            }
          }
          if (Array.isArray(parsedPath) && parsedPath.length > 0 && typeof parsedPath[0] === 'string' && (parsedPath[0] === '[' || parsedPath[0] === '"')) {
            try { parsedPath = JSON.parse(parsedPath.join('')); } catch {}
            if (typeof parsedPath === 'string') {
              try { parsedPath = JSON.parse(parsedPath); } catch {}
            }
          }

          return {
            ...t,
            path_data: Array.isArray(parsedPath) ? parsedPath.filter((p: any) => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null && !isNaN(parseFloat(p[0]))).map((p: any) => [parseFloat(p[0]), parseFloat(p[1])]) : []
          };
        }) || []
      })) : [];
      
      setEvents(processedEvents);
      setAssociations(Array.isArray(assoData) ? assoData : []);
      
      const processedDistributions = Array.isArray(distributionsData) ? distributionsData.map((d: any) => ({
        ...d,
        lat: d.lat != null ? Number(d.lat) : null,
        lng: d.lng != null ? Number(d.lng) : null,
        timestamp: d.timestamp && !d.timestamp.endsWith('Z') 
          ? d.timestamp.replace(' ', 'T') + 'Z' 
          : d.timestamp
      })) : [];
      setDistributions(processedDistributions);

      setRegistrations(Array.isArray(regsData) ? regsData : []);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      setAllBeneficiaries(Array.isArray(benData) ? benData : []);
      
      if (expandedEventId === null && Array.isArray(eventsData) && eventsData.length > 0) {
        setExpandedEventId(eventsData[0].id);
        setSelectedEventId(eventsData[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setNotification({ message: "Erreur lors du chargement des données.", type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleCompleteEvent = async (eventId: number, skipConfirm = false) => {
    const event = events.find(e => e.id === eventId);
    if (!event) {
      setNotification({ message: "Événement non trouvé.", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return false;
    }

    const teamIds = event.teams.map(t => t.id);
    const teamsWithReports = reports.filter(r => teamIds.includes(r.maraude_team_id)).map(r => r.maraude_team_id);
    const missingReports = event.teams.filter(t => !teamsWithReports.includes(t.id));

    if (missingReports.length > 0 && !skipConfirm) {
      const teamNames = missingReports.map(t => t.team_name).join(', ');
      setConfirmation({
        title: "Compte-rendus manquants",
        message: `Attention: Les équipes suivantes n'ont pas encore soumis de compte-rendu : ${teamNames}. Voulez-vous quand même clôturer la maraude ?`,
        onConfirm: () => handleCompleteEvent(eventId, true),
        confirmText: "Clôturer quand même",
        type: 'warning'
      });
      return false;
    }

    setIsProcessing(`complete-${eventId}`);
    try {
      const res = await authFetch(`/api/maraude-events/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      if (res.ok) {
        fetchData();
        setNotification({ message: "Maraude clôturée avec succès !", type: 'success' });
        setTimeout(() => setNotification(null), 3000);
        return true;
      } else {
        const err = await res.json();
        setNotification({ message: "Erreur lors de la clôture : " + err.error, type: 'error' });
        setTimeout(() => setNotification(null), 5000);
        return false;
      }
    } catch (error) {
      console.error("Complete event error:", error);
      setNotification({ message: "Erreur réseau lors de la clôture de la maraude.", type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return false;
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRegister = async (teamId: number, asLeader: boolean) => {
    if (isProcessing) {
      return;
    }
    
    if (!user) {
      setNotification({ type: 'error', message: "Vous devez être connecté pour vous inscrire." });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Check if user is already registered in this specific maraude event
    const teamToJoin = events.flatMap(e => e.teams).find(t => t.id === teamId);
    if (!teamToJoin) return;
    
    const eventId = teamToJoin.event_id;
    const activeUserRegs = registrations.filter(r => r.user_id === user.id);
    const isAlreadyInThisMaraude = activeUserRegs.some(reg => {
      const team = events.flatMap(e => e.teams).find(t => t.id === reg.maraude_team_id);
      return team && team.event_id === eventId;
    });

    if (isAlreadyInThisMaraude) {
      setNotification({
        type: 'error',
        message: "Vous êtes déjà inscrit(e) à une équipe de cette maraude."
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    const actionId = `reg-${teamId}`;
    setIsProcessing(actionId);
    try {
      const res = await authFetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maraude_team_id: teamId, user_id: user.id, is_leader: asLeader })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchData();
        // After successful registration, show consent modal for location sharing
        const event = events.find(e => e.teams.some(t => t.id === teamId));
        if (event && event.status !== 'completed') {
          setConsentModal({ eventId: event.id, teamId });
        }
      } else {
        console.error("Registration failed:", data.error);
        setNotification({ type: 'error', message: data.error || "Erreur lors de l'inscription" });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setNotification({ type: 'error', message: "Une erreur réseau est survenue." });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUnregister = async (teamId: number) => {
    if (isProcessing || !user) return;
    setIsProcessing(`unreg-${teamId}`);
    try {
      const res = await authFetch(`/api/registrations/${teamId}/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        // Stop sharing location if they unregister from their active maraude
        const event = events.find(e => e.teams.some(t => t.id === teamId));
        if (event && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'STOP_SHARING',
            userId: user.id,
            eventId: event.id
          }));
        }
      } else {
        const data = await res.json();
        setNotification({ type: 'error', message: data.error || "Erreur lors de la désinscription" });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error("Unregister error:", error);
      setNotification({ type: 'error', message: "Une erreur réseau est survenue." });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePrepRegister = async (eventId: number) => {
    if (isProcessing || !user) return;
    setIsProcessing(`prep-reg-${eventId}`);
    try {
      const res = await authFetch('/api/prep-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maraude_event_id: eventId, user_id: user.id })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Prep registration error:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePrepUnregister = async (eventId: number) => {
    if (isProcessing || !user) return;
    setIsProcessing(`prep-unreg-${eventId}`);
    try {
      const res = await authFetch(`/api/prep-registrations/${eventId}/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Prep unregistration error:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const openReportModal = async (teamId: number, eventId: number, existingReport?: Report) => {
    if (existingReport) {
      setReportContent(existingReport.content);
      setPeopleHelpedCount((existingReport.people_helped || 0).toString());
      setReportModal({ teamId, eventId, reportId: existingReport.id });
    } else {
      const teamDistributions = distributions.filter(d => d.maraude_team_id === teamId);
      const totalHelped = teamDistributions.reduce((sum, d) => sum + d.people_helped, 0);
      setPeopleHelpedCount(totalHelped.toString());
      setReportContent('');
      setReportModal({ teamId, eventId });
    }

    // Fetch stock items for this event
    setIsStockLoading(true);
    try {
      const res = await authFetch(`/api/stock/event/${eventId}`);
      if (res.ok) {
        setTeamStock(await res.json());
      }
    } catch (error) {
      console.error("Error fetching event stock:", error);
    } finally {
      setIsStockLoading(false);
    }
  };

  const fetchAvailableStock = async (eventId?: number) => {
    try {
      const [stockRes, eventStockRes] = await Promise.all([
        authFetch('/api/stock'),
        eventId ? authFetch(`/api/stock/event/${eventId}`) : Promise.resolve(null)
      ]);
      
      if (stockRes.ok) {
        const data = await stockRes.json();
        setAvailableStock(data.filter((s: StockItem) => s.status === 'available'));
      }
      
      if (eventStockRes && eventStockRes.ok) {
        setTeamStock(await eventStockRes.json());
      }
    } catch (error) {
      console.error("Error fetching available stock:", error);
    }
  };

  const handleAssignToBag = async (stockId: number, eventId: number) => {
    try {
      const res = await authFetch('/api/stock/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: stockId,
          quantity: 1,
          maraude_event_id: eventId,
          maraude_team_id: "", // Assign to event, not team
          date: new Date().toISOString()
        })
      });
      if (res.ok) {
        fetchAvailableStock(eventId);
      }
    } catch (error) {
      console.error("Error assigning to bag:", error);
    }
  };

  const handleReturnFromBag = async (stockId: number, eventId: number) => {
    try {
      const res = await authFetch('/api/stock/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: stockId })
      });
      if (res.ok) {
        fetchAvailableStock(eventId);
      }
    } catch (error) {
      console.error("Error returning from bag:", error);
    }
  };

  const handleReturnStock = async (stockId: number) => {
    try {
      const res = await authFetch('/api/stock/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: stockId })
      });
      if (res.ok) {
        // Update local state
        setTeamStock(prev => prev.filter(item => item.id !== stockId));
      }
    } catch (error) {
      console.error("Error returning stock:", error);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    setConfirmation({
      title: "Supprimer le compte-rendu",
      message: "Êtes-vous sûr de vouloir supprimer ce compte-rendu ?",
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/reports/${reportId}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchData();
            setNotification({ message: "Compte-rendu supprimé", type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          } else {
            const err = await res.json();
            setNotification({ message: "Erreur lors de la suppression : " + err.error, type: 'error' });
            setTimeout(() => setNotification(null), 5000);
          }
        } catch (error) {
          setNotification({ message: "Erreur réseau lors de la suppression.", type: 'error' });
          setTimeout(() => setNotification(null), 5000);
        }
      },
      type: 'danger'
    });
  };

  const handleSaveReport = async () => {
    if (!reportModal || reportContent.length > 2000) return;
    setIsProcessing('report');
    try {
      if (reportModal.reportId) {
        await authFetch(`/api/reports/${reportModal.reportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: reportContent })
        });
      } else {
        await authFetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maraude_team_id: reportModal.teamId,
            content: reportContent,
            author: user?.username,
            user_id: user?.id,
            people_helped: parseInt(peopleHelpedCount) || 0
          })
        });
      }
      
      setReportModal(null);
      setReportContent('');
      setPeopleHelpedCount("0");
      await fetchData();
    } catch (error) {
      console.error("Report error:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const addPlanTeam = () => {
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
    const nextColor = colors[planTeams.length % colors.length];
    setPlanTeams([...planTeams, { team_name: `Équipe ${planTeams.length + 1}`, path_data: [], color: nextColor, path_type: globalPathType }]);
  };

  const removePlanTeam = (idx: number) => {
    if (planTeams.length <= 1) return;
    const updated = planTeams.filter((_, i) => i !== idx);
    setPlanTeams(updated);
    
    if (activeTeamIdx !== null) {
      if (idx === activeTeamIdx) {
        setActiveTeamIdx(null);
      } else if (idx < activeTeamIdx) {
        setActiveTeamIdx(activeTeamIdx - 1);
      }
    }
  };

  const handleSaveMaraude = async () => {
    if (isProcessing) return;
    
    if (!planDate) {
      setNotification({ message: "Veuillez choisir une date.", type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    const missingFields = [];
    if (!prepCoords) missingFields.push("Emplacement de préparation");
    if (!prepTime) missingFields.push("Heure de préparation");
    if (!startCoords) missingFields.push("Emplacement de rendez-vous");
    if (!startTime) missingFields.push("Heure de rendez-vous");

    if (missingFields.length > 0) {
      setNotification({ 
        message: "Informations manquantes : " + missingFields.join(", "), 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    if (planTeams.some(t => t.path_data.length < 1)) {
      setNotification({ message: "Chaque équipe doit avoir au moins 1 point sur son circuit.", type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    setIsProcessing('save');
    try {
      const url = viewMode === 'edit' ? `/api/maraude-events/${editingEventId}` : '/api/maraude-events';
      const method = viewMode === 'edit' ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: planDate,
          teams: planTeams,
          prep_location: prepCoords ? "Localisation sur la carte" : "",
          prep_time: prepTime,
          start_location: startCoords ? "Localisation sur la carte" : "",
          start_time: startTime,
          prep_lat: prepCoords?.lat,
          prep_lng: prepCoords?.lng,
          start_lat: startCoords?.lat,
          start_lng: startCoords?.lng,
          prep_description: prepDescription,
          info_document_url: infoDocumentUrl
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setNotification({ message: "Maraude enregistrée avec succès !", type: 'success' });
        setTimeout(() => setNotification(null), 3000);
        resetForm();
        await fetchData();
      } else {
        console.error("Save failed:", data.error);
        setNotification({ message: "Erreur lors de l'enregistrement : " + data.error, type: 'error' });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error("Save error:", error);
      setNotification({ message: "Erreur réseau lors de l'enregistrement.", type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteEvent = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) {
      return;
    }
    
    setEventToDelete(id);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    const id = eventToDelete;
    setIsProcessing(`del-${id}`);
    try {
      const res = await authFetch(`/api/maraude-events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setEventToDelete(null);
        await fetchData();
        setNotification({ message: "Maraude supprimée avec succès", type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        console.error("Delete failed:", data.error);
        setNotification({ message: data.error || "Erreur lors de la suppression", type: 'error' });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error("Delete error:", error);
      setNotification({ message: "Erreur réseau lors de la suppression.", type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(null);
    }
  };

  useEffect(() => {
    // We no longer force the path to start at startCoords
  }, [startCoords, globalPathType]);

  const resetForm = () => {
    setViewMode('maraudes');
    setPlanDate('');
    setPrepLocation('');
    setPrepTime('19:00');
    setStartLocation('');
    setStartTime('20:00');
    setPrepDescription('');
    setInfoDocumentUrl('');
    setPrepCoords(null);
    setStartCoords(null);
    setLocationSelecting(null);
    setPlanTeams([{ team_name: 'Équipe 1', path_data: [], color: '#10b981', path_type: 'line' }]);
    setEditingEventId(null);
    setActiveTeamIdx(null);
  };

  const startEdit = (event: MaraudeEvent) => {
    navigate(`/mutualized?action=edit&id=${event.id}`);
  };

  const handleUndo = () => {
    if (activeTeamIdx === null) return;
    const updatedTeams = [...planTeams];
    const activeTeam = updatedTeams[activeTeamIdx];
    if (activeTeam.path_data.length > 0) {
      updatedTeams[activeTeamIdx] = {
        ...activeTeam,
        path_data: activeTeam.path_data.slice(0, -1)
      };
      setPlanTeams(updatedTeams);
    }
  };

  const handleRemovePoint = (teamIdx: number, pointIdx: number) => {
    const updatedTeams = [...planTeams];
    const team = updatedTeams[teamIdx];
    updatedTeams[teamIdx] = {
      ...team,
      path_data: team.path_data.filter((_, i) => i !== pointIdx)
    };
    setPlanTeams(updatedTeams);
  };

  const MapEvents = () => {
    const viewModeRef = useRef(viewMode);
    const isAddingMarkerRef = useRef(isAddingMarker);
    const selectedTeamIdRef = useRef(selectedTeamId);
    const activeTeamIdxRef = useRef(activeTeamIdx);
    const planTeamsRef = useRef(planTeams);
    const locationSelectingRef = useRef(locationSelecting);

    useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
    useEffect(() => { isAddingMarkerRef.current = isAddingMarker; }, [isAddingMarker]);
    useEffect(() => { selectedTeamIdRef.current = selectedTeamId; }, [selectedTeamId]);
    useEffect(() => { activeTeamIdxRef.current = activeTeamIdx; }, [activeTeamIdx]);
    useEffect(() => { planTeamsRef.current = planTeams; }, [planTeams]);
    useEffect(() => { locationSelectingRef.current = locationSelecting; }, [locationSelecting]);

    useMapEvents({
      click(e) {
        if (locationSelectingRef.current === 'prep') {
          setPrepCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          setLocationSelecting(null);
        } else if (locationSelectingRef.current === 'start') {
          setStartCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          setLocationSelecting(null);
        } else if (viewModeRef.current === 'create' || viewModeRef.current === 'edit') {
          if (activeTeamIdxRef.current === null) {
            setNotification({ message: "Veuillez sélectionner une équipe pour tracer le parcours.", type: 'info' });
            setTimeout(() => setNotification(null), 3000);
            return;
          }
          const updatedTeams = [...planTeamsRef.current];
          const activeTeam = updatedTeams[activeTeamIdxRef.current];
          updatedTeams[activeTeamIdxRef.current] = {
            ...activeTeam,
            path_data: [...activeTeam.path_data, [e.latlng.lat, e.latlng.lng]]
          };
          setPlanTeams(updatedTeams);
        } else if (isAddingMarkerRef.current && selectedTeamIdRef.current) {
          addMarker(e.latlng.lat, e.latlng.lng, selectedTeamIdRef.current);
        }
      },
      zoomend(e) {
        setMapZoom(e.target.getZoom());
      },
      moveend(e) {
        const center = e.target.getCenter();
        setMapCenter([center.lat, center.lng]);
      }
    });
    return null;
  };

  const addMarker = async (lat: number, lng: number, teamId: number) => {
    setDistributionModal({ lat, lng, teamId });
    setPeopleHelpedCount("1");
    setBeneficiaryEntries([{ first_name: '', last_name: '', comment: '', search: '', showDropdown: false, direct_help: true, mobile_meal: false }]);
  };

  const confirmAddDistribution = async () => {
    if (!distributionModal) return;
    
    // Auto-compute status: if any beneficiary needs a mobile meal, the point is pending
    const needsMobileTeam = beneficiaryEntries.some(b => b.mobile_meal);
    const computedStatus = needsMobileTeam ? 'pending' : 'completed';
    
    // Filter out completely empty entries, but keep those with direct_help or mobile_meal
    // Actually, we keep all entries now because each entry represents a person met
    const validBeneficiaries = beneficiaryEntries
      .map(b => {
        if (!b.first_name && !b.last_name) {
          return { ...b, first_name: 'Anonyme' };
        }
        return b;
      });

    try {
      const url = editingDistributionId ? `/api/distributions/${editingDistributionId}` : '/api/distributions';
      const method = editingDistributionId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lat: distributionModal.lat, 
          lng: distributionModal.lng, 
          people_helped: beneficiaryEntries.length, 
          maraude_team_id: distributionModal.teamId,
          status: computedStatus,
          mobile_meals_delivered: distributionModal.mobile_meals_delivered || 0,
          beneficiaries: validBeneficiaries
        })
      });
      if (res.ok) {
        setIsAddingMarker(false);
        setDistributionModal(null);
        setEditingDistributionId(null);
        fetchData();
        setNotification({ message: editingDistributionId ? "Point mis à jour" : "Point ajouté avec succès", type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        const err = await res.json();
        console.error("Failed to add marker:", err);
        setNotification({ message: "Erreur lors de l'opération: " + err.error, type: 'error' });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error("Network error adding marker:", error);
      setNotification({ message: "Erreur réseau lors de l'opération.", type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleEditDistribution = (id: number) => {
    const dist = distributions.find(d => d.id === id);
    if (!dist) return;
    
    setEditingDistributionId(id);
    setDistributionModal({ 
      lat: dist.lat, 
      lng: dist.lng, 
      teamId: dist.maraude_team_id,
      mobile_meals_delivered: dist.mobile_meals_delivered 
    });
    
    // Fetch beneficiaries for this distribution
    authFetch(`/api/distributions/${id}/beneficiaries`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBeneficiaryEntries(data.map(b => ({
            ...b,
            search: '',
            showDropdown: false,
            direct_help: !!b.direct_help,
            mobile_meal: !!b.mobile_meal
          })));
          setPeopleHelpedCount(data.length.toString());
        }
      });
  };

  const handleDeleteDistribution = async (id: number, isPending: boolean = false) => {
    setConfirmation({
      title: "Supprimer le point",
      message: "Voulez-vous vraiment supprimer ce point de distribution ?",
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/distributions/${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchData();
            setNotification({ message: "Point supprimé", type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          } else {
            const err = await res.json();
            console.error("Failed to delete distribution:", err);
            setNotification({ message: "Erreur lors de la suppression du point: " + err.error, type: 'error' });
            setTimeout(() => setNotification(null), 5000);
          }
        } catch (error) {
          console.error("Network error deleting distribution:", error);
          setNotification({ message: "Erreur réseau lors de l'opération.", type: 'error' });
          setTimeout(() => setNotification(null), 5000);
        }
      },
      type: 'danger'
    });
  };

  const getAssoColor = (assoId: number) => {
    const asso = associations.find(a => a.id === assoId);
    return asso ? asso.color : '#10b981';
  };

  const getAssoName = (assoId: number) => {
    const asso = associations.find(a => a.id === assoId);
    return asso ? asso.name : 'Inconnue';
  };

  const filteredEvents = events.filter(e => {
    if (viewMode === 'maraudes') {
      const myAssoId = user?.association_id ?? (user as any)?.associationId;
      const isMyAsso = myAssoId != null && (e.association_id === Number(myAssoId) || e.association_id === myAssoId);
      if (!showExternalMaraudes && !isMyAsso) return false;

      const eventDate = e.date ? parseISO(e.date) : null;
      const isPast = eventDate ? isBefore(eventDate, startOfDay(new Date())) : false;
      const isFuture = eventDate ? !isPast : true;

      if (filterMaraudeStatus === 'planned' && isPast) return false;
      if (filterMaraudeStatus === 'past' && isFuture) return false;

      if (filterMaraudeStartDate && eventDate && isBefore(eventDate, parseISO(filterMaraudeStartDate))) return false;
      if (filterMaraudeEndDate && eventDate && isAfter(eventDate, parseISO(filterMaraudeEndDate))) return false;

      return true;
    }

    // Default filters for other views
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    const eventDate = new Date(e.date);
    if (filterMonth !== 'all' && eventDate.getMonth().toString() !== filterMonth) return false;
    if (filterYear !== 'all' && eventDate.getFullYear().toString() !== filterYear) return false;
    
    return true;
  });

  const filteredDistributions = distributions.filter(d => {
    const dDate = d.timestamp ? parseISO(d.timestamp) : null;
    if (!dDate) return true;

    if (viewMode === 'analysis') {
      if (appliedHeatmapRange.start && isBefore(dDate, parseISO(appliedHeatmapRange.start))) return false;
      if (appliedHeatmapRange.end && isAfter(dDate, parseISO(appliedHeatmapRange.end))) return false;
    }
    return true;
  });

  const isChefDeGroupe = user?.groups?.some(g => g.name === 'Chef d\'équipe');
  const isBureau = user?.groups?.some(g => g.name === 'Bureau');
  const isAdmin = user?.groups?.some(g => ['Administrateur', 'Admin', 'ADMIN_SITE'].includes(g.name)) || 
                  user?.roles?.some(r => ['Président·e', 'Président', 'President', 'PRESIDENT'].includes(r));

  const rightMaraude = isAdmin ? 'RWD' : (user?.rights?.['La maraude'] || '-');
  const rightEquipe = isAdmin ? 'RWD' : (user?.rights?.['Les équipes'] || '-');

  const canManage = user && (rightMaraude !== '-' || rightEquipe !== '-');

  const canCreateMaraude = isAdmin || isBureau || isChefDeGroupe || rightMaraude === 'RW' || rightMaraude === 'RWD';
  const canDeleteMaraude = isAdmin || rightMaraude === 'RWD';
  const canPrepareMaraude = isAdmin || isBureau || isChefDeGroupe || rightMaraude === 'RW' || rightMaraude === 'RWD';
  const canCloseMaraude = isAdmin || isBureau || isChefDeGroupe || rightMaraude === 'RW' || rightMaraude === 'RWD';
  
  const canRegisterAsMember = isAdmin || isBureau || rightEquipe !== '-';
  const canRegisterAsLeader = isAdmin || isBureau || isChefDeGroupe || rightEquipe === 'RW' || rightEquipe === 'RWD';
  const canCloseTeam = isAdmin || isBureau || isChefDeGroupe || rightEquipe === 'RW' || rightEquipe === 'RWD';
  const canDeleteTeam = isAdmin || rightEquipe === 'RWD';

  const canWriteReport = (teamId: number) => {
    if (isAdmin || isBureau || rightEquipe === 'RW' || rightEquipe === 'RWD') return true;
    if (isChefDeGroupe) {
      // Check if user is the leader of this team
      const registration = registrations.find(r => r.maraude_team_id === teamId && r.user_id === user?.id);
      return registration?.is_leader;
    }
    return false;
  };

  const handleCloseClick = React.useCallback(async (event: MaraudeEvent) => {
    // 1. Check missing reports
    const teamIds = event.teams.map(t => t.id);
    const teamsWithReports = reports.filter(r => teamIds.includes(r.maraude_team_id)).map(r => r.maraude_team_id);
    const missingReports = event.teams.filter(t => !teamsWithReports.includes(t.id));
    
    // 2. Check pending distributions
    const pendingDistributions = distributions.filter(d => teamIds.includes(d.maraude_team_id) && d.status === 'pending');

    // 3. Check prepared material (fetch stock)
    let materialPrepared = false;
    try {
      const res = await authFetch(`/api/stock/event/${event.id}`);
      if (res.ok) {
        const stock = await res.json();
        materialPrepared = stock.length > 0;
        setTeamStock(stock); 
      } else {
        console.error("Failed to fetch stock:", res.status);
      }
    } catch (e) {
      console.error("Error checking stock", e);
    }

    const warnings = [];
    if (missingReports.length > 0) {
      warnings.push(`${missingReports.length} équipe(s) n'ont pas terminé (compte rendu automatique sera généré).`);
    }
    if (!materialPrepared) {
      warnings.push("Aucun matériel n'a été marqué comme préparé.");
    }
    if (pendingDistributions.length > 0) {
      warnings.push(`${pendingDistributions.length} point(s) de distribution en attente (seront annulés par défaut).`);
    }

    setMaraudeWarnings(warnings);
    setCloseMaraudeModal(event.id);
    fetchAvailableStock(event.id);
  }, [reports, distributions]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-stone-50 dark:bg-stone-950 relative">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={cn(
              "fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-3",
              notification.type === 'error' ? "bg-red-500 text-white" : 
              notification.type === 'info' ? "bg-blue-500 text-white" :
              "bg-brand-green text-white"
            )}
          >
            {notification.type === 'error' ? <AlertCircle size={20} /> : 
             notification.type === 'info' ? <Info size={20} /> :
             <CheckCircle size={20} />}
            {notification.message}
          </motion.div>
        )}

        {consentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4 text-brand-green">
                <div className="p-2 bg-brand-green/10 rounded-lg">
                  <MapPin size={24} />
                </div>
                <h2 className="text-lg font-bold">Partager votre position ?</h2>
              </div>
              
              <p className="text-stone-600 dark:text-stone-400 text-sm mb-6 leading-relaxed">
                Souhaitez-vous partager votre position en temps réel avec les autres membres de votre équipe ? 
                Cela permet de mieux se coordonner sur le terrain et de voir l'avancée de la maraude en direct sur la carte.
                <br /><br />
                <span className="text-xs italic">
                  Le partage est facultatif et s'arrêtera automatiquement dès que la maraude sera clôturée.
                </span>
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsSharingLocation(false);
                    setConsentModal(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-colors"
                >
                  Plus tard
                </button>
                <button 
                  onClick={() => {
                    setIsSharingLocation(true);
                    setConsentModal(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-green text-white font-bold text-sm hover:bg-brand-green/90 transition-colors shadow-sm"
                >
                  Partager
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="w-full h-[40%] md:h-auto md:w-96 bg-white dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700 flex flex-col overflow-y-auto shrink-0">
        <div className="p-6 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black flex items-center gap-2 tracking-tight text-text-main">
              <MapIcon className="text-brand-green" /> Carte Intranet
            </h2>
            <button onClick={() => setViewMode('maraudes')} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors text-stone-500">
              <Undo2 size={20} />
            </button>
          </div>

          {canCreateMaraude && (
            <button onClick={() => navigate('/mutualized?action=create')} className="w-full mb-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-sm">
              <Plus size={18} /> Planifier un parcours
            </button>
          )}

          <div className="mb-6">
            <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1 ml-1">Vue actuelle</label>
            <div className="flex bg-stone-100 dark:bg-stone-700 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('maraudes')}
                className={cn(
                  "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                  viewMode === 'maraudes' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                )}
              >
                Maraudes
              </button>
              <button 
                onClick={() => setViewMode('analysis')}
                className={cn(
                  "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                  viewMode === 'analysis' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                )}
              >
                Analyse
              </button>
            </div>
            {(viewMode === 'create' || viewMode === 'edit') && (
              <div className="mt-2 p-2 bg-brand-green/10 text-brand-green text-[10px] font-bold rounded-lg text-center uppercase tracking-wider">
                {viewMode === 'create' ? 'Formulaire de création' : "Formulaire d'édition"}
              </div>
            )}
          </div>

          {viewMode === 'maraudes' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
                <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Filter size={14} className="text-brand-green" /> Filtres Maraudes
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Association</label>
                    <select 
                      value={selectedAssoId}
                      onChange={(e) => setSelectedAssoId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                      className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs outline-none focus:ring-1 focus:ring-brand-green"
                    >
                      <option value="all">Toutes les associations</option>
                      {associations.map(asso => (
                        <option key={asso.id} value={asso.id}>{asso.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Période (semaine par défaut)</label>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        value={filterMaraudeStartDate}
                        onChange={(e) => setFilterMaraudeStartDate(e.target.value)}
                        className="flex-1 p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[10px] outline-none focus:ring-1 focus:ring-brand-green"
                      />
                      <input 
                        type="date" 
                        value={filterMaraudeEndDate}
                        onChange={(e) => setFilterMaraudeEndDate(e.target.value)}
                        className="flex-1 p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[10px] outline-none focus:ring-1 focus:ring-brand-green"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Affichage rapide</label>
                    <div className="flex bg-stone-100 dark:bg-stone-700 p-1 rounded-lg">
                      <button 
                        onClick={() => setFilterMaraudeStatus('planned')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          filterMaraudeStatus === 'planned' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        À venir
                      </button>
                      <button 
                        onClick={() => setFilterMaraudeStatus('past')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          filterMaraudeStatus === 'past' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Passées
                      </button>
                      <button 
                        onClick={() => setFilterMaraudeStatus('all')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          filterMaraudeStatus === 'all' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Toutes
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={showExternalMaraudes}
                      onChange={(e) => setShowExternalMaraudes(e.target.checked)}
                      className="rounded border-stone-300 text-brand-green focus:ring-brand-green w-3 h-3"
                    />
                    <span className="text-[10px] font-bold text-stone-500 group-hover:text-stone-700 uppercase">Voir maraudes externes</span>
                  </label>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Style de la carte</label>
                    <div className="flex bg-stone-100 dark:bg-stone-700 p-1 rounded-lg">
                      {Object.keys(mapTiles).map((style) => (
                        <button
                          key={style}
                          onClick={() => setMapStyle(style as keyof typeof mapTiles)}
                          className={cn(
                            "flex-1 py-1 text-[9px] font-bold rounded-md transition-all uppercase tracking-wider",
                            mapStyle === style ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'analysis' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
                <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Filter size={14} className="text-brand-green" /> Filtres Analyse
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Période d'analyse</label>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        value={heatmapRange.start}
                        onChange={(e) => setHeatmapRange({...heatmapRange, start: e.target.value})}
                        className="flex-1 p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[10px] outline-none focus:ring-1 focus:ring-brand-green"
                      />
                      <input 
                        type="date" 
                        value={heatmapRange.end}
                        onChange={(e) => setHeatmapRange({...heatmapRange, end: e.target.value})}
                        className="flex-1 p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[10px] outline-none focus:ring-1 focus:ring-brand-green"
                      />
                    </div>
                    <button 
                      onClick={() => setAppliedHeatmapRange(heatmapRange)}
                      className="w-full mt-2 py-1.5 bg-brand-green text-white rounded-lg text-[9px] font-bold hover:bg-brand-green/90 transition-colors shadow-sm uppercase tracking-widest"
                    >
                      Appliquer la période
                    </button>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Public à afficher</label>
                    <div className="flex bg-stone-100 dark:bg-stone-700 p-1 rounded-lg">
                      <button 
                        onClick={() => setFilterAnalyseType('helped')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          filterAnalyseType === 'helped' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Juste aidés
                      </button>
                      <button 
                        onClick={() => setFilterAnalyseType('all')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          filterAnalyseType === 'all' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Aidés & rencontrés
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Mode d'affichage statistique</label>
                    <div className="flex bg-stone-100 dark:bg-stone-700 p-1 rounded-lg">
                      <button 
                        onClick={() => setAnalyseMode('heatmap')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          analyseMode === 'heatmap' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Densité
                      </button>
                      <button 
                        onClick={() => setAnalyseMode('markers')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          analyseMode === 'markers' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Points
                      </button>
                      <button 
                        onClick={() => setAnalyseMode('bubbles')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          analyseMode === 'bubbles' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Volumes
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Type de statistiques</label>
                    <div className="flex bg-stone-100 dark:bg-stone-700 p-1 rounded-lg">
                      <button 
                        onClick={() => setAnalyseMode('heatmap')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          analyseMode === 'heatmap' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Densité
                      </button>
                      <button 
                        onClick={() => setAnalyseMode('markers')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          analyseMode === 'markers' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Points
                      </button>
                      <button 
                        onClick={() => setAnalyseMode('bubbles')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          analyseMode === 'bubbles' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Volumes
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-700">
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Style de la carte</label>
                    <div className="flex bg-stone-100 dark:bg-stone-700 p-1 rounded-lg">
                      {Object.keys(mapTiles).map((style) => (
                        <button
                          key={style}
                          onClick={() => setMapStyle(style as keyof typeof mapTiles)}
                          className={cn(
                            "flex-1 py-1 text-[9px] font-bold rounded-md transition-all uppercase tracking-wider",
                            mapStyle === style ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-6">
          {viewMode === 'analysis' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-brand-green" />
                Bilan de la période
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-center">
                  <p className="text-2xl font-black text-stone-900 dark:text-white">{analysisEvents.length}</p>
                  <p className="text-xs text-stone-500">Maraudes analysées</p>
                </div>
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-center">
                  <p className="text-2xl font-black text-brand-green">{recentDistributions.reduce((acc, d) => acc + (d.people_helped || 0), 0)}</p>
                  <p className="text-xs text-stone-500">Personnes rencontrées</p>
                </div>
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-center">
                  <p className="text-2xl font-black text-purple-600">{recentDistributions.reduce((acc, d) => acc + (d.direct_help_count || 0), 0)}</p>
                  <p className="text-xs text-stone-500">Personnes aidées</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Maraudes incluses ({analysisEvents.length})</h4>
                <div className="space-y-2">
                  {analysisEvents.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">Aucune maraude sur cette période.</p>
                  ) : (
                    analysisEvents.slice(0, 10).map(event => (
                      <div key={event.id} className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green">
                            {event.date ? format(parseISO(event.date), 'dd MMM yyyy', { locale: fr }) : '??'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{event.name || 'Maraude'}</p>
                      </div>
                    ))
                  )}
                  {analysisEvents.length > 10 && (
                    <p className="text-[10px] text-stone-400 text-center italic">Et {analysisEvents.length - 10} autres maraudes...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'maraudes' && (
            <>
              <div className="space-y-6">
                {viewMode === 'maraudes' && filteredEvents.map(event => {
                  const isExpanded = expandedEventId === event.id;
                  const myAssoId = user?.association_id ?? (user as any)?.associationId;
                  const isMyAsso = myAssoId != null && (event.association_id === Number(myAssoId) || event.association_id === myAssoId);
                  
                  // Calculate selection state based on teams
                  const allTeamIds = event.teams.map(t => t.id);
                  const selectedTeamCount = allTeamIds.filter(id => selectedTeamsForMap.includes(id)).length;
                  const allSelected = selectedTeamCount === allTeamIds.length && allTeamIds.length > 0;
                  const someSelected = selectedTeamCount > 0 && selectedTeamCount < allTeamIds.length;
                  
                  return (
                    <div key={event.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          className="rounded text-brand-green focus:ring-brand-green cursor-pointer"
                          checked={allSelected}
                          ref={input => {
                            if (input) {
                              input.indeterminate = someSelected;
                            }
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (allSelected) {
                              // Unselect all
                              setSelectedTeamsForMap((prev: number[]) => prev.filter(id => !allTeamIds.includes(id)));
                            } else {
                              // Select all (add missing ones)
                              setSelectedTeamsForMap((prev: number[]) => {
                                const newIds = allTeamIds.filter(id => !prev.includes(id));
                                return [...prev, ...newIds];
                              });
                            }
                          }}
                          title="Afficher/Masquer sur la carte"
                        />
                        <div 
                          className="flex-1 flex items-center justify-between cursor-pointer group"
                          onClick={() => toggleEvent(event.id)}
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-wider group-hover:text-stone-600 transition-colors">
                            <ChevronRight size={14} className={cn("transition-transform", isExpanded && "rotate-90")} />
                            <Calendar size={14} /> {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            {!isMyAsso && (
                              <span style={{ backgroundColor: getAssoColor(event.association_id) + '20', color: getAssoColor(event.association_id) }} className="ml-2 px-2 py-0.5 text-[8px] font-bold rounded-full uppercase">
                                {getAssoName(event.association_id)}
                              </span>
                            )}
                            {event.status === 'completed' ? (
                              <span className="ml-2 px-2 py-0.5 bg-brand-green/10 text-brand-green text-[8px] font-bold rounded-full uppercase">Terminée</span>
                            ) : (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-bold rounded-full uppercase">Prévue</span>
                            )}
                          </div>
                          {canDeleteMaraude && isMyAsso && (
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); startEdit(event); }} 
                                className="text-stone-400 hover:text-blue-500 p-2 rounded-lg hover:bg-stone-100 transition-colors" 
                                title="Modifier"
                                disabled={!!isProcessing}
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={(e) => handleDeleteEvent(e, event.id)} 
                                className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  isProcessing === `del-${event.id}` ? "text-stone-300" : "text-stone-400 hover:text-red-500 hover:bg-red-50"
                                )}
                                title="Supprimer"
                                disabled={!!isProcessing}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 ml-4 border-l-2 border-stone-100 pl-4">
                          {/* Part 1: Preparation */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-[8px]">1</span>
                                Préparation
                              </h4>
                              {event.prep_time && (
                                <span className="text-[10px] font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">RDV {event.prep_time}</span>
                              )}
                            </div>
                            
                            <div className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 shadow-sm">
                              <div className="flex justify-between items-start mb-3">
                                <div className="space-y-1 w-full">
                                  <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                                    <MapPin size={14} className="text-brand-green" />
                                    {event.prep_location || "Lieu non précisé"}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    {event.prep_lat != null && event.prep_lng != null && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setMapCenter([event.prep_lat!, event.prep_lng!]); setMapZoom(18); }}
                                        className="text-[9px] text-brand-green hover:underline font-medium"
                                      >
                                        Voir sur la carte
                                      </button>
                                    )}
                                  </div>
                                  {canPrepareMaraude && (
                                    <>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setBagModal(event.id); fetchAvailableStock(event.id); }}
                                        className="mt-2 w-full py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green/90 transition-colors shadow-sm text-xs font-bold flex items-center justify-center gap-2"
                                        title="Préparer le matériel"
                                      >
                                        <Package size={16} /> Préparer le matériel
                                      </button>
                                      <button 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setMealsPrepared(event.meals_prepared || 0);
                                          setMealsDescription(event.meals_description || '');
                                          setMealModal(event.id); 
                                          fetchAvailableStock(event.id); 
                                        }}
                                        className="mt-2 w-full py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-sm text-xs font-bold flex items-center justify-center gap-2"
                                        title="Préparer le repas"
                                      >
                                        <Utensils size={16} /> Préparer le repas
                                      </button>
                                    </>
                                  )}
                                  
                                  {event.meals_prepared !== undefined && event.meals_prepared > 0 && (
                                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-amber-900 dark:text-amber-500 flex items-center gap-1">
                                          <Utensils size={12} /> Repas préparés
                                        </span>
                                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                                          {(() => {
                                            const eventTeamIds = event.teams.map(t => t.id);
                                            const eventDistributions = distributions.filter(d => eventTeamIds.includes(d.maraude_team_id || 0) && d.status === 'completed');
                                            const deliveredMeals = eventDistributions.reduce((sum, d) => sum + (d.mobile_meals_delivered !== undefined && d.mobile_meals_delivered !== null ? d.mobile_meals_delivered : (d.mobile_meal_count || 0)), 0);
                                            return Math.max(0, (event.meals_prepared || 0) - deliveredMeals);
                                          })()} / {event.meals_prepared}
                                        </span>
                                      </div>
                                      {event.meals_description && (
                                        <p className="text-[10px] text-amber-700 dark:text-amber-600/80 leading-relaxed">
                                          {event.meals_description}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {event.prep_description && (
                                <div className="mb-3 p-2 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-100 dark:border-stone-700 text-[10px] text-stone-600 dark:text-stone-400">
                                  <div className="font-bold text-stone-400 uppercase text-[8px] mb-1">Accès & Contact</div>
                                  {event.prep_description}
                                </div>
                              )}

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <button 
                                    onClick={() => setExpandedPrepVolunteersId(expandedPrepVolunteersId === event.id ? null : event.id)}
                                    className="text-[10px] font-bold text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1"
                                  >
                                    <Users size={12} />
                                    {event.prep_registrations?.length || 0} bénévole(s) inscrit(s)
                                    <ChevronRight size={12} className={cn("transition-transform", expandedPrepVolunteersId === event.id && "rotate-90")} />
                                  </button>
                                  
                                  {user && isMyAsso && (
                                    event.prep_registrations?.some(r => r.user_id === user.id) ? (
                                      <button 
                                        onClick={() => handlePrepUnregister(event.id)}
                                        disabled={isProcessing === `prep-unreg-${event.id}`}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
                                      >
                                        {isProcessing === `prep-unreg-${event.id}` ? "..." : "Se désinscrire"}
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => handlePrepRegister(event.id)}
                                        disabled={isProcessing === `prep-reg-${event.id}`}
                                        className="text-[10px] font-bold text-brand-green hover:text-brand-green/80 transition-colors"
                                      >
                                        {isProcessing === `prep-reg-${event.id}` ? "..." : "S'inscrire"}
                                      </button>
                                    )
                                  )}
                                </div>

                                {expandedPrepVolunteersId === event.id && event.prep_registrations && event.prep_registrations.length > 0 && (
                                  <div className="pt-2 border-t border-stone-50 space-y-1">
                                    {event.prep_registrations.map(reg => (
                                      <div key={reg.id} className="flex items-center gap-2 text-[10px] text-stone-600 dark:text-stone-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green/40"></div>
                                        {reg.username}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Part 2: Distribution */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-[8px]">2</span>
                                Distribution
                              </h4>
                              {event.start_time && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">RDV {event.start_time}</span>
                              )}
                            </div>

                            <div className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 shadow-sm mb-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                                  <MapPin size={14} className="text-blue-500" />
                                  {event.start_location || "Lieu de RDV non précisé"}
                                </div>
                                {event.start_lat != null && event.start_lng != null && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setMapCenter([event.start_lat!, event.start_lng!]); setMapZoom(18); }}
                                    className="text-[9px] text-blue-500 hover:underline font-medium ml-6"
                                  >
                                    Voir sur la carte
                                  </button>
                                )}
                              </div>
                              {event.info_document_url && (
                                <a 
                                  href={event.info_document_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="mt-3 w-full py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2 text-xs font-bold"
                                  title="Document important"
                                >
                                  <History size={16} /> Document d'information
                                </a>
                              )}
                            </div>

                            <div className="space-y-2">
                              {event.teams.map(team => {
                                const teamRegs = registrations.filter(r => r.maraude_team_id === team.id);
                                const isRegistered = teamRegs.some(r => r.user_id === user?.id);
                                const leader = teamRegs.find(r => r.is_leader === 1);
                                const isSelected = selectedTeamId === team.id;
                                const isRegProcessing = isProcessing === `reg-${team.id}`;

                                return (
                                  <div key={team.id} onClick={(e) => { 
                                    e.stopPropagation();
                                    if (selectedTeamId === team.id) {
                                      setSelectedTeamId(null);
                                      setSelectedEventId(event.id);
                                    } else {
                                      setSelectedEventId(event.id); 
                                      setSelectedTeamId(team.id); 
                                    }
                                  }} className={cn(
                                    "p-4 rounded-2xl border transition-all cursor-pointer",
                                    isSelected ? "border-brand-green bg-brand-green/10 shadow-sm" : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 hover:border-stone-300 dark:hover:border-stone-700"
                                  )}>
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          className="rounded text-brand-green focus:ring-brand-green cursor-pointer"
                                          checked={selectedTeamsForMap.includes(team.id)}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            if (selectedTeamsForMap.includes(team.id)) {
                                              setSelectedTeamsForMap((prev: number[]) => prev.filter(id => id !== team.id));
                                            } else {
                                              setSelectedTeamsForMap((prev: number[]) => [...prev, team.id]);
                                            }
                                          }}
                                        />
                                        <span className="font-bold text-sm">{team.team_name}</span>
                                      </div>
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></div>
                                    </div>
                                    
                                    {reports.find(r => r.maraude_team_id === team.id) && (
                                      <div className="mb-3 p-3 bg-white dark:bg-stone-900 rounded-xl border border-brand-green/20 text-[10px] text-stone-600 dark:text-stone-400 italic relative group">
                                        <div className="flex justify-between font-bold text-brand-green not-italic mb-1">
                                          <span>Compte rendu</span>
                                          <span>{reports.find(r => r.maraude_team_id === team.id)?.people_helped} aidés</span>
                                        </div>
                                        <div className="line-clamp-3">
                                          "{reports.find(r => r.maraude_team_id === team.id)?.content}"
                                        </div>
                                        {reports.find(r => r.maraude_team_id === team.id)?.content.length! > 150 && (
                                          <Link to="/member/resources" className="text-brand-green font-bold hover:underline mt-1 inline-block not-italic">Lire la suite</Link>
                                        )}
                                        {canWriteReport(team.id) && (
                                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-stone-800 p-1 rounded-lg shadow-sm border border-stone-100 dark:border-stone-700">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); openReportModal(team.id, event.id, reports.find(r => r.maraude_team_id === team.id)); }}
                                              className="p-1 text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                            >
                                              <Edit3 size={12} />
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleDeleteReport(reports.find(r => r.maraude_team_id === team.id)!.id); }}
                                              className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    <div className="space-y-1 mb-3">
                                      <div className="flex items-center gap-2 text-[10px] font-bold text-brand-green">
                                        {leader ? <><CheckCircle size={10} /> Chef: {leader.username}</> : <><AlertCircle size={10} className="text-amber-500" /> Aucun chef inscrit</>}
                                      </div>
                                      <div 
                                        className="flex items-center gap-2 text-[10px] text-stone-500 hover:text-brand-green cursor-help transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedVolunteersTeamId(expandedVolunteersTeamId === team.id ? null : team.id);
                                        }}
                                      >
                                        <Users size={12} /> {teamRegs.length} bénévoles inscrits
                                      </div>
                                      {expandedVolunteersTeamId === team.id && teamRegs.length > 0 && (
                                        <div className="pl-5 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                          {teamRegs.map(reg => (
                                            <div key={reg.id} className="text-[9px] text-stone-400 flex items-center gap-1">
                                              <div className="w-1 h-1 rounded-full bg-stone-300"></div>
                                              {reg.username} {reg.is_leader ? <span className="text-[8px] bg-brand-green/10 text-brand-green px-1 rounded font-bold">Chef</span> : ''}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {viewMode === 'maraudes' && event.status === 'planned' && isMyAsso && (
                                      isRegistered ? (
                                        <div className="flex flex-col gap-2">
                                          {reports.find(r => r.maraude_team_id === team.id) ? (
                                            <div className="px-3 py-2 bg-stone-100 text-stone-500 rounded-lg text-xs font-bold text-center border border-stone-200">
                                              Compte rendu soumis
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex gap-2">
                                                <button onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  setSelectedEventId(event.id);
                                                  setSelectedTeamId(team.id);
                                                  setIsAddingMarker(!isAddingMarker); 
                                                }} className={cn(
                                                  "flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2",
                                                  isAddingMarker && selectedTeamId === team.id ? "bg-red-100 text-red-600" : "bg-brand-green text-white"
                                                )}>
                                                  {isAddingMarker && selectedTeamId === team.id ? "Annuler placement" : <><MapPin size={12} /> Placer un point</>}
                                                </button>
                                                <div className="px-3 py-2 bg-brand-green/10 text-brand-green rounded-lg flex items-center justify-center"><CheckCircle size={14} /></div>
                                              </div>
                                              {leader?.user_id === user?.id ? (
                                                <div className="flex gap-2">
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); openReportModal(team.id, event.id); }}
                                                    className="flex-1 py-2 bg-stone-900 text-white rounded-lg text-[10px] font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                                                  >
                                                    <CheckCircle size={12} /> Terminer
                                                  </button>
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); handleUnregister(team.id); }}
                                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-200 transition-colors flex items-center justify-center"
                                                    title="Se désinscrire"
                                                  >
                                                    <X size={12} />
                                                  </button>
                                                </div>
                                              ) : (
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); handleUnregister(team.id); }}
                                                  className="w-full py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                                >
                                                  <X size={12} /> Se désinscrire
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-2">
                                          {!leader && canRegisterAsLeader && (
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleRegister(team.id, true); }} 
                                              disabled={!!isProcessing}
                                              className={cn(
                                                "w-full py-2 rounded-lg text-[10px] font-bold transition-colors",
                                                isRegProcessing ? "bg-brand-green/50 cursor-not-allowed" : "bg-brand-green text-white hover:bg-brand-green/90"
                                              )}
                                            >
                                              {isRegProcessing ? "Inscription..." : "S'inscrire comme Chef d'équipe"}
                                            </button>
                                          )}
                                          {canRegisterAsMember && (
                                            <div className="flex gap-2">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleRegister(team.id, false); }} 
                                                disabled={!!isProcessing}
                                                className={cn(
                                                  "flex-1 py-2 border rounded-lg text-[10px] font-bold transition-colors",
                                                  isRegProcessing ? "bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200 dark:border-stone-700" : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700"
                                                )}
                                              >
                                                {isRegProcessing ? "Inscription..." : "S'inscrire comme membre"}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {canPrepareMaraude && event.status === 'planned' && isMyAsso && (
                              <div className="pt-2 space-y-2">
                                {canCloseMaraude && (
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleCloseClick(event);
                                    }}
                                    className="w-full py-3 bg-brand-green text-white rounded-2xl text-xs font-bold hover:bg-brand-green/90 transition-all shadow-sm flex items-center justify-center gap-2"
                                    disabled={isProcessing === `complete-${event.id}`}
                                  >
                                    {isProcessing === `complete-${event.id}` ? "Clôture en cours..." : <><CheckCircle size={16} /> Clôturer la maraude</>}
                                  </button>
                                )}
                                <p className="text-[9px] text-stone-400 text-center mt-2 italic">
                                  La clôture rendra la maraude "Terminée" pour toutes les équipes.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="h-[60%] md:h-auto flex-grow relative z-0">
        <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          <TileLayer 
            url={mapTiles[mapStyle]} 
          />
          
          {/* Map Style moved to sidebar */}

          <MapEvents />
          
          {showMemberLocations && Object.entries(memberLocations).map(([uid, loc]) => {
            if (loc.lat == null || loc.lng == null) return null;
            return (
              <Marker 
                key={`member-${uid}`} 
                position={[loc.lat, loc.lng]} 
                zIndexOffset={1200}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `
                    <div style="position: relative;">
                      <div style="background-color: ${loc.team_color}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        ${loc.avatar_url ? `<img src="${loc.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="color: white; font-weight: bold; font-size: 12px;">${loc.username.charAt(0).toUpperCase()}</span>`}
                      </div>
                      <div style="position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px; background-color: #22c55e; border: 2px solid white; border-radius: 50%;"></div>
                    </div>
                  `,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '12px', margin: 0 }}>{loc.username}</p>
                    <p style={{ fontSize: '10px', color: '#78716c', margin: 0 }}>Dernière mise à jour: {new Date(loc.last_updated).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}



          {viewMode !== 'analysis' && (() => {
            const isCreationMode = viewMode === 'create' || viewMode === 'edit';
            const eventsToRender = isCreationMode 
              ? events.filter(e => e.date && e.date.split('T')[0] === planDate && e.id !== editingEventId)
              : filteredEvents.filter(e => e.teams.some(t => selectedTeamsForMap.includes(t.id)));

            return eventsToRender.map(event => {
              const allTeams = isCreationMode 
                ? event.teams.map(team => ({ team, eventId: event.id }))
                : event.teams
                .filter(t => selectedTeamsForMap.includes(t.id))
                .map(team => ({ team, eventId: event.id }));
              
              // Sort so selected team is rendered last (on top)
              allTeams.sort((a, b) => {
                if (a.team.id === selectedTeamId) return 1;
                if (b.team.id === selectedTeamId) return -1;
                return 0;
              });

              return (
                <React.Fragment key={`event-${event.id}`}>
                  {event.prep_lat != null && event.prep_lng != null && (
                    <Marker 
                      position={[event.prep_lat, event.prep_lng]} 
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                      })}
                    >
                      <Popup>Lieu de préparation: {event.prep_location}</Popup>
                    </Marker>
                  )}
                  {event.start_lat != null && event.start_lng != null && (() => {
                    const focusedTeam = event.teams.find(t => t.id === selectedTeamId);
                    const isFocusedOnZone = focusedTeam?.path_type === 'zone';
                    
                    return (
                      <Marker 
                        position={[event.start_lat, event.start_lng]} 
                        icon={L.divIcon({
                          className: 'custom-div-icon',
                          html: `<div style="background-color: #2563eb; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${isFocusedOnZone ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' : '1'}</div>`,
                          iconSize: [24, 24],
                          iconAnchor: [12, 12]
                        })}
                      >
                        <Popup>Lieu de rendez-vous{!isFocusedOnZone ? ' (Point 1)' : ''}: {event.start_location}</Popup>
                      </Marker>
                    );
                  })()}
                  {allTeams.map(({ team, eventId }) => {
                    const isTeamSelected = selectedTeamId === team.id;
                    
                    const myAssoId = user?.association_id ?? (user as any)?.associationId;
                    const isMyAsso = myAssoId != null && (event.association_id === Number(myAssoId) || event.association_id === myAssoId);
                    const color = isMyAsso ? team.color : '#a8a29e'; // Grey for others
                    const opacity = isMyAsso ? 1 : 0.4;
                    const weight = isMyAsso ? 4 : 3;

                    return (
                      <React.Fragment key={`${team.id}-${isTeamSelected ? 'selected' : 'normal'}-${team.color}`}>
                        {showCircuits && (
                          <>
                            {(() => {
                              const fullPath = [...team.path_data];
                              const isCircuit = team.path_type !== 'zone';
                              const _startCoords = (viewMode === 'edit' || viewMode === 'create') && event.id === selectedEventId ? startCoords : { lat: event.start_lat, lng: event.start_lng };
                              
                              if (isCircuit && _startCoords && _startCoords.lat != null && _startCoords.lng != null) {
                                if (fullPath.length > 0) {
                                  const isStartFirst = Math.abs(fullPath[0][0] - _startCoords.lat) < 0.0001 && Math.abs(fullPath[0][1] - _startCoords.lng) < 0.0001;
                                  if (!isStartFirst) {
                                    fullPath.unshift([_startCoords.lat, _startCoords.lng]);
                                  }
                                } else {
                                  fullPath.unshift([_startCoords.lat, _startCoords.lng]);
                                }
                              }
                              
                              if (isCircuit && fullPath.length > 2) {
                                fullPath.push([...fullPath[0]]);
                              }
                              
                              return team.path_type === 'zone' ? (
                                <Polygon 
                                  positions={fullPath} 
                                  color={color} 
                                  fillColor={color}
                                  fillOpacity={isMyAsso ? 0.3 : 0.1}
                                  weight={weight} 
                                  opacity={opacity} 
                                  eventHandlers={{
                                    click: (e) => {
                                      if (isAddingMarker) return;
                                      L.DomEvent.stopPropagation(e);
                                      if (selectedTeamId === team.id) {
                                        setSelectedTeamId(null);
                                      } else {
                                        setSelectedTeamId(team.id);
                                      }
                                    }
                                  }}
                                >
                                  {!isMyAsso && (
                                    <Tooltip sticky>
                                      <div className="text-[10px] font-bold">
                                        {getAssoName(event.association_id)} (Lecture seule)
                                      </div>
                                    </Tooltip>
                                  )}
                                </Polygon>
                              ) : team.path_type === 'pedestrian' ? (
                                <PedestrianPolyline 
                                  waypoints={fullPath} 
                                  color={color} 
                                  weight={weight} 
                                  opacity={opacity} 
                                  onClick={(e) => {
                                    if (isAddingMarker) return;
                                    L.DomEvent.stopPropagation(e);
                                    if (selectedTeamId === team.id) {
                                      setSelectedTeamId(null);
                                    } else {
                                      setSelectedTeamId(team.id);
                                    }
                                  }}
                                >
                                  {!isMyAsso && (
                                    <Tooltip sticky>
                                      <div className="text-[10px] font-bold">
                                        {getAssoName(event.association_id)} (Lecture seule)
                                      </div>
                                    </Tooltip>
                                  )}
                                </PedestrianPolyline>
                              ) : (
                                <Polyline 
                                  positions={fullPath} 
                                  color={color} 
                                  weight={weight} 
                                  opacity={opacity} 
                                  eventHandlers={{
                                    click: (e) => {
                                      if (isAddingMarker) return;
                                      L.DomEvent.stopPropagation(e);
                                      if (selectedTeamId === team.id) {
                                        setSelectedTeamId(null);
                                      } else {
                                        setSelectedTeamId(team.id);
                                      }
                                    }
                                  }}
                                >
                                  {!isMyAsso && (
                                    <Tooltip sticky>
                                      <div className="text-[10px] font-bold">
                                        {getAssoName(event.association_id)} (Lecture seule)
                                      </div>
                                    </Tooltip>
                                  )}
                                </Polyline>
                              );
                            })()}
                          </>
                        )}
                        {isTeamSelected && showCircuits && team.path_data.map((p, i) => {
                          if (!p || p[0] == null || p[1] == null) return null;
                          // Skip labeling if it's the start point (already labeled as 1)
                          const isStartPoint = event.start_lat != null && event.start_lng != null && 
                            Math.abs(p[0] - event.start_lat) < 0.0001 && 
                            Math.abs(p[1] - event.start_lng) < 0.0001;
                          
                          if (isStartPoint) return null;

                          // Numbering logic:
                          // - Zone: starts at 1
                          // - Others: starts at 2 if start point exists, else 1
                          let pointNumber: number;
                          if (team.path_type === 'zone') {
                            pointNumber = i + 1;
                          } else if (!event.start_lat || !event.start_lng) {
                            pointNumber = i + 1;
                          } else {
                            const firstPointIsStart = team.path_data.length > 0 && 
                              Math.abs(team.path_data[0][0] - event.start_lat) < 0.0001 && 
                              Math.abs(team.path_data[0][1] - event.start_lng) < 0.0001;
                            pointNumber = firstPointIsStart ? i + 1 : i + 2;
                          }

                          return (
                            <Marker 
                              key={`${team.id}-point-${i}`} 
                              position={p} 
                              zIndexOffset={500}
                              icon={L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div style="background-color: ${team.color}; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${pointNumber}</div>`,
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                              })}
                            />
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()}

          {viewMode === 'analysis' ? (() => {
            const filteredPoints = distributions.filter(d => {
              // Find event status
              const team = events.flatMap(e => e.teams).find(t => t.id === d.maraude_team_id);
              const event = events.find(e => e.id === team?.event_id);
              if (event?.status !== 'completed') return false;

              // Date filtering
              if (!appliedHeatmapRange.start && !appliedHeatmapRange.end) return true;
              const dDate = new Date(d.timestamp);
              if (appliedHeatmapRange.start && dDate < new Date(appliedHeatmapRange.start)) return false;
              if (appliedHeatmapRange.end && dDate > new Date(appliedHeatmapRange.end)) return false;
              return d.lat != null && d.lng != null;
            });

            if (analyseMode === 'heatmap') {
              return (
                <HeatmapLayer
                  points={filteredPoints}
                  longitudeExtractor={(d: any) => d.lng}
                  latitudeExtractor={(d: any) => d.lat}
                  intensityExtractor={(d: any) => heatmapType === 'encountered' ? d.people_helped : (d.direct_help_count || 0)}
                  radius={Math.max(15, 40 - (mapZoom * 1.5))}
                  blur={Math.max(10, 30 - (mapZoom))}
                  max={15}
                  minOpacity={0.2}
                />
              );
            } else if (analyseMode === 'bubbles') {
              return filteredPoints.map(d => {
                const value = heatmapType === 'encountered' ? d.people_helped : (d.direct_help_count || 0);
                if (value === 0) return null;
                const teamColor = events.flatMap(e => e.teams).find(t => t.id === d.maraude_team_id)?.color || '#ef4444';
                return (
                  <CircleMarker
                    key={d.id}
                    center={[d.lat, d.lng]}
                    radius={Math.max(5, value * 3)}
                    pathOptions={{ color: teamColor, fillColor: teamColor, fillOpacity: 0.6, weight: 1 }}
                  >
                    <Popup>
                      <div className="text-center font-bold">
                        {value} personne{value > 1 ? 's' : ''} {heatmapType === 'encountered' ? 'rencontrée(s)' : 'aidée(s)'}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              });
            } else {
              // markers
              return filteredPoints.map(d => {
                const value = heatmapType === 'encountered' ? d.people_helped : (d.direct_help_count || 0);
                if (value === 0) return null;
                const teamColor = events.flatMap(e => e.teams).find(t => t.id === d.maraude_team_id)?.color || '#ef4444';
                const svgIcon = `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="${teamColor}" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="10" r="3" fill="white"/>
                  </svg>
                `;
                return (
                  <Marker
                    key={d.id}
                    position={[d.lat!, d.lng!]}
                    icon={L.divIcon({
                      html: svgIcon,
                      className: 'bg-transparent',
                      iconSize: [24, 24],
                      iconAnchor: [12, 24]
                    })}
                  >
                    <Popup>
                      <div className="text-center font-bold">
                        {value} personne{value > 1 ? 's' : ''} {heatmapType === 'encountered' ? 'rencontrée(s)' : 'aidée(s)'}
                      </div>
                    </Popup>
                  </Marker>
                );
              });
            }
          })() : (
            distributions.filter(d => {
              if (viewMode === 'create' || viewMode === 'edit') return false;
              
              const isPending = d.status === 'pending';
              const isCompleted = d.status === 'completed' || d.status === 'cancelled' || !d.status;
              
              if (isPending && !showPendingDistributions) return false;
              if (isCompleted && !showDistributions) return false;
              
              // First check if the team is enabled in the filter
              if (!selectedTeamsForMap.includes(d.maraude_team_id)) return false;

              // Then apply focus logic if any
              if (selectedTeamId) return d.maraude_team_id === selectedTeamId;
              if (selectedEventId) {
                const team = events.flatMap(e => e.teams).find(t => t.id === d.maraude_team_id);
                return team?.event_id === selectedEventId;
              }
              
              // If no focus, show all enabled
              return true;
            }).map(d => {
              if (d.lat == null || d.lng == null) return null;
              const teamColor = events.flatMap(e => e.teams).find(t => t.id === d.maraude_team_id)?.color || '#ef4444';
              const isPending = d.status === 'pending';
              const isCancelled = d.status === 'cancelled';
              const displayColor = (isCancelled && d.people_helped === 0) ? '#9ca3af' : teamColor;
              
              const timeString = new Date(d.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const encountered = d.people_helped || 0;
              const helped = d.direct_help_count || 0;
              const waiting = isPending ? (d.mobile_meal_count || 0) : 0;

              let shapesHtml = '';
              
              if (waiting > 0) {
                shapesHtml = `
                  <div class="relative w-8 h-8 flex items-center justify-center filter drop-shadow-md" title="En attente">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <path d="M12 2L22 20H2L12 2Z" fill="#f59e0b" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                      <text x="12" y="16" font-family="system-ui, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">${waiting}</text>
                    </svg>
                  </div>
                `;
              } else if (encountered > 0 || helped > 0) {
                shapesHtml = `
                  <div class="w-6 h-6 rounded bg-brand-green border-2 border-white shadow-md" title="Rencontrés / Aidés"></div>
                `;
              } else {
                shapesHtml = `<div class="w-4 h-4 rounded-full bg-stone-400 border-2 border-white shadow-md"></div>`;
              }

              const iconHtml = `
                <div class="relative flex flex-col items-center justify-center gap-1" style="pointer-events: auto;">
                  ${isPending ? '<div style="position: absolute; width: 60px; height: 60px; border-radius: 50%; border: 3px solid #f59e0b; opacity: 0.4; animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; pointer-events: none; top: -10px;"></div>' : ''}
                  <div class="flex gap-0.5 z-10">
                    ${shapesHtml}
                  </div>
                  ${isPending ? '<div class="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow border border-white uppercase z-20">En attente</div>' : 
                    isCancelled ? '<div class="bg-stone-400 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow border border-white uppercase z-20">Annulée</div>' : ''}
                </div>
              `;
              
              const customIcon = L.divIcon({
                className: 'custom-icon',
                html: iconHtml,
                iconSize: [76, 40],
                iconAnchor: [38, 20]
              });
              return (
                <Marker 
                  key={d.id} 
                  position={[d.lat!, d.lng!]} 
                  icon={customIcon} 
                  zIndexOffset={isPending ? 9999 : 1000}
                  eventHandlers={{
                    click: () => {
                      console.log(`[DEBUG] Distribution Marker Clicked: ID=${d.id}, Status=${d.status}, Helped=${d.people_helped}`);
                    }
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider",
                          isPending ? "bg-amber-500 text-white" : 
                          isCancelled ? "bg-stone-400 text-white" :
                          "bg-brand-green text-white"
                        )}>
                          {isPending ? "En attente" : isCancelled ? "Annulée" : "Effectuée"}
                        </div>
                        <span className="text-[10px] text-stone-400 font-bold">{timeString}</span>
                      </div>
                      
                      <p className="font-bold text-sm mb-1">
                        {d.people_helped} personne{d.people_helped > 1 ? 's' : ''} rencontrée{d.people_helped > 1 ? 's' : ''}
                      </p>
                      
                      <div className="flex flex-col gap-1 mb-2">
                        <div className="flex justify-between items-center text-[10px] bg-stone-50 p-1.5 rounded border border-stone-100">
                          <span className="text-stone-500">Aide directe:</span>
                          <span className="font-bold text-brand-green">{d.direct_help_count || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] bg-stone-50 p-1.5 rounded border border-stone-100">
                          <span className="text-stone-500">{isPending ? 'En attente repas:' : 'Repas demandés:'}</span>
                          <span className="font-bold text-amber-600">{d.mobile_meal_count || 0}</span>
                        </div>
                        {!isPending && !isCancelled && (
                          <div className="flex justify-between items-center text-[10px] bg-brand-green/5 p-1.5 rounded border border-brand-green/20">
                            <span className="text-brand-green font-medium">Repas livrés:</span>
                            <span className="font-bold text-brand-green">
                              {d.mobile_meals_delivered !== undefined && d.mobile_meals_delivered !== null 
                                ? d.mobile_meals_delivered 
                                : (d.mobile_meal_count || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                      {isPending && (
                        <div className="mb-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          En attente de confirmation
                        </div>
                      )}
                      {isCancelled && (
                        <div className="mb-2 text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded border border-stone-200">
                          Repas mobile annulé
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        {(canWriteReport(d.maraude_team_id) || canManage) && (
                          <button 
                            onClick={() => handleEditDistribution(d.id)}
                            className="w-full py-1 bg-brand-green text-white rounded text-[10px] font-bold hover:bg-brand-green/90 transition-colors flex items-center justify-center gap-1"
                          >
                            <Edit size={10} /> Modifier
                          </button>
                        )}
                        {isPending && (
                          <button 
                            onClick={() => {
                              setConfirmDistributionModal({ id: d.id, requested: d.mobile_meal_count || 0 });
                            }}
                            className="w-full py-1 bg-amber-500 text-white rounded text-[10px] font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={10} /> Confirmer
                          </button>
                        )}
                        {(canWriteReport(d.maraude_team_id) || canManage || isPending) && (
                          <button 
                            onClick={() => handleDeleteDistribution(d.id, isPending)}
                            className="w-full py-1 bg-red-500 text-white rounded text-[10px] font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 size={10} /> {isPending ? 'Annuler' : 'Supprimer'}
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })
          )}
          {/* Temporary Marker while creating distribution */}
          {distributionModal && (
            <Marker 
              position={[distributionModal.lat, distributionModal.lng]}
              zIndexOffset={2000}
              icon={L.divIcon({
                className: 'custom-icon',
                html: `
                  <div class="relative flex flex-col items-center justify-center gap-1" style="pointer-events: auto;">
                    ${beneficiaryEntries.some(b => b.mobile_meal) ? '<div style="position: absolute; width: 60px; height: 60px; border-radius: 50%; border: 3px solid #f59e0b; opacity: 0.4; animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; pointer-events: none; top: -10px;"></div>' : ''}
                    <div class="flex gap-0.5 z-10">
                      ${beneficiaryEntries.some(b => b.mobile_meal) ? `
                        <div class="relative w-8 h-8 flex items-center justify-center filter drop-shadow-md" title="En attente">
                          <svg width="32" height="32" viewBox="0 0 24 24">
                            <path d="M12 2L22 20H2L12 2Z" fill="#f59e0b" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                            <text x="12" y="16" font-family="system-ui, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">${beneficiaryEntries.filter(b => b.mobile_meal).length}</text>
                          </svg>
                        </div>
                      ` : beneficiaryEntries.length > 0 ? `
                        <div class="w-6 h-6 rounded bg-brand-green border-2 border-white shadow-md" title="Rencontrés / Aidés"></div>
                      ` : `
                        <div class="w-4 h-4 rounded-full bg-stone-400 border-2 border-white shadow-md"></div>
                      `}
                    </div>
                    <div class="bg-brand-red text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow border border-white uppercase z-20 animate-pulse">En cours...</div>
                  </div>
                `,
                iconSize: [76, 40],
                iconAnchor: [38, 20]
              })}
            />
          )}
        </MapContainer>
      </div>
      {distributionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-5xl overflow-hidden shadow-sm animate-in zoom-in duration-200 flex flex-col h-[85vh] max-h-[90vh]">
            <div className="p-6 border-b border-stone-100 shrink-0 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <MapPin size={20} className={beneficiaryEntries.some(b => b.mobile_meal) ? "text-amber-500" : "text-brand-red"} /> 
                {editingDistributionId ? "Modifier le point" : "Point de distribution"}
              </h3>
              <button onClick={() => { setDistributionModal(null); setEditingDistributionId(null); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={20} className="text-stone-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Left Panel: Global Info */}
              <div className="w-full md:w-1/3 p-6 bg-stone-50/50 border-r border-stone-100 flex flex-col gap-6 overflow-y-auto">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Statut du point</label>
                  <div className={cn(
                    "p-4 rounded-2xl border flex items-center gap-3",
                    beneficiaryEntries.some(b => b.mobile_meal) 
                      ? "bg-amber-50 border-amber-200 text-amber-700" 
                      : "bg-brand-green/10 border-brand-green/30 text-brand-green"
                  )}>
                    {beneficiaryEntries.some(b => b.mobile_meal) ? (
                      <>
                        <AlertCircle size={24} />
                        <div>
                          <div className="font-bold text-sm">En attente</div>
                          <div className="text-xs opacity-80">Équipe mobile requise</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={24} />
                        <div>
                          <div className="font-bold text-sm">Effectuée</div>
                          <div className="text-xs opacity-80">Aide directe uniquement</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-0 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  <div className="p-3 flex flex-col items-center justify-center border-r border-stone-100">
                    <label className="block text-[8px] font-bold text-stone-400 uppercase mb-1 text-center leading-tight">
                      Rencontrés
                    </label>
                    <div className="text-2xl font-black text-blue-500">
                      {beneficiaryEntries.length}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col items-center justify-center border-r border-stone-100">
                    <label className="block text-[8px] font-bold text-stone-400 uppercase mb-1 text-center leading-tight">
                      Aide directe
                    </label>
                    <div className="text-2xl font-black text-brand-green">
                      {beneficiaryEntries.filter(b => b.direct_help).length}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col items-center justify-center border-r border-stone-100">
                    <label className="block text-[8px] font-bold text-stone-400 uppercase mb-1 text-center leading-tight">
                      En attente
                    </label>
                    <div className="text-2xl font-black text-amber-500">
                      {beneficiaryEntries.filter(b => b.mobile_meal).length}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col items-center justify-center">
                    <label className="block text-[8px] font-bold text-stone-400 uppercase mb-1 text-center leading-tight">
                      Livrées
                    </label>
                    <div className="text-2xl font-black text-emerald-500">
                      {distributionModal.mobile_meals_delivered || 0}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  Ajoutez des personnes dans le panneau de droite pour mettre à jour ces nombres.
                </p>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mt-2">
                  <p className="text-[10px] text-blue-700 font-medium">
                    <span className="font-bold">Note :</span> Si aucun nom n'est renseigné pour une personne, elle sera recensée comme "Anonyme".
                  </p>
                </div>
              </div>

              {/* Right Panel: Beneficiaries */}
              <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-white">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase">Personnes rencontrées</label>
                  <button 
                    onClick={() => setBeneficiaryEntries([...beneficiaryEntries, { first_name: '', last_name: '', comment: '', search: '', showDropdown: false, direct_help: true, mobile_meal: false }])}
                    className="text-xs font-bold text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-lg hover:bg-brand-green/20 transition-colors"
                  >
                    + Ajouter une personne
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="hidden md:flex items-center gap-3 px-3 pb-2 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase">
                    <div className="flex-[1.5]">Nom (facultatif)</div>
                    <div className="w-24 text-center">Aide directe</div>
                    <div className="w-24 text-center">Équipe mobile</div>
                    <div className="flex-1">Commentaire</div>
                    <div className="w-6"></div>
                  </div>

                  {beneficiaryEntries.map((entry, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100 relative group">
                      
                      {/* Name / Search */}
                      <div className="flex-[1.5] w-full md:w-auto relative">
                        {entry.id ? (
                          <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-brand-green/30 h-[44px]">
                            <span className="text-sm font-bold text-brand-green truncate">{entry.first_name} {entry.last_name}</span>
                            <button 
                              onClick={() => {
                                const newEntries = [...beneficiaryEntries];
                                newEntries[idx] = { ...entry, id: undefined, first_name: '', last_name: '', search: '', showDropdown: false };
                                setBeneficiaryEntries(newEntries);
                              }}
                              className="text-[10px] text-stone-400 hover:text-stone-600 underline ml-2 shrink-0"
                            >
                              Modifier
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                placeholder="Nom (facultatif)..."
                                value={entry.search}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newEntries = [...beneficiaryEntries];
                                  newEntries[idx].search = val;
                                  newEntries[idx].showDropdown = val.length > 0;
                                  const parts = val.split(' ');
                                  newEntries[idx].first_name = parts[0] || '';
                                  newEntries[idx].last_name = parts.slice(1).join(' ') || '';
                                  setBeneficiaryEntries(newEntries);
                                }}
                                onFocus={() => {
                                  if (entry.search.length > 0) {
                                    const newEntries = [...beneficiaryEntries];
                                    newEntries[idx].showDropdown = true;
                                    setBeneficiaryEntries(newEntries);
                                  }
                                }}
                                className="w-full p-2 text-sm rounded-lg border border-stone-200 outline-none focus:ring-2 focus:ring-brand-green bg-white h-[44px] font-medium"
                              />
                              {entry.showDropdown && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                  {allBeneficiaries
                                    .filter(b => `${b.first_name} ${b.last_name}`.toLowerCase().includes(entry.search.toLowerCase()))
                                    .sort((a, b) => {
                                      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                                      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                                      const search = entry.search.toLowerCase();
                                      if (nameA === search && nameB !== search) return -1;
                                      if (nameB === search && nameA !== search) return 1;
                                      return new Date(b.last_encounter).getTime() - new Date(a.last_encounter).getTime();
                                    })
                                    .map(b => {
                                      const isExactMatch = `${b.first_name} ${b.last_name}`.toLowerCase() === entry.search.toLowerCase();
                                      const isAlreadySelected = b.first_name !== 'Anonyme' && beneficiaryEntries.some((e, i) => i !== idx && e.id === b.id);
                                      
                                      return (
                                        <button
                                          key={b.id}
                                          disabled={isAlreadySelected}
                                          className={cn(
                                            "w-full text-left p-3 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors",
                                            isExactMatch && "bg-brand-green/5 border-l-4 border-l-brand-green",
                                            isAlreadySelected && "opacity-50 cursor-not-allowed bg-stone-50"
                                          )}
                                          onClick={() => {
                                            const newEntries = [...beneficiaryEntries];
                                            newEntries[idx] = { 
                                              ...newEntries[idx], 
                                              id: b.id, 
                                              first_name: b.first_name, 
                                              last_name: b.last_name, 
                                              search: `${b.first_name} ${b.last_name}`,
                                              showDropdown: false 
                                            };
                                            setBeneficiaryEntries(newEntries);
                                          }}
                                        >
                                          <div className="flex justify-between items-center">
                                            <div className="flex flex-col">
                                              <div className="font-bold text-stone-900">{b.first_name} {b.last_name}</div>
                                              {isAlreadySelected && <div className="text-[8px] text-amber-600 font-bold uppercase">Déjà sélectionné</div>}
                                            </div>
                                            {isExactMatch && <div className="text-[8px] bg-brand-green text-white px-1.5 py-0.5 rounded font-black uppercase">Match</div>}
                                          </div>
                                          <div className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                                            <Calendar size={10} />
                                            Dernière rencontre: {new Date(b.last_encounter).toLocaleDateString()}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  <button
                                    className="w-full text-left p-3 text-sm text-brand-green hover:bg-stone-50 font-bold bg-stone-50/50"
                                    onClick={() => {
                                      const newEntries = [...beneficiaryEntries];
                                      newEntries[idx].showDropdown = false;
                                      setBeneficiaryEntries(newEntries);
                                    }}
                                  >
                                    + Créer nouveau: "{entry.search}"
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const newEntries = [...beneficiaryEntries];
                                newEntries[idx].search = 'Anonyme';
                                newEntries[idx].first_name = 'Anonyme';
                                newEntries[idx].last_name = '';
                                newEntries[idx].showDropdown = false;
                                setBeneficiaryEntries(newEntries);
                              }}
                              className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap h-[38px]"
                            >
                              Anonyme
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Checkboxes */}
                      <div className="flex items-center gap-4 md:gap-0 w-full md:w-auto shrink-0 justify-around md:justify-start">
                        <label className="flex items-center justify-center md:w-24 cursor-pointer gap-2 md:gap-0">
                          <span className="md:hidden text-[10px] font-bold text-stone-500 uppercase">Aide directe</span>
                          <input 
                            type="checkbox" 
                            checked={entry.direct_help}
                            onChange={(e) => {
                              const newEntries = [...beneficiaryEntries];
                              newEntries[idx].direct_help = e.target.checked;
                              setBeneficiaryEntries(newEntries);
                            }}
                            className="w-4 h-4 text-brand-green rounded focus:ring-brand-green"
                          />
                        </label>
                        <label className="flex items-center justify-center md:w-24 cursor-pointer gap-2 md:gap-0">
                          <span className="md:hidden text-[10px] font-bold text-stone-500 uppercase">Équipe mobile</span>
                          <input 
                            type="checkbox" 
                            checked={entry.mobile_meal}
                            onChange={(e) => {
                              const newEntries = [...beneficiaryEntries];
                              newEntries[idx].mobile_meal = e.target.checked;
                              setBeneficiaryEntries(newEntries);
                            }}
                            className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                          />
                        </label>
                      </div>

                      {/* Comment */}
                      <div className="flex-1 w-full md:w-auto">
                        <input
                          type="text"
                          placeholder="Commentaire..."
                          value={entry.comment}
                          onChange={(e) => {
                            const newEntries = [...beneficiaryEntries];
                            newEntries[idx].comment = e.target.value;
                            setBeneficiaryEntries(newEntries);
                          }}
                          className={cn(
                            "w-full p-2 text-xs rounded-lg border outline-none focus:ring-2 h-[38px]",
                            entry.mobile_meal ? "bg-amber-50 border-amber-200 focus:ring-amber-500 placeholder:text-amber-300" : "bg-white border-stone-200 focus:ring-brand-green"
                          )}
                        />
                      </div>

                      {/* Delete Button */}
                      <div className="w-6 flex justify-end absolute top-3 right-3 md:relative md:top-auto md:right-auto">
                        {beneficiaryEntries.length > 1 ? (
                          <button 
                            onClick={() => {
                              const newEntries = beneficiaryEntries.filter((_, i) => i !== idx);
                              setBeneficiaryEntries(newEntries);
                            }}
                            className="text-stone-400 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1"
                          >
                            <X size={16} />
                          </button>
                        ) : (
                          <div className="w-6"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => { setDistributionModal(null); setEditingDistributionId(null); }}
                className="px-6 py-3 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmAddDistribution}
                className={cn(
                  "px-8 py-3 text-white rounded-xl text-sm font-bold transition-colors shadow-sm",
                  beneficiaryEntries.some(b => b.mobile_meal) ? "bg-amber-500 hover:bg-amber-600" : "bg-brand-green hover:bg-brand-green/90"
                )}
              >
                {beneficiaryEntries.some(b => b.mobile_meal) ? "Signaler le besoin" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md overflow-hidden shadow-sm animate-in zoom-in duration-200">
            <div className="p-6 border-b border-stone-100">
              <h3 className="text-lg font-bold">Terminer la maraude</h3>
              <p className="text-xs text-stone-500">Remplissez le compte rendu pour clore votre circuit.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Nombre de personnes aidées</label>
                <input 
                  type="number" 
                  value={peopleHelpedCount} 
                  onChange={e => setPeopleHelpedCount(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase">Compte rendu</label>
                  <span className={`text-[10px] font-bold ${reportContent.length > 2000 ? 'text-red-500' : 'text-stone-400'}`}>
                    {reportContent.length} / 2000
                  </span>
                </div>
                <textarea 
                  value={reportContent}
                  onChange={e => setReportContent(e.target.value)}
                  placeholder="Décrivez le déroulement de la maraude..."
                  className={`w-full h-32 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-brand-green resize-none ${reportContent.length > 2000 ? 'border-red-500' : 'border-stone-200'}`}
                />
              </div>
            </div>
            <div className="p-6 bg-stone-50 flex gap-3">
              <button 
                onClick={() => setReportModal(null)}
                className="flex-1 py-3 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveReport}
                disabled={isProcessing === 'report' || reportContent.length > 2000}
                className="flex-1 py-3 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green/90 transition-colors shadow-sm disabled:bg-brand-green/50"
              >
                {isProcessing === 'report' ? "Envoi..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-amber-50">
              <div>
                <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                  <Package size={20} /> Préparer le matériel
                </h3>
                <p className="text-xs text-amber-700">Sélectionnez les articles à emporter pour cette maraude.</p>
              </div>
              <button onClick={() => setBagModal(null)} className="p-2 hover:bg-amber-100 rounded-full transition-colors">
                <X size={20} className="text-amber-900" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
              {/* Left Column: Available Stock */}
              <div className="flex flex-col border-r border-stone-100 overflow-hidden">
                <div className="p-4 border-b border-stone-100 space-y-3 bg-stone-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Rechercher un article..."
                      value={stockSearch}
                      onChange={e => setStockSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 text-text-main"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={stockCategoryFilter}
                      onChange={e => setStockCategoryFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                      className="flex-1 px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-amber-500 text-text-main"
                    >
                      <option value="all">Toutes catégories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setStockSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-[10px] font-bold flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors text-text-main"
                    >
                      Nom {stockSortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Articles disponibles</h4>
                  {availableStock
                    .filter(item => {
                      const search = stockSearch.toLowerCase();
                      const matchesSearch = 
                        (item.item_name || '').toLowerCase().includes(search) ||
                        item.id.toString().includes(search) ||
                        (item.box_id && item.box_id.toLowerCase().includes(search));
                      const matchesCategory = stockCategoryFilter === 'all' || item.category_id === stockCategoryFilter;
                      return matchesSearch && matchesCategory;
                    })
                    .sort((a, b) => {
                      // Prioritize items with expiry date
                      if (a.expiry_date && !b.expiry_date) return -1;
                      if (!a.expiry_date && b.expiry_date) return 1;
                      if (a.expiry_date && b.expiry_date) {
                        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
                      }
                      const nameA = (a.item_name || '').toLowerCase();
                      const nameB = (b.item_name || '').toLowerCase();
                      return stockSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                    })
                    .length > 0 ? (
                    availableStock
                      .filter(item => {
                        const search = stockSearch.toLowerCase();
                        const matchesSearch = 
                          (item.item_name || '').toLowerCase().includes(search) ||
                          item.id.toString().includes(search) ||
                          (item.box_id && item.box_id.toLowerCase().includes(search));
                        const matchesCategory = stockCategoryFilter === 'all' || item.category_id === stockCategoryFilter;
                        return matchesSearch && matchesCategory;
                      })
                      .sort((a, b) => {
                        // Prioritize items with expiry date
                        if (a.expiry_date && !b.expiry_date) return -1;
                        if (!a.expiry_date && b.expiry_date) return 1;
                        if (a.expiry_date && b.expiry_date) {
                          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
                        }
                        const nameA = (a.item_name || '').toLowerCase();
                        const nameB = (b.item_name || '').toLowerCase();
                        return stockSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                      })
                      .map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 hover:border-amber-200 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: item.category_color || '#d1d1d1' }}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded">A-{item.id}</span>
                                {item.box_id && (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">Carton: {item.box_id}</span>
                                )}
                                {item.expiry_date && (
                                  <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
                                    new Date(item.expiry_date).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000
                                      ? "bg-red-100 text-red-600 animate-pulse"
                                      : "bg-stone-100 text-stone-500"
                                  )}>
                                    <Clock size={10} />
                                    {formatDisplayDate(item.expiry_date)}
                                  </span>
                                )}
                                <p className="text-xs font-bold text-stone-700">{item.item_name}</p>
                              </div>
                              <p className="text-[9px] text-stone-500 uppercase font-bold tracking-wider">{item.category_name}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => bagModal && handleAssignToBag(item.id, bagModal)}
                            className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px] font-bold text-amber-600 rounded-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm"
                          >
                            Ajouter
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-12">
                      <Package size={32} className="mx-auto text-stone-200 mb-2" />
                      <p className="text-stone-400 text-[10px]">Aucun article correspondant.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Bag Contents */}
              <div className="flex flex-col bg-stone-50 overflow-hidden">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Dans le sac de maraude</h4>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">{teamStock.length} article{teamStock.length > 1 ? 's' : ''}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {teamStock.length > 0 ? (
                    teamStock.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm animate-in slide-in-from-right-4 duration-200">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: item.category_color || '#d1d1d1' }}></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">A-{item.id}</span>
                              <p className="text-xs font-bold text-stone-700">{item.item_name}</p>
                            </div>
                            <p className="text-[9px] text-stone-500 uppercase font-bold tracking-wider">{item.category_name}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => bagModal && handleReturnFromBag(item.id, bagModal)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Retirer du sac"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Package size={24} className="text-stone-300" />
                      </div>
                      <p className="text-stone-400 text-[10px] italic">Le sac est vide pour le moment.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
              <button 
                onClick={() => setBagModal(null)}
                className="w-full py-3 bg-stone-900 text-white rounded-2xl text-sm font-bold hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200 dark:shadow-none"
              >
                Valider la préparation du matériel
              </button>
            </div>
          </div>
        </div>
      )}

      {mealModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-amber-50">
              <div>
                <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                  <Utensils size={20} /> Préparation des repas
                </h3>
                <p className="text-xs text-amber-700">Configurez les repas et visualisez les stocks de préparation.</p>
              </div>
              <button onClick={() => setMealModal(null)} className="p-2 hover:bg-amber-100 rounded-full transition-colors">
                <X size={20} className="text-amber-900" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
              {/* Left Column: Meal Details & Calculation */}
              <div className="flex flex-col border-r border-stone-100 overflow-hidden bg-stone-50/30">
                <div className="p-6 space-y-6">
                  <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm">
                    <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Configuration des repas</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Nombre de repas préparés</label>
                        <input 
                          type="number" 
                          min="0"
                          value={mealsPrepared}
                          onChange={e => setMealsPrepared(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 text-text-main"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-500 mb-1">Volume/Poids par repas</label>
                          <input 
                            type="number" 
                            step="0.01"
                            min="0"
                            value={unitPerMeal}
                            onChange={e => setUnitPerMeal(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 text-text-main"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-500 mb-1">Unité</label>
                          <select 
                            value={unitType}
                            onChange={e => setUnitType(e.target.value)}
                            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 text-text-main"
                          >
                            <option value="L">Litres (L)</option>
                            <option value="Kg">Kilogrammes (Kg)</option>
                            <option value="g">Grammes (g)</option>
                            <option value="ml">Millilitres (ml)</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-700">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-stone-500">Total à préparer :</span>
                          <span className="text-2xl font-black text-amber-600">
                            {(mealsPrepared * unitPerMeal).toFixed(1)} {unitType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1 ml-1">Description (menu, remarques...)</label>
                    <textarea 
                      value={mealsDescription}
                      onChange={e => setMealsDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500 text-text-main resize-none shadow-sm"
                      placeholder="Ex: Soupe de légumes, sandwichs jambon-beurre..."
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Reference Stock (Alimentaire Préparation) */}
              <div className="flex flex-col overflow-hidden bg-white dark:bg-stone-900">
                <div className="p-6 border-b border-stone-100 dark:border-stone-800">
                  <h4 className="font-black text-[10px] text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} className="text-amber-500" /> Stock Alimentaire (Préparation)
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                  {isStockLoading ? (
                    <div className="text-center py-12 text-stone-400 text-sm">Chargement du stock...</div>
                  ) : teamStock.filter(item => item.category_name?.includes('Préparation')).length === 0 ? (
                    <div className="text-center py-12 text-stone-400 text-sm flex flex-col items-center gap-2">
                      <Package size={32} className="opacity-20" />
                      <p>Aucun article de préparation dans le sac</p>
                      <p className="text-[10px] text-stone-400">Ajoutez-les d'abord via "Préparer le matériel"</p>
                    </div>
                  ) : (
                    teamStock
                      .filter(item => item.category_name?.includes('Préparation'))
                      .map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm">
                          <div>
                            <div className="font-bold text-sm text-text-main">{item.item_name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded">A-{item.id}</span>
                              <span className="text-[10px] font-bold text-amber-600">{item.unit_value} {item.unit_type}</span>
                              {item.box_id && (
                                <span className="text-[9px] font-bold text-stone-400 tracking-tight">Carton: {item.box_id}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Dans le sac</div>
                            <div className="text-sm font-black text-text-main">1</div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50">
              <button 
                onClick={async () => {
                  try {
                    const event = events.find(e => e.id === mealModal);
                    if (event) {
                      const res = await authFetch(`/api/maraude-events/${mealModal}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...event,
                          meals_prepared: mealsPrepared,
                          meals_description: mealsDescription
                        })
                      });
                      if (res.ok) {
                        fetchData();
                        setMealModal(null);
                      }
                    }
                  } catch (e) {
                    console.error("Error saving meals:", e);
                  }
                }}
                className="w-full py-4 bg-stone-900 text-white rounded-2xl text-sm font-bold hover:bg-stone-800 transition-all shadow-lg active:scale-[0.98]"
              >
                Valider la préparation
              </button>
            </div>
          </div>
        </div>
      )}

      {closeMaraudeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-brand-green/10">
              <div>
                <h3 className="text-lg font-bold text-brand-green flex items-center gap-2">
                  <CheckCircle size={20} /> Clôturer la maraude
                </h3>
                <p className="text-xs text-brand-green">Gérez le stock restant avant de clôturer.</p>
              </div>
              <button onClick={() => {
                setCloseMaraudeModal(null);
                setItemsToReturn([]);
              }} className="p-2 hover:bg-brand-green/20 rounded-full transition-colors">
                <X size={20} className="text-brand-green" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden p-6 bg-stone-50/50 flex flex-col gap-4">
              {maraudeWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <AlertTriangle size={18} />
                    Attention : Actions requises
                  </div>
                  <ul className="text-xs text-amber-600 space-y-1 list-disc pl-5">
                    {maraudeWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Left Column: Consumed (Taken) */}
                <div className="flex-1 flex flex-col bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                  <div className="p-4 border-b border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/30">
                    <h4 className="text-xs font-bold text-stone-500 uppercase flex items-center gap-2">
                      <Package size={14} /> Matériel emporté
                    </h4>
                    <p className="text-[10px] text-stone-400 mt-1">Cliquez pour retourner en stock (non utilisé)</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {isStockLoading ? (
                      <div className="text-center py-8 text-stone-400">Chargement...</div>
                    ) : (
                      teamStock
                        .filter(item => !itemsToReturn.some(r => r.id === item.id))
                        .map((item) => (
                          <div 
                            key={item.id} 
                            onClick={() => setItemsToReturn([...itemsToReturn, item])}
                            className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-100 dark:border-stone-700 hover:border-brand-green hover:bg-brand-green/5 cursor-pointer transition-all group"
                          >
                            <div>
                              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">{item.item_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-stone-500">1 unité</p>
                                {item.expiry_date && (
                                  <p className="text-[10px] text-stone-400 flex items-center gap-1">
                                    <Clock size={10} /> {formatDisplayDate(item.expiry_date)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-brand-green group-hover:bg-brand-green/10 transition-colors">
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        ))
                    )}
                    {teamStock.filter(item => !itemsToReturn.some(r => r.id === item.id)).length === 0 && !isStockLoading && (
                      <div className="text-center py-8 text-stone-400 text-xs italic">
                        Tout le matériel a été déplacé vers le retour ou aucun matériel n'a été emporté.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Returned (Not Used) */}
                <div className="flex-1 flex flex-col bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                  <div className="p-4 border-b border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/30">
                    <h4 className="text-xs font-bold text-brand-green uppercase flex items-center gap-2">
                      <Undo2 size={14} /> Retour en stock
                    </h4>
                    <p className="text-[10px] text-stone-400 mt-1">Matériel non utilisé (sera remis en stock)</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {itemsToReturn.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setItemsToReturn(itemsToReturn.filter(i => i.id !== item.id))}
                        className="flex items-center justify-between p-3 bg-brand-green/5 rounded-xl border border-brand-green/20 hover:bg-red-50 hover:border-red-200 cursor-pointer transition-all group"
                      >
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-stone-800 flex items-center justify-center text-brand-green group-hover:text-red-500 group-hover:bg-red-100 transition-colors">
                          <Undo2 size={16} className="rotate-180" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-stone-700 dark:text-stone-300 group-hover:text-red-600">{item.item_name}</p>
                          <div className="flex items-center justify-end gap-2 mt-0.5">
                            {item.expiry_date && (
                              <p className="text-[10px] text-stone-400 group-hover:text-red-400 flex items-center gap-1">
                                <Clock size={10} /> {formatDisplayDate(item.expiry_date)}
                              </p>
                            )}
                            <p className="text-[10px] text-stone-500 group-hover:text-red-400">1 unité</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {itemsToReturn.length === 0 && (
                      <div className="text-center py-8 text-stone-400 text-xs italic">
                        Aucun matériel à retourner.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex gap-3">
              <button 
                onClick={() => {
                  setCloseMaraudeModal(null);
                  setItemsToReturn([]);
                }}
                className="flex-1 py-3 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={async () => {
                  if (closeMaraudeModal === null) return;
                  setIsProcessing(`complete-${closeMaraudeModal}`);
                  
                  // Process returns first
                  for (const item of itemsToReturn) {
                    try {
                      await authFetch('/api/stock/return', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stock_id: item.id })
                      });
                    } catch (err) {
                      console.error("Error returning item:", item.id, err);
                    }
                  }

                  const success = await handleCompleteEvent(closeMaraudeModal);
                  if (success) {
                    setCloseMaraudeModal(null);
                    setItemsToReturn([]);
                  }
                }}
                disabled={isProcessing === `complete-${closeMaraudeModal}`}
                className="flex-1 py-3 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green/90 transition-colors shadow-sm disabled:bg-brand-green/50 flex items-center justify-center gap-2"
              >
                {isProcessing === `complete-${closeMaraudeModal}` ? "Clôture..." : "Confirmer la clôture"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDistributionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md overflow-hidden shadow-sm animate-in zoom-in duration-200">
            <div className="p-6 border-b border-stone-100">
              <h3 className="text-lg font-bold text-brand-green flex items-center gap-2">
                <CheckCircle size={20} /> Confirmer la livraison
              </h3>
            </div>
            <div className="p-6">
              {(() => {
                const dist = distributions.find(d => d.id === confirmDistributionModal.id);
                const team = events.flatMap(e => e.teams).find(t => t.id === dist?.maraude_team_id);
                const event = events.find(e => e.id === team?.event_id);
                const mealsPrepared = event?.meals_prepared || 0;
                const peopleHelped = dist?.people_helped || 0;
                
                const eventTeamIds = event?.teams.map(t => t.id) || [];
                const eventDistributions = distributions.filter(d => eventTeamIds.includes(d.maraude_team_id || 0) && d.status === 'completed' && d.id !== confirmDistributionModal.id);
                const deliveredMealsSoFar = eventDistributions.reduce((sum, d) => sum + (d.mobile_meals_delivered !== undefined && d.mobile_meals_delivered !== null ? d.mobile_meals_delivered : (d.mobile_meal_count || 0)), 0);
                const remainingMeals = Math.max(0, mealsPrepared - deliveredMealsSoFar);
                
                const isExceedingPeople = confirmDistributionModal.requested > peopleHelped;
                const isExceedingStock = confirmDistributionModal.requested > remainingMeals;

                return (
                  <>
                    <p className="text-stone-600 mb-4">
                      Combien de repas ont été effectivement distribués ?
                    </p>
                    <div className="flex items-center gap-4 mb-6">
                      <button 
                        onClick={() => setConfirmDistributionModal(prev => prev ? { ...prev, requested: Math.max(0, prev.requested - 1) } : null)}
                        className="w-12 h-12 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-stone-200 transition-colors font-bold text-xl"
                      >
                        -
                      </button>
                      <div className="flex-1 text-center text-4xl font-black text-brand-green">
                        {confirmDistributionModal.requested}
                      </div>
                      <button 
                        onClick={() => {
                          if (confirmDistributionModal.requested < remainingMeals) {
                            setConfirmDistributionModal(prev => prev ? { ...prev, requested: prev.requested + 1 } : null);
                          }
                        }}
                        disabled={confirmDistributionModal.requested >= remainingMeals}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors font-bold text-xl",
                          confirmDistributionModal.requested >= remainingMeals ? "bg-stone-50 text-stone-300 cursor-not-allowed" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        )}
                      >
                        +
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-stone-400">Repas disponibles:</span>
                        <span className="text-stone-600">{remainingMeals}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-stone-400">Personnes rencontrées:</span>
                        <span className="text-stone-600">{peopleHelped}</span>
                      </div>
                    </div>

                    {isExceedingPeople && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 leading-tight">
                          Le nombre de repas dépasse le nombre de personnes rencontrées. Des personnes supplémentaires seront ajoutées au rapport.
                        </p>
                      </div>
                    )}

                    {isExceedingStock && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 leading-tight">
                          Attention: Vous dépassez le nombre de repas préparés prévus.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="p-6 bg-stone-50 flex gap-3">
              <button 
                onClick={() => setConfirmDistributionModal(null)}
                className="flex-1 py-3 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await authFetch(`/api/distributions/${confirmDistributionModal.id}/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        status: 'completed',
                        mobile_meals_delivered: confirmDistributionModal.requested
                      })
                    });
                    if (res.ok) {
                      fetchData();
                      setConfirmDistributionModal(null);
                    }
                  } catch (e) {}
                }}
                className="flex-1 py-3 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green/90 transition-colors shadow-sm"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {eventToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md overflow-hidden shadow-sm animate-in zoom-in duration-200">
            <div className="p-6 border-b border-stone-100">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <AlertCircle size={20} /> Supprimer la maraude
              </h3>
            </div>
            <div className="p-6">
              <p className="text-stone-600">Êtes-vous sûr de vouloir supprimer cette maraude ? Cette action supprimera également toutes les équipes, inscriptions, points de distribution et rapports associés. Cette action est irréversible.</p>
            </div>
            <div className="p-6 bg-stone-50 flex gap-3">
              <button 
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-3 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDeleteEvent}
                disabled={!!isProcessing}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm disabled:bg-red-300"
              >
                {isProcessing ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-stone-100 dark:border-stone-800">
              <h3 className={cn(
                "text-lg font-bold flex items-center gap-2",
                confirmation.type === 'danger' ? "text-red-600" : 
                confirmation.type === 'warning' ? "text-amber-600" : 
                "text-brand-green"
              )}>
                {confirmation.type === 'danger' ? <AlertCircle size={20} /> : 
                 confirmation.type === 'warning' ? <AlertTriangle size={20} /> : 
                 <CheckCircle size={20} />}
                {confirmation.title}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                {confirmation.message}
              </p>
            </div>
            <div className="p-6 bg-stone-50 dark:bg-stone-900/50 flex gap-3">
              <button 
                onClick={() => setConfirmation(null)}
                className="flex-1 py-3 text-sm font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
              >
                {confirmation.cancelText || "Annuler"}
              </button>
              <button 
                onClick={() => {
                  confirmation.onConfirm();
                  setConfirmation(null);
                }}
                className={cn(
                  "flex-1 py-3 text-white rounded-xl text-sm font-bold transition-colors shadow-sm",
                  confirmation.type === 'danger' ? "bg-red-600 hover:bg-red-700" : 
                  confirmation.type === 'warning' ? "bg-amber-600 hover:bg-amber-700" : 
                  "bg-brand-green hover:bg-brand-green/90"
                )}
              >
                {confirmation.confirmText || "Confirmer"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default MaraudeMapPage;
