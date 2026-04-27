

const cors = require("cors");
const admin = require("firebase-admin");
admin.initializeApp();
const corsHandler = cors({ origin: "*" })

const { onDocumentCreated } = require("firebase-functions/firestore");
const { createUserWallet } = require("./src/wallets");
const { subscriptionConfirmed } = require("./src/subscriptions");
const { checkBinanceNetwork, createBinanceOrder } = require("./src/payments/binance");
const { cleanupViewers, onViewverJoined, onLeaveStream, onViewverLeave } = require("./src/stream/stream");
const { getLiveKitToken, finishStream } = require("./src/stream/livekit");
const { makePayment } = require("./src/payments/payments");
const { transactionsController } = require("./src/transactions");
const { requestService, getServicesRequests, approveServiceRequest } = require("./src/services");
const { getUserChats, chatCreated } = require("./src/chats");
const { getUsersList, createUserAccount } = require("./src/users");
const { analyzeUserVerification } = require("./src/AI/gemini/images");


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
exports.transactionsController = transactionsController
//WALLETS///////////////////////////////////////////////////////////////////////
exports.createUserWallet = createUserWallet
//SUBSCRIPTIONS
exports.subscriptionConfirmed = subscriptionConfirmed
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
//SERVICES
exports.requestService = requestService
exports.getServicesRequests = getServicesRequests
exports.approveServiceRequest = approveServiceRequest
//CHATS
exports.getUserChats = getUserChats
exports.chatCreated = chatCreated
//USERS
exports.getUsersList = getUsersList
exports.createUserAccount = createUserAccount
//IA
exports.analyzeUserVerification = analyzeUserVerification
