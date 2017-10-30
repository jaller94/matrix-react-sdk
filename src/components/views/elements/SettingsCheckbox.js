/*
Copyright 2017 Travis Ralston

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

import React from "react";
import SettingsStore from "../../../settings/SettingsStore";
import { _t } from '../../../languageHandler';

module.exports = React.createClass({
    displayName: 'SettingsCheckbox',
    propTypes: {
        name: React.PropTypes.string.isRequired,
        level: React.PropTypes.string.isRequired,
        roomId: React.PropTypes.string, // for per-room settings
        label: React.PropTypes.string, // untranslated
        onChange: React.PropTypes.func,

        // If group is supplied, then this will create a radio button instead.
        group: React.PropTypes.string,
        value: React.PropTypes.any, // the value for the radio button
    },

    onChange: function(e) {
        if (this.props.group && !e.target.checked) return;

        const newState = this.props.group ? this.props.value : e.target.checked;
        SettingsStore.setValue(this.props.name, this.props.roomId, this.props.level, newState);
        if (this.props.onChange) this.props.onChange(newState);
    },

    render: function() {
        let val = SettingsStore.getValueAt(this.props.level, this.props.name, this.props.roomId);

        let label = this.props.label;
        if (!label) label = SettingsStore.getDisplayName(this.props.name);
        else label = _t(label);

        let id = this.props.name;
        let checkbox = (
            <input id={this.props.name}
                   type="checkbox"
                   defaultChecked={val}
                   onChange={this.onChange}
            />
        );
        if (this.props.group) {
            id = this.props.group + '_' + this.props.name;
            checkbox = (
                <input id={id}
                       type="radio"
                       name={this.props.group}
                       value={this.props.value}
                       checked={val === this.props.value}
                       onChange={this.onChange}
                       />
            );
        }

        return (
            <div className="mx_SettingCheckbox">
                { checkbox }
                <label htmlFor={id}>
                    { label }
                </label>
            </div>
        );
    },
});
