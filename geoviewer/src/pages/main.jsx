/* Written by Ye Liu */

import React from 'react';
import { SnackbarProvider } from 'notistack';

import Snackbar from '@components/snackbar';
import About from '@components/about';
import Navigator from '@components/navigator';
import Menu from '@components/menu';
import Login from '@components/login';
import Feature from '@components/feature';
import StyleController from '@components/controllers/styleController';
import LayerController from '@components/controllers/layerController';
import DataController from '@components/controllers/dataController';
import Canvas from '@components/canvas';
import Popup from '@components/popup';
import '@styles/materialize.min.style.css';
import SyncController from '../components/controllers/syncController';
import TreeController from '../components/controllers/treeController';
import RusleController from '../components/controllers/rusleController';
import SocController from '../components/controllers/socController'
import VegInspectorController from '../components/controllers/vegInspectorController';
import SpatioTemporalAnalysisController from '../components/controllers/spatioTemporalAnalysisController';

class Main extends React.Component {
    render() {
        return (
            <SnackbarProvider maxSnack={3}>
                <React.Fragment>
                    <Snackbar />
                    <About />
                    <Navigator />
                    <Menu />
                    <Login />
                    <Feature />
                    <StyleController />
                    <LayerController />
                    <SocController />
                    <RusleController />
                    <VegInspectorController/>
                    <SpatioTemporalAnalysisController/>
                    <TreeController/>
                    <DataController />
                    <SyncController />
                    <Popup />
                    <Canvas />
                </React.Fragment>
            </SnackbarProvider>
        );
    }
}

export default Main;
