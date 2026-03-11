const { onRequest } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");


const BINANCE_SECRET = defineSecret('BINANCE_SECRET')

const binancePayment = onRequest({secrets: ["BINANCE_SECRET"]},(req, res) => {

})

module.exports = {
    binancePayment
}