'use strict';
const v8 = require('v8')

const nodemailer = require('nodemailer')

const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: 'aalok.public@gmail.com',
        pass: 'bEhz^#*8@G'
    }
})

const regularEmail = (userEmail, emailSubject, htmlText) => {
    mailTransporter.sendMail({
        from: "aalok.public@gmail.com",
        to: userEmail,
        subject: emailSubject,
        html: htmlText
    }, (err) => {
        if (err) {
            return console.log(`Couldn't send mail: ${err}`)
        } else {
            console.log(`OTP sent to ${userEmail} succesfully`)
        }
    })
}

const verifyLoginByQR = (userEmail, userName, imageBuffer) => {
    qrImage = v8.deserialize(imageBuffer)
    mailTransporter.sendMail({
        from: "aalok.public@gmail.com",
        to: userEmail,
        subject: "QR for logging in",
        html: `QR for logging in to app is ${qrImage}`
    }, (err) => {
        if (err) {
            return console.log(`Couldn't send mail: ${err}`)
        } else {
            console.log(`OTP sent to ${userEmail} succesfully`)
        }
    })
}

module.exports = {
    regularEmail,
    verifyLoginByQR
}