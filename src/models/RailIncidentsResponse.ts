export interface RailIncidentsResponse {
  Incidents: {
    DateUpdated: string;
    Description: string;
    IncidentID: string;
    IncidentType: string;
    LinesAffected: string;
  }[];
}
