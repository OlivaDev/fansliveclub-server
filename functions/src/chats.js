const admin = require("firebase-admin");
const cors = require("cors");
const corsHandler = cors({ origin: "*" })
const { onRequest } = require("firebase-functions/https");

const getUserChats = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { userId } = req.body
        try {
            const data = await admin.firestore().collection("chats").where("users", "array-contains", userId).get()
            const chats = data.docs.map((chat) => chat.data())
            
            res.send({success: true, chats: chats})

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
    getUserChats
}