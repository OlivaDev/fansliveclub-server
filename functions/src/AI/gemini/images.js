
const { VertexAI } = require('@google-cloud/vertexai');
const admin = require("firebase-admin");
const { Timestamp } = require('firebase-admin/firestore');
const { onDocumentCreated } = require('firebase-functions/firestore');
const { verificationPrompt } = require('../prompts/images');


const analyzeUserVerification = onDocumentCreated({
    document: "users/{userId}/verifications/{docId}",
    memory: "2GiB",
    timeoutSeconds: 300,
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const newData = snapshot.data();

    if (!newData.documentFront?.ref || !newData.selfie?.ref) {
        return await admin.firestore().collection("kyc_error_tracking").add({
            error: "No data",
            data: newData,
            created: Timestamp.now()
        });
    }

    try {
        const bucketName = "fansliveclub.firebasestorage.app";

        const selfieUri = `gs://${bucketName}/${newData.selfie.ref}`;
        const idUri = `gs://${bucketName}/${newData.documentFront.ref}`;

        const vertex_ai = new VertexAI({ project: "fansliveclub", location: 'us-central1' });


        const model = vertex_ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const request = {
            contents: [{
                role: 'user',
                parts: [
                    { fileData: { fileUri: selfieUri, mimeType: 'image/jpeg' } },
                    { fileData: { fileUri: idUri, mimeType: 'image/jpeg' } },
                    { text: verificationPrompt }
                ]
            }]
        };
        
        const result = await model.generateContent(request);
        const analysisText = result.response.candidates[0].content.parts[0].text;

        const cleanJson = JSON.parse(analysisText.replace(/```json|```/g, ""));

        return Promise.all([
            snapshot.ref.set({
                status: cleanJson.final_decision,
                explanation: cleanJson.explanation,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true }),

            snapshot.ref.collection("analysis").doc("result").set({
                ...cleanJson,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true })
        ])


    } catch (error) {
    console.error("Error en KYC:", error);
    return await admin.firestore().collection("kyc_error_tracking").add({
        error: error.toString(),
        created: Timestamp.now()
    });
}
});

module.exports = {
    analyzeUserVerification
};