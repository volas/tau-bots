/*
	Discord bridge
	todo: add sec key if you want to use it in opennet
*/

"use strict";

const Discord = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');

const config = require('./config.json');

const client = new Discord.Client();
const app = express();

const discordToken = process.env.DISCORD_TOKEN;

let mainGuildID;

app.use(express.json());

console.log(config);

app.get('/', async (req, res) => {
	let json = req.body;
	let embed;
	console.log(json);

	if(!json.type || !(json.message || json.attachment_msg || json.attachment_title) || !mainGuildID) {
		return res.send({"success": 0});
	}

	try {

		json.type.forEach(type => {
			if(!config["channels-map"][type]) {
				throw "not mapped"; //just ignore request then
			}
		});

	} catch(error) {

		if(error=="not mapped") {
			return res.send({"success": 2, "error": "Type not mapped: " + json.type});
		}

		console.log(error);
		return res.send({"success": 0});

	}

	if(json.attachment_color) {
		json.attachment_color = json.attachment_color.replace("#", "0x"); //why discord so strange
	}

	embed = new Discord.RichEmbed();

	if(json.attachment_msg) {
		embed.setDescription(json.attachment_msg);
	}

	if(json.attachment_title) {
		embed.setTitle(json.attachment_title);
	}

	if(json.attachment_color) {
		embed.setColor(json.attachment_color);
	}

	if(json.attachment_footer) {
		embed.setFooter(json.attachment_footer);
	}

	let message = "", mention;

	if(json.mention && config["roles-map"][json.mention]) {

		mention = config["roles-map"][json.mention];

		if(mention === "here" || mention === "everyone" ) { 
			mention = "@" + mention;

		} else { //if not common slaps, try to find a group
			mention = await mainGuildID.roles.find(role => role.name === config["roles-map"][json.mention]);

			if(!mention) { //maybe it is a user slap?
				mention = await mainGuildID.user.find(role => role.members === config["roles-map"][json.mention]);
			}
		}
	}

	if(mention) {
		message = mention + " ";
	}

	if(json.message) {
		message += json.message;
	}

	try {

		json.type.forEach(async type => {
			config["channels-map"][type].forEach(async channel => {
				let targetChannel = await mainGuildID.channels.get(channel);
				if(message.length)
					await targetChannel.send(message, embed);
				else
					await targetChannel.send(embed);
			});

		});

	} catch(error) {
		console.log(error);
		return res.send({"success": 0});
	}

	return res.send({"success": 1});
});
 
client.login(discordToken);
app.listen(3000);

client.on('ready', async () => {
	mainGuildID = await client.guilds.get(config["server-id"]);
});
