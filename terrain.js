export class Terrain {
    constructor(heighmap, maxheight) {
        this.heighmap = heighmap;
        this.maxheight = maxheight;
    }

    setHeightmap(heighmap) {
        this.heighmap = heighmap
    }

    getHeight(x, y) {
        x = Math.floor(x)
        y = Math.floor(y)
        return (this.heighmap[y]?.[x] ?? 0) * this.maxheight
    }
}