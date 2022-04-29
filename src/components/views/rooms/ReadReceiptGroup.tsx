/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { PropsWithChildren, useEffect, useRef } from "react";
import { User } from "matrix-js-sdk/src/matrix";
import classNames from "classnames";

import ReadReceiptMarker, { IReadReceiptInfo } from "./ReadReceiptMarker";
import { IReadReceiptProps } from "./EventTile";
import AccessibleButton from "../elements/AccessibleButton";
import MemberAvatar from "../avatars/MemberAvatar";
import AutoHideScrollbar from "../../structures/AutoHideScrollbar";
import { Alignment } from "../elements/Tooltip";
import { formatDate } from "../../../DateUtils";
import { Action } from "../../../dispatcher/actions";
import dis from "../../../dispatcher/dispatcher";
import ContextMenu, { aboveLeftOf, MenuItem, useContextMenu } from "../../structures/ContextMenu";
import { useTooltip } from "../../../utils/useTooltip";
import { _t } from "../../../languageHandler";
import { useRovingTabIndex } from "../../../accessibility/RovingTabIndex";

// #20547 Design specified that we should show the three latest read receipts
const MAX_READ_AVATARS_PLUS_N = 3;
// #21935 If we’ve got just 4, don’t show +1, just show all of them
const MAX_READ_AVATARS = MAX_READ_AVATARS_PLUS_N + 1;

const READ_AVATAR_OFFSET = 10;
export const READ_AVATAR_SIZE = 16;

interface Props {
    readReceipts: IReadReceiptProps[];
    readReceiptMap: { [userId: string]: IReadReceiptInfo };
    checkUnmounting: () => boolean;
    suppressAnimation?: boolean;
    isTwelveHour: boolean;
    alignWithMessage?: boolean;
}

interface IAvatarPosition {
    hidden: boolean;
    position: number;
}

function determineAvatarPosition(index: number, count: number, max: number): IAvatarPosition {
    const firstVisible = Math.max(0, count - max);

    if (index >= firstVisible) {
        return {
            hidden: false,
            position: index - firstVisible,
        };
    } else {
        return {
            hidden: true,
            position: 0,
        };
    }
}

export function ReadReceiptGroup(
    { readReceipts, readReceiptMap, checkUnmounting, suppressAnimation, isTwelveHour, alignWithMessage }: Props,
) {
    const suppressAnimationInternal = useRef<boolean>(true);
    useEffect(() => {
        suppressAnimationInternal.current = false;
    }, []);

    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    const [{ showTooltip, hideTooltip }, tooltip] = useTooltip({
        label: _t("Seen by %(count)s people", { count: readReceipts.length }),
        alignment: Alignment.TopRight,
    });

    const className = classNames("mx_ReadReceiptGroup", {
        "mx_ReadReceiptGroup--alignWithMessage": alignWithMessage,
    });

    // return early if there are no read receipts
    if (readReceipts.length === 0) {
        // We currently must include `mx_ReadReceiptGroup_container` in
        // the DOM of all events, as it is the positioned parent of the
        // animated read receipts. We can't let it unmount when a receipt
        // moves events, so for now we mount it for all events. Without
        // it, the animation will start from the top of the timeline
        // (because it lost its container).
        // See also https://github.com/vector-im/element-web/issues/17561
        return (
            <div className="mx_EventTile_msgOption">
                <div className={className}>
                    <div className="mx_ReadReceiptGroup_button">
                        <span className="mx_ReadReceiptGroup_container" />
                    </div>
                </div>
            </div>
        );
    }

    // If we are above MAX_READ_AVATARS, we’ll have to remove a few to have space for the +n count.
    const maxAvatars = readReceipts.length > MAX_READ_AVATARS
        ? MAX_READ_AVATARS_PLUS_N
        : MAX_READ_AVATARS;

    const avatars = readReceipts.map((receipt, index) => {
        const { hidden, position } = determineAvatarPosition(index, readReceipts.length, maxAvatars);

        const userId = receipt.userId;
        let readReceiptInfo: IReadReceiptInfo;

        if (readReceiptMap) {
            readReceiptInfo = readReceiptMap[userId];
            if (!readReceiptInfo) {
                readReceiptInfo = {};
                readReceiptMap[userId] = readReceiptInfo;
            }
        }

        return (
            <ReadReceiptMarker
                key={userId}
                member={receipt.roomMember}
                fallbackUserId={userId}
                offset={position * READ_AVATAR_OFFSET}
                hidden={hidden}
                readReceiptInfo={readReceiptInfo}
                checkUnmounting={checkUnmounting}
                suppressAnimation={suppressAnimation ?? suppressAnimationInternal.current}
                timestamp={receipt.ts}
                showTwelveHour={isTwelveHour}
            />
        );
    });

    let remText: JSX.Element;
    const remainder = readReceipts.length - maxAvatars;
    if (remainder > 0) {
        remText = (
            <span className="mx_ReadReceiptGroup_remainder" aria-live="off">
                +{ remainder }
            </span>
        );
    }

    let contextMenu;
    if (menuDisplayed) {
        const buttonRect = button.current.getBoundingClientRect();
        contextMenu = (
            <ContextMenu
                menuClassName="mx_ReadReceiptGroup_popup"
                onFinished={closeMenu}
                {...aboveLeftOf(buttonRect)}>
                <AutoHideScrollbar>
                    <SectionHeader className="mx_ReadReceiptGroup_title">
                        { _t("Seen by %(count)s people", { count: readReceipts.length }) }
                    </SectionHeader>
                    { readReceipts.map(receipt => (
                        <ReadReceiptPerson
                            key={receipt.userId}
                            {...receipt}
                            isTwelveHour={isTwelveHour}
                            onAfterClick={closeMenu}
                        />
                    )) }
                </AutoHideScrollbar>
            </ContextMenu>
        );
    }

    return (
        <div className="mx_EventTile_msgOption">
            <div className={className}>
                <AccessibleButton
                    className="mx_ReadReceiptGroup_button"
                    inputRef={button}
                    onClick={openMenu}
                    onMouseOver={showTooltip}
                    onMouseLeave={hideTooltip}
                    onFocus={showTooltip}
                    onBlur={hideTooltip}>
                    { remText }
                    <span
                        className="mx_ReadReceiptGroup_container"
                        style={{
                            width: Math.min(maxAvatars, readReceipts.length) * READ_AVATAR_OFFSET +
                                READ_AVATAR_SIZE - READ_AVATAR_OFFSET,
                        }}
                    >
                        { avatars }
                    </span>
                </AccessibleButton>
                { tooltip }
                { contextMenu }
            </div>
        </div>
    );
}

interface ReadReceiptPersonProps extends IReadReceiptProps {
    isTwelveHour: boolean;
    onAfterClick?: () => void;
}

function ReadReceiptPerson({ userId, roomMember, ts, isTwelveHour, onAfterClick }: ReadReceiptPersonProps) {
    const [{ showTooltip, hideTooltip }, tooltip] = useTooltip({
        alignment: Alignment.TopCenter,
        tooltipClassName: "mx_ReadReceiptGroup_person--tooltip",
        label: (
            <>
                <div className="mx_Tooltip_title">
                    { roomMember?.rawDisplayName ?? userId }
                </div>
                <div className="mx_Tooltip_sub">
                    { userId }
                </div>
            </>
        ),
    });

    return (
        <MenuItem
            className="mx_ReadReceiptGroup_person"
            onClick={() => {
                dis.dispatch({
                    action: Action.ViewUser,
                    // XXX: We should be using a real member object and not assuming what the receiver wants.
                    // The ViewUser action leads to the RightPanelStore, and RightPanelStoreIPanelState defines the
                    // member property of IRightPanelCardState as `RoomMember | User`, so we’re fine for now, but we
                    // should definitely clean this up later
                    member: roomMember ?? { userId } as User,
                    push: false,
                });
                onAfterClick?.();
            }}
            onMouseOver={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
            onWheel={hideTooltip}
        >
            <MemberAvatar
                member={roomMember}
                fallbackUserId={userId}
                width={24}
                height={24}
                aria-hidden="true"
                aria-live="off"
                resizeMethod="crop"
                hideTitle
            />
            <div className="mx_ReadReceiptGroup_name">
                <p>{ roomMember?.name ?? userId }</p>
                <p className="mx_ReadReceiptGroup_secondary">
                    { formatDate(new Date(ts), isTwelveHour) }
                </p>
            </div>
            { tooltip }
        </MenuItem>
    );
}

interface ISectionHeaderProps {
    className?: string;
}

function SectionHeader({ className, children }: PropsWithChildren<ISectionHeaderProps>) {
    const ref = useRef<HTMLHeadingElement>();
    const [onFocus] = useRovingTabIndex(ref);

    return (
        <h3
            className={className}
            role="menuitem"
            onFocus={onFocus}
            tabIndex={-1}
            ref={ref}
        >
            { children }
        </h3>
    );
}
