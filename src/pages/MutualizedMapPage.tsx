import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Polygon, Marker, Popup, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import { motion } from 'motion/react';
import { Map as MapIcon, Users, Calendar, Layers, Filter, Activity, MapPin, CircleDot, ChevronLeft, ChevronRight, Plus, Trash2, X, AlertCircle, Pencil, Save, Undo2, ChevronUp, ChevronDown } from 'lucide-react';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/Skeleton';
import { 
  format, parseISO, isAfter, isBefore, subDays, startOfDay, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  addMonths, subMonths, getDay, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { PedestrianPolyline } from '../components/PedestrianPolyline';

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapClickHandler = ({ onMapClick }: { onMapClick: (e: any) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e);
    }
  });
  return null;
};

const parsePath = (data: any): [number, number][] => {
  let parsed = data;
  for (let i = 0; i < 3; i++) {
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        break;
      }
    } else {
      break;
    }
  }

  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string' && (parsed[0] === '[' || parsed[0] === '"')) {
    try { parsed = JSON.parse(parsed.join('')); } catch {}
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch {}
    }
  }
  
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((p: any) => Array.isArray(p) && p.length >= 2 && p[0] != null && !isNaN(parseFloat(p[0])) && p[1] != null && !isNaN(parseFloat(p[1])))
    .map((p: any) => [parseFloat(p[0]), parseFloat(p[1])] as [number, number]);
};

const MutualizedMapPage = () => {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [associations, setAssociations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'planned' | 'create'>('planned');
  const [filterStartDate, setFilterStartDate] = useState(format(subDays(new Date(), 90) , 'yyyy-MM-dd'));
  const [filterEndDate, setFilterEndDate] = useState(format(subDays(new Date(), -90), 'yyyy-MM-dd'));
  const [filterStatus, setFilterStatus] = useState<'planned' | 'past' | 'all'>('planned');
  const [selectedAssoIds, setSelectedAssoIds] = useState<number[]>([]);
  const [isAssoListExpanded, setIsAssoListExpanded] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getAssoColor = (id: number) => associations.find(a => a.id === id)?.color || '#2563eb';
  const getAssoName = (id: number) => associations.find(a => a.id === id)?.name || 'Inconnue';

  const filteredEvents = events.filter(e => {
    if (selectedAssoIds.length > 0 && !selectedAssoIds.includes(e.association_id)) return false;
    
    const eventDate = e.date ? parseISO(e.date) : null;
    const isPast = eventDate ? isBefore(eventDate, startOfDay(new Date())) : false;
    const isFuture = eventDate ? !isPast : true;

    if (filterStatus === 'planned' && isPast) return false;
    if (filterStatus === 'past' && isFuture) return false;

    if (filterStartDate && eventDate && isBefore(eventDate, parseISO(filterStartDate))) return false;
    if (filterEndDate && eventDate && isAfter(eventDate, parseISO(filterEndDate))) return false;

    return true;
  });

  const displayAssociations = associations.filter(a => {
    if (selectedAssoIds.length > 0 && !selectedAssoIds.includes(a.id)) return false;
    return true;
  });

  const mapTiles = {
    'OSM Standard': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    'OSM France': 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    'OSM HOT': 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
  };

  useEffect(() => {
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    
    if (action === 'create') {
      setViewMode('create');
    } else if (action === 'edit' && id) {
      const eventToEdit = events.find(e => e.id === parseInt(id));
      if (eventToEdit) {
        // Check permissions: either same association or admin
        const isAdminUser = user?.groups?.some(g => ['Administrateur', 'Admin', 'ADMIN_SITE'].includes(g.name)) || 
                             user?.roles?.some(r => ['Président·e', 'Président', 'President', 'PRESIDENT'].includes(r));
        const isOwner = eventToEdit.association_id === Number(user?.association_id) || eventToEdit.association_id === user?.association_id;
        const canEdit = isOwner || isAdminUser;
        
        if (!canEdit) {
          alert("Vous n'êtes pas autorisé à modifier les parcours d'une autre association.");
          navigate('/mutualized');
          return;
        }

        setEditingEventId(parseInt(id));
        setCreateData({
          association_id: eventToEdit.association_id.toString(),
          date: eventToEdit.date ? eventToEdit.date.split('T')[0] : '',
          prep_location: eventToEdit.prep_location || '',
          prep_time: eventToEdit.prep_time || '',
          prep_description: eventToEdit.prep_description || '',
          start_location: eventToEdit.start_location || '',
          start_time: eventToEdit.start_time || '',
          info_document_url: eventToEdit.info_document_url || '',
          name: eventToEdit.name || 'Circuit Principal',
        });
        setPrepCoords(eventToEdit.prep_lat && eventToEdit.prep_lng ? { lat: eventToEdit.prep_lat, lng: eventToEdit.prep_lng } : null);
        setStartCoords(eventToEdit.start_lat && eventToEdit.start_lng ? { lat: eventToEdit.start_lat, lng: eventToEdit.start_lng } : null);
        setPlanTeams(eventToEdit.teams.map((t: any) => ({
          team_name: t.team_name,
          color: t.color,
          path_type: t.path_type || 'line',
          path_data: parsePath(t.path_data)
        })));
        setViewMode('create'); // Use 'create' view for editing too, just update the submit logic
      }
    }
  }, [searchParams, events]);

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await authFetch(`/api/maraude-events/${eventToDelete}`, { method: 'DELETE' });
      setEvents(events.filter(e => e.id !== eventToDelete));
      setEventToDelete(null);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await authFetch('/api/maraude/dashboard-summary');
        
        if (res.ok) {
          const { events: eventsData, distributions: distributionsData, associations: associationsData } = await res.json();
          
          const processedEvents = eventsData.map((e: any) => ({
            ...e,
            teams: e.teams?.map((t: any) => {
              return {
                ...t,
                path_data: (() => {
                  return parsePath(t.path_data);
                })()
              };
            }) || []
          }));
          setEvents(processedEvents);
          setDistributions(distributionsData);
          setAssociations(associationsData);
        }
      } catch (err) {
        console.error("Failed to fetch mutualized data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch]);

  useEffect(() => {
    if (user?.association_id && !createData.association_id) {
      setCreateData(prev => ({ ...prev, association_id: user.association_id.toString() }));
    }
  }, [user]);
  
  useEffect(() => {
    if (filteredEvents.length > 0 && selectedMaraudesForMap.length === 0) {
      setSelectedMaraudesForMap(filteredEvents.map(e => e.id));
    }
  }, [filteredEvents]);

  const [selectedMaraudesForMap, setSelectedMaraudesForMap] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<keyof typeof mapTiles>('OSM France');
  const [isStyleExpanded, setIsStyleExpanded] = useState(false);
  const [heatmapRange, setHeatmapRange] = useState({ start: '', end: '' });
  const [appliedHeatmapRange, setAppliedHeatmapRange] = useState({ start: '', end: '' });
  
  // Creation States

  const toggleAllMaraudes = (selectAll: boolean) => {
    if (selectAll) {
        setSelectedMaraudesForMap(filteredEvents.map(e => e.id));
    } else {
        setSelectedMaraudesForMap([]);
    }
  };

  const toggleMaraude = (eventId: number) => {
    if (selectedMaraudesForMap.includes(eventId)) {
        setSelectedMaraudesForMap(selectedMaraudesForMap.filter(id => id !== eventId));
    } else {
        setSelectedMaraudesForMap([...selectedMaraudesForMap, eventId]);
    }
  };

  const calendarDays = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Padding for the first week
    const firstDay = getDay(start);
    const padding = (firstDay + 6) % 7; // Monday = 0
    const paddedDays = [];
    for (let i = 0; i < padding; i++) {
        paddedDays.push(null);
    }
    return [...paddedDays, ...days];
  }, [currentMonth]);

  const maraudeDates = React.useMemo(() => {
    const dates: Record<string, 'planned' | 'past'> = {};
    events.forEach(e => {
        if (!e.date) return;
        const d = e.date.split('T')[0];
        const eventDate = parseISO(e.date);
        const isPast = isBefore(eventDate, startOfDay(new Date()));
        
        // If there's already a 'planned' one, keep it, otherwise update
        if (dates[d] === 'planned') return;
        dates[d] = isPast ? 'past' : 'planned';
    });
    return dates;
  }, [events]);

  // Creation States
  const [createData, setCreateData] = useState({
    association_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    prep_location: '',
    prep_time: '19:00',
    prep_description: '',
    start_location: '',
    start_time: '20:00',
    info_document_url: '',
    name: 'Circuit Principal', // Legacy, keep for now
  });
  const [prepCoords, setPrepCoords] = useState<{lat: number, lng: number} | null>(null);
  const [startCoords, setStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [locationSelecting, setLocationSelecting] = useState<'prep' | 'start' | null>(null);
  const [globalPathType, setGlobalPathType] = useState<'line' | 'zone' | 'pedestrian'>('line');
  
  const [planTeams, setPlanTeams] = useState<{ team_name: string, path_data: [number, number][], color: string, path_type?: 'line' | 'zone' | 'pedestrian' }[]>([
    { team_name: 'Équipe 1', path_data: [], color: '#ef4444', path_type: 'line' }
  ]);
  const [activeTeamIdx, setActiveTeamIdx] = useState<number | null>(0);
  const [isProcessing, setIsProcessing] = useState<false | 'save'>(false);

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const addPlanTeam = () => {
    const nextColor = colors[planTeams.length % colors.length];
    setPlanTeams([...planTeams, { team_name: `Équipe ${planTeams.length + 1}`, path_data: [], color: nextColor, path_type: globalPathType }]);
    setActiveTeamIdx(planTeams.length);
  };

  const removePlanTeam = (idx: number) => {
    if (planTeams.length <= 1) return;
    const updated = planTeams.filter((_, i) => i !== idx);
    setPlanTeams(updated);
    if (activeTeamIdx !== null) {
      if (idx === activeTeamIdx) {
        setActiveTeamIdx(Math.max(0, idx - 1));
      } else if (idx < activeTeamIdx) {
        setActiveTeamIdx(activeTeamIdx - 1);
      }
    }
  };

  const handleMapClick = (e: any) => {
    if (viewMode !== 'create') return;
    
    if (locationSelecting === 'prep') {
      setPrepCoords(e.latlng);
      setLocationSelecting(null);
      return;
    }
    if (locationSelecting === 'start') {
      setStartCoords(e.latlng);
      setLocationSelecting(null);
      return;
    }

    if (activeTeamIdx === null) return;
    
    const updatedTeams = [...planTeams];
    updatedTeams[activeTeamIdx] = {
      ...updatedTeams[activeTeamIdx],
      path_data: [...updatedTeams[activeTeamIdx].path_data, [e.latlng.lat, e.latlng.lng]]
    };
    setPlanTeams(updatedTeams);
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

  const resetForm = () => {
    setViewMode('planned');
    setCreateData({
      ...createData,
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setPrepCoords(null);
    setStartCoords(null);
    setPlanTeams([{ team_name: 'Équipe 1', path_data: [], color: '#ef4444', path_type: 'line' }]);
    setActiveTeamIdx(0);
    setLocationSelecting(null);
  };

  const handleCreateSubmit = async () => {
    if (!createData.association_id) {
      alert("Veuillez sélectionner une association");
      return;
    }
    if (planTeams.some(t => t.path_data.length < 1)) {
      alert("Veuillez dessiner un parcours pour chaque équipe (au moins 1 point).");
      return;
    }

    setIsProcessing('save');
    try {
      const payload = {
        association_id: createData.association_id,
        date: createData.date,
        prep_location: createData.prep_location,
        prep_time: createData.prep_time,
        prep_description: createData.prep_description,
        start_location: createData.start_location,
        start_time: createData.start_time,
        info_document_url: createData.info_document_url,
        prep_lat: prepCoords?.lat,
        prep_lng: prepCoords?.lng,
        start_lat: startCoords?.lat,
        start_lng: startCoords?.lng,
        teams: planTeams.map(t => ({
          team_name: t.team_name,
          color: t.color,
          path_type: t.path_type || 'line',
          path_data: JSON.stringify(t.path_data)
        }))
      };

      const url = editingEventId ? `/api/maraude-events/${editingEventId}` : '/api/maraude-events';
      const method = editingEventId ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        resetForm();
        alert("Maraude enregistrée avec succès !");
        // Refresh data
        const eventsRes = await authFetch('/api/maraude-events?all=true');
        console.log("Events refresh result:", eventsRes.status);
        if (eventsRes.ok) {
          const text = await eventsRes.text();
          let rawEvents;
          try {
            rawEvents = JSON.parse(text);
          } catch (e) {
            console.error("Failed to parse events JSON in handleCreateSubmit, received:", text);
            throw new Error("Failed to parse API response as JSON");
          }
          
          console.log("Raw events:", rawEvents);
          const processedEvents = (rawEvents || []).map((event: any) => ({
            ...event,
            teams: (event.teams || []).map((t: any) => ({
              ...t,
              path_data: parsePath(t.path_data)
            }))
          }));
          setEvents(processedEvents);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        console.error("Save error data:", errorData);
        alert(`Erreur lors de la création : ${errorData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-stone-50 dark:bg-stone-950 overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col h-1/3 md:h-full z-10 shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
                <MapIcon size={20} />
              </div>
              <div>
                <h1 className="text-xl font-black text-stone-900 dark:text-white cursor-pointer" onClick={() => navigate('/')}>Carte Mutualisée</h1>
                <p className="text-xs text-stone-500">Vue globale inter-associations</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar space-y-4 pt-0">
          
          {user && user.rights?.['Carte Mutualisée'] !== '-' && (
            <button onClick={() => setViewMode(prev => prev === 'create' ? 'planned' : 'create')} className="w-full py-3 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green/90 transition-colors shadow-sm">
              {(viewMode as any) === 'create' ? 'Fermer le formulaire' : 'Ajouter un parcours'}
            </button>
          )}

          <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
            <label className="block text-[9px] font-bold text-stone-400 uppercase mb-2">Style de la carte</label>
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

          {viewMode === 'planned' && (
            <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button 
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className="w-full flex items-center justify-between group"
              >
                <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest flex items-center gap-2 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
                  <Filter size={14} className="text-brand-green" /> Filtres de la carte
                </h3>
                <div className="text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                  {isFiltersExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              
              {isFiltersExpanded && (
                <div className="space-y-4 mt-4">
                {/* Association Filter Retractable */}
                  <div>
                    <button 
                      onClick={() => setIsAssoListExpanded(!isAssoListExpanded)}
                      className="flex items-center justify-between w-full text-[9px] font-bold text-stone-400 uppercase mb-2"
                    >
                      Associations {selectedAssoIds.length > 0 && selectedAssoIds.length !== associations.length ? `(${selectedAssoIds.length} sélectionnées)` : `(${associations.length} sélectionnées)`}
                      {isAssoListExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                    </button>
                    {isAssoListExpanded && (
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAssoIds.length === 0 || selectedAssoIds.length === associations.length}
                            onChange={() => {
                              if (selectedAssoIds.length === 0 || selectedAssoIds.length === associations.length) {
                                // If already all checked, selecting 'Toutes' again could either do nothing or select a default one
                                // In many UX patterns, click 'all' when 'all' is on stays on 'all' or resets.
                                // Let's make it so it selects just the first one if you uncheck 'All' from 'All' state if that's desired, 
                                // but usually people want to click 'All' to select everything.
                                if (associations.length > 0) setSelectedAssoIds([associations[0].id]);
                              } else {
                                setSelectedAssoIds([]); // [] represents all in the current filter logic
                              }
                            }}
                            className="rounded text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-[10px] text-stone-600 dark:text-stone-300">Toutes ({associations.length})</span>
                        </label>
                        {associations.map(asso => (
                          <label key={asso.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedAssoIds.length === 0 || selectedAssoIds.includes(asso.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const next = [...selectedAssoIds, asso.id];
                                  if (next.length === associations.length) {
                                    setSelectedAssoIds([]); // Back to "All" state
                                  } else {
                                    setSelectedAssoIds(next);
                                  }
                                } else {
                                  if (selectedAssoIds.length === 0) {
                                    // If we were in "All" mode and uncheck one, we need to explicitly list all others
                                    setSelectedAssoIds(associations.filter(a => a.id !== asso.id).map(a => a.id));
                                  } else {
                                    setSelectedAssoIds(selectedAssoIds.filter(id => id !== asso.id));
                                  }
                                }
                              }}
                              className="rounded text-brand-green focus:ring-brand-green"
                            />
                            <span className="text-[10px] text-stone-600 dark:text-stone-300">{asso.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-2">Période / Calendrier</label>
                    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden mb-4">
                        <div className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors">
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-[10px] font-bold uppercase text-stone-600 dark:text-stone-300">
                                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                            </span>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-px bg-stone-200 dark:bg-stone-700">
                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                                <div key={i} className="bg-white dark:bg-stone-900 text-center py-1 text-[8px] font-black text-stone-400">{d}</div>
                            ))}
                            {calendarDays.map((day, i) => {
                                if (!day) return <div key={`pad-${i}`} className="bg-white dark:bg-stone-900" />;
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const status = maraudeDates[dateStr];
                                const isSelected = dateStr >= filterStartDate && dateStr <= filterEndDate;
                                const isStart = dateStr === filterStartDate;
                                const isEnd = dateStr === filterEndDate;
                                const isRange = filterStartDate !== filterEndDate;
                                const isTodayDay = isToday(day);

                                return (
                                    <button 
                                        key={dateStr}
                                        onClick={() => {
                                            if (filterStartDate === filterEndDate) {
                                                if (dateStr === filterStartDate) {
                                                    // Reset
                                                    setFilterStartDate(format(subDays(new Date(), 90) , 'yyyy-MM-dd'));
                                                    setFilterEndDate(format(subDays(new Date(), -90), 'yyyy-MM-dd'));
                                                } else {
                                                    if (dateStr < filterStartDate) {
                                                        setFilterStartDate(dateStr);
                                                        setFilterEndDate(filterStartDate);
                                                    } else {
                                                        setFilterStartDate(filterStartDate);
                                                        setFilterEndDate(dateStr);
                                                    }
                                                }
                                            } else {
                                                setFilterStartDate(dateStr);
                                                setFilterEndDate(dateStr);
                                            }
                                        }}
                                        className={cn(
                                            "bg-white dark:bg-stone-900 py-1.5 relative group transition-colors hover:bg-stone-50 dark:hover:bg-stone-800",
                                            isSelected && "bg-brand-green/20",
                                            isStart && isRange && "rounded-l-md",
                                            isEnd && isRange && "rounded-r-md"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[9px] font-medium relative z-10",
                                            (isStart || isEnd || (!isRange && isSelected)) ? "text-brand-green font-bold" : "text-stone-600 dark:text-stone-300",
                                            isTodayDay && "underline decoration-brand-green decoration-2 underline-offset-2"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                        {status && (
                                            <div className={cn(
                                                "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                                                status === 'planned' ? "bg-brand-green" : "bg-stone-400"
                                            )} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="flex-1 p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[10px] outline-none focus:ring-1 focus:ring-brand-green"
                      />
                      <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="flex-1 p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[10px] outline-none focus:ring-1 focus:ring-brand-green"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Affichage maraudes</label>
                    <div className="flex bg-stone-100 dark:bg-stone-700 p-1 rounded-lg">
                      <button 
                        onClick={() => setFilterStatus('planned')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          filterStatus === 'planned' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Prochaines
                      </button>
                      <button 
                        onClick={() => setFilterStatus('past')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          filterStatus === 'past' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Passées
                      </button>
                      <button 
                        onClick={() => setFilterStatus('all')}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                          filterStatus === 'all' ? "bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm" : "text-stone-500 hover:text-stone-700"
                        )}
                      >
                        Toutes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'create' && (
            <div className="mb-6">
              <div className="p-5 bg-brand-green/5 rounded-2xl border border-brand-green/20 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-sm text-brand-green">
                    {editingEventId ? 'Modifier la Maraude' : 'Nouvelle Maraude Mutualisée'}
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handleUndo} className="p-2 bg-white dark:bg-stone-800 rounded-lg text-brand-green hover:bg-brand-green/10 shadow-sm transition-colors" title="Annuler dernier point">
                      <Undo2 size={16} />
                    </button>
                    {editingEventId && (
                      <button 
                        onClick={() => {
                          if (confirm("Supprimer cette maraude ?")) {
                            authFetch(`/api/maraude-events/${editingEventId}`, { method: 'DELETE' }).then(() => resetForm());
                          }
                        }}
                        className="p-2 bg-white dark:bg-stone-800 rounded-lg text-red-500 hover:bg-red-50 shadow-sm transition-colors"
                        title="Supprimer la maraude"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-brand-green uppercase mb-1 ml-1">Association</label>
                  <select 
                    value={createData.association_id}
                    onChange={(e) => setCreateData({...createData, association_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-brand-green/30 text-sm outline-none focus:ring-2 focus:ring-brand-green bg-white dark:bg-stone-800 text-stone-900 dark:text-white transition-all"
                  >
                    <option value="" disabled>Sélectionnez une asso...</option>
                    {associations.map(asso => (
                      <option key={asso.id} value={asso.id}>{asso.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-brand-green uppercase mb-1 ml-1">Date de la maraude</label>
                  <input 
                    type="date" 
                    value={createData.date} 
                    onChange={e => setCreateData({...createData, date: e.target.value})} 
                    className="w-full px-3 py-2 rounded-xl border border-brand-green/30 text-sm outline-none focus:ring-2 focus:ring-brand-green bg-white dark:bg-stone-800 text-stone-900 dark:text-white transition-all" 
                  />
                </div>

                <div className="flex flex-col gap-4 mb-4">
                  <div className="space-y-3 p-3 bg-white dark:bg-stone-800 rounded-xl border border-brand-green/20">
                    <h4 className="text-[10px] font-bold text-brand-green uppercase">1. Préparation (facultatif)</h4>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Lieu de préparation</label>
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => setLocationSelecting('prep')}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-colors",
                            locationSelecting === 'prep' ? "bg-brand-green text-white border-brand-green" : 
                            prepCoords ? "bg-brand-green/10 text-brand-green border-brand-green/30" : "bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100"
                          )}
                        >
                          <MapPin size={14} />
                          {prepCoords && prepCoords.lat != null && prepCoords.lng != null 
                            ? `Point défini (${prepCoords.lat.toFixed(4)}, ${prepCoords.lng.toFixed(4)})` 
                            : "Sélectionner sur la carte"}
                        </button>
                        {prepCoords && (
                          <button 
                            onClick={() => setPrepCoords(null)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Retirer l'emplacement"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Heure de préparation</label>
                      <input 
                        type="time" 
                        value={createData.prep_time} 
                        onChange={e => setCreateData({...createData, prep_time: e.target.value})} 
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-200 text-xs outline-none focus:ring-1 focus:ring-brand-green bg-white dark:bg-stone-900 text-stone-900 dark:text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Description (accès, contact...)</label>
                      <textarea 
                        value={createData.prep_description} 
                        onChange={e => setCreateData({...createData, prep_description: e.target.value})} 
                        placeholder="Ex: Sonner à l'appartement 4, ou appeler le 06..."
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-200 text-xs outline-none focus:ring-1 focus:ring-brand-green bg-white dark:bg-stone-900 text-stone-900 dark:text-white min-h-[60px]" 
                      />
                    </div>
                  </div>

                  <div className="space-y-3 p-3 bg-white dark:bg-stone-800 rounded-xl border border-brand-green/20">
                    <h4 className="text-[10px] font-bold text-brand-green uppercase">2. Distribution</h4>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Lieu de rendez-vous</label>
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => setLocationSelecting('start')}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-colors",
                            locationSelecting === 'start' ? "bg-brand-green text-white border-brand-green" : 
                            startCoords ? "bg-brand-green/10 text-brand-green border-brand-green/30" : "bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100"
                          )}
                        >
                          <MapPin size={14} />
                          {startCoords && startCoords.lat != null && startCoords.lng != null 
                            ? `Point défini (${startCoords.lat.toFixed(4)}, ${startCoords.lng.toFixed(4)})` 
                            : "Sélectionner sur la carte"}
                        </button>
                        {startCoords && (
                          <button 
                            onClick={() => setStartCoords(null)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Retirer l'emplacement"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Heure de rendez-vous</label>
                      <input 
                        type="time" 
                        value={createData.start_time} 
                        onChange={e => setCreateData({...createData, start_time: e.target.value})} 
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-200 text-xs outline-none focus:ring-1 focus:ring-brand-green bg-white dark:bg-stone-900 text-stone-900 dark:text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase mb-1">Document important (PDF, etc.)</label>
                      <div className="flex flex-col gap-2">
                        <input 
                          type="url" 
                          value={createData.info_document_url} 
                          onChange={e => setCreateData({...createData, info_document_url: e.target.value})} 
                          placeholder="Lien (https://...) ou importer ->"
                          className="w-full px-2 py-1.5 rounded-lg border border-stone-200 text-xs outline-none focus:ring-1 focus:ring-brand-green bg-white dark:bg-stone-900 text-stone-900 dark:text-white" 
                        />
                        <input 
                          type="file"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              alert('Le fichier est trop lourd (max 2Mo).');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              setCreateData(prev => ({ ...prev, info_document_url: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="w-full text-[10px] text-stone-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-brand-green/10 file:text-brand-green"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100 dark:border-stone-700 mt-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-brand-green uppercase ml-1">Équipes & Circuits</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={globalPathType}
                            onChange={(e) => {
                              const newType = e.target.value as 'line' | 'zone' | 'pedestrian';
                              setGlobalPathType(newType);
                              setPlanTeams(planTeams.map(t => ({ ...t, path_type: newType })));
                            }}
                            className="text-[10px] bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded px-1 py-0.5 text-stone-600 dark:text-stone-300 outline-none focus:border-brand-green"
                          >
                            <option value="line">Tracé direct</option>
                            <option value="zone">Zone de maraude</option>
                            <option value="pedestrian">Itinéraire piéton</option>
                          </select>
                          <button 
                            onClick={addPlanTeam} 
                            className="text-brand-green hover:text-brand-green/80 p-1 rounded-lg hover:bg-brand-green/10 transition-colors"
                            title="Ajouter une équipe"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-brand-green font-medium bg-brand-green/5 p-2 rounded-lg border border-brand-green/20 flex items-center gap-2">
                        <AlertCircle size={12} /> Tracez le circuit sur la carte.
                      </p>
                      
                      <div className="max-h-64 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                        {planTeams.map((team, idx) => (
                          <div key={idx} onClick={() => setActiveTeamIdx(idx)} className={cn(
                            "p-3 rounded-xl border cursor-pointer transition-all relative group",
                            activeTeamIdx === idx ? "bg-brand-green/10 dark:bg-brand-green/20 border-brand-green shadow-md ring-1 ring-brand-green" : "bg-white dark:bg-stone-800 border-transparent hover:border-brand-green/30"
                          )}>
                            <div className="flex items-center gap-2 mb-1">
                              <input 
                                type="color" 
                                value={team.color} 
                                onChange={e => {
                                  const updated = [...planTeams];
                                  updated[idx].color = e.target.value;
                                  setPlanTeams(updated);
                                }}
                                className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-xs font-bold w-full truncate text-stone-900 dark:text-white">{team.team_name}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newName = prompt("Nouveau nom de l'équipe :", team.team_name);
                                  if (newName && newName.trim()) {
                                    const updated = [...planTeams];
                                    updated[idx].team_name = newName.trim();
                                    setPlanTeams(updated);
                                  }
                                }}
                                className="text-stone-400 hover:text-brand-green p-1 rounded-md hover:bg-brand-green/10 transition-colors"
                                title="Renommer l'équipe"
                              >
                                <Pencil size={12} />
                              </button>
                              {planTeams.length > 1 && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); removePlanTeam(idx); }} 
                                  className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Supprimer l'équipe"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-[10px] text-stone-500">
                                {team.path_data.length} points tracés
                              </span>
                            </div>
                            {activeTeamIdx === idx && (
                              <div className="mt-2 flex justify-end">
                                <span className="text-[8px] font-bold text-brand-green uppercase animate-pulse">Édition active</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={handleCreateSubmit} 
                    disabled={!!isProcessing}
                    className="flex-1 bg-brand-green text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-green/90 transition-all shadow-sm disabled:bg-brand-green/50"
                  >
                    {isProcessing === 'save' ? "Enregistrement..." : <><Save size={18} /> Enregistrer</>}
                  </button>
                  <button 
                    onClick={resetForm} 
                    className="px-4 py-2.5 text-stone-500 font-bold text-sm hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : viewMode !== 'create' ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-brand-green" />
                    Maraudes ({filteredEvents.length})
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox"
                        checked={filteredEvents.length > 0 && filteredEvents.every(e => selectedMaraudesForMap.includes(e.id))}
                        onChange={(e) => toggleAllMaraudes(e.target.checked)}
                        className="rounded text-brand-green focus:ring-brand-green cursor-pointer"
                    />
                    <span className="text-[10px] text-stone-500">Tout</span>
                </div>
              </h3>
              {filteredEvents.length === 0 ? (
                <p className="text-sm text-stone-500 italic">Aucune maraude trouvée avec ces filtres.</p>
              ) : (
                filteredEvents.map(event => {
                  const canEdit = user && (user.groups?.some((g: any) => g.name === 'Administrateur') || user.rights?.['La maraude'] === 'RW' || user.rights?.['La maraude'] === 'RWD');
                  
                  return (
                    <div key={event.id} className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={selectedMaraudesForMap.includes(event.id)}
                        onChange={() => toggleMaraude(event.id)}
                        className="rounded text-brand-green focus:ring-brand-green cursor-pointer"
                      />
                      <div className="flex-1 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-stone-600 font-medium">
                            {event.date ? format(parseISO(event.date), 'dd/MM/yy', { locale: fr }) : 'Inconnu'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ backgroundColor: `${getAssoColor(event.association_id)}20`, color: getAssoColor(event.association_id) }}>
                            {getAssoName(event.association_id)}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {canEdit && (
                            <button 
                              onClick={() => {
                                setViewMode('create');
                                setEditingEventId(event.id);
                                // Populate form
                                const eDate = event.date ? event.date.split('T')[0] : '';
                                setSelectedAssoIds([event.association_id]);
                                setCreateData({
                                  name: event.name || 'Circuit Principal',
                                  date: eDate,
                                  association_id: event.association_id.toString(),
                                  start_location: event.start_location || '',
                                  prep_location: event.prep_location || '',
                                  prep_time: event.prep_time || '19:00',
                                  prep_description: event.prep_description || '',
                                  start_time: event.start_time || '20:00',
                                  info_document_url: event.info_document_url || '',
                                });
                                setPrepCoords(event.prep_lat ? { lat: event.prep_lat, lng: event.prep_lng } : null);
                                setStartCoords(event.start_lat ? { lat: event.start_lat, lng: event.start_lng } : null);
                                setPlanTeams(event.teams || []);
                              }}
                              className="text-stone-500 hover:text-brand-green transition-colors p-2"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canEdit && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventToDelete(event.id);
                              }}
                              className="text-stone-500 hover:text-red-500 transition-colors p-2"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        {/* Removed Legende duplicate as per user request */}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative h-2/3 md:h-full z-0">
        <MapContainer 
          center={[43.6047, 1.4442]} 
          zoom={13} 
          className="w-full h-full"
          zoomControl={false}
        >
          <MapClickHandler onMapClick={handleMapClick} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={mapTiles[mapStyle]}
          />

          {viewMode === 'create' && (
            <>
              {prepCoords && prepCoords.lat != null && prepCoords.lng != null && (
                <Marker 
                  position={[prepCoords.lat, prepCoords.lng]} 
                  zIndexOffset={1100}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                  eventHandlers={{
                    click: (e) => {
                      if (e.originalEvent) {
                        L.DomEvent.stopPropagation(e.originalEvent);
                      }
                    }
                  }}
                >
                  <Popup>Lieu de préparation</Popup>
                </Marker>
              )}
              {startCoords && startCoords.lat != null && startCoords.lng != null && (
                <Marker 
                  position={[startCoords.lat, startCoords.lng]} 
                  zIndexOffset={1100}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: #2563eb; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${(activeTeamIdx !== null && planTeams[activeTeamIdx]?.path_type === 'zone') ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' : '1'}</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                  eventHandlers={{
                    click: (e) => {
                      if (e.originalEvent) {
                        L.DomEvent.stopPropagation(e.originalEvent);
                      }
                    }
                  }}
                >
                  <Popup>Lieu de rendez-vous {(activeTeamIdx !== null && planTeams[activeTeamIdx]?.path_type !== 'zone') ? '(Point 1)' : ''}</Popup>
                </Marker>
              )}

              {planTeams.map((team, idx) => {
                const fullPath = [...team.path_data];
                const isCircuit = team.path_type !== 'zone';
                
                if (isCircuit && startCoords && startCoords.lat != null && startCoords.lng != null) {
                  if (fullPath.length > 0) {
                    const isStartFirst = Math.abs(fullPath[0][0] - startCoords.lat) < 0.0001 && Math.abs(fullPath[0][1] - startCoords.lng) < 0.0001;
                    if (!isStartFirst) {
                      fullPath.unshift([startCoords.lat, startCoords.lng]);
                    }
                  } else {
                    fullPath.unshift([startCoords.lat, startCoords.lng]);
                  }
                }
                
                if (isCircuit && fullPath.length > 2) {
                  fullPath.push([...fullPath[0]]);
                }
                
                const opacity = 1;
                const weight = 4;

                return (
                  <React.Fragment key={`${idx}-${team.color}`}>
                    {team.path_type === 'zone' ? (
                      <Polygon positions={fullPath} color={team.color} fillOpacity={0.3} weight={weight} opacity={opacity} dashArray="5, 10" />
                    ) : team.path_type === 'pedestrian' ? (
                      <PedestrianPolyline waypoints={fullPath} color={team.color} weight={weight} opacity={opacity} dashArray="5, 10" />
                    ) : (
                      <Polyline positions={fullPath} color={team.color} weight={weight} opacity={opacity} dashArray="5, 10" />
                    )}
                    {team.path_data.map((p, i) => {
                      if (!p || p[0] == null || p[1] == null) return null;
                      // Skip rendering marker for the start point if it's already rendered by the blue marker
                      const isStartPoint = startCoords && team.path_type !== 'zone' && 
                        Math.abs(p[0] - (startCoords.lat || 0)) < 0.0001 && 
                        Math.abs(p[1] - (startCoords.lng || 0)) < 0.0001;
                      
                      if (isStartPoint) return null;

                      let pointNumber: number;
                      if (team.path_type === 'zone') {
                        pointNumber = i + 1;
                      } else if (!startCoords) {
                        pointNumber = i + 1;
                      } else {
                        const firstPointIsStart = team.path_data.length > 0 && 
                          Math.abs(team.path_data[0][0] - startCoords.lat) < 0.0001 && 
                          Math.abs(team.path_data[0][1] - startCoords.lng) < 0.0001;
                        pointNumber = firstPointIsStart ? i + 1 : i + 2;
                      }

                      return (
                        <Marker 
                          key={i} 
                          position={p} 
                          zIndexOffset={1000}
                          icon={L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div style="background-color: ${team.color}; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${pointNumber}</div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                          })}
                          eventHandlers={{
                            click: (e) => {
                              if (e.originalEvent) {
                                L.DomEvent.stopPropagation(e.originalEvent);
                              }
                              if (activeTeamIdx !== idx) {
                                setActiveTeamIdx(idx);
                              } else {
                                // removing point by clicking it
                                const updatedTeams = [...planTeams];
                                updatedTeams[idx].path_data = updatedTeams[idx].path_data.filter((_, ptIdx) => ptIdx !== i);
                                setPlanTeams(updatedTeams);
                              }
                            }
                          }}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </>
          )}

          {/* Map Tiles moved to sidebar */}

          {/* Render other events from either viewMode !== create OR if viewMode === create, matching the creation date */}
          <React.Fragment key={associations.length}>
            {(viewMode !== 'create' ? filteredEvents.filter(e => selectedMaraudesForMap.includes(e.id)) : events.filter(e => e.date && e.date.split('T')[0] === createData.date)).map(event => (
              event.teams?.map((team: any) => {
              if (!team.path_data || team.path_data.length === 0) {
                console.log("No path data or empty for team:", team.id, team.path_data);
                return null;
              }
              console.log("Rendering path for team:", team.id, team.path_type);
              const color = getAssoColor(event.association_id);
              
              const fullPath = [...team.path_data];
              const isCircuit = team.path_type !== 'zone';
              
              if (isCircuit && event.start_lat != null && event.start_lng != null) {
                if (fullPath.length > 0) {
                  const isStartFirst = Math.abs(fullPath[0][0] - event.start_lat) < 0.0001 && Math.abs(fullPath[0][1] - event.start_lng) < 0.0001;
                  if (!isStartFirst) {
                    fullPath.unshift([event.start_lat, event.start_lng]);
                  }
                } else {
                  fullPath.unshift([event.start_lat, event.start_lng]);
                }
              }
              
              if (isCircuit && fullPath.length > 2) {
                fullPath.push([...fullPath[0]]);
              }
              
              if (team.path_type === 'zone') {
                return (
                  <Polygon 
                    key={`${team.id}-${color}`}
                    positions={fullPath} 
                    color={color} 
                    fillColor={color} 
                    fillOpacity={0.2}
                    weight={2}
                  >
                    <Tooltip sticky>
                      <div className="text-xs">
                        <p className="font-bold">{getAssoName(event.association_id)}</p>
                        <p>{event.name || 'Maraude'} - {event.date ? format(parseISO(event.date), 'dd/MM/yyyy') : 'Date inconnue'}</p>
                        <p className="text-stone-500">Équipe: {team.team_name}</p>
                      </div>
                    </Tooltip>
                  </Polygon>
                );
              } else if (team.path_type === 'pedestrian') {
                return (
                  <PedestrianPolyline 
                    key={`${team.id}-${color}`}
                    waypoints={fullPath} 
                    color={color} 
                    weight={4} 
                    opacity={0.8}
                  />
                );
              } else {
                return (
                  <Polyline 
                    key={`${team.id}-${color}`}
                    positions={fullPath} 
                    color={color} 
                    weight={4} 
                    opacity={0.8}
                  >
                    <Tooltip sticky>
                      <div className="text-xs">
                        <p className="font-bold">{getAssoName(event.association_id)}</p>
                        <p>{event.name || 'Maraude'} - {event.date ? format(parseISO(event.date), 'dd/MM/yyyy') : 'Date inconnue'}</p>
                        <p className="text-stone-500">Équipe: {team.team_name}</p>
                      </div>
                    </Tooltip>
                  </Polyline>
                );
              }
            })
          ))}
          </React.Fragment>
        </MapContainer>
      </div>
      {eventToDelete && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-stone-200 dark:border-stone-700">
            <h2 className="text-2xl font-black mb-4 tracking-tight text-text-main">Confirmer la suppression</h2>
            <p className="text-stone-500 mb-8">Êtes-vous sûr de vouloir supprimer cette maraude ? Cette action est irréversible.</p>
            <div className="flex gap-4">
                <button onClick={() => setEventToDelete(null)} className="flex-1 py-4 font-bold text-stone-400 hover:bg-stone-50 rounded-2xl transition-colors">Annuler</button>
                <button onClick={confirmDeleteEvent} className="flex-[2] bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MutualizedMapPage;
