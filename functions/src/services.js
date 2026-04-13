const admin = require("firebase-admin");
const cors = require("cors");
const { onRequest } = require("firebase-functions/https");
const { Timestamp } = require("firebase-admin/firestore");
const corsHandler = cors({ origin: "*" })

const requestService = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const { subscriber, service, user, date } = req

        let request = {
            id: crypto.randomUUID(),
            subscriber,
            user,
            service,
            date: Timestamp.fromDate(new Date(date)),
            created: admin.firestore.Timestamp.now(),
            status: "pending",
        }

        try{
            await admin.firestore().collection("services_requests").doc(request.id).set(request)
            res.send({success: true, message: "Request sended successfully"})
        }catch(err){
            res.send({success: false, error: err.toString()})
        }
    })
})

module.exports = {
    requestService
}