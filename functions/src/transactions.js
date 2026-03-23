const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { onDocumentCreated } = require("firebase-functions/firestore");

/*
    ACTUALIZACIÓN DE GANANCIAS DE PERIODO-------------------------------------------------------------------------------------------------

    Esta función cumple los siguientes propositos:
    1-Se encarga de llevar el conteo de la ganancia durante el periodo del usuario
    2-Comprueba si la ganancia alcanzó el monto requerido para el siguiente nivel y actualiza al usuario
    3-Gestiona el siguiente paso si al crearse una transacción
*/

const transactionsController = onDocumentCreated("wallets/{walletId}/transactions/{transId}", async (data) => {
    let transaction = data.data.data()
    switch (transaction.type) {
        case 1:
        case 2:
            try {
                //Añadir transacción y obtener usuario al que se le realiza la transacción
                //Este (currentGains) dato funciona para tener el monto anterior a al actualización, así se suma el dinero a el siguiente periodo
                let currentGains = await admin.firestore().collection("wallets").doc(transaction.toWallet).get()
                currentGains = currentGains.data().periodGains || 0


                let user = await admin.firestore().collection("users").doc(transaction.toUser).get()
                user = user.data()

                //Obtener nivel actual y siguiente nivel del usuario

                let promises2 = await Promise.all([
                    admin.firestore().collection("levels").doc(user.streamerLevel).get(),
                    admin.firestore().collection("levels").doc(user.nextStreamerLevel).get()
                ])

                let currentLevel = promises2[0].data()
                let nextLevel = promises2[1].data()
                let amount = (transaction.amount * currentLevel.percentage) / 100

                await Promise.all([
                    admin.firestore().collection("wallets").doc(transaction.toWallet).update({
                        periodGains: FieldValue.increment(amount),
                        available: FieldValue.increment(amount)
                    }),

                    admin.firestore().collection("wallets").doc(transaction.toWallet).doc(transaction.id).update({
                        gained: amount
                    })
                ])

                /*
                await admin.firestore().collection("wallets").doc(transaction.fromWallet).update({
                    expense: FieldValue.increment(transaction.amount),
                    available: FieldValue.increment(-transaction.amount)
                })
                    */

                /*
                    Si las ganancias del periodo actual son mayores o iguales al monto requerido para el
                    siguiente nivel, se reinician las ganancias del periodo y se le asigna el siguiente nivel si existe
                */

                if (nextLevel) {
                    if (currentGains + transaction.amount >= nextLevel.amountRequired) {
                        let nextPeriod = await admin.firestore().collection("levels").doc(nextLevel.nextLevel).get()
                        nextPeriod = nextPeriod.data()

                        let periodEnd = new Date()

                        if (nextPeriod) {
                            periodEnd.setMonth(periodEnd.getMonth() + nextPeriod.monthsLimit)
                            periodEnd = Timestamp.fromDate(periodEnd)
                        }

                        let actualGains = (currentGains + transaction.amount) - nextLevel.amountRequired

                        await Promise.all([
                            admin.firestore().collection("wallets").doc(transaction.toWallet).update({
                                periodGains: 0
                            }),

                            admin.firestore().collection("users").doc(user.id).update({
                                nextStreamerLevel: nextLevel.nextLevel || null,
                                streamerLevel: nextLevel.id,
                                levelReachedAt: Timestamp.now(),
                                periodEnd: periodEnd || null
                            })
                        ])
                    }
                }
            } catch (err) {
                await admin.firestore().collection("errors").add({
                    type: "update_period",
                    error: err.toString(),
                    created: Timestamp.now()
                })
            }
            break;
    }

    return null
})

/*-----------------------------------------FIN DE ACTUALIZACIÓN DE GANANCIAS DEL PERIODO----------------------------------------------------------------------------------- */

module.exports = {
    transactionsController
}