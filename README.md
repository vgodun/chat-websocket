# Chat WebSocket Application

## How to Run the Project

### 1. Clone the repository
```sh
git clone <your-repo-url>
cd chat-websocket
```

### 2. Create and configure environment variables
- Copy the example below into a new file named `.env` in the project root:

```env
NODE_ENV=development
PORT=3001
DB_SSL=false
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:3001
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=chat_app
POSTGRES_PORT=5432
POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256
POSTGRES_HOST=localhost
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=chat_app

```


### 3. Run with Docker Compose
```sh
docker-compose up --build
```

## How to Test WebSocket Chat with Doctor and Patient

1. **Login as a user (patient):**
   - Send a POST request to `/api/v1/auth/login` with your credentials (email, password).
   - Copy the `accessToken` from the response.

2. **Create a consultation room:**
   - Send a POST request to:
     ```
     http://localhost:3001/api/v1/chat-rooms/consultation/{doctor_id}
     ```
     - Replace `{doctor_id}` with the actual ID of a doctor user (not patient!).
     - In the Authorization header, use Bearer Token and paste the `accessToken` you got from login.
   - The response will contain the `id` of the created room (this is your `roomId`).

3. **Configure test clients:**
   - Open `src/test_websocket/interactive-doctor.js` and `src/test_websocket/interactive-patient.js`.
   - Set the `roomId` property in both files to the value you received from the previous step.

4. **Run both clients in separate terminals:**
   ```sh
   node src/test_websocket/interactive-doctor.js
   # in another terminal
   node src/test_websocket/interactive-patient.js
   ```

> **Note:**
> - You must use a valid doctor user ID for the consultation endpoint.
> - The `accessToken` must belong to a patient user for the request to succeed.
> - Both clients will join the same room and can exchange messages in real time.
