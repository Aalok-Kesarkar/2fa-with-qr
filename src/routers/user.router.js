const express = require('express')
const speakeasy = require('speakeasy')
const v8 = require('v8')
const { User } = require('../models/user.model')
const authenticate = require('../middleware/authenticate')
const sendEmail = require('../email-sending/sendgrid')
const QRCode = require('qrcode')
const jsQR = require('jsqr')
const router = new express.Router()

// Post method for new user //SIGNUP
router.post('/user/signin', async (req, res) => {

    const user = new User(req.body)

    try {
        await user.save()
        const otp = await user.generateOTPSecretKey()

        const emailSubject = `OTP for email verification`
        const htmlText = `<h3>Dear ${user.name},</h3><br>OTP for verifying email is: <h2>${otp}</h2><br>One Time Password is valid for 3 minutes only`
        sendEmail.regularEmail(user.email, emailSubject, htmlText)

        res.status(201).send({ message: `OTP for verification of email sent successfully to ${user.email}` })
        // res.redirect('/verify-email')
    } catch (err) {
        res.status(400).send({ error: `Error occured, ${err}` })
    }
})

router.post('/verify-email', async (req, res) => {
    // verify that OTP is matching, if yes then generate JWT token and send to user by res.send()
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user.isEmailVerified) {        // if email aready verified, send error as email is already verified, in short don't send verification OTP again
            const tempSecret = user.tempSecretKey

            // verify OTP here...
            const verified = speakeasy.totp.verify({
                secret: tempSecret,
                encoding: 'base32',
                token: req.body.otp,
                window: 5
            })

            if (verified) {     // if email is verified, send JWT token for logging in
                const token = await user.generateAuthToken()

                user.secretKey = user.tempSecretKey
                user.tempSecretKey = undefined
                user.isEmailVerified = true

                const emailSubject = `Email is verified successfuly`
                const htmlText = `<h3>Dear ${user.name},</h3><br>Your email address is verified successfuly!</h2>`
                sendEmail.regularEmail(user.email, emailSubject, htmlText)

                await user.save()
                res.status(201).send({ user, token })
            } else {
                res.status(400).send({ error: `OTP doesn't match` })
            }
        } else {
            res.status(400).send({ message: `Email has already been verified` })
        }
    } catch (err) {
        res.status(500).send(err)
    }
})

router.post('/regenerate-email-verification-otp', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user.isEmailVerified) {    // if email aready verified, send error as email is already verified, in short don't send verification OTP again
            const otp = await user.regenerateEmailVerificationOTP()

            const emailSubject = `OTP for email verification`
            const htmlText = `<h3>Dear ${user.name},</h3><br>As per your request for new OTP...<br>OTP for verifying email is: <h2>${otp}</h2><br>One Time Password is valid for 3 minutes only.`
            sendEmail.regularEmail(user.email, emailSubject, htmlText)

            res.send({ message: `Email with OTP sent to ${user.email} successfully!` })

            // res.redirect('/verify-email')
        } else {
            res.status(400).send({ message: `Email has already been verified` })
        }
    } catch (err) {
        res.status(500).send(err)
    }
})

// Login for user
router.post('/user/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const otp = await user.generateOTP()

        const emailSubject = `OTP for logging in`
        const htmlText = `<h3>Dear ${user.name},</h3><br>OTP for logging in is: <h2>${otp}</h2><br>One Time Password is valid for 3 minutes only`
        sendEmail.regularEmail(user.email, emailSubject, htmlText)
        res.send({ message: `OTP sent to ${user.email} successfuly` })
    } catch (err) {
        res.status(400).send({ error: `Something went wrong: ${err}` })
    }
})

router.post('/otp-validate', async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    try {
        const secret = user.secretKey

        const validate = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: req.body.otp,
            window: 5
        })

        if (validate) {
            const token = await user.generateAuthToken()
            res.send({ message: `OTP verified and logged in successfully`, token })
        } else {
            res.status(400).send({ error: 'OTP not correct or timed out' })
        }
    } catch (err) {
        res.status(400).send({ error: `Error occured, ${err}` })
    }
})

// Get method to see user profile
router.get('/user', authenticate, async (req, res) => {
    res.send(req.user)
})

// LOGOUT from single device
router.post('/user/logout', authenticate, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((eachTokenObjInDb) => { // filter will go through for all tokens in database of that particular user (like forEach)
            return eachTokenObjInDb.token !== req.token // Return true if token does not match with token come with header
        })
        await req.user.save() // Save all tokens except one which match with request header token
        res.send({ message: `Successfully logged out` })
    } catch (err) {
        res.status(500).send({ error: `Server issue, coludn't logged out, try again` })
    }
})

// LOGOUT from multiple devices
router.post('/user/logout-all', authenticate, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send({ message: `Successfully logged out of all devices` })
    } catch (err) {
        res.status(500).send({ error: `Can't perform logout operation, ${err}` })
    }
})

// Update user data
router.patch('/user', authenticate, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'age', 'password']
    const isValidUpdate = updates.every((update) => { // if every param from requested 'updates' is available in allowed list then only it'll return true
        return allowedUpdates.includes(update)
    })

    if (!isValidUpdate) {
        return res.status(400).send({ error: 'Invalid update operation detected' })
    }

    try {
        updates.forEach((update) => {
            req.user[update] = req.body[update]
        })
        await req.user.save()
        res.send({ message: `Updated successfully!`, updated: req.user })
    } catch (err) {
        res.status(400).send({ error: `Can't update, ${err}` })
    }
})

// Delete an user with ID
router.delete('/user', authenticate, async (req, res) => {
    try {
        await req.user.remove()
        res.send({ message: `User Deleted :(`, deletedUser: req.user })
    } catch (err) {
        res.status(500).send({ error: `Couldn't delete, ${err}` })
    }
})

router.get('/generate-qr', async (req, res) => {
    try {
        QRCode.toDataURL(req.body.text, function (err, url) {

            sendEmail.verifyLoginByQR('aalokkesarkar7@gmail.com', 'Aalok Kesarkar', url)
            res.send()
        })
        console.log(`QR image sent to aalokkesarkar7@gmail.com successfuly`)

    } catch (err) {
        res.status(500).send(err)
    }
})

module.exports = router