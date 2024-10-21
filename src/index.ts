import IncidentCheck from "./incidents";
import ThreadsPublisher from "./threads";

const main = async () => {
  try {
    console.log("Starting check for WMATA incidents");

    // Initialize services
    const incidentCheck = new IncidentCheck();
    const threadsPublisher = ThreadsPublisher.createFromEnv();

    // Fetch and process incidents
    await incidentCheck.fetchAllIncidents();
    const newIncidents = incidentCheck.getNewIncidents();
    const incidentSummary = incidentCheck.buildIncidentSummary(newIncidents);

    if (incidentSummary) {
      console.log("Publishing new incidents to Threads");
      const postId = await threadsPublisher.publishPost(incidentSummary);
      console.log(`Successfully published to Threads with ID: ${postId}`);
    } else {
      console.log("No new incidents found");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (error instanceof Error && error.message.includes("THREADS_")) {
      console.error("Threads configuration error:", errorMessage);
    } else {
      console.error("Error in WMATA incident check:", errorMessage);
    }
  }
};

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("Fatal error in main:", error);
  process.exit(1);
});
