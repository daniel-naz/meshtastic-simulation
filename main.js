import analysis from "./analysis.js";
import { NetWork } from "./network.js";
import node, { RadioNode } from "./node.js";
import { Terrain } from "./terrain.js";
import utils from "./utils.js";
import { fromUrl, fromArrayBuffer } from 'geotiff';


// IMPORTANT GLOBAL

let realWorldMap = false
let realWorldElevation = undefined
let currentMousePos = {x: 0, y: 0}

const width = 1000
const height = 1000
const canvas = document.getElementById("simulationCanvas");
canvas.width = width
canvas.height = height
const ctx = canvas.getContext("2d");

const noiseValues = Array.from({ length: width }).map((v, y) => {
    return Array.from({ length: width }).map((v, x) => { 
        return 1
    })
})

const terrain = new Terrain(noiseValues, 1000)
const network = new NetWork(terrain) // set after side menu

const modes = {
    PlacingNodes: "1",
    SendPocket: "2",
    FindStrong: "3",
    AddingWalls: "4"
}
let currentMode = modes.PlacingNodes

const walls = []

let lines = undefined
let packetDest = undefined

//#region Side menu
const seedInput = document.getElementById('seedInput')

const hopsSlider = document.getElementById('hopsRange')
const sfSlider = document.getElementById('sfRange')
const crSlider = document.getElementById('crSlider')
const bwSlider = document.getElementById('bwSlider')
const freqSlider = document.getElementById('freqSlider')
const packetSlider = document.getElementById('packetCount')
const lossSlider = document.getElementById('lossRange')
const txSlider = document.getElementById('txRange')

const crvalues = [0.5, 0.8]
const bwvalues = [125, 250, 500]
const freqvalues = [433, 868, 915]

let hops = Number(hopsSlider.value)
let sf = Number(sfSlider.value)
let cr = crvalues[Number(crSlider.value)]
let bw = bwvalues[Number(bwSlider.value)]
let freq = freqvalues[Number(freqSlider.value)]
let packets = Number(packetSlider.value)
let loss = Number(lossSlider.value)
let txdbm = Number(txSlider.value)

network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)

hopsSlider.addEventListener('input', () => {
    hops = Number(hopsSlider.value)
    network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)
    renderNoiseFast(ctx, terrain.heighmap, width, height)
})

sfSlider.addEventListener('input', () => {
    sf = Number(sfSlider.value)
    network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)
    renderNoiseFast(ctx, terrain.heighmap, width, height)
})

crSlider.addEventListener('input', () => {
    cr = crvalues[Number(crSlider.value)]
    network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)
    renderNoiseFast(ctx, terrain.heighmap, width, height)
})

bwSlider.addEventListener('input', () => {
    bw = bwvalues[Number(bwSlider.value)]
    network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)
    renderNoiseFast(ctx, terrain.heighmap, width, height)
})

freqSlider.addEventListener('input', () => {
    freq = freqvalues[Number(freqSlider.value)]
    network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)
    renderNoiseFast(ctx, terrain.heighmap, width, height)
})

packetSlider.addEventListener('input', () => {
    packets = (Number(packetSlider.value) / 10).toFixed() * 10
    if (packets == 0) packets++

    network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)
    renderNoiseFast(ctx, terrain.heighmap, width, height)
})

lossSlider.addEventListener('input', () => {
    loss = Number(lossSlider.value)
    network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)
    renderNoiseFast(ctx, terrain.heighmap, width, height)
})

txSlider.addEventListener('input', () => {
    txdbm = Number(txSlider.value)
    network.setNetworkStats(hops, sf, cr, bw, freq, loss, txdbm)
    renderNoiseFast(ctx, terrain.heighmap, width, height)
})

seedInput.addEventListener('input', () => {
    network.setSeed(Number(seedInput.value))
})

//#endregion

//#region Top menu

function encodeLink() {
    const seed = Number(seedInput.value)

    const bytearr = new Uint8Array(6)
    bytearr[0] = hops + (sf << 4)
    bytearr[1] = crSlider.value + (bwSlider.value << 1) + (freq << 3)
    bytearr[2] = packets
    bytearr[3] = seed & 0xff
    bytearr[4] = (seed >> 8) & 0xff
    bytearr[5] = (seed >> 16) & 0xff

    const binaryString = String.fromCharCode(...bytearr);
    return btoa(binaryString)
}

function decodeLink(link) {
    const binaryString = atob(link);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function loadDataFromURL() {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');

    if (data) {
        try {
            const bytearr = decodeLink(data);

            const hopsValue = bytearr[0] & 0x0F;
            const sfValue = bytearr[0] >> 4;

            const crValue = bytearr[1] & 0x01;
            const bwValue = (bytearr[1] >> 1) & 0x03;
            const freqValue = bytearr[1] >> 3;

            const packetsValue = bytearr[2]

            const seed = bytearr[3] + (bytearr[4] << 8) + (bytearr[5] << 16)

            seedInput.value = seed
            hopsSlider.value = hopsValue
            sfSlider.value = sfValue
            crSlider.value = crValue;
            bwSlider.value = bwValue;
            freqSlider.value = freqValue
            packetSlider.value = packetsValue

            function triggerInput(slider) {
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }

            triggerInput(hopsSlider)
            triggerInput(sfSlider)
            triggerInput(crSlider)
            triggerInput(bwSlider)
            triggerInput(freqSlider)
            triggerInput(packetSlider)

            hops = Number(hopsSlider.value)
            sf = Number(sfSlider.value)
            cr = crvalues[Number(crSlider.value)]
            bw = bwvalues[Number(bwSlider.value)]
            freq = freqvalues[Number(freqSlider.value)]
            packets = Number(packetSlider.value)
        } catch (e) {
            console.error('Failed to decode data from URL:', e);
        }
    }
}

window.addEventListener('DOMContentLoaded', loadDataFromURL);

document.getElementById("copyLinkBtn").addEventListener('click', (e) => {
    const link = encodeLink()
    const baseURL = window.location.origin + window.location.pathname;
    alert(`Link created : ${baseURL}?data=${link}`);
})

document.getElementById("trackPacketBtn").addEventListener('click', (e) => {
    const idstr = prompt(`Enter packet id from 1 to ${packets} : `)

    if (idstr) {
        const id = Number(idstr)

        if (!id || id < 1 || id > packets) {
            alert("Invalid input, try again.")
            return
        }

        lines = network.lines.get(id) 
        packetDest = network.dest.get(id)
        renderNoiseFast(ctx, terrain.heighmap, width, height)
    }
})

document.getElementById("findStrongBtn").addEventListener('click', (e) => {
    setCurrentMode(modes.FindStrong)
})

document.getElementById("startSimBtn").addEventListener('click', (e) => {
    if (network.nodes.length < 2) {
        alert('Not enough nodes.')
        return
    }

    const random = utils.random.createSeeded(network.seed)
    network.reload()

    for (let i = 0; i < packets; i++) {
        let sindex = random.nextInt(0, network.nodes.length)
        let rindex = random.nextInt(0, network.nodes.length)

        if (sindex == rindex) {
            i--
            continue
        }

        const sender = network.nodes[sindex]
        const receiver = network.nodes[rindex]

        sender.send(receiver, "hellooo")
    }

    alert(`Received ${network.packetsArrived} out of ${packets} packets.\n${network.packetsLost} packets were out of ${network.packetsSend} lost.`)
})

document.getElementById("addWallBtn").addEventListener('click', () => {
    setCurrentMode(modes.AddingWalls)
})

//#endregion

function setCurrentMode(newMode) {

    if (newMode == modes.PlacingNodes) {
        currentModeText.innerText = "Click to place a node"
    }
    else if (newMode == modes.SendPocket) {
        currentModeText.innerText = "Click to select a sender and receiver"
    }
    else if (newMode == modes.FindStrong) {
        currentModeText.innerText = "Hover to see strongly connected nodes"
    }
    else if (newMode == modes.AddingWalls) {
        currentModeText.innerText = "Click and drag to draw a wall"
    }

    currentMode = newMode
}

const currentModeText = document.getElementById('currentModeText')

let isDrawingWall = false;
let wallStart = undefined
let wallEnd = undefined

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

canvas.addEventListener('click', (e) => {
    if (e.button == '2') {
        setCurrentMode(modes.PlacingNodes)
        return
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentMode == modes.PlacingNodes) {
        network.addStation(x, y)
    }
    else if (currentMode == modes.SendPocket) {
        let clickedNode = false
        for (const n of network.nodes) {
            if (utils.math.isPointInCircle(x, y, n.x, n.y, n.radius)) {
                if (!src) {
                    src = n
                    clickedNode = true
                    break
                }
                else {
                    dst = n
                    src.send(dst)
                    setCurrentMode(modes.PlacingNodes)
                    clickedNode = true
                    break
                }
            }
        }

        if (!clickedNode) {
            setCurrentMode(modes.PlacingNodes)
        }
    }

    else if (currentMode == modes.FindStrong) {
        let clickedNode = false
        for (const n of network.nodes) {
            if (utils.math.isPointInCircle(x, y, n.x, n.y, n.radius)) {
                clickedNode = true
            }
        }
        if (!clickedNode) {
            setCurrentMode(modes.PlacingNodes)
        }
    }

    renderNoiseFast(ctx, noiseValues, width, height)
})

canvas.addEventListener('mousedown', (e) => {
    if (e.button == '2') {
        setCurrentMode(modes.PlacingNodes)
        return
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentMode == modes.AddingWalls) {
        if (!isDrawingWall) {
            isDrawingWall = true
            wallStart = {x, y}
            wallEnd = {x, y}
        }
    }
})

function drawThickLineOnArray(arr, x0, y0, x1, y1, thickness = 2, value = 4) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    const radius = Math.floor(thickness / 2);

    function setPixel(x, y) {
        
        for (let oy = -radius; oy <= radius; oy++) {
            for (let ox = -radius; ox <= radius; ox++) {
                const nx = x + ox;
                const ny = y + oy;
                if (arr[ny] && arr[ny][nx] !== undefined) {
                    arr[ny][nx] = value;
                }
            }
        }
    }

    while (true) {
        setPixel(x0, y0);
        if (x0 === x1 && y0 === y1) break;

        const e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y0 += sy;
        }
    }
}


canvas.addEventListener('mouseup', (e) => {
    if (e.button == '2') {
        return
    }

    if (currentMode == modes.AddingWalls) {
        if (isDrawingWall) {
            isDrawingWall = false

            walls.push([wallStart, wallEnd])
            drawThickLineOnArray(terrain.heighmap, wallStart.x, wallStart.y, wallEnd.x, wallEnd.y)
            
            network.reload()

            wallStart = undefined;
            wallEnd = undefined
        }
    }
})

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentMousePos = {x, y}


    renderNoiseFast(ctx, noiseValues, width, height)

    if (currentMode == modes.FindStrong) {
        for (const node of network.nodes) {
            if (utils.math.isPointInCircle(x, y, node.x, node.y, node.radius)) {
                const strong = analysis.findStrongConnections(node, network.nodes, network.hops)

                for (const n of strong) {
                    // Draw center
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                    ctx.fillStyle = 'green';
                    ctx.fill();
                    ctx.strokeStyle = 'black';
                    ctx.stroke();
                }
            }
        }
    }
    else if (currentMode == modes.AddingWalls) {
        if (isDrawingWall) {
            wallEnd = {x, y}
        }
    }
})


function resizeCanvas() {
    renderNoiseFast(ctx, noiseValues, width, height)
}

function renderNoiseFast(ctx, noiseValues, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const {x, y} = currentMousePos

    if (!realWorldMap) {
        let i = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const value = terrain.heighmap[y][x];
                const [r, g, b] = getColorRGB(value); // returns [r, g, b] values 0–255

                data[i++] = r;
                data[i++] = g;
                data[i++] = b;
                data[i++] = 255; // alpha
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
    else {
        drawHeightmapToCanvas(realWorldElevation)
    }

    for (const wall of walls) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;

        ctx.beginPath()
        ctx.moveTo(wall[0].x, wall[0].y);
        ctx.lineTo(wall[1].x, wall[1].y);
        ctx.stroke()
    }
    ctx.lineWidth = 1;
    
    network.draw(ctx)

    for (const node of network.nodes) {
        if (utils.math.isPointInCircle(x, y, node.x, node.y, node.radius)) {
            // Draw center
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'green';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
        }
        else {
            // Draw center
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
        }
    }

    if(lines) {
        for (const line of lines) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;

            ctx.beginPath()
            ctx.moveTo(line[0], line[1]);
            ctx.lineTo(line[2], line[3]);
            ctx.stroke()
        }

        ctx.beginPath();
        ctx.arc(lines[0], lines[1], 6, 0, Math.PI * 2);
        ctx.fillStyle = 'green';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(packetDest.x, packetDest.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
    }
}


window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial resize

function getColorRGB(v) {
    v = Math.max(0, Math.min(1, v));

    if (v < 0.2) {
        return [0, 51, 102];      // Deep water
    } else if (v < 0.25) {
        return [194, 178, 128];   // Beach/sand
    } else if (v < 0.6) {
        return [0, 128, 17];      // Grass
    } else if (v < 0.7) {
        return [51, 51, 51];      // Rock
    } else if (v < 0.8) {
        return [85, 85, 85];      // Rock
    } else {
        return [255, 255, 255];   // Snow
    }
}

let src = undefined;
let dst = undefined;

//#region Worley            
const generateEmptyBtn = document.getElementById('generateEmptyBtn')
const generateLocationBtn = document.getElementById('generateLocationBtn')

function genereteEmpty() {
    lines = undefined
    canvas.width = width
    canvas.height = height
    realWorldMap = false
    node.setMetersPerPixel(100)
    walls.length = 0

    const seedInput = document.getElementById('seedInput')
    seedInput.value = 0

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            noiseValues[y][x] = 1
        }
    }

    network.setSeed(0)
    network.clear()
    terrain.setHeightmap(noiseValues)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
}

generateEmptyBtn.addEventListener('click', genereteEmpty)

generateLocationBtn.addEventListener("click", () => {
    lines = undefined   
    canvas.width = width
    canvas.height = height
    realWorldMap = false
    node.setMetersPerPixel(100)
    walls.length = 0

    const seedInput = document.getElementById('seedInput')
    const seed = Number(seedInput.value)

    if (seed == 0) {
        genereteEmpty();
        return
    }

    const noise = utils.noise.createWorley(seed, 32, 3)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const value = noise.noise(x / width, y / width, 0.4) ** 1.5 * 5
            if (value > 0.25 && value < 0.6) noiseValues[y][x] = 0.25 + value / 100
            else if (value < 0.2) noiseValues[y][x] = 0.199
            else noiseValues[y][x] = value
        }
    }

    network.setSeed(seed)
    network.clear()
    terrain.setHeightmap(noiseValues)
    renderNoiseFast(ctx, noiseValues, width, height)
})
//#endregion

//#region Coords
const pickLocationBtn = document.getElementById("pickLocationBtn")
const mapModal = document.getElementById("mapModal");
const closeBtn = document.getElementById("closeMapBtn");
const confirmBtn = document.getElementById("confirmLocationBtn");

const startSelectBtn = document.getElementById("startSelectBtn");

const bboxSouth = document.getElementById("bboxSouth");
const bboxWest = document.getElementById("bboxWest");
const bboxNorth = document.getElementById("bboxNorth");
const bboxEast = document.getElementById("bboxEast");

let leafletMap, rectangle, startCorner;
let selectActive = false;  // track if selection is enabled

pickLocationBtn.addEventListener("click", openMapModal);

confirmBtn.addEventListener("click", confirmLocation);
closeBtn.addEventListener("click", closeMapModal);

async function fetchAndDrawHeightmap(south, north, west, east, apiKey) {
    const dataset = "SRTMGL1";
    const format = "GTiff";
    const url = `https://portal.opentopography.org/API/globaldem?` +
        `demtype=${dataset}&south=${south}&north=${north}&west=${west}&east=${east}` +
        `&outputFormat=${format}&API_Key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();

        const tiff = await fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const width = image.getWidth();
        const height = image.getHeight();
        const raster = await image.readRasters({ interleave: true });

        // Convert flat array to 2D grid
        const elevationGrid = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push(raster[y * width + x]);
            }
            elevationGrid.push(row);
        }

        return elevationGrid
    } catch (err) {
        console.error("Error fetching or rendering heightmap:", err);
    }
}

function downsampleElevationGrid(grid, targetWidth, targetHeight) {
    const srcHeight = grid.length;
    const srcWidth = grid[0].length;

    const scaleY = srcHeight / targetHeight;
    const scaleX = srcWidth / targetWidth;

    const result = [];

    for (let ty = 0; ty < targetHeight; ty++) {
        const row = [];
        for (let tx = 0; tx < targetWidth; tx++) {
            let sum = 0;
            let count = 0;

            const startY = Math.floor(ty * scaleY);
            const endY = Math.min(Math.floor((ty + 1) * scaleY), srcHeight);
            const startX = Math.floor(tx * scaleX);
            const endX = Math.min(Math.floor((tx + 1) * scaleX), srcWidth);

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    sum += grid[y][x];
                    count++;
                }
            }

            row.push(count > 0 ? sum / count : 0);
        }
        result.push(row);
    }

    return result;
}

function openMapModal() {
    mapModal.classList.remove("hidden");

    if (!leafletMap) {
        leafletMap = L.map("map").setView([20, 0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(leafletMap);

        leafletMap.on("click", function (e) {
            if (!selectActive) return;  // ignore clicks unless selection started

            const { lat, lng } = e.latlng;

            if (!startCorner) {
                startCorner = [lat, lng];
                if (rectangle) {
                    leafletMap.removeLayer(rectangle);
                    rectangle = null;
                }
            } else {
                const endCorner = [lat, lng];

                const south = Math.min(startCorner[0], endCorner[0]);
                const north = Math.max(startCorner[0], endCorner[0]);
                const west = Math.min(startCorner[1], endCorner[1]);
                const east = Math.max(startCorner[1], endCorner[1]);

                const bounds = [[south, west], [north, east]];
                rectangle = L.rectangle(bounds, { color: "#3388ff", weight: 2 }).addTo(leafletMap);

                bboxSouth.textContent = south.toFixed(5);
                bboxWest.textContent = west.toFixed(5);
                bboxNorth.textContent = north.toFixed(5);
                bboxEast.textContent = east.toFixed(5);

                startCorner = null;
                selectActive = false;    // automatically disable selection after one bounding box
                startSelectBtn.textContent = "Select";  // reset button text
            }
        });
    }

    setTimeout(() => leafletMap.invalidateSize(), 100);
}

function confirmLocation() {
    const south = Number(bboxSouth.textContent);
    const west = Number(bboxWest.textContent);
    const north = Number(bboxNorth.textContent);
    const east = Number(bboxEast.textContent);
    console.log("Selected bounding box:", { south, west, north, east });

    async function getElevationAndDraw() {
        const elevationGrid = await fetchAndDrawHeightmap(south, north, west, east, "6dea6806c9f50f7cf5325276b4f25ee1");

        if (elevationGrid) {
            const srcHeight = elevationGrid.length;
            const srcWidth = elevationGrid[0].length;

            let targetWidth, targetHeight;

            if (srcWidth >= srcHeight) {
                targetWidth = 1000;
                targetHeight = Math.round((srcHeight / srcWidth) * 1000);
            } else {
                targetHeight = 1000;
                targetWidth = Math.round((srcWidth / srcHeight) * 1000);
            }

            const scaleMul = srcWidth / targetWidth

            node.setMetersPerPixel(scaleMul * 16)  

            const scaled = downsampleElevationGrid(elevationGrid, targetWidth, targetHeight);
            drawHeightmapToCanvas(scaled);
            
            lines = undefined
            walls.length = 0
            realWorldMap = true;
            realWorldElevation = scaled
            calculateRealworldTerrain(realWorldElevation)
            network.clear()
        }
        else {
            alert('Error reading height data.');
        }
    }
    getElevationAndDraw();
    closeMapModal();
    alert("This may take some time... please don't click anything")
}

function calculateRealworldTerrain(elevationGrid) {
    
    let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY

    function getHeight(elev) {
        if (elev <= 800) return 600
        if (elev <= 1200) return 1200
        if (elev <= 3200) return 3200
        return 4000
    }

    const height = elevationGrid.length
    const width = elevationGrid[0].length

    const map = Array.from({ length: height }).map(() => {
        return Array.from({ length: width })
    })
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const v = elevationGrid[y][x]
            if (v > max) max = v
            if (v < min) min = v
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            map[y][x] = (getHeight(elevationGrid[y][x]) - min / (max - min))
        }
    }

    terrain.heighmap = map
    terrain.maxheight = max - min
}

async function closeMapModal() {
    mapModal.classList.add("hidden");
}

startSelectBtn.addEventListener("click", () => {
    selectActive = !selectActive;
    if (selectActive) {
        startSelectBtn.textContent = "Selecting...";
        // Clear previous selection if any
        startCorner = null;
        if (rectangle) {
            leafletMap.removeLayer(rectangle);
            rectangle = null;
        }
        bboxSouth.textContent = "--";
        bboxWest.textContent = "--";
        bboxNorth.textContent = "--";
        bboxEast.textContent = "--";
    }
    else {
        startSelectBtn.textContent = "Select";
    }
});

function drawHeightmapToCanvas(elevationGrid) {
    const canvas = document.getElementById("simulationCanvas");
    if (!canvas) {
        console.error("Canvas with id 'simulationCanvas' not found");
        return;
    }

    const ctx = canvas.getContext("2d");

    const height = elevationGrid.length;
    const width = elevationGrid[0].length;

    // Resize canvas to match heightmap size (or scale it as needed)
    canvas.width = width;
    canvas.height = height;

    // Create ImageData object
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    function getColorRGB(elev) {
        if (elev <= -3000) return [0, 0, 15];
        if (elev <= -2000) return [0, 0, 20];
        if (elev <= -1000) return [0, 0, 25];
        if (elev <= -500) return [0, 10, 30];
        if (elev <= -200) return [0, 20, 40];
        if (elev <= -100) return [0, 25, 50];
        if (elev <= -50) return [0, 30, 60];
        if (elev <= -10) return [10, 60, 80];
        if (elev <= 0) return [20, 70, 90];
        if (elev <= 2) return [150, 150, 110];
        if (elev <= 5) return [160, 160, 120];
        if (elev <= 10) return [170, 155, 120];
        if (elev <= 20) return [180, 160, 120];
        if (elev <= 40) return [130, 150, 100];
        if (elev <= 80) return [120, 140, 90];
        if (elev <= 120) return [110, 130, 80];
        if (elev <= 160) return [100, 120, 70];
        if (elev <= 200) return [90, 110, 65];
        if (elev <= 300) return [85, 105, 60];
        if (elev <= 400) return [80, 100, 55];
        if (elev <= 500) return [70, 95, 50];
        if (elev <= 600) return [65, 90, 45];
        if (elev <= 700) return [60, 85, 40];
        if (elev <= 800) return [55, 80, 40];
        if (elev <= 1000) return [70, 75, 50];
        if (elev <= 1200) return [80, 80, 60];
        if (elev <= 1400) return [85, 85, 70];
        if (elev <= 1600) return [95, 95, 80];
        if (elev <= 1800) return [105, 105, 90];
        if (elev <= 2000) return [115, 115, 100];
        if (elev <= 2200) return [130, 130, 115];
        if (elev <= 2500) return [150, 150, 130];
        if (elev <= 2800) return [180, 180, 160];
        if (elev <= 3200) return [210, 210, 200];
        if (elev <= 3800) return [230, 230, 230];
        return [245, 245, 245];
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Normalize elevation to 0-255 grayscale
            const [r, g, b] = getColorRGB(elevationGrid[y][x])

            data[idx] = r;     // Red
            data[idx + 1] = g; // Green
            data[idx + 2] = b; // Blue
            data[idx + 3] = 255;  // Alpha (opaque)
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

//#endregion