'use strict';
const mongoose = require('mongoose')

// To connect to database only
mongoose.connect('mongodb://127.0.0.1:27017/2fa-project-database', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(`========== Connected to database! ==========`)
}).catch((error) => {
    console.log(`Can't connect to database due to ${error}`)
}) 