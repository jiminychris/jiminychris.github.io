LINE_BREAK = "LINE_BREAK"
SONG_TITLE = "SONG_TITLE"
WRYLIE = "WRYLIE"
LYRICS = "LYRICS"
PROSE = "PROSE"
NAMES = "NAMES"
ALL = "ALL";
NONE = "NONE";

function isEmptyOrSpaces(str){
    return str === null || str.match(/^ *$/) !== null;
}

function onload(script) {
    const characters = new Map();
    characters.set(ALL, {scenes: new Set()});
    characters.set(NONE, {scenes: new Set()});
    
    const scenes = [];
    {
        let act, character, sceneIndex;
        let scene = {chunks:[]}
        for (line of script.split("\n")) {
            if (isEmptyOrSpaces(line)) {
                scene.chunks.push({type: LINE_BREAK});
            } else if (line.startsWith("          ")) {
                scene.chunks.push({type: WRYLIE, text: line.trim()});
            } else if (line.startsWith("     ")) {
                scene.chunks.push({type: LYRICS, parts: line.split("|").map(p => p.trim())});
            } else {
                switch (line[0]) {
                    case '@': {
                        act = line.split(" ")[1];
                    } break;
    
                    case '$': {
                        scene = {
                            act,
                            scene: line.split(" ")[1],
                            chunks: []
                        };
                        sceneIndex = scenes.length;
                        characters.get(ALL).scenes.add(sceneIndex);
                        characters.get(NONE).scenes.add(sceneIndex);
                        scenes.push(scene);
                    } break;
    
                    case '#': {
                        scene.chunks.push({type: SONG_TITLE, text: line});
                    } break;
    
                    case '/': {
                        const names = line.slice(1).split("/").map(n => n.replace("(CONT'D)", "").trim());
                        character = names[0];
                        scene.chunks.push({type: NAMES, names});
                    } break;

                    default: {
                        if(!characters.has(character)) {
                            characters.set(character, {scenes: new Set()});
                        }
                        characters.get(character).scenes.add(sceneIndex);
                        scene.chunks.push({type: PROSE, text: line});
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
    restart = document.getElementById("restart");
    buttonQuit = document.getElementById("quit");
    skipButton = document.getElementById("skip");

    for (const character of characters.keys()) {
        const option = document.createElement("option");
        option.value = option.innerHTML = character;
        characterSelect.appendChild(option);
    }

    characterSelect.onchange = event => {
        sceneSelect.value = "";
        while (sceneSelect.childElementCount > 1) sceneSelect.removeChild(sceneSelect.lastChild);
        for (const sceneIndex of characters.get(event.target.value).scenes) {
            const option = document.createElement("option");
            const scene = scenes[sceneIndex];
            option.value = sceneIndex;
            option.innerHTML = `ACT ${scene.act}, SCENE ${scene.scene}`;
            sceneSelect.appendChild(option);
        }
        sceneSelect.hidden = false;
    }
    sceneSelect.onchange = event => {
        actionButton.hidden = false;
    }

    let chunkIndex, scene, speaker;

    function quit() {
        play.hidden = true;
        attract.hidden = false;
    }

    textarea.onkeydown = function(event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            submitButton.click();
        }
    };

    function normalize(s) {
        return s.toLowerCase().replace(/[^\w\s\']|_/g, "").replace(/\s+/g, " ");
    }

    function submit() {
        const scene = scenes[sceneSelect.value]
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
        const scene = scenes[sceneSelect.value];
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
                speaker = chunk.names[0];

                chunkIndex++;
                advance();
            } else if (chunk.type === PROSE) {
                if (characterSelect.value === ALL || speaker === characterSelect.value) {
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

    function action() {
        chunkIndex = 0;
        play.hidden = false;
        attract.hidden = true;

        if (sceneSelect.value === "0" || scenes[sceneSelect.value - 1].act !== scenes[sceneSelect.value].act) {
            const element = document.createElement("p");
            element.classList.add("act-heading");
            element.innerHTML = `ACT ${scenes[sceneSelect.value].act}`;
            scriptDiv.appendChild(element);
        }
        const element = document.createElement("p");
        element.classList.add("scene-heading");
        element.innerHTML = `SCENE ${scenes[sceneSelect.value].scene}`;
        scriptDiv.appendChild(element);
        scriptDiv.scrollTop = scriptDiv.scrollHeight;

        advance();
    }

    function skip() {
        const scene = scenes[sceneSelect.value];
        if (chunkIndex < scene.chunks.length) {
            const chunk = scene.chunks[chunkIndex];
            textarea.value = chunk.text;
            submit();
        }
    }

    actionButton.onclick = action;
    submitButton.onclick = submit;
    buttonQuit.onclick = quit;
    skipButton.onclick = skip;
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
