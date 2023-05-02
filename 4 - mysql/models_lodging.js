const { DataTypes } = require("sequelize")
const db = require("./lib_sequelize");
const Reservation = require('./models_reservation')

// Define the table in the DB (note not include id, auto created by sequelize?)
const Lodging = db.define('lodging',  {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    street: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING(2), allowNull: false },
    zip: { type: DataTypes.STRING(5), allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
})

// Define association between lodging and reservation
// One-to-many: lodging can have many reservations, reservations have one lodging
Lodging.hasMany(Reservation, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    foreignKey: { allowNull: false }
})
Reservation.belongsTo(Lodging)

module.exports = Lodging