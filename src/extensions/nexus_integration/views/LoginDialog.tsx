import { showDialog } from '../../../actions/notifications';
import FormFeedback from '../../../controls/FormFeedback';
import Icon from '../../../controls/Icon';
import More from '../../../controls/More';
import { Button, IconButton } from '../../../controls/TooltipControls';
import { ComponentEx, connect, translate } from '../../../util/ComponentEx';
import { getSafe } from '../../../util/storeHelper';
import { truthy } from '../../../util/util';

import { setUserAPIKey } from '../actions/account';
import { IValidateKeyData } from '../types/IValidateKeyData';

import getText from '../texts';

import { remote } from 'electron';
import * as update from 'immutability-helper';
import opn = require('opn');
import * as React from 'react';
import { ControlLabel, FormControl, FormGroup, HelpBlock, Image, Modal } from 'react-bootstrap';
import * as Redux from 'redux';

export interface IBaseProps {
  visible: boolean;
  onHide: () => void;
}

interface IConnectedProps {
  APIKey: string;
  userInfo: IValidateKeyData;
}

interface IActionProps {
  onSetAPIKey: (APIKey: string) => void;
  onShowLoginError: (message: string) => void;
}

type IProps = IBaseProps & IConnectedProps & IActionProps;

interface IValidationState {
  state?: 'success' | 'warning' | 'error';
  reason?: string;
  pending?: boolean;
}

interface ILoginFormState {
  APIKey: string;
  didSubmit: boolean;
}

class LoginDialog extends ComponentEx<IProps, ILoginFormState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      APIKey: props.APIKey,
      didSubmit: false,
    };
  }

  public render(): JSX.Element {
    const { t, APIKey, visible, onHide, userInfo } = this.props;
    return (
      <Modal id='login-dialog' show={visible} onHide={onHide}>
        <Modal.Body>
          <IconButton
            className='close-button'
            id='btn-close-login'
            onClick={onHide}
            tooltip={t('Close')}
            icon='close'
          />
          <div className='login-content'>
            <Icon
              className='nexus-header'
              name='nexus-header'
              svgStyle='#login-dialog path { fill: black }'
            />
            <div className='login-instructions'>
              {t('Please log in or register on the Nexus Mods website to log in on vortex!')}
            </div>
            <Button
              onClick={this.login}
              tooltip={t('Opens the Nexus Mods page in your default browser')}
            >
              {t('Log In On Website')}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  private renderLoginForm(): JSX.Element {
    const { APIKey, userInfo } = this.props;
    return (
      <form>
        {((userInfo === undefined) || (userInfo === null))
          ? this.renderKeyInput()
          : this.renderAccountInfo()}
      </form>
    );
  }

  private renderSubmitButton(): JSX.Element {
    const { t, APIKey, userInfo } = this.props;
    return ((userInfo === undefined) || (userInfo === null))
      ? (
        <Button id='submit-apikey' tooltip={t('Submit')} onClick={this.apiKeySubmit}>
          {t('Submit')}
        </Button>
      )
      : (
        <Button id='remove-apikey' tooltip={t('Remove Key')} onClick={this.clearAPIKey}>
          {t('Remove Key')}
        </Button>
      );
  }

  private renderKeyInput() {
    const { t } = this.props;
    const { APIKey } = this.state;

    const validation: IValidationState = this.validationState();
    return (
      <Button onClick={this.login} tooltip={t('Log in')}>
        {t('Log in')}
      </Button>
    );
  }

  private renderAccountInfo() {
    const { t } = this.props;
    const { name, email, isPremium, isSupporter, profileUrl, userId } = this.props.userInfo;

    return (
      <FormGroup
        controlId='formUserInfo'
      >
        <div>
          <Image src={profileUrl || 'assets/images/noavatar.png'} width='90' height='90' rounded />
        </div>
        <div>
          <ControlLabel>{t('User ID: {{userId}}', { replace: { userId } })}</ControlLabel>
        </div>
        <div>
          <ControlLabel>{t('UserName: {{name}}', { replace: { name } })}</ControlLabel>
        </div>
        <div>
          <ControlLabel>
            {t('Premium: {{isPremium}}',
              { replace: { isPremium: (isPremium ? t('YES') : t('NO')) } })}
          </ControlLabel>
        </div>
        <div>
          <ControlLabel>
            {t('Supporter: {{isSupporter}}',
              { replace: { isSupporter: (isSupporter ? t('YES') : t('NO')) } })}
          </ControlLabel>
        </div>
        <div>
          <ControlLabel>{t('Email: {{email}}', { replace: { email } })}</ControlLabel>
        </div>
      </FormGroup>
    );
  }

  private login = () => {
    const { onHide } = this.props;
    this.context.api.events.emit('request-nexus-login', (err: Error) => {
      if (err !== null) {
        this.context.api.showErrorNotification('Failed to get access key', err);
      }
      onHide();
    });
  }

  private openAPIKeyPage = evt => {
    evt.preventDefault();
    opn('https://www.nexusmods.com/users/myaccount?tab=api+access').catch(err => undefined);
  }

  private validationState(): IValidationState {
    const { APIKey, userInfo } = this.props;
    const { didSubmit } = this.state;
    const editAPIKey = this.state.APIKey;

    if (didSubmit && (APIKey === undefined)) {
      return { state: 'warning', reason: 'API Key rejected' };
    } else if ((APIKey !== undefined) && (userInfo === undefined)) {
      return { pending: true, reason: 'Verifying...' };
    } else if ((APIKey !== undefined) && (userInfo === null)) {
      return { state: 'warning', reason: 'API Key not validated' };
    } else if ((!truthy(editAPIKey) && !truthy(APIKey)) || (editAPIKey === APIKey)) {
      return {};
    }

    return { state: 'success' };
  }

  private apiKeySubmit = () => {
    const { onSetAPIKey } = this.props;
    this.setState(update(this.state, { didSubmit: { $set: true } }));
    if (this.state.APIKey === this.props.APIKey) {
      // unset the api key first to ensure this registers as a state-change
      onSetAPIKey(undefined);
    }
    onSetAPIKey(this.state.APIKey);
  }

  private clearAPIKey = () => {
    this.props.onSetAPIKey(undefined);
  }

  private handleChangeAPIKey = (event) => {
    this.setState(update(this.state, {
      APIKey: { $set: event.target.value.trim() },
    }));
  }
}

function mapStateToProps(state: any): IConnectedProps {
  return {
    APIKey: state.confidential.account.nexus.APIKey,
    userInfo: state.session.nexus.userInfo,
  };
}

function mapDispatchToProps(dispatch: Redux.Dispatch<any>): IActionProps {
  return {
    onSetAPIKey: (APIKey: string) => dispatch(setUserAPIKey(APIKey)),
    onShowLoginError:
    (message: string) => dispatch(showDialog('error', 'Error', { message },
                                             [ { label: 'Close' } ])),
  };
}

export default
  connect(mapStateToProps, mapDispatchToProps)(
    translate(['common'], { wait: false })(
      LoginDialog)) as React.ComponentClass<IBaseProps>;
