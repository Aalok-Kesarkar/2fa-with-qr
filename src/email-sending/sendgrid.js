// 'use strict';
// const sgMail = require('@sendgrid/mail');

// sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// const otpMail = (userEmail, userName, otp) => {
//     sgMail.send({
//         to: userEmail,
//         from: `aalok.public@gmail.com`,
//         subject: `OTP to login!`,
//         html: `<h3>Hey ${userName}!</h3> <p>Thank you for choosing our Task Manager application 😃️</p><b>
//         OTP for email verification is ${otp}`
//     })
// }

// module.exports = {
//     otpMail
// }