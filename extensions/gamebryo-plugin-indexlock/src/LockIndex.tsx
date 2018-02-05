import { lockPluginIndex } from './actions';
import { IPlugin } from './types';

import * as React from 'react';
import { translate } from 'react-i18next';
import { connect } from 'react-redux';
import { ComponentEx, selectors, Toggle, types, util } from 'vortex-api';

function toHex(input: number) {
  if (input === undefined) {
    return 'FF';
  }
  let res = input.toString(16).toUpperCase();
  if (res.length < 2) {
    res = '0' + res;
  }
  return res;
}

export interface IBaseProps {
  gameMode: string;
  plugin: IPlugin;
}

interface IConnectedProps {
  lockedIndex: number;
}

interface IActionProps {
  onLockPluginIndex: (gameId: string, pluginName: string, modIndex: number) => void;
}

type IProps = IBaseProps & IConnectedProps & IActionProps;

class LockIndex extends ComponentEx<IProps, {}> {
  public render(): JSX.Element {
    const { t, lockedIndex } = this.props;
    const title = (lockedIndex !== undefined)
      ? t('Locked to Index {{lockedIndex}}', { replace: { lockedIndex: toHex(lockedIndex) } })
      : t('Sorted automatically');
    return (
      <Toggle
        checked={lockedIndex !== undefined}
        onToggle={this.onToggle}
      >
        {title}
      </ Toggle>
    );
  }

  private onToggle = (newValue: boolean, dataId?: string) => {
    const { gameMode, onLockPluginIndex, plugin } = this.props;
    onLockPluginIndex(gameMode, plugin.name, newValue ? plugin.modIndex : undefined);
    this.forceUpdate();
  }
}

function mapStateToProps(state: types.IState, ownProps: IBaseProps): IConnectedProps {
  const statePath = ['persistent', 'plugins', 'lockedIndices',
                     ownProps.gameMode, ownProps.plugin.name];
  return {
    lockedIndex: util.getSafe(state, statePath, undefined),
  };
}

function mapDispatchToProps(dispatch: Redux.Dispatch<any>): IActionProps {
  return {
    onLockPluginIndex: (gameId: string, pluginName: string, modIndex: number) =>
      dispatch(lockPluginIndex(gameId, pluginName, modIndex)),
  };
}

export default translate(['common', 'gamebryo-lockindex'])(
  connect(mapStateToProps, mapDispatchToProps)(
    LockIndex)) as React.ComponentClass<IBaseProps>;