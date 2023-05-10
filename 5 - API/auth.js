const jwt = require('jsonwebtoken')


// Used to sign and verify JWt
// DON'T DO THIS IN PROD (obvi), in prod you could read key from env variable/file/randomly generate one (eg. Node.js Crypto module)
const secretKey = "SuperSecret"


function generateAuthToken(userID){
    // JWT payload which will be an object containg data we want to include in JWT; 
    // Here storing the provided user ID under the subject field
    const payload = {sub: userID}

    // create signed JWT which we'll return from our function in addition to secret key and payload we'll also pass expires in option
    // this will add the exp field to the JWT payload based on time span 
    // NOTE: allowing sign() to use default sign algo HMAC_SHA256
    return jwt.sign(payload, secretKey, { expiresIn: '24h' });
}

// express middleware that we will plug into express app to make sure request contains valid JWT
// If request does contain valid JWT, we can set req.user to ID of logged-in user so we can use this value in other middleware functions
// otherwise return 403 (user request not authorized)
function requireAuthentication(req, res, next) {
    // Get authorization from header:
    // Need to break it up as Authorization if format: Authorization: Bearer <token>
    const authHeader = req.get('Authorization') || '';
    const authHeaderParts = authHeader.split(' ');

    // verify header specifies the bearer scheme and grab the token setting the token to null if header doesn't specifiy the bearer scheme
    const token = authHeaderParts[0] === 'Bearer' ?authHeaderParts[1] : null;
    
    // Once we have token (even if it's null), we can use verify to verify the token
    // It will take secrete key and use to compute signature over the header and payload of the JWT (just like when it was originally signed)
    // If computed signature matches the one attached to token, then it's validated
    // verify() will also check if tokens expired
    // If it passes, function returns the decoded payload of the token, otherwise will throw error (use try/catch)
    try{
        const payload = jwt.verify(token, secretKey);

        // Token validated, set the req.user to the user's ID which is available in sub field of payload and then call next middleware function
        req.user = payload.sub
        next()
    }catch(err){
        // If error, return 401 (unauthorized)
        res.status(401).json({
            error: "Invalid authentication token provided."
        });
    }

}
exports.requireAuthentication = requireAuthentication;

  
exports.generateAuthToken = generateAuthToken;