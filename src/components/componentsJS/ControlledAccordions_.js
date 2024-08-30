import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Backdrop , CircularProgress, InputLabel, Select,TextField, FormControl, MenuItem, Button } from '@material-ui/core';
import Accordion from '@material-ui/core/Accordion';
import { DropzoneArea } from 'material-ui-dropzone';
import { AttachFile, Description, PictureAsPdf, Theaters } from '@material-ui/icons';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: '100%',
  },
  dateInput: {
    width: '100%',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  progressText: {
    marginLeft: theme.spacing(2),
  },
}));

export default function ControlledAccordions({ onSubmit }) {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "2024-04-14",
    endDate: "2024-05-14",
    indexType: 'NDVI',
    aoiDataFiles: []
  });
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

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


  const handleChangeExp = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreviewIcon = (fileObject, classes) => {
    const {type} = fileObject.file
    const iconProps = {
      className : classes.image,
    }
  
    if (type.startsWith("video/")) return <Theaters {...iconProps} />
  
    switch (type) {
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return <Description {...iconProps} />
      case "application/pdf":
        return <PictureAsPdf {...iconProps} />
      default:
        return <AttachFile {...iconProps} />
    }
  }

  const handleFileChange = (name, files) => {
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
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


  const handleSubmit = async () => {
    try {
      setLoading(true);
      setTimer(0);
      const data = new FormData();
      
      data.append('aoiDataFiles', formData.aoiDataFiles[0]);
      data.append('indexType', formData.indexType)
      data.append('startDate', formData.startDate)
      data.append('endDate', formData.endDate)

      const response = await fetch('http://localhost:5004/vegetation_index_change_inspector', {
        method: 'POST',
        body: data
      });

      const result = await response.json();
      console.log(result)
      if (result) {
        console.log('Data sent successfully', result);
        onSubmit(result);
        setLoading(false);
        return true;
      }

    } catch (error) {
      console.error('Failed to send data', error);
    }
  };

  return (
    <div className={classes.root}>
      <Accordion expanded={expanded === 'panel1'} onChange={handleChangeExp('panel1')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1bh-content"
          id="panel1bh-header"
        >
          <Typography className={classes.heading}>Choose a veg index</Typography>
        </AccordionSummary>
        <AccordionDetails>
        <DropzoneArea
            onChange={(files) => handleFileChange('aoiDataFiles', files)}
            acceptedFiles={['.zip']}
            dropzoneText="Area of Interest (AOI)"
            maxFileSize={5000000}
            filesLimit={1}
            getPreviewIcon={handlePreviewIcon}
            />
        </AccordionDetails>
        <AccordionDetails>
          <FormControl className={classes.formControl}>
            <TextField
              label="Start Date"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={classes.dateInput}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="End Date"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={classes.dateInput}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <InputLabel id="index-type-label">Index Type</InputLabel>
            <Select
              labelId="index-type-label"
              id="index-type-select"
              value={formData.indexType}
              onChange={handleChange}
              name="indexType"
            >
              <MenuItem value="NDVI">NDVI</MenuItem>
              <MenuItem value="EVI">EVI</MenuItem>
              <MenuItem value="SAVI">SAVI</MenuItem>
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>
      <Button onClick={handleSubmit} color="primary" variant="contained">Submit Data</Button>
      <Backdrop className={classes.backdrop} open={loading}>
        <CircularProgress color="inherit" />
        <Typography variant="h6" className={classes.progressText}>
          Ejecutando el modelo... {timer}s
        </Typography>
      </Backdrop>
    </div>
  );
}