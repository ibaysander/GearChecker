require("dotenv").config();
const { Client, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const commandHandler = require('./commands');
const express = require('express');

const app = express();
const port = 2000;

client.on('ready', () => {
    console.log(`[${new Date().toLocaleString()}]:> Logged in as: ${client.user.tag}`);
});

client.on('messageCreate', async(msg) => {
    await commandHandler.handleMessage(msg);
});

client.login(process.env.discord_bot_id);

app.get('/healthcheck', (req, res) => {
    res.sendStatus(200); // OK
});

// Start the express server
app.listen(port, () => {
    console.log(`[${new Date().toLocaleString()}]:> Server is running on port: ${port}`);
});