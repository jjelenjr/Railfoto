// Module-level singleton for Leaflet map instance
let _map = null;

export const setMapInstance = (map) => { _map = map; };
export const getMapInstance = () => _map;
