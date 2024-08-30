/* Written by Ye Liu */

import React from 'react';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import grey from '@material-ui/core/colors/grey';

import emitter from '@utils/events.utils';

const theme = createTheme({
    palette: {
        primary: {
            main: grey[900]
        }
    }
});

const styles = {
    root: {
        position: 'fixed',
        top: 0,
        zIndex: 900
    },
    logoContainer: {
        height: '60px',
        padding: '2px 10px 1px 0px;',
    },
    logo: {
        height: '55px',
    },
    flexContainer: {
        position: 'absolute',
        right: 12,
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start'
    },
    svgIcon: {
        width: 24,
        height: 24
    },
    fontIcon: {
        fontSize: 29
    },
    toolbar:{
        background: '#89ca92'
    }
};

class Navigator extends React.Component {
    state = {
        loggedin: false,
        token:null
    }

    handleLoginClick = () => {
        // Display login modal
        emitter.emit('login');
    }

    handleLogoutClick = () => {
        // Initiate request
        // request({
        //    url: SERVICE.logout.url,
        //    method: SERVICE.logout.method,
        //    successCallback: (res) => {
                // Display snackbar
                emitter.emit('removeAllLayer');
                emitter.emit('removeDataset');
                emitter.emit('removeAllDataset');
                emitter.emit('handleDatasetRemove');
                localStorage.removeItem('token');
                localStorage.removeItem('jwt');
                document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });

                emitter.emit('showSnackbar', 'success', 'Logout successfully.');
                // Switch login icon
                this.setState({
                    token:null,
                    loggedin: false
                })
            //}
        //});
    }

    handleToken = (token) => {
        console.log('Received token:', token);
        // Aquí puedes hacer algo con los datos, como establecer el estado
        this.setState({ token: token });
    }

    componentDidMount() {
        // Bind event listener
        this.setLoginStateListener = emitter.addListener('setLoginState', e => {
            this.setState({
                loggedin: e
            })
        });
        emitter.on('handleToken', this.handleToken);
    }

    componentWillUnmount() {
        // Remove event listener
        emitter.removeListener(this.setLoginStateListener);
    }

    render() {
        return (
            <MuiThemeProvider theme={theme} >
                <AppBar style={styles.root} position="static">
                    <Toolbar style={styles.toolbar}>
                        {/* Logo */}
                        <a style={styles.logoContainer} href="https://evenor-tech.com/">
                        <img style={styles.logo} src="./static/assets/logo.png" alt="" />
                        </a>

                        &nbsp;
                        &nbsp;
                        &nbsp;
                        &nbsp;

                        <a style={styles.logoContainer} href="https://www.steambioafrica.com/">
                        <img style={styles.logo} src="./static/assets/bioafrica.png" alt="" />
                        </a>

                        {/* Icons */}
                        <div style={styles.flexContainer}>
                            <Tooltip title="About" aria-label="About" enterDelay={200}>
                                <IconButton className="icon-container modal-trigger" aria-label="About" color="inherit" data-target="about">
                                    <Icon style={styles.fontIcon}>info_outline</Icon>
                                </IconButton>
                            </Tooltip>
                            {this.state.token!=null ?
                                <Tooltip title="Logout" aria-label="Logout" enterDelay={200}>
                                    <IconButton className="icon-container" aria-label="Logout" color="inherit" onClick={this.handleLogoutClick}>
                                        <Icon style={styles.fontIcon}>exit_to_app</Icon>
                                    </IconButton>
                                </Tooltip> :
                                <Tooltip title="Login" aria-label="Login" enterDelay={200}>
                                    <IconButton className="icon-container" aria-label="Login" color="inherit" onClick={this.handleLoginClick}>
                                        <Icon style={styles.fontIcon}>account_circle</Icon>
                                    </IconButton>
                                </Tooltip>}
                        </div>
                    </Toolbar>
                </AppBar>
            </MuiThemeProvider>
        );
    }
}

export default Navigator;
