const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/firestore");


const createUserWallet = onDocumentCreated("users/{userId}", async (data) => {
    try {
        let wallet = {
            id: crypto.randomUUID(),
            periodGains: 0,
            user: data.params.userId,
            created: admin.firestore.Timestamp.now()
        }

        await Promise.all([
            admin.firestore().collection("wallets").doc(wallet.id).set(wallet),
            admin.firestore().collection("users").doc(data.params.userId).update({
                wallet: wallet.id,

            })
        ])
    } catch (err) {
        await admin.firestore().collection("errors").add({
            type: "wallet_creation",
            error: err.toString(),
            created: admin.firestore.Timestamp.now()
        })
    }
})

module.exports = {
    createUserWallet
}