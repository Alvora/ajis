const e = { prepLat: 1, associationId: 2, startLocation: "here" };
const mapped = {
  ...e,
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
  meals_description: e.mealsDescription
};
console.log(mapped);
