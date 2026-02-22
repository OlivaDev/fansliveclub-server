const { onDocumentCreated } = require("firebase-functions/firestore")
const { FieldValue } = require("firebase-admin/firestore")
const admin = require("firebase-admin");
const cors = require("cors");
const { onRequest } = require("firebase-functions/https");
const corsHandler = cors({ origin: "*" })


const subscribeToChannel = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        let { userId, tierId, subId } = req.body

        try {
            const subs = {
                id: subId,
                tier: tierId,
                created: admin.firestore.Timestamp.now()
            }

            await admin.firestore().collection("users").doc(userId).collection("subscribers").doc(subs.id).set(subs)
            res.send(JSON.stringify({ success: true }))
        } catch (err) {
            await admin.firestore().collection("errors").add({
                error: err.toString(),
                created: admin.firestore.Timestamp.now()
            })
        }

        return null
    })
})

const subscriptionsController = onDocumentCreated("/users/{userId}/subscribers/{subId}", async (data) => {
    try {
        let userId = data.params.userId
        let subId = data.params.subId

        await Promise.all([
            admin.firestore().collection("users").doc(userId).update({
                subscribers: FieldValue.increment(1)
            }),

            admin.firestore().collection("users").doc(subId).collection("subscriptions").doc(userId).set({
                user: userId,
                created: admin.firestore.Timestamp.now()
            })
        ])
    } catch (err) {
        await admin.firestore().collection("errors").add({
            error: err.toString(),
            created: admin.firestore.Timestamp.now()
        })
    }

    return null
})

module.exports = {
    subscribeToChannel,
    subscriptionsController
}