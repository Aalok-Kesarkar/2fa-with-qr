'use strict';
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const speakeasy = require("speakeasy");
// const { Task } = require('./task');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error(`Invalid email address`)
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 6,
        validate(value) {
            if (value.toLowerCase().includes('password')) {
                throw new Error(`Password should not contain string 'password'`)
            }
        }
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0) {
                throw new Error(`Age can't be negative`)
            }
        }
    },
    tempSecretKey: {
        type: String
    },
    secretKey: {
        type: String
    },
    tokens: [{
        token: {
            type: String,
            // required: true
        }
    }]
}, {
    timestamps: true
})

userSchema.virtual('virtualTasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ _id: user._id.toString() }, 'testSeCrEt', { expiresIn: '7d' })

    user.tokens = user.tokens.concat({ token })

    await user.save()

    return token
}

// This should be used only in SignUp page
userSchema.methods.generateOTPSecretKey = async function () {
    const userWithOTPSecret = this

    const tempSecret = speakeasy.generateSecret();
    const OTP = speakeasy.totp({
        secret: tempSecret.base32,
        encoding: 'base32'
    });

    userWithOTPSecret.tempSecretKey = tempSecret.base32

    return { userWithOTPSecret, OTP }
}

// Need to create separate API to call this method
userSchema.methods.regenerateEmailVerificationOTP = async function () {
    const user = this
    const OTP = speakeasy.totp({
        secret: user.tempSecretKey,
        encoding: 'base32'
    })

    return OTP
}

userSchema.methods.generateOTP = async function () {
    const user = this
    const OTP = speakeasy.totp({
        secret: user.secretKey,
        encoding: 'base32'
    })

    return OTP
}

userSchema.methods.verifyOTP = async (secret, otp) => {
    const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: otp,
        window: 5
    })
    return isValid
}

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar

    return userObject
}

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })
    if (!user) {
        throw new Error(`Unable to login`)
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        throw new Error(`Unable to login`)
    }
    return user
}

// Hashing password before storing to db
userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

userSchema.pre('remove', async function (next) {
    const user = this
    await Task.deleteMany({ owner: user._id })
    next()
})

// This create an model as well as an file named users in database
const User = mongoose.model('User', userSchema)

module.exports = {
    User: User
}