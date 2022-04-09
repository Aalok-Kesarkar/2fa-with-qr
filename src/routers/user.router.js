const express = require('express')
const speakeasy = require('speakeasy')
const { User } = require('../models/user.model')
const authenticate = require('../middleware/authenticate')
const emailSender = require('../email-sending/emailSender')
const QRCode = require('qrcode')
const jsQR = require('jsqr')
const { PNG } = require('pngjs')
const multer = require('multer')
const router = new express.Router()

const upload = multer()

// @route: POST /user/signin
// @desc: Signin with new user details
router.post('/user/signin', async (req, res) => {

    const user = new User(req.body)

    try {
        await user.save()
        const otp = await user.generateOTPSecretKey()

        const emailSubject = `OTP for email verification`
        const htmlText = `<h3>Dear ${user.name},</h3><br>OTP for verifying email is: <h2>${otp}</h2><br>One Time Password is valid for 3 minutes only`

        await emailSender.regularEmail(user.email, emailSubject, htmlText)

        res.send({ Phase: `DEVELOPEMENT PHASE`, message: `Check inbox of ${user.email} for email verification OTP!` })
        // res.redirect('/verify-email')
    } catch (err) {
        res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: ` ${err}` })
    }
})

// @route: POST /user/verify-email
// @desc: Verify email ID set by new user by verifying OTP sent to email
router.post('/user/verify-email', async (req, res) => {
    // verify that OTP is matching, if yes then generate JWT token and send to user by res.send()
    console.log(req.body)
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

                const emailSubject = `Email is verified succesfully`
                const htmlText = `<h3>Dear ${user.name},</h3><br>Your email address is verified successfuly!</h2>`
                await emailSender.regularEmail(user.email, emailSubject, htmlText)

                await user.save()
                res.status(201).json({ Phase: `DEVELOPEMENT PHASE`, message: `Email verified succesfully`, user, token })
            } else {
                res.status(400).json({ Phase: `DEVELOPEMENT PHASE`, error: `OTP doesn't match` })
            }
        } else {
            res.status(400).json({ Phase: `DEVELOPEMENT PHASE`, message: `Email has already been verified` })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ Phase: `DEVELOPEMENT PHASE`, error: err })
    }
})

// @route: POST /user/recrete-veri-otp
// @desc: Recreate OTP to verify email if past OTP is expired
router.post('/user/recreate-veri-otp', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user.isEmailVerified) {    // if email aready verified, send error as email is already verified, in short don't send verification OTP again
            const otp = await user.regenerateEmailVerificationOTP()

            const emailSubject = `OTP for email verification`
            const htmlText = `<h3>Dear ${user.name},</h3><br>As per your request for new OTP...<br>OTP for verifying email is: <h2>${otp}</h2><br>One Time Password is valid for 3 minutes only.`
            emailSender.regularEmail(user.email, emailSubject, htmlText)

            res.send({ Phase: `DEVELOPEMENT PHASE`, message: `Email with OTP sent to ${user.email} successfully!` })

            // res.redirect('/verify-email')
        } else {
            res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, message: `Email has already been verified` })
        }
    } catch (err) {
        res.status(500).send({ Phase: `DEVELOPEMENT PHASE`, error: err })
    }
})

// @route: POST /user/login?verifMethod= <qr/otp>
// @desc: Login existing user and specify verification method, send OTP or QR as selected by user
router.post('/user/login', async (req, res) => {
    if (!req.query.verifMethod)
        return res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, message: `Tampering with URL is not allowed.` })
    const user = await User.findByCredentials(req.body.email, req.body.password)
    switch (req.query.verifMethod) {
        case `otp`:
            try {
                const otp = await user.generateOTP()

                const emailSubject = `OTP for logging in`
                const htmlText = `<h3>Dear ${user.name},</h3><br>OTP for logging in is: <h2>${otp}</h2><br>One Time Password is valid for 3 minutes only`
                emailSender.regularEmail(user.email, emailSubject, htmlText)
                return res.send({ Phase: `DEVELOPEMENT PHASE`, message: `OTP sent to ${user.email} successfuly` })
            } catch (err) {
                return res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: `Something went wrong: ${err}` })
            }
        case `qr`:
            try {
                const user = await User.findByCredentials(req.body.email, req.body.password)
                const otp = await user.generateOTP()
                const imageBin = await QRCode.toDataURL(otp)

                const emailMsg = await emailSender.verifyLoginByQR(user.email, user.name, imageBin)

                return res.send({ Phase: `DEVELOPEMENT PHASE`, message: emailMsg })
            } catch (err) {
                return res.status(500).send({ Phase: `DEVELOPEMENT PHASE`, error: err })
            }
        default:
            return res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, message: `Tampering with URL is not allowed.` })
    }
})

// @route: POST /user/validate-login
// @desc: Validate login request of user by accepting OTP only
router.post('/user/validate-login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    try {
        const secret = user.secretKey

        const isValid = await user.verifyOTP(secret, req.body.otp)

        if (isValid) {
            const token = await user.generateAuthToken()
            res.send({ Phase: `DEVELOPEMENT PHASE`, message: `OTP verified and logged in successfully`, token })
        } else {
            res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: 'OTP not correct or timed out' })
        }
    } catch (err) {
        res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: `Error occured, ${err}` })
    }
})

// @route: GET /user
// @desc: Show users profile after logging in
router.get('/user', authenticate, async (req, res) => {
    res.send({ Phase: `DEVELOPEMENT PHASE`, user: req.user })
})

// @route: POST /user/logout
// @desc: Logout user from current browser
router.post('/user/logout', authenticate, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((eachTokenObjInDb) => { // filter will go through for all tokens in database of that particular user (like forEach)
            return eachTokenObjInDb.token !== req.token // Return true if token does not match with token come with header
        })
        await req.user.save() // Save all tokens except one which match with request header token
        res.send({ Phase: `DEVELOPEMENT PHASE`, message: `Successfully logged out` })
    } catch (err) {
        res.status(500).send({ Phase: `DEVELOPEMENT PHASE`, error: `Server issue, coludn't logged out, try again` })
    }
})

// @route: POST /user/logout-all
// @desc: Logout from all currently logged in devices
router.post('/user/logout-all', authenticate, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send({ Phase: `DEVELOPEMENT PHASE`, message: `Successfully logged out of all devices` })
    } catch (err) {
        res.status(500).send({ Phase: `DEVELOPEMENT PHASE`, error: `Can't perform logout operation, ${err}` })
    }
})

// @route: PATCH /user
// @desc: Update users personal data after verification
router.patch('/user', authenticate, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'age', 'password']
    const isValidUpdate = updates.every((update) => { // if every param from requested 'updates' is available in allowed list then only it'll return true
        return allowedUpdates.includes(update)
    })

    if (!isValidUpdate) {
        return res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: 'Invalid update operation detected' })
    }

    try {
        updates.forEach((update) => {
            req.user[update] = req.body[update]
        })
        await req.user.save()
        res.send({ Phase: `DEVELOPEMENT PHASE`, message: `Updated successfully!`, updated: req.user })
    } catch (err) {
        res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: `Can't update, ${err}` })
    }
})

// @route: /user
// @desc: Delete users profile
router.delete('/user', authenticate, async (req, res) => {
    try {
        await req.user.remove()
        res.send({ Phase: `DEVELOPEMENT PHASE`, message: `User Deleted :(`, deletedUser: req.user })
    } catch (err) {
        res.status(500).send({ Phase: `DEVELOPEMENT PHASE`, error: `Couldn't delete, ${err}` })
    }
})

// @route: GET /user/verify-qr
// @desc: Verify login attempt with QR image uploaded to endpoint
router.get('/user/verify-qr', upload.single('qr'), async (req, res) => {
    try {
        if (req.file.mimetype != 'image/png') { return res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: `Upload QR png file sent to email ID only` }) }

        const user = await User.findOne({ email: req.body.email })
        if (!user) { return res.status(404).send({ Phase: `DEVELOPEMENT PHASE`, error: `User not found` }) }

        const buffer = req.file.buffer
        const png = PNG.sync.read(buffer)

        const code = jsQR(Uint8ClampedArray.from(png.data), png.width, png.height)

        if (code === null) { return res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: `Please upload QR.png file only` }) }
        const qrCodeText = code.data

        const secret = user.secretKey

        const validate = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: qrCodeText,
            window: 5
        })

        if (validate) {
            const token = await user.generateAuthToken()
            res.send({ Phase: `DEVELOPEMENT PHASE`, message: `QR verified and logged in successfully`, token })
        } else {
            res.status(400).send({ Phase: `DEVELOPEMENT PHASE`, error: 'QR not correct or timed out' })
        }
    } catch (err) {
        res.status(500).send({ Phase: `DEVELOPEMENT PHASE`, error: `${err}` })
    }
})

module.exports = router