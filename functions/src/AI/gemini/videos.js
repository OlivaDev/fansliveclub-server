const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { VertexAI } = require("@google-cloud/vertexai");
const admin = require("firebase-admin");
const { interviewPrompt } = require("../prompts/interview");

const videoAnalysisAI = onObjectFinalized({
    memory: "2GiB",
    cpu: 1,
    timeoutSeconds: 300,
}, async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const videoUri = `gs://${event.data.bucket}/${filePath}`;
    const fileName = filePath.split('/').pop();

    if (!filePath.startsWith("analysis/video/")) return null;
    if (!contentType.startsWith("video/")) return null;

    try {

        await admin.firestore().collection("analysis_video").doc(fileName).set({
            state: "video_analysis",
            status: "AI is analysing your video",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const vertex_ai = new VertexAI({ project: "ai-server-60c1a", location: 'us-central1' });

        const model = vertex_ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const request = {
            contents: [{
                role: 'user',
                parts: [
                    { fileData: { fileUri: videoUri, mimeType: contentType } },
                    { text: interviewPrompt }
                ]
            }]
        };

        const result = await model.generateContent(request);
        const response = result.response;

        const analysisText = response.candidates[0].content.parts[0].text;


        await admin.firestore().collection("analysis_video").doc(fileName).set({
            analysis: JSON.parse(analysisText),
            status: "Completed",
            state: "completed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

    } catch (error) {
        await admin.firestore().collection("video_error_tracking").add({
            status: "Failed to process your video",
            state: "canceled",
            error: error.message,
            stack: error.stack,
            filePath,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});

module.exports = { videoAnalysisAI };