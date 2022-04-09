const express = require('express')
const ejs = require('ejs')
require('./db/mongoose')

const PORT = process.env.AUTH_PROJECT_PORT
const app = express()
app.use(express.json())
express.urlencoded({ extended: false })

// app.use(express.static(staticDirectory))
const userRouter = require('./routers/user.router')

app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('signin')
})

app.use(userRouter)

app.use((req, res, next) => {           // if none of the path matches with path requested by client, send an 404 not found error
    res.status(404).send({ error: `Please check URL or request type again!` })
})

app.listen(PORT, () => {
    console.log(`E-authentication system server running on port ${PORT}`)
})