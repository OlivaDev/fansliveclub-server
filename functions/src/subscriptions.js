const { onDocumentCreated } = require("firebase-functions/firestore")
const { FieldValue } = require("firebase-admin/firestore")
const admin = require("firebase-admin");

const subscriptionConfirmed = onDocumentCreated("wallets/{walletId}/transactions/{transId}", async (data) => {
    let transaction = data.data.data()
    if (transaction.type === 2) {
        try {
            const subs = {
                ...transaction.subscription,
                created: admin.firestore.Timestamp.now()
            }

            await Promise.all([
                admin.firestore().collection("users").doc(subs.userId).collection("subscribers").doc(subs.id).set(subs),
                admin.firestore().collection("users").doc(subs.userId).update({
                    subscribers: FieldValue.increment(1)
                }),

                admin.firestore().collection("users").doc(subs.id).collection("subscriptions").doc(subs.userId).set({
                    user: subs.userId,
                    tier: subs.tier,
                    tierData: subs.tierData,
                    created: admin.firestore.Timestamp.now()
                })
            ])

        } catch (err) {
            admin.firestore().collection("subscriptions_error_tracking").add({
                created: admin.firestore.Timestamp.now(),
                error: err.toString()
            })
        }
    }

    return null
})

module.exports = {
    subscriptionConfirmed
}