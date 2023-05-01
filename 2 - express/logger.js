// Middleware functions don't need to be anonymous, they can also be defined in different files
module.exports = (req, res, next) =>{
    console.log("Request Received:")
    console.log(`\tMethod: ${req.method}`)
    console.log(`\tURL: ${req.url}`)
    next()
}