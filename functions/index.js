

const cors = require("cors");
const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/firestore");
const { updatePeriodGains } = require("./src/streamers");
const { createUserWallet } = require("./src/wallets");
const { subscribeToChannel, subscriptionsController } = require("./src/subscriptions");
const { checkBinanceNetwork, createBinanceOrder } = require("./src/payments/binance");
const { cleanupViewers, onViewverJoined, onLeaveStream, onViewverLeave } = require("./src/stream/stream");
const { getLiveKitToken, finishStream } = require("./src/stream/livekit");
const { makePayment } = require("./src/payments/payments");
admin.initializeApp();
const corsHandler = cors({ origin: "*" })

//NOTIFICADORES
const sendNotification = async (message) => {
    let t = await admin.credential.applicationDefault().getAccessToken()

    const options = {
        hostname: 'fcm.googleapis.com',
        port: 443,
        path: '/v1/projects/fansliveclub/messages:send',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${t.access_token}`,
            'Content-Type': 'application/json'
        }
    };


    const req = https.request(options, (res) => {
        let resp = ""
        res.on("data", (chunk) => {
            resp += chunk
        })

        res.on("end", () => {
            admin.firestore().collection("notResult").add({
                result: resp,
                created: Timestamp.now(),
                token: message.message.token
            })
        })
    })
    req.write(JSON.stringify(message));
    req.end();
}

exports.mainNotificator = onDocumentCreated("notifications/{notification}", async (document) => {
    let data = document.data.data()

    let devices = await admin.firestore().collection("users").doc(data.to).collection("devices").where("notificationsAllowed", "==", true).get()
    devices = devices.docs.map(d => d.data())

    let alreadyNotified = []

    for (let i = 0; i < devices.length; i++) {
        let device = devices[i]
        if (!alreadyNotified.includes(device.token)) {
            const message = {
                message: {
                    data: {
                        title: data.title,
                        body: data.description,
                        url: data.url || null,
                        data: data.url
                    },
                    token: device.token
                }
            }

            await sendNotification(message)
            alreadyNotified.push(device.token)
        }
    }
})
//////////////////////////////////////////////////////////////////////

//STREAMERS//////////////////////////////////////////////////////////////////////
exports.updatePeriodGains = updatePeriodGains
//WALLETS///////////////////////////////////////////////////////////////////////
exports.createUserWallet = createUserWallet
//SUBSCRIPTIONS
exports.subscribeToChannel = subscribeToChannel
exports.subscriptionsController = subscriptionsController
//PAYMENTS
exports.checkBinanceNetwork = checkBinanceNetwork
exports.createBinanceOrder = createBinanceOrder
exports.makePayment = makePayment
//STREAM (OLD)
/*
exports.cleanupViewers = cleanupViewers
exports.onViewverJoined = onViewverJoined
exports.onViewverLeave = onViewverLeave
exports.onLeaveStream = onLeaveStream
*/
//STREAM LIVEKIT
exports.getLiveKitToken = getLiveKitToken
exports.finishStream = finishStream

