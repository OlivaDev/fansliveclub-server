// functions/index.js
const { onRequest } = require('firebase-functions/https');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const admin = require("firebase-admin")
const { onCall } = require("firebase-functions/v2/https");

const getLiveKitToken = onRequest({
    cors: true, secrets: [
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET"
    ]
}, async (req, res) => {
    const { roomName, participantName, isStreamer } = req.query;

    const canPublish = isStreamer === "true"

    if (!roomName || !participantName) {
        return res.status(400).send('Faltan datos: roomName o participantName');
    }

    const at = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        { identity: participantName }
    );

    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: canPublish,
        canSubscribe: true
    });

    res.send({ token: await at.toJwt() });
});


const finishStream = onCall({
    secrets: [
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "LIVEKIT_HOST"
    ]
}, async (request) => {
    const { roomName } = request.data;
    const uid = request.auth.uid;

    const svc = new RoomServiceClient(
        process.env.LIVEKIT_HOST, 
        process.env.LIVEKIT_API_KEY, 
        process.env.LIVEKIT_API_SECRET
    );

    try {
        const streamDoc = await admin.firestore().collection('streams').doc(roomName).get();

        if (!streamDoc.exists || streamDoc.data().creator !== uid) {
            throw new Error("No tienes permiso para finalizar este stream.");
        }

        await svc.deleteRoom(roomName);

        await streamDoc.ref.update({
            state: 'finished',
            finishedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

module.exports = {
    getLiveKitToken,
    finishStream
}