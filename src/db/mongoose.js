'use strict';
const mongoose = require('mongoose')

// To connect to database only
mongoose.connect(process.env.AUTH_PROJECT_MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(`========== Connected to database! ==========`)
}).catch((error) => {
    console.log(`Can't connect to database due to ${error}`)
}) 