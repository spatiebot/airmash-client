import { abWalls } from "../ab-assets/walls";
import { Pos } from "../models/pos";
import { ClippedView } from "./clipped-view";

export class WallsRenderer {

    constructor(private clip: ClippedView) {
    }

    public renderWalls(context: CanvasRenderingContext2D) {
        context.fillStyle = "gray";
        for (const point of abWalls) {
            const pos = new Pos(point[0], point[1]);
            const widthMargin = point[2];
            const halfWall = widthMargin / 2;

            const topLeft = new Pos(pos.x - halfWall, pos.y - halfWall);
            const bottRight = new Pos(pos.x + halfWall, pos.y + halfWall);

            if (this.clip.isVisible(topLeft) || this.clip.isVisible(bottRight)) {
                context.beginPath();

                const clipPos = this.clip.translate(pos);
                context.arc(clipPos.x, clipPos.y, this.clip.scale(widthMargin), 0, 2 * Math.PI);
                context.fill();
            }
        }
    }
}
