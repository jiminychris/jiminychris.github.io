LINE_BREAK = "LINE_BREAK"
SONG_TITLE = "SONG_TITLE"
WRYLIE = "WRYLIE"
LYRICS = "LYRICS"
PROSE = "PROSE"
NAMES = "NAMES"
ACT_START = "ACT_START"
SCENE_START = "SCENE_START"
ALL = "ALL";
NONE = "NONE";

function onload(script) {
    const characters = new Map();
    const aliases = new Map();
    characters.set(ALL, {scenes: new Set(), sort: 0});
    characters.set(NONE, {scenes: new Set(), sort: 9999});

    function resolveAlias(name) {
	const trimmed = name.replace("(CONT'D)", "").trim();
	if (aliases.has(trimmed)) {
	    return aliases.get(trimmed);
	}
	aliases.set(trimmed, trimmed);
	return trimmed;
    }

    const scenes = [];
    {
        let act, speakers, sceneIndex;
        let scene = {chunks:[]}
        for (rawLine of script.split("\n")) {
	    const line = rawLine.trim();
            if (line.length === 0) {
                scene.chunks.push({type: LINE_BREAK});
            } else {
                switch (line[0]) {
                    case '@': {
			scene = {chunks: []};
			const chunk = {type: ACT_START, number: line.split(" ")[1]};
			act = chunk.number;
			scene.chunks.push(chunk);
                    } break;
    
                    case '$': {
		        if (scene.scene !== undefined) {
			    scene = {chunks: []};
			}
			const chunk = {type: SCENE_START, number: line.split(" ")[1]};
			scene.act = act;
			scene.scene = chunk.number;
			scene.chunks.push(chunk);
                        sceneIndex = scenes.length;
                        characters.get(ALL).scenes.add(sceneIndex);
                        characters.get(NONE).scenes.add(sceneIndex);
                        scenes.push(scene);
                    } break;
    
                    case '!': {
                        const names = line.slice(1).split("=")
			const mainName = names[0];
			for (const alias of names) {
			    aliases.set(alias, mainName);
			}
                    } break;
    
                    case '#': {
                        scene.chunks.push({type: SONG_TITLE, text: line});
                    } break;

                    case '\\': {
                        scene.chunks.push({type: WRYLIE, text: line.slice(1).trim()});
                    } break;
    
                    case '|': {
                        scene.chunks.push({type: LYRICS, parts: line.slice(1).split("|").map(p => p.trim())});
                    } break;
    
                    case '=': {
                        const names = line.slice(1).split('=').map(l => l.trim());
                        speakers = names.map(resolveAlias);
                        scene.chunks.push({type: NAMES, names});
                    } break;

                    default: {
			const lastChunk = scene.chunks[scene.chunks.length - 1];
			if (lastChunk.type === PROSE) {
                            lastChunk.text = [lastChunk.text, line].join(" ");
			} else {
                            scene.chunks.push({type: PROSE, text: line});
                            for (const speaker of speakers) {
                                if (!characters.has(speaker)) {
                                    characters.set(speaker, {scenes: new Set(), sort: 0});
                                }
                                characters.get(speaker).scenes.add(sceneIndex);
                                characters.get(speaker).sort += 1;
                            }
			}
                    } break;
                }
            }
        }
    }

    characterSelect = document.getElementById("character-select");
    sceneSelect = document.getElementById("scene-select");
    actionButton = document.getElementById("action");
    scriptDiv = document.getElementById("script");
    attract = document.getElementById("attract");
    play = document.getElementById("play");
    buttonUpload = document.getElementById("upload");
    textarea = document.getElementById("textarea");
    submitButton = document.getElementById("submit");
    buttonQuit = document.getElementById("quit");
    skipButton = document.getElementById("skip");
    nextSceneButton = document.getElementById("next-scene");
    myNextSceneButton = document.getElementById("my-next-scene");

    for (const entry of [...characters.entries()].sort((a, b) => b[1].sort - a[1].sort)) {
        const character = entry[0];
        const option = document.createElement("option");
        option.value = option.innerHTML = character;
        characterSelect.appendChild(option);
    }
    for (let sceneIndex = 0; sceneIndex < scenes.length; ++sceneIndex) {
        const option = document.createElement("option");
        const scene = scenes[sceneIndex];
        option.value = sceneIndex;
        option.innerHTML = `ACT ${scene.act}, SCENE ${scene.scene}`;
        sceneSelect.appendChild(option);
    }

    characterSelect.onchange = event => {
        actionButton.disabled = false;
        for (let sceneIndex = 0; sceneIndex < scenes.length; ++sceneIndex) {
	    sceneSelect.children[sceneIndex].classList.remove("has-line");
	    if (characters.get(characterSelect.value).scenes.has(sceneIndex)) {
                sceneSelect.children[sceneIndex].classList.add("has-line");
	    }
        }
    }
    characterSelect.onchange();

    let sceneIndex, chunkIndex, scene, speakers;

    function quit() {
        play.hidden = true;
        attract.hidden = false;
        scriptDiv.innerHTML = "";
    }

    textarea.onkeydown = function(event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            submitButton.click();
        }
    };

    function normalize(s) {
        return s.toLowerCase().normalize("NFD")
	    .replace(/[\u0300-\u036f]/g, "")
	    .replace(/<\/?[ui]>/g, "")
	    .replace(/[^\w\s]|_/g, "")
	    .replace(/\s+/g, " ");
    }

    function submit() {
        const scene = scenes[sceneIndex]
        if (chunkIndex < scene.chunks.length) {
            const line = scene.chunks[chunkIndex].text;
            if (normalize(textarea.value) === normalize(line)) {
                const element = document.createElement("p");
                element.classList.add("prose");
                element.innerHTML = line;
                scriptDiv.appendChild(element);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;
                textarea.value = "";
                chunkIndex++;
                advance();
            }
        }
    }

    function advance() {
        const scene = scenes[sceneIndex];
        if (chunkIndex < scene.chunks.length) {
            const chunk = scene.chunks[chunkIndex];
            if (chunk.type === SONG_TITLE) {
                const element = document.createElement("p");
                element.classList.add("song-title");
                element.innerHTML = chunk.text;
                scriptDiv.appendChild(element);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;

                chunkIndex++;
                advance();
            } else if (chunk.type === ACT_START) {
                const element = document.createElement("p");
                element.classList.add("act-heading");
                element.innerHTML = `ACT ${chunk.number}`;
                scriptDiv.appendChild(element);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;

                chunkIndex++;
                advance();
            } else if (chunk.type === SCENE_START) {
                const element = document.createElement("p");
                element.classList.add("scene-heading");
                element.innerHTML = `SCENE ${chunk.number}`;
                scriptDiv.appendChild(element);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;

                chunkIndex++;
                advance();
            } else if (chunk.type === WRYLIE) {
                const element = document.createElement("p");
                element.classList.add("wrylie");
                element.innerHTML = chunk.text;
                scriptDiv.appendChild(element);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;

                chunkIndex++;
                advance();
            } else if (chunk.type === LINE_BREAK) {
                const element = document.createElement("p");
                element.classList.add("line-break");
                scriptDiv.appendChild(element);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;

                chunkIndex++;
                advance();
            } else if (chunk.type === LYRICS) {
                const element = document.createElement("div");
                element.classList.add("column-group");

                for (part of chunk.parts) {
                    const el = document.createElement("p");
                    el.classList.add("lyric");
                    el.innerHTML = part;
                    element.appendChild(el);
                }
                scriptDiv.appendChild(element);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;

                chunkIndex++;
                advance();
            } else if (chunk.type === NAMES) {
                const element = document.createElement("div");
                element.classList.add("column-group");

                for (name of chunk.names) {
                    const el = document.createElement("p");
                    el.classList.add("character-name");
                    el.innerHTML = name;
                    element.appendChild(el);
                }
                scriptDiv.appendChild(element);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;
                speakers = chunk.names.map(resolveAlias);

                chunkIndex++;
                advance();
            } else if (chunk.type === PROSE) {
                if (characterSelect.value === ALL || speakers.includes(characterSelect.value)) {
                } else {
                    const element = document.createElement("p");
                    element.classList.add("prose");
                    element.innerHTML = chunk.text;
                    scriptDiv.appendChild(element);
                    scriptDiv.scrollTop = scriptDiv.scrollHeight;
                    
                    chunkIndex++;
                    advance();
                }
            }
        } else {
            textarea.readOnly = true;
        }
    }

    function initialize(sceneIdx) {
	if (sceneIdx < scenes.length) {
            sceneIndex = sceneIdx;
            chunkIndex = 0;
            play.hidden = false;
            attract.hidden = true;
            advance();
	}
    }

    function action() {
	initialize(parseInt(sceneSelect.value));
    }

    function skip() {
        const scene = scenes[sceneIndex];
        if (chunkIndex < scene.chunks.length) {
            const chunk = scene.chunks[chunkIndex];
            textarea.value = chunk.text;
            submit();
        }
    }

    function goToNextScene() {
	initialize(sceneIndex + 1);
    }

    function goToMyNextScene() {
	const sceneIndices = [...characters.get(characterSelect.value).scenes].sort((a, b) => a-b);
	for (idx of sceneIndices) {
	    if (sceneIndex < idx) {
		initialize(idx);
		return;
	    }
	}
    }

    actionButton.onclick = action;
    submitButton.onclick = submit;
    buttonQuit.onclick = quit;
    skipButton.onclick = skip;
    nextSceneButton.onclick = goToNextScene;
    myNextSceneButton.onclick = goToMyNextScene;
}


(function() {
    fetch("bright_star.txt")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.text();
        })
        .then((script) => onload(script));
})();
