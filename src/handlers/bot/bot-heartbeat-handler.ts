import { CTF_FLAG_STATE, KEY_CODES, PLAYER_STATUS } from "../../ab-protocol/src/lib";
import { IContext } from "../../app-context/icontext";
import { FaceLocationExecutor } from "../../botting/face-location-executor";
import { GotoLocationExecutor } from "../../botting/goto-location-executor";
import { Events } from "../../events/constants";
import { EventMessage } from "../../events/event-message";
import { StopWatch } from "../../helpers/stopwatch";
import { IMessageHandler } from "../imessage-handler";

const BOT_TICK_MS = 180;
const SHOOTING_RANGE = 700;

export class BotHeartbeatHandler implements IMessageHandler {

    public handles = [Events.TICK];

    private timer = new StopWatch(BOT_TICK_MS);

    constructor(private context: IContext) {
        this.timer.start();
    }

    public exec(ev: EventMessage): void {
        if (!this.timer.hasTimedOut) {
            return;
        }

        this.timer.start();

        if (this.context.botstate.autoPilotToFlag) {
            this.autoPilot();
        } else if (this.context.botstate.playerToKill) {
            this.followPlayer();
        }

        this.doSteering();
    }

    private autoPilot() {

        const otherTeam = this.context.state.getOtherCtfTeam(this.context.state.team);
        if (!otherTeam) {
            return;
        }
        const me = this.context.state.getFocusedPlayer();

        let flagPos = otherTeam.flagPos;
        if (otherTeam.flagState === CTF_FLAG_STATE.DYNAMIC) {
            // flag is on the move
            const carrier = this.context.state.getPlayerById(otherTeam.flagTakenById);
            if (carrier) {
                flagPos = carrier.mostReliablePos;
            }
        }

        const goto = new GotoLocationExecutor(this.context, me, flagPos);
        const { isClose } = goto.execute();

        if (isClose) {
            this.context.botstate.stop();
        }
    }

    private followPlayer() {
        const playerToFollow = this.context.state.getPlayerById(this.context.botstate.playerToKill);

        if (!playerToFollow || playerToFollow.status !== PLAYER_STATUS.ALIVE) {
            return;
        }

        const me = this.context.state.getFocusedPlayer();
        const posToGoTo = playerToFollow.mostReliablePos;

        const goto = new GotoLocationExecutor(this.context, me, posToGoTo);
        const { isClose, distance } = goto.execute();

        if (isClose) {
            const faceLocation = new FaceLocationExecutor(this.context, me, posToGoTo);
            faceLocation.execute();
        }

        if (distance < SHOOTING_RANGE) {
            this.context.state.isAutoFiring = true;
        } else {
            this.context.state.isAutoFiring = false;
        }
    }

    private doSteering() {
        const keyInstructions = this.context.botstate.eatKeyQueue();

        const allKeys = [KEY_CODES.UP, KEY_CODES.DOWN, KEY_CODES.LEFT, KEY_CODES.RIGHT, KEY_CODES.FIRE, KEY_CODES.SPECIAL];

        // only send the last state per key of all instructions
        for (const keyCode of allKeys) {
            for (let i = keyInstructions.length - 1; i >= 0; i--) {
                const instr = keyInstructions[i];
                if (instr.key === keyCode) {
                    // in case of duration (= turning during a certain time), only send the key if we aren't turning already.
                    if (instr.duration > 0) {
                        if (!this.context.botstate.turningTimeout) {
                            this.context.connection.sendKey(instr.key, instr.state);
                            this.context.botstate.turningTimeout = setTimeout(() => {
                                this.context.connection.sendKey(instr.key, !instr.state);
                                this.context.botstate.turningTimeout = null;
                            }, instr.duration);
                        }
                    } else {
                        this.context.connection.sendKey(instr.key, instr.state);
                    }
                    break;
                }
            }
        };


    }

}
