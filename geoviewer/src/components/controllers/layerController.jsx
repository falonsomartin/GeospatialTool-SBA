/* Written by Ye Liu */

import React from 'react';
import Slider from '@material-ui/core/Slider';
import emitter from '@utils/events.utils';
import { Avatar, Card, CardContent, Chip, Checkbox, FormControl, Icon, IconButton, Input, InputLabel, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, MenuItem, Select, Slide, Tooltip, Typography } from '@material-ui/core';

import { indigo } from '@material-ui/core/colors';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';


const theme = createTheme({
    palette: {
        primary: {
            main: indigo.A200
        }
    }
});

const styles = {
    root: {
        position: 'fixed',
        top: 74,
        right: 10,
        width: 300,
        borderRadius: 4,
        margin: 0,
        zIndex: 900
    },
    header: {
        backgroundColor: '#f1f1f1'
    },
    closeBtn: {
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 22
    },
    content: {
        paddingBottom: 16
    },
    select: {
        width: '100%'
    },
    placeholder: {
        height: 28,
        lineHeight: '28px',
        cursor: 'pointer'
    },
    chipContainer: {
        display: 'flex',
        overflow: 'hidden'
    },
    chip: {
        height: 28,
        lineHeight: '28px',
        marginRight: 5
    },
    layerList: {
        marginTop: 6,
        paddingBottom: 0
    },
    layerItem: {
        paddingLeft: 2
    },
    sortAction: {
        right: 12
    }
};

class LayerController extends React.Component {
    state = {
        open: false,
        mapp:null,
        selected: {},
        resolution: 7,
        zoom: 0,
        layerForm: 'Border',
        datasetss: {}
    }

    handleCloseClick = () => {
        this.setState({
            open: false
        });
    }

    handleDatasetChange = async (e) => {
        var deleting = false;
        Object.keys(this.state.selected).map(item => {
            //emitter.emit('removeDataset', item);
            deleting = true;
                    
            this.setState({
                selected: {}
            });
            return true;
        });

        if (!deleting && e.target.value.length) {
            const id = e.target.value[e.target.value.length - 1];
            emitter.emit('showSnackbar', 'default', `Downloading dataset '${id}'.`);
            emitter.emit('displayDataset', id, this.state.datasetss[id].data, '#f08');
            emitter.emit('showSnackbar', 'success', `Dataset '${id}' downloaded successfully.`);
        }

        

    };

    handleDrop = (event) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = JSON.parse(e.target.result);
                const geoJsonData = data;
                this.setState({ datasets: { ...this.state.datasets, [file.name]: { data: geoJsonData } } });
                emitter.emit('displayDataset', file.name, geoJsonData);
                emitter.emit('showSnackbar', 'success', `Dataset '${file.name}' downloaded successfully.`);
            };
            reader.readAsText(file);
        }
    };

    updateDatasets = () => {
        let layers = this.state.mapp; // Assuming map is passed as a prop
        let newDatasets = {};
        
        console.log(layers);
        
        layers.forEach((layer) => {
            // Filtrar las capas que no pertenezcan a la fuente 'composite'
            console.log(layer)
            if (layer.id === "predictedSOC") {
                console.log(layer)
                // Construir la estructura de newDatasets similar a datasets
                newDatasets[layer.id] = {
                    
                };
            }
        });

        console.log(newDatasets)
    
        console.log(Object.keys(newDatasets));

        console.log(Object.values(newDatasets));

        this.setState({
            selected: newDatasets
        });
        // Actualizar el estado con el nuevo objeto datasets
        this.setState({ datasetss: newDatasets});

    }
    

    componentDidMount() {
        console.log("ASA")
        this.openLayerControllerListener = emitter.addListener('openLayerController', () => {
            this.setState({ open: true });
        });

        this.closeAllControllerListener = emitter.addListener('closeAllController', () => {
            this.setState({ open: false });
        });

        this.setMapZoomListener = emitter.addListener('setMapZoom', (z) => {
            this.setState({ zoom: z });
        });

        this.handleDatasetRemoveListener = emitter.addListener('handleDatasetRemove', () => {
            this.handleDatasetRemove();
        });

        emitter.on('moveDataset', this.handleDataMoved);
        emitter.on('moveMAP', this.handleMAPMoved);

        window.addEventListener('dragover', this.handleDragOver);
        window.addEventListener('drop', this.handleDrop);

    }

    componentDidUpdate(prevProps) {
        if (this.props.map !== prevProps.map) {
            this.updateDatasets();
        }
    }

    handleMAPMoved = (movedData) => {
        console.log("ASASJ")
        console.log(movedData)
        let layers = movedData.getStyle().layers;
        console.log(layers)
        this.setState({ mapp: layers });
        this.updateDatasets();
    }
    handleDataMoved = (movedData) => {
        this.setState({ datasets: movedData });
    }

    handleDatasetRemove() {
        this.setState({ datasets: {}, selected: {} });
    }

    componentWillUnmount() {
        emitter.removeListener(this.openLayerControllerListener);
        emitter.removeListener(this.closeAllControllerListener);
        emitter.removeListener(this.setMapZoomListener);
        emitter.removeListener(this.handleDatasetRemoveListener);
        window.removeEventListener('dragover', this.handleDragOver);
        window.removeEventListener('drop', this.handleDrop);
    }

    handleLayerFormBor = () => {
        this.setState({ layerForm: 'Border' });
    }

    handleLayerFormHex = () => {
        this.setState({ layerForm: 'Hexagonal' });
    }

    render() {
        console.log(this.state.selected)
        return (
            <MuiThemeProvider theme={theme}>
                <Slide direction="left" in={this.state.open}>
                    <Card style={styles.root}>
                        <CardContent style={styles.header}>
                            <Typography gutterBottom variant="h5" component="h2">Layers</Typography>
                            <Typography variant="body2" color="textSecondary">Download and display layers</Typography>
                            <Tooltip title="Hexagons" aria-label="Hexagons" enterDelay={200}>
                                <IconButton aria-label="Hexagons" onClick={this.handleLayerFormHex}>
                                    <Icon fontSize="inherit">crop</Icon>
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Border" aria-label="Border" enterDelay={200} onClick={this.handleLayerFormBor}>
                                <IconButton aria-label="Border">
                                    <Icon fontSize="inherit">border_style</Icon>
                                </IconButton>
                            </Tooltip>

                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={this.handleCloseClick}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>
                        {this.state.layerForm === 'Hexagonal' ?
                            <CardContent style={this.state.selected.length ? styles.content : null}>
                                <FormControl style={styles.select}>
                                    <InputLabel shrink htmlFor="resolution-label">Resolution</InputLabel>
                                    &nbsp;&nbsp;&nbsp;
                                    <Slider
                                        value={this.state.resolution}
                                        min={1}
                                        max={15}
                                        step={1}
                                        onChange={this.handleResolutionChange}
                                    />
                                    <Select
                                        displayEmpty
                                        value={this.state.selected}
                                        onChange={this.handleDatasetChange}
                                        input={<Input id="dataset-label" />}
                                        renderValue={selected => (
                                            selected.length ?
                                                <div style={styles.chipContainer}>
                                                    {Object.keys(this.state.selected).map(item => (
                                                        <Chip key={item} style={styles.chip} label={item} />
                                                    ))}
                                                </div> :
                                                <InputLabel style={styles.placeholder}>Choose layers</InputLabel>
                                        )}
                                    >
                                        {Object.keys(this.state.datasetss).map(item => (
                                            <MenuItem key={item} value={item}>
                                                <Checkbox
                                                    checked={Object.keys(this.state.selected).indexOf(item) > -1}
                                                    color="primary"
                                                    onChange={this.handleDatasetChange}
                                                    value={item}
                                                />
                                                <ListItemText primary={item} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                    <List id="layers" style={styles.layerList}>
                                    {Object.keys(this.state.selected).map(item => (
                                            <ListItem style={styles.layerItem} key={item}>
                                                <ListItemAvatar>
                                                    <Avatar>
                                                        <Icon color="action">layers</Icon>
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText primary={item} />
                                                <ListItemSecondaryAction style={styles.sortAction}>
                                                    <IconButton className="handle" edge="end" aria-label="Sort" disableRipple disableFocusRipple>
                                                        <Icon>menu</Icon>
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                            </CardContent>
                            : <CardContent style={Object.keys(this.state.selected).length ? styles.content : null}>
                                <FormControl style={styles.select}>
                                    <Select
                                        displayEmpty
                                        value={this.state.selected}
                                        onChange={this.handleDatasetChange}
                                        input={<Input id="dataset-label" />}
                                        renderValue={selected => (
                                            selected.length ?
                                                <div style={styles.chipContainer}>
                                                    {Object.keys(this.state.selected).map(item => (
                                                        <Chip key={item} style={styles.chip} label={item} />
                                                    ))}
                                                </div> :
                                                <InputLabel style={styles.placeholder}>Choose layers</InputLabel>
                                        )}
                                    >
                                        {Object.keys(this.state.datasetss).map(item => (
                                            <MenuItem key={item} value={item}>
                                                <Checkbox
                                                    checked={Object.keys(this.state.selected).indexOf(item) > -1}
                                                    color="primary"
                                                    onChange={this.handleDatasetChange}
                                                    value={item}
                                                />
                                                <ListItemText primary={item} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                    <List id="layers" style={styles.layerList}>
                                        {Object.keys(this.state.selected).map(item => (
                                            <ListItem style={styles.layerItem} key={item}>
                                                <ListItemAvatar>
                                                    <Avatar>
                                                        <Icon color="action">layers</Icon>
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText primary={item} />
                                                <ListItemSecondaryAction style={styles.sortAction}>
                                                    <IconButton className="handle" edge="end" aria-label="Sort" disableRipple disableFocusRipple>
                                                        <Icon>menu</Icon>
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                            </CardContent>}
                    </Card>
                </Slide>
            </MuiThemeProvider>
        );
    }
}

export default LayerController;