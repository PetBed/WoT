const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const getSecret = () => process.env.STUDY_AUTH_SECRET || 'study-dashboard-development-secret';

function encode(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createStudyToken(userId) {
    const payload = {
        sub: String(userId),
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    };
    const encodedPayload = encode(payload);
    const signature = crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
}

function verifyStudyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return null;
    }
    try {
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch (error) {
        return null;
    }
}

function requireStudyAuth(req, res, next) {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verifyStudyToken(token);
    if (!payload) return res.status(401).json({ error: 'A valid study session is required.' });
    req.studyUserId = payload.sub;
    next();
}

module.exports = { createStudyToken, requireStudyAuth };
