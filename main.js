const bodyParser = require("body-parser");
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { execFile } = require("child_process");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const run = (file, args) => {
	return new Promise((resolve, reject) => {
		execFile(file, args, (error, stdout, stderr) => {
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
		const voices = await run("/usr/bin/say", ["-v", "?"]);
		const sortedVoices = voices
			.trim()
			.split("\n")
			.map(line => ({
				line,
				lang: line.match(/(\w+-?\w+)\s+#\s+/)[1],
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
		return res.status(500).contentType("text/plain").send(error);
	}
});

app.get("/sound.wav", async (req, res) => {
	const voice = (req.query.voice || "").trim();
	if (voice == "") return res.send("Voice missing");
	const text = (req.query.text || "").trim();
	if (text == "") return res.send("Text missing");

	const filePath = path.resolve(
		os.tmpdir(),
		crypto.randomBytes(4).toString("hex") + ".wav",
	);

	try {
		await run("/usr/bin/say", [
			"--data-format=LEI16@44100",
			"-o",
			filePath,
			"-v",
			voice,
			text,
		]);

		const wavFile = fs.readFileSync(filePath);
		res.contentType("audio/wav").send(wavFile);
		fs.unlinkSync(filePath);
	} catch (error) {
		return res.status(500).contentType("text/plain").send(error);
	}
});

app.get("*", (req, res) => {
	res.redirect("/");
});

let port = Number.parseInt(process.env.PORT);
if (Number.isNaN(port)) port = 8080;

app.listen(port, () => {
	console.log("http://127.0.0.1:" + port);
});
