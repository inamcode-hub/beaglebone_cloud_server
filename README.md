# beaglebone_cloud_server

# BeagleBone IoT Device Data Management

This project demonstrates how to manage data from IoT devices using a BeagleBone. It features a system for handling WebSocket connections, managing data storage, and providing HTTP endpoints for interacting with the devices.

## Table of Contents

- [Overview](#overview)
- [Components](#components)
- [Workflow](#workflow)
  - [Connections Management](#connections-management)
  - [Data Handling](#data-handling)
  - [HTTP Endpoints](#http-endpoints)
- [Setup](#setup)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Overview

This system allows:

- Connecting to IoT devices via WebSockets.
- Storing and managing data received from devices.
- Providing HTTP endpoints for reading device data and updating device settings.
- Implementing rate limiting to avoid overwhelming devices with requests.

## Components

- **connectionManager.js**: Manages WebSocket connections and data storage.
- **websocketHandler.js**: Handles WebSocket communication with IoT devices.
- **deviceController.js**: Provides HTTP endpoints for interacting with devices.
- **logger**: Logs system events for debugging and monitoring.

## Workflow

### Connections Management

1. **Adding Connections**:

   - When a device connects, a WebSocket connection is established and added to the `activeConnections` list.
   - The connection is logged.

2. **Removing Connections**:

   - When a device disconnects, the connection is removed from the `activeConnections` list.
   - The corresponding data and last request time are also removed.

3. **Getting Connections**:
   - Provides a list of all active connections.

### Data Handling

1. **Storing Data**:

   - Data received from devices is stored in `dataStore` with a timestamp.
   - The data is logged for debugging purposes.

2. **Retrieving Data**:

   - Data can be retrieved if it is still valid (not expired based on `DATA_TTL`).
   - If the data is expired, it is removed from the `dataStore`.

3. **Rate Limiting**:
   - Ensures that requests to the device are not made more frequently than the specified `REQUEST_INTERVAL`.
   - Tracks the last request time for each device.

### HTTP Endpoints

1. **Read Data** (`/api/devices/read-data`):

   - Checks if valid data is already available. If so, returns it immediately.
   - If data is not available or expired, checks if the request interval has passed.
   - Sends a new request to the device if the interval has passed and waits for the response.
   - Stores the new data and returns it to the client.

2. **Update Register** (`/api/devices/update-register`):

   - Receives a request to update a device register.
   - Sends the update request to the device and waits for acknowledgment.
   - Returns the acknowledgment to the client.

3. **Get Connections** (`/api/devices/connections`):
   - Returns a list of all active device connections.

## Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Start the Server**:

   ```bash
   npm start
   ```

3. **Configure WebSocket**:
   - Ensure devices are configured to connect to the WebSocket server at the appropriate URL and port.

## Usage

1. **Reading Data**:

   - Send a POST request to `/api/devices/read-data` with the device's `serialNumber` in the body.

2. **Updating Registers**:

   - Send a POST request to `/api/devices/update-register` with the device's `serialNumber`, `registerAddress`, and `newValue` in the body.

3. **Listing Connections**:
   - Send a GET request to `/api/devices/connections`.

## Contributing

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes with clear messages.
4. Push your branch to your fork.
5. Create a pull request to the main repository.

## License

This project is licensed under the MIT License.

---

### Example Workflow

#### Reading Data

1. **Client Request**:

   - A client sends a POST request to `/api/devices/read-data` with the device's `serialNumber`.

2. **Check Existing Data**:

   - The server checks if valid data is already available in the `dataStore`.
   - If valid data exists, it is immediately returned to the client.

3. **Rate Limiting Check**:

   - If no valid data is available, the server checks if the minimum interval (`REQUEST_INTERVAL`) since the last request has passed.
   - If the interval has not passed, the server returns a "Service Unavailable" response.

4. **Request New Data**:

   - If the interval has passed, the server sends a request to the device for new data.
   - The server waits for the data to be received.

5. **Store and Return Data**:
   - Once the new data is received, it is stored in the `dataStore`.
   - The new data is returned to the client.

#### Updating Registers

1. **Client Request**:

   - A client sends a POST request to `/api/devices/update-register` with the device's `serialNumber`, `registerAddress`, and `newValue`.

2. **Send Update Request**:

   - The server sends the update request to the device.

3. **Wait for Acknowledgment**:

   - The server waits for an acknowledgment from the device.

4. **Return Acknowledgment**:
   - Once the acknowledgment is received, it is returned to the client.
