const generateId = (length) => {
    let result = ""
    let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * (chars.length - 1))]
    }

    return result
}

const divideArray = (array, size) => {
    let result = [];
    let start = 0;
    let end = size
    let limit = Math.ceil((array.length) / size);
    for (let i = 0; i < limit; i++) {
        result.push(array.slice(start, end));

        start += size;
        end += size;
    }
    return result;
}

const requestSeparatedData = async (data = [], request) => {
    const parts = divideArray(data, 30);
    const promises = parts.map(part => request(part).get());
    const results = await Promise.all(promises);
    const finalData = [];
    
    results.forEach(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
            finalData.push(doc.data());
        });
    });

    return finalData;
};

module.exports = {
    generateId,
    requestSeparatedData
}