// functions/index.js
const { onRequest } = require('firebase-functions/https');
const { AccessToken } = require('livekit-server-sdk');

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

module.exports = {
    getLiveKitToken
}