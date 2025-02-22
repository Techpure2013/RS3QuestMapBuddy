import axios from "axios";

export async function threeStepHandshakeForQuest(
  userId: string,
  questName: string
) {
  if (questName === "") return;

  try {
    // Step 1: Initiate the handshake
    const step1Response = await axios.get(`http://localhost:42069/api/HS1`, {
      params: { userId, questName }, // Ensure field names match server expectations
    });

    const handshakeToken = step1Response.data.handshakeToken; // Correct key usage

    // Step 2: Validate handshake token
    const step2Response = await axios.post("http://localhost:42069/api/HS2", {
      userID: step1Response.data.userID, // Ensure field name matches backend expectation
      handshakeToken: handshakeToken, // Use the correct key expected by the backend
    });
    // Step 3: Complete the handshake
    const step3Response = await axios.get(`http://localhost:42069/api/HS3`, {
      params: { userID: userId, questName: step1Response.data.questName }, // Match "userID" as expected by the backend
    });
    const handshakeCompleteMsg = step3Response.data.message;
    console.log("Step 3: Handshake complete:", handshakeCompleteMsg);
    return handshakeCompleteMsg;
  } catch (error) {
    console.error("Handshake failed:", error);
    throw error;
  }
}
