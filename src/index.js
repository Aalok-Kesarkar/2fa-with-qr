const express = require('express')
const path = require('path')
const hbs = require('hbs')
require('./db/mongoose')

const PORT = process.env.PORT || 3005
const app = express()

app.use(express.json())
express.urlencoded({ extended: false })

app.set('views', path.join('./src/templates/views'))
app.set('view engine', 'hbs')
app.use('/', express.static(path.join(__dirname, '/static')))
const userRouter = require('./routers/user.router')

app.use(userRouter)

app.use((req, res, next) => {
    // res.status(404).send({ error: `Please check URL or request type again!` })
    res.render('404_not_found')
})

// app.get('*', (req, res) => {
//     res.render('404_not_found')
// })

app.listen(PORT, () => {
    console.log(`E-authentication system server running on port ${PORT}`)
})