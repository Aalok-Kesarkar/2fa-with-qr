'use strict';
const v8 = require('v8')

const nodemailer = require('nodemailer');

const mailTransporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    auth: {
        user: 'aalok.temp@outlook.com',
        pass: 'hFuy&*t82hfy'
    }
})

const regularEmail = (userEmail, emailSubject, htmlText) => {
    return new Promise((resolve, reject) => {
        mailTransporter.sendMail({
            from: "aalok.temp@outlook.com",
            to: userEmail,
            subject: emailSubject,
            html: htmlText
        }, err => {
            if (err) {
                reject(`Couldn't send email: ${err}`)
            } else {
                resolve(`OTP sent to ${userEmail} succesfully!`)
            }
        })
    })
}

const verifyLoginByQR = (userEmail, userName, imageBuffer) => {
    qrImage = v8.deserialize(imageBuffer)
    mailTransporter.sendMail({
        from: "aalok.temp@outlook.com",
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