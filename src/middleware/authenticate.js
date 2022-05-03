const jwt = require('jsonwebtoken')
const { User } = require('../models/user.model')

const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '') // This token variable will contain simple token
        const decodeToken = jwt.verify(token, process.env.JWT_SECRET) // thid decodeToken variable will contain '_id' & 'iat' value
        const user = await User.findOne({ _id: decodeToken._id, 'tokens.token': token }) // Return all data of user if both conditions true after findOne method

        if (!user) {
            throw new Error()
        }

        req.token = token
        req.user = user
        next()
    } catch (err) {
        res.status(401).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Please login first` })
    }
}

module.exports = authenticate