export const WMATA_API_CONFIG = {
  primaryApiKey: process.env.WMATA_API_PRIMARY_KEY || "",
  railIncidentsUrl: process.env.WMATA_API_RAIL_INCIDENTS_URL || "",
  busIncidentsUrl: process.env.WMATA_API_BUS_INCIDENTS_URL || "",
  elevatorIncidentsUrl: process.env.WMATA_API_ELEVATOR_INCIDENTS_URL || "",
};
