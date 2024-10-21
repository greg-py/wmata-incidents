export interface BusIncidentsResponse {
  BusIncidents: {
    IncidentID: string;
    IncidentType: string;
    RoutesAffected: string[];
    Description: string;
    DateUpdated: string;
  }[];
}
