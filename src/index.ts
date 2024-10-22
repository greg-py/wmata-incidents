import IncidentCheck from "./incidents";
import ThreadsPublisher from "./threads";

const main = async () => {
  try {
    console.log("Starting check for WMATA incidents");

    // Initialize services
    const incidentCheck = new IncidentCheck();
    const threadsPublisher = ThreadsPublisher.createFromConfig();

    // Fetch and process incidents
    await incidentCheck.fetchAllIncidents();
    const newIncidents = incidentCheck.getNewIncidents();
    const formattedIncidents =
      incidentCheck.getFormattedIncidents(newIncidents);

    if (formattedIncidents.length > 0) {
      console.log(
        `Found ${formattedIncidents.length} new incidents to publish`
      );

      // Process each incident sequentially to avoid rate limiting
      for (const incident of formattedIncidents) {
        try {
          console.log(`Publishing ${incident.type} incident to Threads`);
          const postId = await threadsPublisher.publishPost(incident.message);
          console.log(
            `Successfully published ${incident.type} incident with ID: ${postId}`
          );

          // Add a small delay between posts to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(
            `Failed to publish ${incident.type} incident:`,
            error instanceof Error ? error.message : String(error)
          );
          // Continue with next incident even if one fails
          continue;
        }
      }
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

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("Fatal error in main:", error);
  process.exit(1);
});
