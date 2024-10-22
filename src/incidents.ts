import axios from "axios";
import {
  isAfter,
  parseISO,
  setMilliseconds,
  setSeconds,
  subMinutes,
} from "date-fns";
import { RailIncidentsResponse } from "./models/RailIncidentsResponse";
import { BusIncidentsResponse } from "./models/BusIncidentsResponse";
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
};

interface FormattedIncident {
  type: "rail" | "bus";
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
    };
  }

  // Fetches all rail/bus current incidents from WMATA API
  async fetchAllIncidents(): Promise<IncidentTypes> {
    try {
      const [rail, bus] = await Promise.all([
        this._fetchIncidents<RailIncidentsResponse, "Incidents">(
          WMATA_API_CONFIG.railIncidentsUrl,
          "Incidents"
        ),
        this._fetchIncidents<BusIncidentsResponse, "BusIncidents">(
          WMATA_API_CONFIG.busIncidentsUrl,
          "BusIncidents"
        ),
      ]);

      this.incidents = { rail, bus };
      return this.incidents;
    } catch (error) {
      throw new Error(
        `Failed to fetch incidents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Uses check interval to filter all incidents down to new within interval
  getNewIncidents(): IncidentTypes {
    const now = new Date();
    const estNow = toZonedTime(now, "America/New_York");

    // Set seconds and milliseconds to zero
    const roundedEstNow = setSeconds(setMilliseconds(estNow, 0), 0);
    const cutoffTime = subMinutes(
      roundedEstNow,
      IncidentCheck.CHECK_INTERVAL_MINUTES
    );

    console.log("Calculated cutoff time: ", cutoffTime);

    return {
      rail: this._filterIncidents(this.incidents.rail, cutoffTime),
      bus: this._filterIncidents(this.incidents.bus, cutoffTime),
    };
  }

  // Creates a formatted post message for each new incident
  getFormattedIncidents(incidents: IncidentTypes): FormattedIncident[] {
    const formattedIncidents: FormattedIncident[] = [];

    incidents.rail.forEach((incident) => {
      formattedIncidents.push({
        type: "rail",
        message: this._formatIncidentMessage(incident, "rail"),
      });
    });

    incidents.bus.forEach((incident) => {
      formattedIncidents.push({
        type: "bus",
        message: this._formatIncidentMessage(incident, "bus"),
      });
    });

    return formattedIncidents;
  }

  private _validateConfig(): void {
    const requiredConfigs = [
      "primaryApiKey",
      "railIncidentsUrl",
      "busIncidentsUrl",
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
        console.log("Parsed incident time: ", incidentTime);
        return isAfter(incidentTime, cutoffTime);
      } catch (error) {
        console.warn(
          `Invalid date format for incident: ${incident.DateUpdated}`
        );
        return false;
      }
    });
  }

  private _formatIncidentMessage(incident: any, type: "rail" | "bus"): string {
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
    }

    return message.length <= IncidentCheck.MAX_MESSAGE_LENGTH
      ? message
      : `${message.slice(0, IncidentCheck.MAX_MESSAGE_LENGTH - 3)}...`;
  }
}

export default IncidentCheck;
