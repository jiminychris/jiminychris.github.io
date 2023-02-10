LINE_BREAK = "LINE_BREAK"
HORIZONTAL_RULE = "HORIZONTAL_RULE"
SONG_TITLE = "SONG_TITLE"
WRYLIE = "WRYLIE"
LYRICS = "LYRICS"
PROSE = "PROSE"
NAMES = "NAMES"
ACT_START = "ACT_START"
SCENE_START = "SCENE_START"
ALL = "ALL";
NONE = "NONE";

ASCII_A = 'a'.charCodeAt(0);
ASCII_Z = 'z'.charCodeAt(0);

function onload(script) {
    const characters = new Map();
    const aliases = new Map();
    characters.set(ALL, {scenes: new Set(), sort: 0, cues: new Map()});
    characters.set(NONE, {scenes: new Set(), sort: 9999, cues: new Map()});

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
                    const chunk = {type: LYRICS, parts: line.slice(1).split("|").map(p => p.trim())};
                    scene.chunks.push(chunk);
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
                                characters.set(speaker, {scenes: new Set(), sort: 0, cues: new Map()});
                            }
                            const character = characters.get(speaker);
                            character.scenes.add(sceneIndex);
                        }
                    }
                } break;
                }
            }
        }
    }

    {
        let sceneStart, names, previousNames, previousLine;
        for (let sceneIndex = 0; sceneIndex < scenes.length; ++sceneIndex) {
            const scene = scenes[sceneIndex];
            for (const chunk of scene.chunks) {
                switch (chunk.type) {
                case SCENE_START: {
                    sceneStart = chunk;
                    previousNames = previousLine = names = undefined;
                } break;
                    
                case LYRICS: {
                    previousNames = names;
                    previousLine = chunk;
                } break;
                    
                case NAMES: {
                    names = chunk;
                } break;
                    
                case PROSE: {
                    for (const name of names.names) {
                        const speaker = resolveAlias(name);
                        const character = characters.get(speaker);
                        if (!character.cues.has(sceneIndex)) character.cues.set(sceneIndex, []);
                        const cues = character.cues.get(sceneIndex);
                        character.scenes.add(sceneIndex);
                        if (previousLine === undefined) {
                            cues.push(sceneStart);
                            cues.push({type: LINE_BREAK});
                            cues.push(names);
                            cues.push(chunk);
                        } else if (previousLine.type === PROSE && previousNames.names.map(resolveAlias).includes(speaker)) {
                            cues.push({type: LINE_BREAK});
                            cues.push(chunk);
                        } else {
                            character.sort += 1;
                            if (cues.length > 0) {
                                cues.push({type: HORIZONTAL_RULE});
                            }
                            cues.push(previousNames);
                            cues.push(previousLine);
                            cues.push({type: LINE_BREAK});
                            cues.push(names);
                            cues.push(chunk);
                        }
                    }
                    previousNames = names;
                    previousLine = chunk;
                } break;
                }
            }
        }
    }

    characterSelect = document.getElementById("character-select");
    sceneSelect = document.getElementById("scene-select");
    actionButton = document.getElementById("action");
    scriptDiv = document.getElementById("script");
    cuesDiv = document.getElementById("cues");
    attract = document.getElementById("attract");
    play = document.getElementById("play");
    sceneHeading = document.getElementById("scene-heading");
    textarea = document.getElementById("textarea");
    deliverButton = document.getElementById("deliver");
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
    characterSelect.size = characters.size;

    for (let sceneIndex = 0; sceneIndex < scenes.length; ++sceneIndex) {
        const option = document.createElement("option");
        const scene = scenes[sceneIndex];
        option.value = sceneIndex;
        option.innerHTML = `ACT ${scene.act}, SCENE ${scene.scene}`;
        sceneSelect.appendChild(option);
    }
    sceneSelect.size = scenes.length;

    function populateCues() {
        cuesDiv.innerHTML = "";
        const character = characters.get(characterSelect.value);
        if (character.cues.has(parseInt(sceneSelect.value))) {
            const cues = character.cues.get(parseInt(sceneSelect.value));
            for (let cueIndex = 0; cueIndex < cues.length; ++cueIndex) {
                const chunk = cues[cueIndex];
                renderChunk(cuesDiv, chunk);
            }
        }
        cuesDiv.scrollTop = 0;
    }

    characterSelect.onchange = event => {
        populateCues();
        for (let sceneIndex = 0; sceneIndex < scenes.length; ++sceneIndex) {
            sceneSelect.children[sceneIndex].classList.remove("has-line");
            if (characters.get(characterSelect.value).scenes.has(sceneIndex)) {
                sceneSelect.children[sceneIndex].classList.add("has-line");
            }
        }
    }
    characterSelect.onchange();

    sceneSelect.onchange = event => {
        populateCues();
    }

    let sceneIndex, chunkIndex, scene, speakers, proseFeedback;

    function quit() {
        play.hidden = true;
        attract.hidden = false;
    }

    textarea.onkeydown = function(event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            deliverButton.click();
        }
    };

    function toLowerCaseASCII(s) {
        return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    }

    function normalize(s) {
        return toLowerCaseASCII(s)
            .replace(/<\/?[ui]>/g, "")
            .replace(/[^\w]|_/g, "")
            .trim();
    }

    function deliver() {
        const scene = scenes[sceneIndex];
        if (chunkIndex < scene.chunks.length) {
            const line = scene.chunks[chunkIndex].text;
            const target = normalize(line);
            const actual = normalize(textarea.value);
            let element;
            if (proseFeedback !== undefined) {
                element = proseFeedback;
            } else {
                element = document.createElement("p");
                element.classList.add("prose");
                scriptDiv.appendChild(element);
            }
            if (actual === target) {
                element.innerHTML = line;
                textarea.value = "";
                proseFeedback = undefined
                advance();
            } else {
                const text = toLowerCaseASCII(textarea.value);
                const targetMatches = [];
                let targetIndex = 0;
                for (let textIndex = 0; textIndex < text.length; ++textIndex) {
                    const code = text.charCodeAt(textIndex);
                    if (ASCII_A <= code && code <= ASCII_Z) {
                        targetMatches.push(text.charAt(textIndex) === target.charAt(targetIndex++));
                    } else {
                        targetMatches.push(true);
                    }
                }
                let buffer = "";
                for (let textIndex = 0; textIndex < text.length; ++textIndex) {
                    const ch = textarea.value.charAt(textIndex)
                    if (targetMatches[textIndex]) {
                        buffer += ch;
                    } else {
                        buffer += `<span class="incorrect">${ch}</span>`;
                    }
                }
                if(actual.length < target.length) {
                    buffer += '<span class="incorrect">...</span>';
                }
                element.innerHTML = buffer;
                proseFeedback = element;
            }
            scriptDiv.scrollTop = scriptDiv.scrollHeight;
        }
    }

    function advance() {
        chunkIndex++;
        displayChunk();
    }

    function renderChunk(div, chunk) {
        if (chunk.type === SONG_TITLE) {
            const element = document.createElement("p");
            element.classList.add("song-title");
            element.innerHTML = chunk.text;
            div.appendChild(element);
        } else if (chunk.type === ACT_START) {
            const element = document.createElement("p");
            element.classList.add("act-heading");
            element.innerHTML = `ACT ${chunk.number}`;
            div.appendChild(element);
        } else if (chunk.type === SCENE_START) {
            const element = document.createElement("p");
            element.classList.add("scene-heading");
            element.innerHTML = `SCENE ${chunk.number}`;
            div.appendChild(element);
        } else if (chunk.type === WRYLIE) {
            const element = document.createElement("p");
            element.classList.add("wrylie");
            element.innerHTML = chunk.text;
            div.appendChild(element);
        } else if (chunk.type === LINE_BREAK) {
            const element = document.createElement("p");
            element.classList.add("line-break");
            div.appendChild(element);
        } else if (chunk.type === HORIZONTAL_RULE) {
            div.appendChild(document.createElement("hr"));
        } else if (chunk.type === LYRICS) {
            const element = document.createElement("div");
            element.classList.add("column-group");
            for (part of chunk.parts) {
                const el = document.createElement("p");
                el.classList.add("lyric");
                el.innerHTML = part;
                element.appendChild(el);
            }
            div.appendChild(element);
        } else if (chunk.type === NAMES) {
            const element = document.createElement("div");
            element.classList.add("column-group");
            for (name of chunk.names) {
                const el = document.createElement("p");
                el.classList.add("character-name");
                el.innerHTML = name;
                element.appendChild(el);
            }
            div.appendChild(element);
        } else if (chunk.type === PROSE) {
            const element = document.createElement("p");
            element.classList.add("prose");
            element.innerHTML = chunk.text;
            div.appendChild(element);
        }
    }

    function displayChunk() {
        const scene = scenes[sceneIndex];
        if (chunkIndex < scene.chunks.length) {
            const chunk = scene.chunks[chunkIndex];
            if (chunk.type === PROSE && (characterSelect.value === ALL || speakers.includes(characterSelect.value))) {
                deliverButton.disabled = skipButton.disabled = false;
            } else {
                if (chunk.type === NAMES) {
                    speakers = chunk.names.map(resolveAlias);
                }
                renderChunk(scriptDiv, chunk);
                scriptDiv.scrollTop = scriptDiv.scrollHeight;
                advance();
            }
        } else {
            deliverButton.disabled = skipButton.disabled = true;
            textarea.readOnly = true;
        }
    }

    function goToNextScene() {
        const idx = sceneIndex + 1;
        if (idx < scenes.length) {
            sceneSelect.value = idx.toString();
            action();
        }
    }

    function findMyNextScene() {
        const sceneIndices = [...characters.get(characterSelect.value).scenes].sort((a, b) => a-b);
        for (idx of sceneIndices) {
            if (sceneIndex < idx) {
                return idx;
            }
        }
        return -1;
    }

    function goToMyNextScene() {
        const idx = findMyNextScene();
        if (idx >= 0) {
            sceneSelect.value = idx.toString();
            action();
        }
    }

    function initialize(sceneIdx) {
        if (0 <= sceneIdx && sceneIdx < scenes.length) {
            sceneIndex = sceneIdx;

            scriptDiv.innerHTML = "";
            chunkIndex = 0;
            play.hidden = false;
            attract.hidden = true;
            textarea.value = "";
            textarea.readOnly = false;
            sceneHeading.innerHTML = sceneSelect.children[sceneIndex].innerHTML;
            nextSceneButton.disabled = scenes.length <= (sceneIndex + 1);
            myNextSceneButton.disabled = findMyNextScene() < 0;
            displayChunk();
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
            deliver();
        }
    }

    actionButton.onclick = action;
    deliverButton.onclick = deliver;
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
