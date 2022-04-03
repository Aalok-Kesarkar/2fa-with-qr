const express = require('express')
const qr = require('qrcode')
require('./db/mongoose')

const app = express()

app.use(express.json())

const userRouter = require('./routers/user.router')

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

const port = 3004
app.listen(port, () => {
    console.log(`Server started on port ${port}`)
})