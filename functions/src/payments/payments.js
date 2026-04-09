const admin = require("firebase-admin");
const cors = require("cors");
const { onRequest } = require("firebase-functions/https");
const corsHandler = cors({ origin: "*" })

const makePayment = onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        let data = req.body
        let transaction = {
            ...data,
            id: crypto.randomUUID(),
            created: admin.firestore.Timestamp.now()
        }

        //Segun el método aquí agregaremos las condiciones
        switch (data.method) {
            case 1:
                try {

                } catch (err) {
                    res.send({ success: false })
                    return null
                }
                break;

            default:
                return
        }


        //Aquí ya registramos el pago (esto se tiene que mover luego a los hooks de las pasarelas reales)
        try {
            await admin.firestore().collection("wallets").doc(transaction.toWallet).collection("transactions").doc(transaction.id).set(transaction)
            res.send({success: true})
        } catch (err) {
            await admin.firestore().collection("payments_error_tracking").add({
                type: "try_payment",
                error: err.toString(),
                created: admin.firestore.Timestamp.now()
            })

            res.send({success: false})

            return null
        }

        return null
    })
})

module.exports = {
    makePayment
}