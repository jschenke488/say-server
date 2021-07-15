const bodyParser = require("body-parser");
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const child_process = require("child_process");
const { stdout, stderr } = require("process");
const { fstat } = require("fs");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const run = command => {
	return new Promise((resolve, reject) => {
		child_process.exec(command, (error, stdout, stderr) => {
			// if (error) return reject(error);
			if (stderr) return reject(stderr);
			return resolve(stdout);
		});
	});
};

app.get("/", (req, res) => {
	res.sendFile(path.resolve(__dirname, "index.html"));
});

app.get("/voices", async (req, res) => {
	try {
		const voices = await run("say -v\\?");
		const sortedVoices = voices
			.trim()
			.split("\n")
			.map(line => ({
				line,
				lang: line.match(/(\w+-?\w+)\s+#\s+/)[1]
			}))
			.sort((a, b) => {
				if (a.lang < b.lang) return -1;
				if (a.lang > b.lang) return 1;
				return 0;
			})
			.map(lang => lang.line)
			.join("\n");
		return res.contentType("text/plain").send(sortedVoices);
	} catch (error) {
		return res.send(error);
	}
});

const escape = str => str.replace(/\"/g, '\\"');

app.get("/sound.wav", async (req, res) => {
	const voice = (req.query.voice || "").trim();
	if (voice == "") return res.send("Voice missing");
	const text = (req.query.text || "").trim();
	if (text == "") return res.send("Text missing");

	const filePath = "/tmp/" + crypto.randomBytes(4).readUInt32LE(0) + ".wav";

	try {
		await run(
			[
				"say",
				`-o "${escape(filePath)}"`,
				"--data-format=LEI16@44100",
				`-v "${escape(voice)}"`,
				`"${escape(text)}"`
			].join(" ")
		);

		const wavFile = fs.readFileSync(filePath);
		res.contentType("audio/wav").send(wavFile);
		fs.unlinkSync(filePath);
	} catch (error) {
		return res.send(error);
	}
});

app.get("*", (req, res) => {
	res.redirect("/");
});

app.listen(8080, () => {
	console.log("http://127.0.0.1:8080");
});
