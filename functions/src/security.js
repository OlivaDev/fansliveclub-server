const validateAuth = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Unauthorized: No token provided");
    }

    const idToken = authHeader.split("Bearer ")[1];
    // verifyIdToken nos da el UID real del usuario desde los servidores de Google
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
};

module.exports = {
    validateAuth
}