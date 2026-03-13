const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require('firebase-functions/params');
const axios = require("axios");
const crypto = require("crypto");
const admin = require("firebase-admin")

const BINANCE_SECRET = defineSecret('BINANCE_SECRET');
const BINANCE_KEY = defineSecret('BINANCE_KEY');
const baseURL = "https://bpay.binanceapi.com"; 

//Esto es solo para testear si la red de binance está ok
const checkBinanceNetwork = onCall({ secrets: [BINANCE_SECRET] }, async (request) => {
    const endpoint = "/api/v3/time";
    
    try {
        const timeRes = await axios.get(`${baseURL}${endpoint}`);
        const serverTime = timeRes.data.serverTime;

        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto
            .createHmac("sha256", BINANCE_SECRET.value())
            .update(queryString)
            .digest("hex");

        return { 
            conexion_red: "EXITOSA",
            server_time: serverTime,
            nota: "Si ves el server_time, tu NAT y VPC están perfectos.",
            intento_firma: "Enviado con BINANCE_SECRET"
        };

    } catch (error) {
        return { 
            status: "ERROR", 
            detalles: error.response?.data || error.message,
            ayuda: "Si el error es 401, la llave no sirve para Testnet. Si es Timeout, falla el NAT."
        };
    }
});

//Función que procesa los pagos de binance
const createBinanceOrder = onCall({ 
    secrets: [BINANCE_SECRET, BINANCE_KEY],
    region: "europe-west1"
}, async (request) => {
    
    const { amount, orderId } = request.data;
    const endpoint = "/binancepay/openapi/v2/order";
    
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");
    
    const body = {
        env: { terminalType: "WEB" },
        orderAmount: amount,
        currency: "USDT",
        merchantTradeNo: orderId,
        goods: {
            goodsType: "02",
            goodsCategory: "Z000",
            referenceGoodsId: "gift",
            goodsName: "Send a gift",
        },
        returnUrl: "https://fansliveclub.web.app",
        cancelUrl: "https://fansliveclub.web.app"
    };

    const payload = JSON.stringify(body);
    const signaturePayload = `${timestamp}\n${nonce}\n${payload}\n`;
    
    const signature = crypto
        .createHmac("sha512", BINANCE_SECRET.value())
        .update(signaturePayload)
        .digest("hex")
        .toUpperCase();

    try {
        const response = await axios.post(`${baseURL}${endpoint}`, body, {
            headers: {
                "Content-Type": "application/json",
                "BinancePay-Timestamp": timestamp,
                "BinancePay-Nonce": nonce,
                "BinancePay-Certificate-SN": BINANCE_KEY.value(),
                "BinancePay-Signature": signature
            }
        });

        return { success: true, data: response.data };
    } catch (error) {
        await admin.firestore().collection("binance_error_tracking").add({
            error: error.toString(),
            created: admin.firestore.Timestamp.now()
        })
        return { success: false, error: error.toString() };
    }
});

module.exports = {
    checkBinanceNetwork,
    createBinanceOrder
}