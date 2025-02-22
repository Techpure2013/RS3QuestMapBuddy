import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
const app = express();
const PORT = 42069;
// Create an HTTP server to attach WebSocket to
const httpServer = createServer(app);
// Initialize WebSocket server
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust CORS settings as needed
        methods: ["GET", "POST"],
    },
});
app.get("/api/generate-url/:userID", (req, res) => {
    const { userID } = req.params;
    if (!userID) {
        res.status(400).json({ error: "Missing userID" });
    }
    // Check if the user exists in the session
    if (!userSessions.has(userID)) {
        res.status(404).json({ error: "User not found" });
    }
    const session = userSessions.get(userID);
    const { questName } = session;
    if (!questName) {
        res.status(400).json({ error: "Quest name not set for this user" });
    }
    // Generate the dynamic URL
    const level = 1; // Example level, replace with actual logic if needed
    const z = 0; // Example z-coordinate
    const x = 0; // Example x-coordinate
    const y = 0; // Example y-coordinate
    const url = `/MapBuddy/${userID}/${questName}/${level}-${z}-${x}-${y}`;
    console.log(`Generated URL for userID: ${userID} -> ${url}`);
    res.status(200).json({ url });
});
// In-memory storage for user-specific data
const userSessions = new Map(); // Map<userID, { socketId, questName }>
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// REST API Endpoints
app.post("/api/questName", (req, res) => {
    try {
        const { userID, questName } = req.body;
        if (!userID || !questName) {
            res.status(400).json({ error: "Missing userID or questName" });
        }
        // Update user session
        if (userSessions.has(userID)) {
            const session = userSessions.get(userID);
            session.questName = questName;
            userSessions.set(userID, session);
        }
        else {
            userSessions.set(userID, { socketId: null, questName });
        }
        console.log(`Received quest data for userID: ${userID}, questName: ${questName}`);
        res.status(200).json({
            message: "Data received successfully",
            receivedData: { userID, questName },
        });
    }
    catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
// WebSocket Handlers
io.on("connection", (socket) => {
    console.log("A client connected:", socket.id);
    // Emit the current number of connected users to all clients
    const connectedUsers = io.sockets.sockets.size; // Get the number of connected clients
    io.emit("connectedUsers", { count: connectedUsers });
    console.log(`Number of connected users: ${connectedUsers}`);
    // Handle user registration (e.g., when a user sends their userID)
    socket.on("register", (data) => {
        const { userID } = data;
        if (!userID) {
            socket.emit("error", { message: "Missing userID" });
        }
        // Associate the socket with the userID
        if (userSessions.has(userID)) {
            const session = userSessions.get(userID);
            session.socketId = socket.id;
            userSessions.set(userID, session);
        }
        else {
            userSessions.set(userID, { socketId: socket.id, questName: null });
        }
        console.log(`User registered: ${userID} with socket ID: ${socket.id}`);
        socket.emit("registered", { message: "User registered successfully" });
    });
    //Generate URL request via WebSocket
    socket.on("generateURL", (data) => {
        const { userID } = data;
        if (!userID) {
            socket.emit("error", { message: "Missing userID" });
            return;
        }
        if (!userSessions.has(userID)) {
            socket.emit("error", { message: "User not found" });
            return;
        }
        const session = userSessions.get(userID);
        const { questName } = session;
        if (!questName) {
            socket.emit("error", { message: "Quest name not set for this user" });
            return;
        }
        // Generate the dynamic URL
        const level = 0; // Example level, replace with actual logic if needed
        const z = 2; // Example z-coordinate
        const x = 3283; // Example x-coordinate
        const y = 3024; // Example y-coordinate
        const url = `alt1://browser/http://localhost:3000/${userID
            .replace('"', "")
            .replace('"', "")}/${questName.replace(" ", "_")}/${level}-${z}-${x}-${y}`;
        console.log(`Generated URL for userID: ${userID} -> ${url
            .replace('"', "")
            .replace('"', "")}`);
        // Emit the URL back to the user
        socket.emit("urlGenerated", { url });
    });
    socket.on("removeTempURL", (data) => {
        const { userID, questName } = data;
        if (!userID || !questName) {
            socket.emit("error", { message: "Missing userID or questName" });
            return;
        }
        if (!userSessions.has(userID)) {
            socket.emit("error", { message: "User not found" });
            return;
        }
        const session = userSessions.get(userID);
        // Check if the questName matches
        if (session.questName !== questName) {
            socket.emit("error", { message: "Quest name does not match" });
            return;
        }
        // Remove or invalidate the session's questName
        session.questName = null;
        userSessions.set(userID, session);
        console.log(`Temporary URL for userID: ${userID} and questName: ${questName} has been removed.`);
        // Notify the client that the URL has been removed
        socket.emit("tempURLRemoved", {
            message: "Temporary URL removed successfully",
        });
    });
    socket.on("send-coordinates", (data) => {
        console.log(JSON.stringify(data, null, 2));
        process.stdout.write(",\n"); // Log the coordinates to the terminal
    });
    // Handle quest updates from a specific user
    socket.on("updateQuest", (data) => {
        const { userID, questName } = data;
        if (!userID || !questName) {
            socket.emit("error", { message: "Missing userID or questName" });
            return;
        }
        // Update the user's session
        if (userSessions.has(userID)) {
            const session = userSessions.get(userID);
            session.questName = questName;
            userSessions.set(userID, session);
        }
        else {
            userSessions.set(userID, { socketId: socket.id, questName });
        }
        console.log(`Quest updated for userID: ${userID}, questName: ${questName}`);
        // Notify only the specific user
        socket.emit("questUpdated", { userID, questName });
    });
    // Handle client disconnection
    socket.on("disconnect", () => {
        console.log("A client disconnected:", socket.id);
        // Remove the user session associated with this socket
        for (const [userID, session] of userSessions.entries()) {
            if (session.socketId === socket.id) {
                userSessions.delete(userID);
                console.log(`User session removed for userID: ${userID}`);
                break;
            }
        }
        // Emit the updated number of connected users to all clients
        const connectedUsers = io.sockets.sockets.size; // Get the updated number of connected clients
        io.emit("connectedUsers", { count: connectedUsers });
        console.log(`Number of connected users: ${connectedUsers}`);
    });
});
// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
