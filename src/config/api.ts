export const WMATA_API_CONFIG = {
  primaryApiKey: process.env.WMATA_API_PRIMARY_KEY || "",
  railIncidentsUrl: process.env.WMATA_API_RAIL_INCIDENTS_URL || "",
  busIncidentsUrl: process.env.WMATA_API_BUS_INCIDENTS_URL || "",
  elevatorIncidentsUrl: process.env.WMATA_API_ELEVATOR_INCIDENTS_URL || "",
};

export const THREADS_API_CONFIG = {
  userId: process.env.THREADS_USER_ID || "",
  accessToken: process.env.THREADS_ACCESS_TOKEN || "",
  baseUrl: process.env.THREADS_API_BASE_URL || "https://graph.threads.net/v1.0",
  timeout: process.env.THREADS_API_TIMEOUT
    ? Number(process.env.THREADS_API_TIMEOUT)
    : 15000,
};
