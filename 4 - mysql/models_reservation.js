const { DataTypes } = require("sequelize")

const db = require("lib_equelize")

// Define reservation table in DB (id auto created by Sequelize?)
const Reservation = db.define('reservation', {
    start: { type: DataTypes.DATEONLY, allowNull: false },
    end: { type: DataTypes.DATEONLY, allowNull: false }
})

module.exports = Reservation