const admin = require("firebase-admin");
const cors = require("cors");
const { onRequest } = require("firebase-functions/https");
const { Timestamp, Filter } = require("firebase-admin/firestore");
const { requestSeparatedData } = require("./util");
const corsHandler = cors({ origin: "*" })

const requestService = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { subscriber, services, user, date } = req.body

        let request = {
            id: crypto.randomUUID(),
            subscriber,
            user,
            services,
            date: Timestamp.fromDate(new Date(date)),
            created: admin.firestore.Timestamp.now(),
            status: "pending",
        }

        try {
            await Promise.all([
                admin.firestore().collection("services_requests").doc(request.id).set(request),

                admin.firestore().collection("users").doc(user).collection("updaters").doc("requests").set({
                    updatedAt: admin.firestore.Timestamp.now()
                }, { merge: true }),
            ])

            res.send({ success: true, message: "Request sended successfully" })
            return null
        } catch (err) {
            res.send({ success: false, error: err.toString() })
            return null
        }
    })
})

const getServicesRequests = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { user } = req.body

        try {
            const data = await admin.firestore().collection("services_requests").where(
                Filter.or(
                    Filter.where("user", "==", user),
                    Filter.where("subscriber", "==", user)
                )
            ).get()

            const requests = data.docs.map(r => r.data())
            let usersIds = requests.map(r => r.subscriber)

            let users = await requestSeparatedData(usersIds, (part) => admin.firestore().collection("users").where("id", "in", part))

            requests.forEach((item) => {
                let subscriber = users.find(u => u.id === item.subscriber)
                item.date = item.date.toDate().toISOString()
                item.created = item.created.toDate().toISOString()

                if (subscriber) {
                    item.subscriber = subscriber
                }
            })

            res.send({ success: true, data: requests })
            return null

        } catch (err) {
            res.send({ success: false, error: err.toString() })
            return null
        }
    })
})

const approveServiceRequest = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { request } = req.body

        try {

            const msg = {
                id: crypto.randomUUID(),
                creator: "system",
                created: Timestamp.now(),
                type: "system",
                text: "Service chat: In case of fraud, please report it for verification."
            }

            const chat = {
                id: crypto.randomUUID(),
                users: [request.user, request.subscriber.id],
                type: 2,
                lastUpdate: Timestamp.now(),
                lastMessage: msg
            }

            await Promise.all([
                admin.firestore().collection("services_requests").doc(request.id).update({
                    status: "approved"
                }),

                admin.firestore().collection("chats").doc(chat.id).set(chat),
                admin.firestore().collection("chats").doc(chat.id).collection("messages").doc(msg.id).set(chat),

                admin.firestore().collection("users").doc(request.user).collection("updaters").doc("requests").set({
                    updatedAt: admin.firestore.Timestamp.now()
                }, { merge: true }),

                admin.firestore().collection("users").doc(request.subscriber.id).collection("updaters").doc("requests").set({
                    updatedAt: admin.firestore.Timestamp.now()
                }, { merge: true }),
            ])

            res.send({ success: true, chatId: chat.id })
            return null
        } catch (err) {
            res.send({ success: false, error: err.toString() })
            return null
        }
    })
})

module.exports = {
    requestService,
    getServicesRequests,
    approveServiceRequest
}