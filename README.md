# WMATA Incidents Threads Bot

A Node.js application that monitors WMATA (Washington Metropolitan Area Transit Authority) rail and bus incidents and automatically posts updates to Threads. The bot is meant to be deployed as a cron job that runs at a configurable interval to check for new incidents since the last run.

## Features

- Monitors both rail and bus incidents from WMATA's API
- Automatically formats incidents with appropriate emojis and affected lines/routes
- Posts updates to Threads with error handling and rate limiting
- Configurable check intervals and message formatting

## Prerequisites

- Node.js
- npm
- WMATA API key and Rail & Bus API routes
- Threads (Meta) developer account with app ID, secret, access token, and user ID

## Setup

1. Clone the repository:

```bash
git clone [https://github.com/greg-py/wmata-incidents.git]
cd wmata-incidents
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the following values:

```
WMATA_API_PRIMARY_KEY=
WMATA_API_BUS_INCIDENTS_URL=
WMATA_API_RAIL_INCIDENTS_URL=
THREADS_APP_ID=
THREADS_APP_SECRET=
THREADS_ACCESS_TOKEN=
THREADS_USER_ID=
```

4. Build and run:

```bash
npm run build
npm run dev
```

## How It Works

The application consists of three main components:

### 1. Incident Check (`incidents.ts`)

- Fetches incident data from WMATA's API
- Filters for new incidents within the check interval (5 minutes)
- Formats incidents with appropriate emojis and details
- Handles date parsing and timezone conversion

### 2. Threads Publisher (`threads.ts`)

- Manages authentication and communication with Threads API
- Creates media containers for text content
- Publishes posts with error handling
- Implements rate limiting between posts

### 3. Main Process (`index.ts`)

- Orchestrates the incident checking and publishing process
- Implements error handling and logging
- Manages the application lifecycle

## Error Handling

The application includes comprehensive error handling for:

- API failures (both WMATA and Threads)
- Configuration errors
- Rate limiting
- Invalid date formats
- Network timeouts

## Contributing

Feel free to submit issues and pull requests to help improve the bot.
