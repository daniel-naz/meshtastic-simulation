import analysis from "./analysis.js"
import { RadioNode } from "./node.js"
import utils from "./utils.js"

export class NetWork {
    /**
     * @param {Terrain} terrain 
     */
    constructor(terrain, hops = 3, sf = 7, cr = 0.8, bw = 500, freq = 915, lossChance = 0.05, txDbm = 20) {
        this.hops = hops
        this.sf = sf
        this.cr = cr
        this.bw = bw
        this.freq = freq
        this.lossChance = lossChance
        this.txDbm = txDbm

        this.ranges = {
            500: {
                7: {
                    0.8: -117
                }
            },
            250: {
                7: {
                    0.8: -121
                },
                8: {
                    0.8: -124
                },
                9: {
                    0.8: -127
                },
                10: {
                    0.8: -130
                }
            },
            125: {
                11: {
                    0.8: -133,
                    0.5: -136
                },
                12: {
                    0.5: -137
                }
            }
        }
        this.sensitivity = -121

        if (
            this.ranges.hasOwnProperty(this.bw) &&
            this.ranges[this.bw].hasOwnProperty(this.sf) &&
            this.ranges[this.bw][this.sf].hasOwnProperty(this.cr)
        ) {
            this.sensitivity = this.ranges[this.bw][this.sf][this.cr];
        }
        else {
            console.log('Invalid network properties - defaulting to (bw, sf, cr) = (500, sf7, 0.8).')
        }

        this.terrain = terrain
        /**
         * @type {RadioNode[]}
         */
        this.nodes = []
        this.lines = new Map()
        this.dest = new Map()
        this.currentPacket = 1;

        this.seed = 0
        this.random = utils.random.createSeeded(this.seed)

        // statistic 
        this.packetsLost = 0
        this.packetsSend = 0
        this.packetsArrived = 0
    }

    clear() {
        this.nodes.length = 0
        this.lines.length = 0
        this.currentPacket = 1

        this.packetsLost = 0
        this.packetsSend = 0
        this.packetsArrived = 0
        this.random = utils.random.createSeeded(this.seed)
    }

    reload() {
        this.currentPacket = 1

        for (const node of this.nodes) {
            node.computeDirectionalRanges()
        }

        this.packetsLost = 0
        this.packetsSend = 0
        this.packetsArrived = 0
        this.random = utils.random.createSeeded(this.seed)

        for (const node of this.nodes) {
            node.seenMessages.clear()
        }

        this.lines.clear()
    }

    setSeed(seed) {
        this.seed = seed
        this.random = utils.random.createSeeded(this.seed)
    }

    setNetworkStats(hops, sf, cr, bw, freq, lossChance, txDbm) {
        this.hops = hops
        this.sf = sf
        this.cr = cr
        this.bw = bw
        this.freq = freq
        this.lossChance = lossChance
        this.txDbm = txDbm

        document.getElementById('errorLabel').innerHTML = ''
        if (
            this.ranges.hasOwnProperty(this.bw) &&
            this.ranges[this.bw].hasOwnProperty(this.sf) &&
            this.ranges[this.bw][this.sf].hasOwnProperty(this.cr)
        ) {
            this.sensitivity = this.ranges[this.bw][this.sf][this.cr];
        }
        else {
            console.log('devnote : Move error label to main.');
            document.getElementById('errorLabel').innerHTML = 'Invalid (Sf, Cr, Bw) paremeters'
        }

        this.reload()
    }

    addStation(x, y) {
        const z = this.terrain.getHeight(x, y)
        const node = new RadioNode(this, x, y, z)
        this.nodes.push(node)
        node.computeDirectionalRanges();
    }

    generatePacketId() {
        return this.currentPacket++
    }

    /**
     * @param {RadioNode} sender 
     * @param {RadioNode} receiver 
     */
    async send(sender, receiver, msg) {
        if (!this.dest.has(msg.id)) {
            this.dest.set(msg.id, receiver)
        }

        const neighbors = analysis.findStrongConnections(sender, this.nodes, 1);
        const entries = [...neighbors.values()].map((v) => {
            const dx = sender.x - v.x;
            const dy = sender.y - v.y;
            return {
                node: v,
                dist: Math.sqrt(dx * dx + dy * dy)
            }
        }).sort((a, b) => a.dist - b.dist)

        const seen = new Set()
        seen.add(sender)

        while (entries.length > 0) {
            const rnd = this.random.next() 
            this.packetsSend++

            // Packet loss simulation 
            if (rnd <= this.lossChance) {
                entries.shift()
                this.packetsLost++
                continue
            }
            //

            const { node, dist } = entries[0]
    

            // "Draw" line 
            if(this.lines.has(msg.id)) {
                let arr = this.lines.get(msg.id)
                arr.push([sender.x, sender.y, node.x, node.y])
            }
            else {
                let arr = [sender.x, sender.y, node.x, node.y]
                this.lines.set(msg.id, arr)
            }

            if (node == receiver) {
                node.receive(msg)
            }
            else if (msg.hops >= 1) {
                node.receiveToSend(receiver, msg)
            }

            entries.shift()
        }
    }

    draw(ctx) {
        for (const node of this.nodes) {
            node.draw(ctx)
        }

        for (const line of this.lines) {
            ctx.beginPath();
            ctx.moveTo(line[0], line[1]);
            ctx.lineTo(line[2], line[3]);
            ctx.stroke();
        }
    }
}