'use strict';
const v8 = require('v8')

const nodemailer = require('nodemailer');

const mailTransporter = nodemailer.createTransport({
    // service: "gmail",
    host: 'smtp.office365.com',
    // port: 465,
    // ssl: true,
    auth: {
        user: 'aalok.temp@outlook.com',
        pass: 'hFuy&*t82hfy'
    }
})

const regularEmail2 = new Promise((resolve, reject) => { // start of promise function
    (function () {    // funtion that accepts 3 arguments from caller of function
        mailTransporter.sendMail({          // function to send email
            from: "aalok.temp@outlook.com", // YOU CAN IGNORE NEXT 4 LINES
            to: userEmail,
            subject: emailSubject,
            html: htmlText
        }, (err) => {                       // callback to throw error (if any error generated)
            if (err) {                      // if error generated, send promise reject
                reject(`Couldn't send email: ${err}`)
            } else {                        // if no error, send promise resolve
                resolve(`OTP sent to ${userEmail} succesfully!`)
            } // end of line 24
        })  //  } is end of code from 21st line,    ) is end of code from 16th line
    })  // } is end of code from 15th line,     ) is end of code from 15th line
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

// (err) => {
//     if (err) {
//         return console.log(`Couldn't send mail: ${err}`)
//     } else {
//         console.log(`OTP sent to ${userEmail} succesfully`)
//     }
// })

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