const mapEventToSnakeCase = (e) => ({
  id: e.id,
  date: e.date,
  status: e.status,
  association_id: e.associationId,
  prep_location: e.prepLocation,
  prep_time: e.prepTime,
  start_location: e.startLocation,
  start_time: e.startTime,
  prep_lat: e.prepLat,
  prep_lng: e.prepLng,
  start_lat: e.startLat,
  start_lng: e.startLng,
  prep_description: e.prepDescription,
  info_document_url: e.infoDocumentUrl,
  meals_prepared: e.mealsPrepared,
  meals_description: e.mealsDescription,
  created_at: e.createdAt,
  teams: (e.teams || []).map((t) => ({
    id: t.id,
    event_id: t.eventId,
    team_name: t.teamName,
    path_data: typeof t.pathData === 'string' ? JSON.parse(t.pathData) : (t.pathData || []),
    color: t.color,
    path_type: t.pathType
  }))
});
console.log(mapEventToSnakeCase({ id: 1, associationId: 2, teams: [{id:1, teamName: "A", pathData: "[[1,2]]"}] }));
