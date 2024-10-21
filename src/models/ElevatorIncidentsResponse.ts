export interface ElevatorIncidentsResponse {
  ElevatorIncidents: {
    DateOutOfServ: string;
    DateUpdated: string;
    EstimatedReturnToService: string;
    LocationDescription: string;
    StationCode: string;
    StationName: string;
    SymptomDescription: string;
    UnitName: string;
    UnitType: "ELEVATOR" | "ESCALATOR";
  }[];
}
