const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { onDocumentCreated } = require("firebase-functions/firestore");

/*
    ACTUALIZACIÓN DE GANANCIAS DE PERIODO-------------------------------------------------------------------------------------------------

    Esta función cumple 2 propositos
    1-Se encarga de llevar el conteo de la ganancia durante el periodo del usuario
    2-Comprueba si la ganancia alcanzó el monto requerido para el siguiente nivel y actualiza al usuario
*/

const updatePeriodGains = onDocumentCreated("wallets/{walletId}/transactions/{transId}", async (data) => {
    let transaction = data.data.data()
    let wallet = await admin.firestore().collection("wallets").doc(transaction.toWallet).get()
    wallet = wallet.data()

    try {
        //1-Añadir transacción y obtener usuario al que se le realiza la transacción
        let promises = await Promise.all([
            admin.firestore().collection("wallets").doc(transaction.toWallet).update({
                periodGains: FieldValue.increment(transaction.amount)
            }),

            admin.firestore().collection("users").doc(transaction.toUser).get(),
        ])

        let user = promises[1].data()

        //2-Obtener siguiente nivel del usuario
        let nextLevel = await admin.firestore().collection("levels").doc(user.nextStreamerLevel).get()
        nextLevel = nextLevel.data()

        /*3-
            Si las ganancias del periodo actual son mayores o iguales al monto requerido para el
            siguiente nivel, se reinician las ganancias del periodo y se le asigna el siguiente nivel si existe
        */

        if (nextLevel) {
            if (wallet.periodGains >= nextLevel.amountRequired) {
                let nextPeriod = await admin.firestore().collection("levels").doc(nextLevel.nextLevel).get()
                nextPeriod = nextPeriod.data()

                let periodEnd = new Date()

                if(nextPeriod){
                    periodEnd.setMonth(periodEnd.getMonth() + nextPeriod.monthsLimit)
                    periodEnd = Timestamp.fromDate(periodEnd)
                }

                let actualGains = nextLevel.amountRequired - transaction.amount

                await Promise.all([
                    admin.firestore().collection("wallets").doc(wallet.id).update({
                        periodGains: actualGains
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

    return
})

/*-----------------------------------------FIN DE ACTUALIZACIÓN DE GANANCIAS DEL PERIODO----------------------------------------------------------------------------------- */

module.exports = {
    updatePeriodGains
}