const { io } = require("socket.io-client");
const readline = require("readline");
const http = require("http");
const fs = require("fs");
const path = require("path");

const CONFIG = {
  apiUrl: "http://localhost:3001",
  wsUrl: "http://localhost:3001/chat",
  credentials: {
    email: "john.doe@example.com",
    password: "SecurePass123!"
  },
  tokenFile: path.join(__dirname, ".patient-tokens.json"),
  role: "patient",
  displayName: "Patient"
};

class ChatClient {
  constructor(config) {
    this.config = config;
    this.socket = null;
    this.tokens = null;
    this.roomId = "c213b65a-500c-4f09-80dd-021356626049";
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  makeRequest(url, options, postData) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: options.method || "GET",
        headers: options.headers || {}
      };

      const req = http.request(reqOptions, (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on("error", reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  loadTokens() {
    try {
      if (fs.existsSync(this.config.tokenFile)) {
        const data = fs.readFileSync(this.config.tokenFile, "utf8");
        this.tokens = JSON.parse(data);
        console.log("Tokens loaded");
        return true;
      }
    } catch (error) {
      console.log("Error loading tokens:", error.message);
    }
    return false;
  }

  saveTokens() {
    try {
      fs.writeFileSync(this.config.tokenFile, JSON.stringify(this.tokens, null, 2));
      console.log("Tokens saved");
    } catch (error) {
      console.log("Error saving tokens:", error.message);
    }
  }

  async login() {
    try {
      console.log("Performing login...");
      const response = await this.makeRequest(
        `${this.config.apiUrl}/api/v1/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(JSON.stringify(this.config.credentials))
          }
        },
        JSON.stringify(this.config.credentials)
      );

      if (response.status === 200 && response.data.accessToken) {
        this.tokens = {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
          expiresAt: Date.now() + (14 * 60 * 1000)
        };
        this.saveTokens();
        console.log(`Login successful for ${this.tokens.user.firstName} (${this.tokens.user.role})`);
        return true;
      } else {
        console.error("Login error:", response.data);
        return false;
      }
    } catch (error) {
      console.error("Login error:", error.message);
      return false;
    }
  }

  async refreshAccessToken() {
    try {
      console.log("Refreshing token...");
      const response = await this.makeRequest(
        `${this.config.apiUrl}/api/v1/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.tokens.refreshToken}`
          }
        }
      );

      if (response.status === 200 && response.data.accessToken) {
        this.tokens.accessToken = response.data.accessToken;
        this.tokens.expiresAt = Date.now() + (14 * 60 * 1000);
        this.saveTokens();
        console.log("Token updated");
        return true;
      } else {
        console.log("Failed to update token, performing login");
        return await this.login();
      }
    } catch (error) {
      console.log("Error updating token, performing login");
      return await this.login();
    }
  }

  async ensureValidToken() {
    if (!this.tokens) {
      return await this.login();
    }

    if (Date.now() > this.tokens.expiresAt - (2 * 60 * 1000)) {
      return await this.refreshAccessToken();
    }

    return true;
  }

  async connectWebSocket() {
    await this.ensureValidToken();

    this.socket = io(this.config.wsUrl, {
      auth: { token: this.tokens.accessToken }
    });

    this.socket.on("connect", () => {
      console.log(`${this.config.displayName} connected to chat`);
      if (this.roomId) {
        this.socket.emit("join-room", { roomId: this.roomId });
      }
    });

    this.socket.on("joined-room", (data) => {
      console.log("Joined room:", data.roomId);
      console.log("Enter message (commands: exit, refresh, status):");
      this.promptForMessage();
    });

    this.socket.on("message-received", (msg) => {
      const time = new Date().toLocaleTimeString();
      console.log(`\n[${time}]  ${msg.sender.firstName} (${msg.sender.role}): ${msg.content}`);
      this.promptForMessage();
    });

    this.socket.on("user-joined-room", (data) => {
      console.log(`User joined room: ${data.userId}`);
    });

    this.socket.on("message-sent", () => {
      console.log("Message sent");
      this.promptForMessage();
    });

    this.socket.on("error", async (err) => {
      console.error("WebSocket error:", err.message);
      
      if (err.message.includes("Authentication") || err.message.includes("authenticated")) {
        console.log("Attempting to refresh token and reconnect...");
        await this.refreshAccessToken();
        this.socket.disconnect();
        setTimeout(() => this.connectWebSocket(), 1000);
      } else {
        this.promptForMessage();
      }
    });

    this.socket.on("disconnect", () => {
      console.log("Connection lost");
    });
  }

  showStatus() {
    if (this.tokens) {
      const expiresIn = Math.max(0, this.tokens.expiresAt - Date.now());
      const minutes = Math.floor(expiresIn / 60000);
      const seconds = Math.floor((expiresIn % 60000) / 1000);
      
      console.log("Status:");
      console.log(`   User: ${this.tokens.user.firstName} ${this.tokens.user.lastName}`);
      console.log(`   Role: ${this.tokens.user.role}`);
      console.log(`   Token valid for: ${minutes}m ${seconds}s`);
      console.log(`   Room: ${this.roomId}`);
      console.log(`   Connection: ${this.socket?.connected ? " Connected" : " Disconnected"}`);
    }
  }

  promptForMessage() {
    this.rl.question(`${this.config.role} > `, async (message) => {
      const cmd = message.toLowerCase().trim();

      if (cmd === "exit") {
        await this.cleanup();
        return;
      }

      if (cmd === "refresh") {
        await this.refreshAccessToken();
        this.promptForMessage();
        return;
      }

      if (cmd === "status") {
        this.showStatus();
        this.promptForMessage();
        return;
      }

      if (message.trim() && this.roomId) {
        await this.ensureValidToken();
        
        this.socket.emit("send-message", {
          roomId: this.roomId,
          content: message,
          type: "text"
        });
      } else if (!this.roomId) {
        console.log("Room not configured");
        this.promptForMessage();
      } else {
        this.promptForMessage();
      }
    });
  }

  async cleanup() {
    console.log("\n Bye!");
    if (this.socket) this.socket.disconnect();
    this.rl.close();
    process.exit(0);
  }

  async start() {
    console.log(`Starting chat client: ${this.config.displayName}...`);

    this.loadTokens();

    const tokenValid = await this.ensureValidToken();
    if (!tokenValid) {
      console.error("Failed to get valid token");
      process.exit(1);
    }

    await this.connectWebSocket();

    setInterval(async () => {
      await this.ensureValidToken();
    }, 10 * 60 * 1000);

    process.on("SIGINT", () => this.cleanup());
  }
}

const client = new ChatClient(CONFIG);
client.start().catch(console.error);
