import * as actions from '../actions/session';
import { IReducerSpec } from '../types/IExtensionContext';

import { pushSafe, removeValue, setSafe } from '../util/storeHelper';

/**
 * reducer for changes to the window state
 */
export const sessionReducer: IReducerSpec = {
  reducers: {
    [actions.displayGroup as any]: (state, payload) =>
      setSafe(state, [ 'displayGroups', payload.groupId ], payload.itemId),
    [actions.setDialogVisible as any]: (state, payload) =>
      setSafe(state, [ 'visibleDialog' ], payload.dialogId),
    [actions.setOverlayOpen as any]: (state, payload) =>
      setSafe(state, [ 'overlayOpen' ], payload.open),
    [actions.setSettingsPage as any]: (state, payload) =>
      setSafe(state, [ 'settingsPage' ], payload.pageId),
    [actions.startActivity as any]: (state, payload) =>
      pushSafe(state, [ 'activity', payload.group ], payload.activityId),
    [actions.stopActivity as any]: (state, payload) =>
      removeValue(state, [ 'activity', payload.group ], payload.activityId),
    [actions.setProgress as any]: (state, payload) =>
      setSafe(state, ['progress', payload.group, payload.progressId],
              { text: payload.text, percent: Math.round(payload.percent) }),
    [actions.setOpenMainPage as any]: (state, payload) => {
      if (payload.secondary) {
        return setSafe(state, [ 'secondaryPage' ], payload.page);
      } else {
        return setSafe(
          setSafe(state, [ 'mainPage' ], payload.page),
          [ 'secondaryPage' ], '');
      }
    },
    [actions.setExtensionLoadFailures as any]: (state, payload) =>
      setSafe(state, ['extLoadFailures'], payload),
  },
  defaults: {
    displayGroups: {},
    visibleDialog: undefined,
    overlayOpen: false,
    mainPage: '',
    secondaryPage: '',
    activity: {},
    progress: {},
    settingsPage: undefined,
    extLoadFailures: {},
  },
};
