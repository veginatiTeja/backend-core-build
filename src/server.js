require("dotenv").config(); // tells the node load enviornment varibales from .env file
require("./cron/reconcilation.cron");
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})