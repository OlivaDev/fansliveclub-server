
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/firestore");
const { onRequest } = require("firebase-functions/https");
const { onSchedule } = require("firebase-functions/scheduler");
const cors = require("cors");
const corsHandler = cors({
    origin: true,
    methods: ['POST', 'OPTIONS'],
})

const onLeaveStream = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { stream, user } = req.body
        try {
            await admin.firestore().collection("streams").doc(stream).collection("viewers").doc(user).delete()
            res.send({ success: true })
        } catch (err) {
            await admin.firestore().collection("error_tracking").add({
                created: admin.firestore.Timestamp.now(),
                error: err.toString()
            })
            res.send({ success: false })
        }

        return null
    })
})

const cleanupViewers = onSchedule("every 1 minutes", async (event) => {
    const db = admin.firestore();
    const ago = new Date(Date.now() - 40 * 1000);

    try {
        const streams = await db.collection("streams").where("state", "in", ["created", "live"]).get();

        for (const streamDoc of streams.docs) {
            const viewersRef = streamDoc.ref.collection("viewers");

            const expiredViewers = await viewersRef.where("last_ping", "<", ago).get();

            if (!expiredViewers.empty) {
                const batch = db.batch();
                expiredViewers.forEach(doc => {
                    batch.delete(doc.ref);
                });

                const infoRef = streamDoc.ref.collection("information").doc("information");
                batch.update(infoRef, {
                    viewers: FieldValue.increment(-expiredViewers.size)
                });

                await batch.commit();
            }
        }

        return null
    } catch (err) {
        await admin.firestore().collection("streams_cleanup_error_tracking").add({
            error: err.toString(),
            created: admin.firestore.Firestore.now()
        })
        return null
    }
});


const onViewverJoined = onDocumentCreated("streams/{streamId}/viewers/{viewerId}", async (event) => {
    const streamId = event.params.streamId

    if (!streamId) return;

    try {
        const db = admin.firestore();
        const infoRef = db.collection("streams").doc(streamId)
            .collection("information").doc("information");

        await infoRef.set({
            viewers: admin.firestore.FieldValue.increment(1)
        }, { merge: true });

        return null
    } catch (error) {
        await admin.firestore().collection("streams_cleanup_error_tracking").add({
            error: err.toString(),
            created: admin.firestore.Firestore.now()
        })
        return null
    }
});


const onViewverLeave = onDocumentDeleted("streams/{streamId}/viewers/{viewerId}", async (event) => {
    const streamId = event.params.streamId

    if (!streamId) return;

    try {
        const db = admin.firestore();
        const infoRef = db.collection("streams").doc(streamId)
            .collection("information").doc("information");

        await infoRef.update({
            viewers: admin.firestore.FieldValue.increment(-1)
        });

        return null
    } catch (error) {
        await admin.firestore().collection("streams_cleanup_error_tracking").add({
            error: err.toString(),
            created: admin.firestore.Firestore.now()
        })
        return null
    }
});

module.exports = {
    cleanupViewers,
    onViewverJoined,
    onLeaveStream,
    onViewverLeave
}