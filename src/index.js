const express = require('express')
const qr = require('qrcode')
const path = require('path')
require('./db/mongoose')

const PORT = process.env.AUTH_PROJECT_PORT
const app = express()
// const viewsPath = path.join(__dirname, '../templates/views')

app.use(express.json())
express.urlencoded({ extended: false })

app.use(express.static(path.join(__dirname, '../static')))

const userRouter = require('./routers/user.router')

// app.set('view engine', 'hbs')
// app.set('views', viewsPath)

app.use(userRouter)

app.use((req, res, next) => {
    res.status(404).send({ error: `Please check URL or request type again!` })
})

app.listen(PORT, () => {
    console.log(`E-authentication system server running on port ${PORT}`)
})