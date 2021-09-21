import React from "react";
import { animated } from "@react-spring/web";
import classNames from "classnames";
import { GroupCallParticipant } from "matrix-js-sdk/src/webrtc/groupCallParticipant";
import { useGroupCallParticipant } from "../../../../hooks/useGroupCallParticipant";

interface IParticipantTileProps {
    style: any;
    participant: GroupCallParticipant;
    remove: boolean;
    presenter: boolean;
}

export default function ParticipantTile({ style, participant, remove, presenter, ...rest }: IParticipantTileProps) {
    const {
        displayName,
        speaking,
        audioMuted,
        videoMuted,
        mediaRef,
    } = useGroupCallParticipant<HTMLVideoElement>(participant);

    // Firefox doesn't respect the disablePictureInPicture attribute
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1611831

    return (
        <animated.div className="mx_participantTile" style={style} {...rest}>
            <div
                className={classNames("mx_participantName", {
                    "mx_speaking": speaking,
                })}
            >
                { speaking ? (
                    <i />
                ) : audioMuted ? (
                    <i className="mx_muteMicIcon" />
                ) : null }
                <span>{ displayName }</span>
            </div>
            { videoMuted && (
                <i className="mx_videoMuted" />
            ) }
            <video ref={mediaRef} playsInline disablePictureInPicture />
        </animated.div>
    );
}
