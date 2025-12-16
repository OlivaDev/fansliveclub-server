const generateId = (length) => {
    let result = ""
    let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * (chars.length - 1))]
    }

    return result
}

module.exports = {
    generateId
}