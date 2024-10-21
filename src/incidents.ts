import axios from "axios";
import { isAfter, parseISO, subMinutes } from "date-fns";
import { RailIncidentsResponse } from "./models/RailIncidentsResponse";
import { BusIncidentsResponse } from "./models/BusIncidentsResponse";
import { ElevatorIncidentsResponse } from "./models/ElevatorIncidentsResponse";
import { WMATA_API_CONFIG } from "./config/api";

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

class IncidentCheck {
  private incidents: IncidentTypes;
  private static readonly CHECK_INTERVAL_MINUTES = 5;
  private static readonly MAX_SUMMARY_LENGTH = 500;

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
    const cutoffTime = subMinutes(
      new Date(),
      IncidentCheck.CHECK_INTERVAL_MINUTES
    );

    return {
      rail: this._filterIncidents(this.incidents.rail, cutoffTime),
      bus: this._filterIncidents(this.incidents.bus, cutoffTime),
      elevator: this._filterIncidents(this.incidents.elevator, cutoffTime),
    };
  }

  buildIncidentSummary(incidents: IncidentTypes): string | null {
    const descriptions = [
      ...incidents.rail.map((incident) => incident.Description),
      ...incidents.bus.map((incident) => incident.Description),
      ...incidents.elevator.map((incident) => incident.SymptomDescription),
    ].filter((desc): desc is string => !!desc);

    if (descriptions.length === 0) {
      return null;
    }

    const summary = descriptions.join(" | ");
    return summary.length <= IncidentCheck.MAX_SUMMARY_LENGTH
      ? summary
      : `${summary.slice(0, IncidentCheck.MAX_SUMMARY_LENGTH - 3)}...`;
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
