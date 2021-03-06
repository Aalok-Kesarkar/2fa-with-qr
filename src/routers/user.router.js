const express = require('express')
const speakeasy = require('speakeasy')
const { User } = require('../models/user.model')
const authenticate = require('../middleware/authenticate')
const emailSender = require('../email-sending/emailSender')
const QRCode = require('qrcode')
const jsQR = require('jsqr')
const { PNG } = require('pngjs')
// const multer = require('multer')
const router = new express.Router()

// @route: GET /
// @desc: Render 'home' page
router.get('/', (req, res) => {
    res.render('index')
})

// @route: POST /user/signin
// @desc: Signin a new user with new login details
router.post('/user/signin', async (req, res) => {

    try {
        let user = new User(req.body)

        const { userWithOTPSecret, OTP } = await user.generateOTPSecretKey()
        user = userWithOTPSecret
        await user.save()

        const emailSubject = `OTP for email verification`
        const htmlText = `<h3>Dear ${user.name},</h3><br>
        Greetings from Snap Buy Online Shopping!<br>
        OTP for verifying email is: <h2>${OTP}</h2><br>One Time Password is valid for 3 minutes only`

        await emailSender.regularEmail(user.email, emailSubject, htmlText)

        res.send({ Phase: `DEPLOYMENT PHASE`, status: 'ok', message: `Check inbox of ${user.email} for email verification OTP!` })
    } catch (err) {
        err.code === 11000 ? res.status(400).json({ Phase: `DEPLOYMENT PHASE`, status: 'error', errorType: `duplicate`, message: `Can't use this email address or mobile number` }) : res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: ` ${err}` })
    }
})

// @route: POST /user/verify-email
// @desc: Verify email ID set by new user by verifying OTP sent to email
router.post('/user/verify-email', async (req, res) => {
    // verify that OTP is matching, if yes then generate JWT token and send to user by res.send(
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user) { return res.status(404).json({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `User not found` }) }

        if (!user.isEmailVerified) {        // if email aready verified, send status:'error', message as email is already verified, in short don't send verification OTP again
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

                const emailSubject = `Email is verified successfully`
                const htmlText = `<h3>Dear ${user.name},</h3><br>Your email address is verified successfully!</h2>`
                emailSender.regularEmail(user.email, emailSubject, htmlText)

                await user.save()
                res.status(201).json({ Phase: `DEPLOYMENT PHASE`, status: 'ok', message: `Email verified successfully`, token })
            } else {
                res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `OTP doesn't match` })
            }
        } else {
            res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Email has already been verified` })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: err })
    }
})

// @route: POST /user/recrete-veri-otp
// @desc: Recreate OTP to verify email if past OTP is expired
router.post('/user/recreate-veri-otp', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user) { return res.status(404).json({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `User not found` }) }

        if (!user.isEmailVerified) {    // if email aready verified, send status:'error', message as email is already verified, in short don't send verification OTP again
            const otp = await user.regenerateEmailVerificationOTP()

            const emailSubject = `OTP for email verification`
            const htmlText = `<h3>Dear ${user.name},</h3><br>As per your request for new OTP...<br>OTP for verifying email is: <h2>${otp}</h2><br>One Time Password is valid for 3 minutes only.`
            emailSender.regularEmail(user.email, emailSubject, htmlText)

            res.send({ Phase: `DEPLOYMENT PHASE`, status: 'ok', message: `Email with OTP sent to ${user.email} successfuly!` })

            // res.redirect('/verify-email')
        } else {
            res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Email has already been verified, no need to verify again!` })
        }
    } catch (err) {
        res.status(500).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: err })
    }
})

// @route: POST /user/login?verifMethod= <qr/otp>
// @desc: Login existing user and specify verification method, send OTP or QR as selected by user
router.post('/user/login', async (req, res) => {

    if (!req.query.verifMethod)
        return res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Tampering with URL is not allowed.` })

    const user = await User.findByCredentials(req.body.email, req.body.password)

    if (!user)
        return res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Unable to login` })

    if (user.isEmailVerified == false)
        return res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Verify email address before logging in` })

    switch (req.query.verifMethod) {
        case `otp`:
            try {
                const otp = await user.generateOTP()

                const emailSubject = `OTP for login`
                const htmlText = `<h3>Dear ${user.name},</h3><br>OTP for logging in is: <h2>${otp}</h2><br>One Time Password is valid for 3 minutes only`
                await emailSender.regularEmail(user.email, emailSubject, htmlText)
                return res.send({ Phase: `DEPLOYMENT PHASE`, status: 'ok', message: `OTP sent to ${user.email} successfuly` })
            } catch (err) {
                return res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Something went wrong: ${err}` })
            }
        case `qr`:
            try {
                const user = await User.findByCredentials(req.body.email, req.body.password)
                const otp = await user.generateOTP()
                const imageBin = await QRCode.toDataURL(otp)

                const emailMsg = await emailSender.verifyLoginByQR(user.email, user.name, imageBin)

                return res.send({ Phase: `DEPLOYMENT PHASE`, status: 'ok', message: emailMsg })
            } catch (err) {
                return res.status(500).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: err })
            }
        default:
            return res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Tampering with URL is not allowed.` })
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
            res.send({ Phase: `DEPLOYMENT PHASE`, status: 'ok', message: `OTP verified and logged in successfully`, token })
        } else {
            res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `OTP not correct or timed out` })
        }
    } catch (err) {
        res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Error occured, ${err}` })
    }
})

// @route: GET /user
// @desc: Show users profile after logging in
router.get('/user', authenticate, async (req, res) => {
    res.send({ Phase: `DEPLOYMENT PHASE`, status: 'ok', userName: req.user.name, userEmail: req.user.email, userContact: req.user.contact, userAddress: req.user.address, userAge: req.user.age, userCreated: req.user.createdAt })
})

// @route: POST /user/logout
// @desc: Logout user from current browser
router.post('/user/logout', authenticate, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((eachTokenObjInDb) => { // filter will go through for all tokens in database of that particular user (like forEach)
            return eachTokenObjInDb.token !== req.token // Return true if token does not match with token come with header
        })
        await req.user.save() // Save all tokens except one which match with request header token
        res.send({ Phase: `DEPLOYMENT PHASE`, status: 'ok', message: `Successfully logged out` })
    } catch (err) {
        res.status(500).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Server issue, coludn't logged out, try again` })
    }
})

// @route: DELETE /user
// @desc: Delete users profile
router.delete('/user', authenticate, async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        if (!user)
            return res.send({ Phase: `DEVLOPEMENT PHASE`, status: 'error', message: `Wrong password...` })
        await req.user.remove()
        res.send({ Phase: `DEVLOPEMENT PHASE`, status: 'ok', message: `Your acccount having email ID ${req.user.email} is deleted.` })
    } catch (err) {
        res.status(500).send({ Phase: `DEVLOPEMENT PHASE`, status: 'error', message: `Couldn't delete, ${err}` })
    }
})

// @route: POST /user/verify-qr
// @desc: Verify login attempt with QR image uploaded to endpoint
router.post('/user/verify-qr', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user) { return res.status(404).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `User not found` }) }

        const removeDataPart = req.body.qr.replace('data:', '')
        const getMimeType = removeDataPart.split(';')
        if (getMimeType[0] != 'image/png') { return res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Upload QR png file sent to email ID only` }) }

        const base64StringOfQR = getMimeType[1].replace('base64,', '')

        const buffer = Buffer.from(base64StringOfQR, 'base64url')
        const png = PNG.sync.read(buffer)

        const code = jsQR(Uint8ClampedArray.from(png.data), png.width, png.height)

        if (code === null) { return res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `Please upload QR.png file only` }) }
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
            res.send({ Phase: `DEPLOYMENT PHASE`, status: 'ok', message: `QR verified and logged in successfully`, token })
        } else {
            res.status(400).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: 'QR not correct or timed out' })
        }
    } catch (err) {
        res.status(500).send({ Phase: `DEPLOYMENT PHASE`, status: 'error', message: `${err}` })
    }
})

// @route: GET /team
// @desc: Render 'team member' page
router.get('/team', (req, res) => {
    res.render('team')
})

// @route: GET /cart
// @desc: Render 'cart' page
router.get('/cart', (req, res) => {
    res.render('cart')
})

// @route: GET /cart
// @desc: Render 'cart' page
router.get('/products', (req, res) => {
    res.render('products')
})

// @route: GET /login
// @desc: Render 'login' page
router.get('/login', (req, res) => {
    res.render('login')
})

// @route: GET /signup
// @desc: Render 'signup' page
router.get('/signup', (req, res) => {
    res.render('signup')
})

// @route: GET /cart
// @desc: Render 'cart' page
router.get('/profile', (req, res) => {
    res.render('user-profile')
})

module.exports = router