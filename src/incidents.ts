import axios from "axios";
import { format, isAfter, parseISO, subMinutes } from "date-fns";
import { RailIncidentsResponse } from "./models/RailIncidentsResponse";
import { BusIncidentsResponse } from "./models/BusIncidentsResponse";
import { ElevatorIncidentsResponse } from "./models/ElevatorIncidentsResponse";
import { WMATA_API_CONFIG } from "./config/api";
import { toZonedTime } from "date-fns-tz";

type Incident = {
  DateUpdated: string;
  Description?: string;
  SymptomDescription?: string;
};

type IncidentTypes = {
  rail: RailIncidentsResponse["Incidents"];
  bus: BusIncidentsResponse["BusIncidents"];
  elevator: ElevatorIncidentsResponse["ElevatorIncidents"];
};

interface FormattedIncident {
  type: "rail" | "bus" | "elevator";
  message: string;
}

class IncidentCheck {
  private incidents: IncidentTypes;
  private static readonly CHECK_INTERVAL_MINUTES = 5;
  private static readonly MAX_MESSAGE_LENGTH = 500;

  constructor() {
    this._validateConfig();
    this.incidents = {
      rail: [],
      bus: [],
      elevator: [],
    };
  }

  async fetchAllIncidents(): Promise<IncidentTypes> {
    try {
      const [rail, bus, elevator] = await Promise.all([
        this._fetchIncidents<RailIncidentsResponse, "Incidents">(
          WMATA_API_CONFIG.railIncidentsUrl,
          "Incidents"
        ),
        this._fetchIncidents<BusIncidentsResponse, "BusIncidents">(
          WMATA_API_CONFIG.busIncidentsUrl,
          "BusIncidents"
        ),
        this._fetchIncidents<ElevatorIncidentsResponse, "ElevatorIncidents">(
          WMATA_API_CONFIG.elevatorIncidentsUrl,
          "ElevatorIncidents"
        ),
      ]);

      this.incidents = { rail, bus, elevator };
      return this.incidents;
    } catch (error) {
      throw new Error(
        `Failed to fetch incidents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  getNewIncidents(): IncidentTypes {
    const now = new Date();
    const estNow = toZonedTime(now, "America/New_York");
    const cutoffTime = subMinutes(estNow, IncidentCheck.CHECK_INTERVAL_MINUTES);

    return {
      rail: this._filterIncidents(this.incidents.rail, cutoffTime),
      bus: this._filterIncidents(this.incidents.bus, cutoffTime),
      elevator: this._filterIncidents(this.incidents.elevator, cutoffTime),
    };
  }

  formatIncidentMessage(
    incident: any,
    type: "rail" | "bus" | "elevator"
  ): string {
    let message = "";

    switch (type) {
      case "rail":
        message = `🚇 Rail Alert: ${incident.Description}${
          incident.LinesAffected
            ? `\nLines affected: ${incident.LinesAffected}`
            : ""
        }`;
        break;
      case "bus":
        message = `🚌 Bus Alert: ${incident.Description}${
          incident.RoutesAffected?.length
            ? `\nRoutes affected: ${incident.RoutesAffected.join(", ")}`
            : ""
        }`;
        break;
      case "elevator":
        let formattedReturnToService = "";
        if (incident.EstimatedReturnToService) {
          const returnDate = parseISO(incident.EstimatedReturnToService);
          formattedReturnToService = format(returnDate, "PPpp");
        }

        message = `🛗 ${incident.UnitType} Alert at ${incident.StationName}: ${
          incident.SymptomDescription
        }${
          formattedReturnToService
            ? `\nEstimated return to service: ${formattedReturnToService}`
            : ""
        }`;
        break;
    }

    return message.length <= IncidentCheck.MAX_MESSAGE_LENGTH
      ? message
      : `${message.slice(0, IncidentCheck.MAX_MESSAGE_LENGTH - 3)}...`;
  }

  getFormattedIncidents(incidents: IncidentTypes): FormattedIncident[] {
    const formattedIncidents: FormattedIncident[] = [];

    // Process rail incidents
    incidents.rail.forEach((incident) => {
      formattedIncidents.push({
        type: "rail",
        message: this.formatIncidentMessage(incident, "rail"),
      });
    });

    // Process bus incidents
    incidents.bus.forEach((incident) => {
      formattedIncidents.push({
        type: "bus",
        message: this.formatIncidentMessage(incident, "bus"),
      });
    });

    // Process elevator incidents
    incidents.elevator.forEach((incident) => {
      formattedIncidents.push({
        type: "elevator",
        message: this.formatIncidentMessage(incident, "elevator"),
      });
    });

    return formattedIncidents;
  }

  private async _fetchIncidents<T, K extends keyof T>(
    url: string,
    dataKey: K
  ): Promise<T[K] extends any[] ? T[K] : never[]> {
    try {
      const response = await axios.get<T>(url, {
        headers: {
          api_key: WMATA_API_CONFIG.primaryApiKey,
        },
        timeout: 5000,
      });

      const data = response.data[dataKey];
      return (Array.isArray(data) ? data : []) as T[K] extends any[]
        ? T[K]
        : never[];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch ${String(dataKey)}: ${
            error.response?.status || error.message
          }`
        );
      }
      throw error;
    }
  }

  private _filterIncidents<T extends Incident>(
    incidents: T[],
    cutoffTime: Date
  ): T[] {
    return incidents.filter((incident) => {
      try {
        const incidentTime = parseISO(incident.DateUpdated);
        return isAfter(incidentTime, cutoffTime);
      } catch (error) {
        console.warn(
          `Invalid date format for incident: ${incident.DateUpdated}`
        );
        return false;
      }
    });
  }

  private _validateConfig(): void {
    const requiredConfigs = [
      "primaryApiKey",
      "railIncidentsUrl",
      "busIncidentsUrl",
      "elevatorIncidentsUrl",
    ] as const;

    const missingConfigs = requiredConfigs.filter(
      (config) => !WMATA_API_CONFIG[config]
    );

    if (missingConfigs.length > 0) {
      throw new Error(
        `Missing required configurations: ${missingConfigs.join(", ")}`
      );
    }
  }
}

export default IncidentCheck;
