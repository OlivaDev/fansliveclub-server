const admin = require("firebase-admin");
const cors = require("cors");
const corsHandler = cors({ origin: "*" })
const { onRequest } = require("firebase-functions/https");
const { requestSeparatedData } = require("./util");

const getUsersList = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { ids } = req.body
        try {
            const data = await requestSeparatedData(ids, (part) => admin.firestore().collection("users").where("id", "in", part))
            res.send({success: true, users: data})

        } catch (err) {
            await admin.firestore().collection("chats_error_tracking").add({
                error: err.toString(),
                created: admin.firestore.Timestamp.now()
            })

            res.send({success: false, chats: []})
            return null
        }
    })
})

module.exports = {
    getUsersList
}