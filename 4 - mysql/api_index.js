const { Router } = require('express')
const router = Router()

// mount specified middleware functions at path which is being specified
router.use('/lodgings', require('./api_lodgings'))
router.use('/reservations', require('./api_reservations'))

module.exports = router