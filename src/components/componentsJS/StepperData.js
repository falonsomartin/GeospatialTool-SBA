import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Backdrop, CircularProgress, Step, Stepper, StepLabel, InputLabel, MenuItem, TextField, Button, Select } from '@material-ui/core';
import { AttachFile, Description, PictureAsPdf, Theaters } from '@material-ui/icons';
import Typography from '@material-ui/core/Typography';
import { DropzoneArea } from 'material-ui-dropzone';

import Plot from 'react-plotly.js';
import shp from 'shpjs';

const steps = ['Select your AOI', 'Choose variable', 'Select data range'];

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& .MuiDropzoneArea-root': {
      minHeight: '100px',
      maxHeight: '200px',
    }
  },
  fileDetails: {
    marginTop: theme.spacing(1),
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0,
    fontWeight: 'bold',
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
  },
  checkBoxContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: '100%',
  },
  inputLabel: {
    marginBottom: theme.spacing(1),
  },
  dateInput: {
    width: '100%',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  foormControl: {
    margin: theme.spacing(3),
  },
  dropzone: {
    minHeight: '191px',
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  progressText: {
    marginLeft: theme.spacing(2),
  },
}));

export default function HorizontalLinearStepperData({ onSubmit }) {
  const classes = useStyles();
  const [numericColumns, setNumericColumns] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [plotData, setPlotData] = useState([]);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    equipmentType: '',
    dataType: ''
  });
  const [dataTypes, setDataTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      startDate: '',
      endDate: '',
      equipmentType: '',
      dataType: ''
    });
    setPlotData([]);
    setIsCompleted(false);  // Reset the completion state
  };

  const handlePreviewIcon = (fileObject, classes) => {
    const { type } = fileObject.file;
    const iconProps = {
      className: classes.image,
    };

    if (type.startsWith("video/")) return <Theaters {...iconProps} />;

    switch (type) {
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return <Description {...iconProps} />;
      case "application/pdf":
        return <PictureAsPdf {...iconProps} />;
      default:
        return <AttachFile {...iconProps} />;
    }
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const processPlotData = (data) => {
    console.log(data.sort((a, b) => a.Date - b.Date))
    const sortedData = data.sort((a, b) => a.Date - b.Date);
    const trace = {
      type: 'scatter',
      mode: 'lines',
      x: sortedData.map(item => new Date(item.Date)),
      y: sortedData.map(item => item.Value),
      name: formData.dataType,
    };
    setPlotData([trace]);
  };

  const layoutWatsat = {
    title: formData.dataType + ' Visualization',
    xaxis: {
      title: 'Date',
      type: 'date'
    },
    yaxis: { title: formData.dataType + ' Content' }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setTimer(0);

      const data = new FormData();
      data.append('aoiDataFiles', formData.aoiDataFiles[0]);
      data.append('varType', formData.dataType);

      const response = await fetch(`http://localhost:5004/spatiotemporal_analysis`, {
        method: 'POST',
        body: data
      });
      setIsCompleted(true);  // Mark the process as completed

      const result = await response.json();
      console.log(result)
      if (result && result.output) {
        console.log(result.output[0])
        //const data = JSON.parse(result.output);
        console.log(data)
        processPlotData(result.output);
      }
    } catch (error) {
      console.error("Failed to fetch data: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timerInterval;
    if (loading) {
      timerInterval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    } else {
      clearInterval(timerInterval);
    }

    return () => clearInterval(timerInterval);
  }, [loading]);

  const handleFileChange = (name, files) => {
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = await shp(event.target.result);
          const columns = data.features.length > 0 ? Object.keys(data.features[0].properties) : [];
          const numericColumns = columns.filter(key => typeof data.features[0].properties[key] === 'number');
          setNumericColumns(numericColumns);
        } catch (error) {
          console.error("Error processing shapefile", error);
        }
      };
      reader.readAsArrayBuffer(files[0]);
    }
    setFormData(prev => ({
      ...prev,
      [name]: files
    }));
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <DropzoneArea
              onChange={(files) => handleFileChange('aoiDataFiles', files)}
              acceptedFiles={['.zip']}
              dropzoneText="Area of Interest (AOI)"
              maxFileSize={5000000}
              filesLimit={1}
              getPreviewIcon={handlePreviewIcon}
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <InputLabel id="data-type-label">Data Type</InputLabel>
            <Select
              labelId="data-type-label"
              id="data-type-select"
              value={formData.dataType}
              onChange={handleChange}
              name="dataType"
              sx={{ width: 200, margin: 1 }}
            >
              <MenuItem value="NDVI">NDVI</MenuItem>
              <MenuItem value="EVI">EVI</MenuItem>
              <MenuItem value="TSAVI">TSAVI</MenuItem>
              <MenuItem value="MSI">MSI</MenuItem>
              <MenuItem value="PRECIPT">PRECIPT</MenuItem>
              <MenuItem value="TREE_COVER">TREE COVER %</MenuItem>
              <MenuItem value="ABVGRND_CARBON">ABVGRND CARBON</MenuItem>
            </Select>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <InputLabel id="data-type-label">Data Range</InputLabel>
            <TextField
              label="Start Date"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ margin: 1 }}
            />
            <TextField
              label="End Date"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ margin: 1 }}
            />
          </Box>
        );
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {!isCompleted && (
        <Stepper activeStep={activeStep} sx={{ width: '80%', marginBottom: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}
      <div>
        {activeStep === steps.length && !loading ? (
          <React.Fragment>
            <Button onClick={handleReset}>Reset</Button>
            <Plot data={plotData} layout={layoutWatsat} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            {getStepContent(activeStep)}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Button disabled={activeStep === 0} onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (activeStep === steps.length - 1) {
                    fetchData();
                  }
                  handleNext();
                }}
              >
                {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </Box>
            {loading && (
              <Backdrop className={classes.backdrop} open={loading}>
                <CircularProgress color="inherit" />
                <Typography variant="h6" className={classes.progressText}>
                  Ejecutando la consulta... {timer}s
                </Typography>
              </Backdrop>
            )}
          </React.Fragment>
        )}
      </div>
    </Box>
  );
}
