const express = require('express')
const qr = require('qrcode')
const path = require('path')
// const hbs = require('hbs')
require('./db/mongoose')
const PORT = process.env.AUTH_PROJECT_PORT
const app = express()
// const staticDirectory = path.join(__dirname, '../public')
// const viewsPath = path.join(__dirname, '../templates/views')
app.use(express.json())

// app.use(express.static(staticDirectory))
const userRouter = require('./routers/user.router')

// app.set('view engine', 'hbs') // Telling express that from now on "View Engine" will be hbs!
// app.set('views', viewsPath) // Telling express that directory you're looking as "views" is in viewsPath location

app.use(userRouter)

app.use((req, res, next) => {           // if none of the path matches with path requested by client, send an 404 not found error
    res.status(404).send({ error: `Please check URL or request type again!` })
})

// const app = express()
// app.use(express.json())
// app.get('/', (req, res) => {
//     qr.toDataURL('Aalok', { type: 'terminal' }, (err, url) => {
//         res.send()
//     })
// })

// const QRpath = `./qr/testQR.png`

// app.post('/qr', (req, res) => {
//     try {
//         qr.toFile(QRpath, req.body.qrContent, {
//             color: {
//                 dark: '#FFF',  // Blue dots
//                 light: '#0000' // Transparent background
//             }
//         })
//         res.status(201).send('Done')
//     } catch (err) {
//         res.status(500).send(err)
//     }
// })

// const port = 3004
app.listen(PORT, () => {
    console.log(`E-authentication system server running on port ${PORT}`)
})