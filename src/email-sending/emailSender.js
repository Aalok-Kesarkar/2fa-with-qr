'use strict';
const nodemailer = require('nodemailer');

const mailTransporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    secureConnection: false,
    port: 587,
    auth: {
        user: process.env.OUTLOOK_MAIL_ID,
        pass: process.env.OUTLOOK_MAIL_PASS
    }
})

const regularEmail = (userEmail, emailSubject, htmlText) => {
    return new Promise((resolve, reject) => {
        mailTransporter.sendMail({
            from: "E-Auth System <aalok.temp@outlook.com>",
            to: userEmail,
            subject: emailSubject,
            html: htmlText

        }, err => err ? reject(`Couldn't send email: ${err}`) : resolve(`OTP sent to ${userEmail} succesfully!`))
    })
}

const verifyLoginByQR = (userEmail, userName, imgBin) => {
    return new Promise((resolve, reject) => {
        mailTransporter.sendMail({
            from: "E-Auth System <aalok.temp@outlook.com>",
            to: userEmail,
            subject: "QR for logging in ot app",
            attachDataUrls: true,
            html: `<h2>Dear ${userName},</h2><br>One Time QR for logging in to app. Please copy and paste into browser to get authenticated.<br><img src=${imgBin}><br>Valid for 3 minutes only`,
            attachments: [{
                filename: 'QR.png',
                path: imgBin
            }]
        }, err => err ? reject(`Couldn't send email due to: ${err}`) : resolve(`QR code sent to ${userEmail} succesfully`))
    })
}

module.exports = {
    regularEmail,
    verifyLoginByQR
}