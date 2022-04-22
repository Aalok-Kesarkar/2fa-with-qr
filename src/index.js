const express = require('express')
const path = require('path')
require('./db/mongoose')

const PORT = process.env.AUTH_PROJECT_PORT || 3000
const app = express()

app.use(express.json())
express.urlencoded({ extended: false })

app.use('/', express.static(path.join(__dirname, '/static')))
const userRouter = require('./routers/user.router')

app.use(userRouter)

app.use((req, res, next) => {
    res.status(404).send({ error: `Please check URL or request type again!` })
})

app.listen(PORT, () => {
    console.log(`E-authentication system server running on port ${PORT}`)
})