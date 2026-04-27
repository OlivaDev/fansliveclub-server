const admin = require("firebase-admin");
const cors = require("cors");
const corsHandler = cors({ origin: "*" })
const { onRequest } = require("firebase-functions/https");
const { requestSeparatedData } = require("./util");

const usernameIsAvailable = async(username) => {
    const count = await admin.firestore().collection("users").where("user_id", "==", username.toLowerCase()).count().get()
    return count.data().count === 0
}

const getUsersList = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { ids } = req.body
        
        try {
            const data = await requestSeparatedData(ids, (part) => admin.firestore().collection("users").where("id", "in", part))
            res.send({ success: true, users: data })

        } catch (err) {
            await admin.firestore().collection("chats_error_tracking").add({
                error: err.toString(),
                created: admin.firestore.Timestamp.now()
            })

            res.send({ success: false, chats: [] })
            return null
        }
    })
})

const createUserAccount = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { data } = req.body
        
        const available = await usernameIsAvailable(data.username)

        if(!available){
            await admin.auth().deleteUser(data.id)
            res.send({success: false, message: "Username not available"})
            return null
        }

        try {
            let finalData = { ...data }
            delete finalData.password2
            delete finalData.password

            let periodEnd = new Date()
            periodEnd.setMonth(periodEnd.getMonth() + 1)

            await Promise.all([
                admin.firestore().collection("users").doc(data.id).set({
                    ...finalData,
                    created: admin.firestore.Timestamp.now(),
                    user_id: data.username.toLowerCase(),
                    welcomeMessageShowed: false,
                    streamerLevel: "84w5C5LfToEnPKcEPx7e",
                    nextStreamerLevel: "UQ7dj9RQVUPfq8lg6q0W",
                    levelReachedAt: admin.firestore.Timestamp.now(),
                    periodEnd: admin.firestore.Timestamp.fromDate(periodEnd)
                }),

                admin.firestore().collection("users").doc(data.id).collection("secret").doc("secret").set({
                    password: data.password,
                })
            ])

            res.send({success: true})
            return null
        } catch (err) {
            await admin.firestore().collection("accounts_error_tracking").add({
                created: admin.firestore.Timestamp.now(),
                err: err.toString()
            })
            await admin.auth().deleteUser(data.id)
            res.send({success: false, message: err.toString()})
            return null
        }
    })
})

module.exports = {
    getUsersList,
    createUserAccount
}