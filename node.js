import { NetWork } from "./network.js";
import { Terrain } from "./terrain.js";

const SPEED_OF_LIGHT = 3e8;
const FREQUENCY_MHZ = 915;
const FREQUENCY_HZ = FREQUENCY_MHZ * 1e6;
const WAVELENGTH = SPEED_OF_LIGHT / FREQUENCY_HZ;
let PIXEL_TO_M = 100;
const MAX_PATH_LOSS_DB = 120; // Tune this for your simulation

const AIR_DMB_LOSS = 0.05; // per km

function setMetersPerPixel(meters) {
    PIXEL_TO_M = meters
}

/**
 * @param {number} meters 
 */
export default {
    setMetersPerPixel
}

function fspl(distancePixels) {
    const dKm = (distancePixels * PIXEL_TO_M) / 1000;
    return 20 * Math.log10(dKm) + 20 * Math.log10(FREQUENCY_MHZ) + 32.44;
}

function knifeEdgeLoss(hMeters, d1Pixels, d2Pixels) {
    const d1 = d1Pixels * PIXEL_TO_M;
    const d2 = d2Pixels * PIXEL_TO_M;
    if (hMeters <= 0) return 0;

    const v = (hMeters * Math.sqrt(2)) / Math.sqrt((WAVELENGTH * d1 * d2) / (d1 + d2));
    if (v < -0.78) return 0;

    return 6.9 + 20 * Math.log10(Math.sqrt((v - 0.1) ** 2 + 1) + v - 0.1);
}

/**
 * @param {number} txDbm 
 * @param {NetWork} network 
 * @returns 
 */
function maxRangeKm(txDbm, network) {
    const PL_d0 = 32.44 + 20 * Math.log10(network.freq); // FSPL at 1 m

    const linkBudget = txDbm - 2 - network.sensitivity;
    const A_env = 20

    const exponent = (linkBudget - PL_d0 - A_env) / 20;
    const d = Math.pow(10, exponent);

    return d;
}

export class RadioNode {
    /**
     * @param {NetWork} network 
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    constructor(network, x, y, z) {
        // Communication data
        this.network = network
        this.seenMessages = new Set()

        // Position data
        this.x = x
        this.y = y
        this.z = z
        this.radius = 6

        // SIMULATION ONLY VARIABLES
        this.directionalRanges = []; // store distance per angle
        this.reachanleStations = []; // TOOD : INIT AT START OF SIMULATION  
    }

    /**
     * @param {number} maxRange 
     * @param {number} step 
     */
    computeDirectionalRanges(step = 2) {
        const maxRange = maxRangeKm(this.network.txDbm, this.network)

        const directions = 360;
        this.directionalRanges = [];

        for (let angle = 0; angle < 360; angle++) {
            const rad = angle * Math.PI / 180;
            let maxReach = 0;

            for (let d = step; d <= maxRange; d += step) {
                const dx = this.x + Math.cos(rad) * d;
                const dy = this.y + Math.sin(rad) * d;

                const t = d / maxRange;
                const losHeight = this.z + 5 // slightly above ground

                const terrainHeight = this.network.terrain.getHeight(dx, dy)
                const obstruction = terrainHeight - losHeight;

                let totalLoss = fspl(d) + d * PIXEL_TO_M * AIR_DMB_LOSS / 1000; // base FSPL

                if (obstruction > 0) {
                    const d1 = d * t;
                    const d2 = d * (1 - t);
                    const diffraction = knifeEdgeLoss(obstruction, d1, d2);
                    totalLoss += diffraction;
                }

                // Use a reasonable cutoff like 120 dB max loss
                if (totalLoss > -this.network.sensitivity) break;

                maxReach = d;
            }

            this.directionalRanges.push(maxReach);
        }
    }

    /**
     * @param {RadioNode} receiver  
     */
    send(receiver, payload) {
        const msg = {
            id: this.network.generatePacketId(),
            hops: this.network.hops,
            payload
        }
        
        this.seenMessages.add(msg.id)
        this.network.send(this, receiver, msg);
    }

    receiveToSend(receiver, msg) {        
        if (this.seenMessages.has(msg.id)) return
        this.seenMessages.add(msg.id)

        const newmsg = {...msg, hops: msg.hops-1}
        this.network.send(this, receiver, newmsg)
    }

    receive(msg) {
        if (this.seenMessages.has(msg.id)) return
        
        this.seenMessages.add(msg.id)

        this.network.packetsArrived++
    }

    canTransmit(node) {
        // Calculate dx, dy in pixels
        const dx = node.x - this.x;
        const dy = node.y - this.y;

        // Calculate distance in pixels
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate angle from nodeA to nodeB in degrees (0 to 359)
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle < 0) angle += 360;

        // Round to nearest integer index since directionalRanges has 360 entries
        const angleIndex = Math.round(angle) % 360;

        // Check if distance is within max reachable range in that direction
        return dist <= this.directionalRanges[angleIndex];
    }

    draw(ctx) {
        if (this.directionalRanges.length === 0) {
            this.calculateTransferDistance(); // fallback circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, 100, 0, Math.PI * 2);
            ctx.fillStyle = 'grey';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
        } else {
            // Draw actual reach polygon
            ctx.beginPath();
            this.directionalRanges.forEach((r, i) => {
                const angle = i * Math.PI / 180;
                const x = this.x + Math.cos(angle) * r;
                const y = this.y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
        }

        // Draw center
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.stroke();
    }

}