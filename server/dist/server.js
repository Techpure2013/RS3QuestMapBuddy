var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = 42069;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});
const userSessions = new Map();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// --- Helper Functions ---
const normalizeNameForPath = (name) => {
    const sanitized = name.replace(/[\\/:\*\?"<>\|]/g, "");
    return sanitized.replace(/\s+/g, "_");
};
// --- REST API Endpoints ---
app.get("/api/generate-url/:userID", (req, res) => {
    const { userID } = req.params;
    if (!userID) {
        res.status(400).json({ error: "Missing userID" });
        return;
    }
    if (!userSessions.has(userID)) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    const session = userSessions.get(userID);
    const { questName } = session;
    if (!questName) {
        res.status(400).json({ error: "Quest name not set for this user" });
        return;
    }
    const level = 1;
    const z = 0;
    const x = 0;
    const y = 0;
    const url = `/MapBuddy/${userID}/${questName}/${level}-${z}-${x}-${y}`;
    console.log(`Generated URL for userID: ${userID} -> ${url}`);
    res.status(200).json({ url });
});
app.post("/api/questName", (req, res) => {
    try {
        const { userID, questName } = req.body;
        if (!userID || !questName) {
            res.status(400).json({ error: "Missing userID or questName" });
            return;
        }
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
// ✅ THE DEFINITIVE GITHUB PULL REQUEST ENDPOINT
app.post("/api/submit-pr", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userID, questJson } = req.body;
    if (!questJson || !questJson.questName) {
        res.status(400).json({ error: "Missing or invalid quest data." });
        return;
    }
    try {
        const owner = "Techpure2013";
        const repo = "RS3QuestMapBuddy";
        const baseBranch = "main";
        const submissionBranch = "quest-submissions";
        const normalizedFolderName = normalizeNameForPath(questJson.questName);
        const filePath = `client/src/Quest Directories/${questJson.questName}/${normalizedFolderName}.json`;
        // STEP 1: Ensure the submission branch exists and is up-to-date.
        try {
            yield octokit.git.getRef({
                owner,
                repo,
                ref: `heads/${submissionBranch}`,
            });
            yield octokit.repos.merge({
                owner,
                repo,
                base: submissionBranch,
                head: baseBranch,
            });
        }
        catch (error) {
            if (error.status === 404) {
                const { data: refData } = yield octokit.git.getRef({
                    owner,
                    repo,
                    ref: `heads/${baseBranch}`,
                });
                yield octokit.git.createRef({
                    owner,
                    repo,
                    ref: `refs/heads/${submissionBranch}`,
                    sha: refData.object.sha,
                });
            }
            else {
                throw error;
            }
        }
        // ✅ STEP 2: Get the SHA of the existing file, if it exists.
        let existingFileSha;
        try {
            const { data: existingFile } = yield octokit.repos.getContent({
                owner,
                repo,
                path: filePath,
                ref: submissionBranch, // IMPORTANT: Check on the submission branch
            });
            if (!Array.isArray(existingFile)) {
                existingFileSha = existingFile.sha;
            }
        }
        catch (error) {
            // A 404 error is expected if the file is new, so we can ignore it.
            if (error.status !== 404) {
                throw error;
            }
        }
        // STEP 3: Commit the quest file, providing the SHA if it's an update.
        const content = Buffer.from(JSON.stringify(questJson, null, 2)).toString("base64");
        yield octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: `feat: Add/Update quest '${questJson.questName}'`,
            content,
            branch: submissionBranch,
            sha: existingFileSha,
            committer: { name: "Quest Map Buddy Bot", email: "bot@example.com" },
            author: { name: userID || "Anonymous User", email: "user@example.com" },
        });
        // STEP 4: Check for an existing PR or create a new one.
        const { data: existingPrs } = yield octokit.pulls.list({
            owner,
            repo,
            state: "open",
            head: `${owner}:${submissionBranch}`,
            base: baseBranch,
        });
        let prUrl;
        if (existingPrs.length > 0) {
            prUrl = existingPrs[0].html_url;
        }
        else {
            const { data: newPr } = yield octokit.pulls.create({
                owner,
                repo,
                title: "Quest Submissions Update",
                head: submissionBranch,
                base: baseBranch,
                body: "This PR contains new and updated quest files from the Quest Map Buddy.",
            });
            prUrl = newPr.html_url;
        }
        res.json({ success: true, prUrl: prUrl });
    }
    catch (err) {
        console.error("Error creating GitHub PR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
}));
// --- WebSocket Handlers ---
io.on("connection", (socket) => {
    console.log("A client connected:", socket.id);
    const connectedUsers = io.sockets.sockets.size;
    io.emit("connectedUsers", { count: connectedUsers });
    console.log(`Number of connected users: ${connectedUsers}`);
    socket.on("register", (data) => {
        const { userID } = data;
        if (!userID) {
            socket.emit("error", { message: "Missing userID" });
            return;
        }
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
        const level = 0;
        const z = 2;
        const x = 3283;
        const y = 3024;
        const url = `alt1://browser/http://localhost:3000/${userID
            .replace('"', "")
            .replace('"', "")}/${questName.replace(" ", "_")}/${level}-${z}-${x}-${y}`;
        console.log(`Generated URL for userID: ${userID} -> ${url
            .replace('"', "")
            .replace('"', "")}`);
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
        if (session.questName !== questName) {
            socket.emit("error", { message: "Quest name does not match" });
            return;
        }
        session.questName = null;
        userSessions.set(userID, session);
        console.log(`Temporary URL for userID: ${userID} and questName: ${questName} has been removed.`);
        socket.emit("tempURLRemoved", {
            message: "Temporary URL removed successfully",
        });
    });
    socket.on("send-coordinates", (data) => {
        console.log(JSON.stringify(data, null, 2));
        process.stdout.write(",\n");
    });
    socket.on("updateQuest", (data) => {
        const { userID, questName } = data;
        if (!userID || !questName) {
            socket.emit("error", { message: "Missing userID or questName" });
            return;
        }
        if (userSessions.has(userID)) {
            const session = userSessions.get(userID);
            session.questName = questName;
            userSessions.set(userID, session);
        }
        else {
            userSessions.set(userID, { socketId: socket.id, questName });
        }
        console.log(`Quest updated for userID: ${userID}, questName: ${questName}`);
        socket.emit("questUpdated", { userID, questName });
    });
    socket.on("disconnect", () => {
        console.log("A client disconnected:", socket.id);
        for (const [userID, session] of userSessions.entries()) {
            if (session.socketId === socket.id) {
                userSessions.delete(userID);
                console.log(`User session removed for userID: ${userID}`);
                break;
            }
        }
        const connectedUsers = io.sockets.sockets.size;
        io.emit("connectedUsers", { count: connectedUsers });
        console.log(`Number of connected users: ${connectedUsers}`);
    });
});
// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
