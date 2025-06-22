class Xorshift32 {
    constructor(seed) {
        this.state = seed >>> 0;
        if (this.state === 0) this.state = 1;
    }

    next() {
        let x = this.state;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.state = x >>> 0;
        return this.state / 0x100000000;
    }

    nextFloat(min = 0, max = 0xffffffff) {
        return min + this.next() * (max - min)
    }

    nextInt(min = 0, max = 0xffffffff) {
        return Math.floor(this.nextFloat(min, max))
    }
}

class WorleyNoise {
    constructor(seed, pointCount, octaves = 1) {
        const rnd = random.createSeeded(seed)

        this.octaves = octaves

        this.points = Array.from({ length: octaves }).map((v, i) => {
            return Array.from({ length: pointCount * (2 ** i) }).map(() => {
                return {
                    x: rnd.nextFloat(0, 2 ** i),
                    y: rnd.nextFloat(0, 2 ** i),
                }
            })
        })
    }

    octaveNoise(x, y, octave, persistance) {
        let dist2 = 0xffffffff
        let dist1 = 0xffffffff
        let freq = 2 ** octave
        let closest = undefined
        const point = { x: x * freq, y: y * freq }

        for (const p of this.points[octave]) {
            if (math.distance(point, p) < dist1) {
                dist1 = math.distance(point, p)
                closest = p
            }
        }

        for (const p of this.points[octave]) {
            if (closest != p && math.distance(point, p) < dist2) {
                dist2 = math.distance(point, p)
            }
        }

        //return (0.7 * dist1 + 0.3 * dist2) * (persistance ** octave)
        return (0.7 * dist1 + 0.3 * dist2) * (persistance ** octave);
    }

    noise(x, y, persistance = 1) {
        let dist = 0

        for (let i = 0; i < this.octaves; i++) {
            dist += this.octaveNoise(x, y, i, persistance)
        }

        return dist
    }
}

class PerlinNoise {
    constructor(seed) {
        const rnd = random.createSeeded(seed)

        this.permutation = [];
        for (let i = 0; i < 256; i++) this.permutation[i] = i;
        this.permutation.sort(() => rnd.next() - 0.5);
        this.permutation = this.permutation.concat(this.permutation);
    }
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const topRight = this.permutation[this.permutation[X + 1] + Y + 1];
        const topLeft = this.permutation[this.permutation[X] + Y + 1];
        const bottomRight = this.permutation[this.permutation[X + 1] + Y];
        const bottomLeft = this.permutation[this.permutation[X] + Y];

        const u = this.fade(xf);
        const v = this.fade(yf);

        const x1 = this.lerp(u, this.grad(bottomLeft, xf, yf), this.grad(bottomRight, xf - 1, yf));
        const x2 = this.lerp(u, this.grad(topLeft, xf, yf - 1), this.grad(topRight, xf - 1, yf - 1));

        return this.lerp(v, x1, x2);
    }

    fractalNoise(x, y, octaves, persistence) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }
}

const random = {
    createSeeded: (seed) => {
        return new Xorshift32(seed)
    },
    randomInt: (min = 0, max = 0xffffffff) => {
        return min + Math.floor(Math.random() * (max - min))
    },
}

const noise = {
    createWorley: (seed, pointCount, octaves) => {
        return new WorleyNoise(seed, pointCount, octaves)
    },
    createPerlin: (seed) => {
        return new PerlinNoise(seed)
    }
}

const math = {
    distance: (p1, p2) => {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
    },
    map: (value, inMin, inMax, outMin, outMax) => {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    },
    isPointInCircle: (x, y, cx, cy, r) => {
        const dx = x - cx;
        const dy = y - cy;
        return (dx * dx + dy * dy) <= (r * r);
    }
}

export default {
    random,
    noise,
    math,
}