function tts(voice, text) {
	var sound = SoundCache.getSound(
		"http://192.168.1.148:8080/sound.wav?voice=" +
			encodeURIComponent(voice) +
			"&text=" +
			encodeURIComponent(text)
	);
	function play() {
		Audio.playSound(sound, {
			position: MyAvatar.position,
			volume: 0.5
		});
		Chat.sendMessage(text, false, false);
	}
	if (sound.downloaded) {
		play();
	} else {
		sound.ready.connect(play);
	}
}

tts("Samantha", "Hi there!");
