import express from "express";
import cors from "cors";
const app = express();
const PORT = 42069;
let corsOptions: cors.CorsOptions = {};

// Check if we're in a production environment
if (process.env.NODE_ENV === "production") {
  // In production, allow only specific domains
  corsOptions = {
    origin: [
      "https://techpure.dev/RS3QuestBuddy", // Allow RS3QuestBuddy domain
      "https://techpure.dev/RS3MapBuddy", // Allow RS3MapBuddy domain
    ],
  };
} else {
  // In development, allow any local origin (localhost)
  corsOptions = {
    origin: "*", // Allow all origins in testing (localhost)
  };
}
app.use(cors(corsOptions));
// Middleware to parse JSON or URL encoded bodies
app.use(express.json()); // For JSON payloads
app.use(express.urlencoded({ extended: true })); // For URL encoded payloads

app.post("/api/messagesenttomapbuddy", (req, res) => {
  console.log("Received data:", req.body); // Log the incoming data

  res.json({
    message: "Data received successfully",
    receivedData: req.body,
  });
});

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
