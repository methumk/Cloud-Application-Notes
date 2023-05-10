const bcrypt = require('bcryptjs')


const testUser = {name: "bob", email: "bob@builder.com", password: "ILikeToBuild69"}

// User object has pass, user name and email
async function insertNewUser(user){
    // hash(password, salt length)
    const passwordHash = await bcrypt.hash(user.password, 8);

    
}

