import express from "express";
const app = express();
const PORT = 42069;
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
