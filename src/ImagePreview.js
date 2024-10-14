import { useEffect, useState, useHistory, forwardRef } from "react";
import { useStateValue } from './StateProvider';
import Dialog from '@material-ui/core/Dialog'
import { Avatar, IconButton } from '@material-ui/core';
import Slide  from '@material-ui/core/Slide'
import Box from '@material-ui/core/Box';
import { fade, makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import {  Close  } from '@material-ui/icons';


const DialogTransition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
    root: {
      flexGrow: 1,
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
      display: 'none',
      [
        theme.breakpoints.up('sm')]: {
          display: 'block',
      },
    },
  }));


function ImagePreview({ image, handleClose }) {

    const classes = useStyles();

    const saveImage = (url) => {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView?.postMessage(url);
        } else {
            window.open(url);
        }
    }

    return (
    <>
    <Dialog
        fullScreen
        open={true}
        onClose={handleClose}
        TransitionComponent={DialogTransition}
    >
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="relative" style={{ background: '#ededed', color: '#000000' }}>
                <Toolbar>
                <IconButton
                    className={classes.menuButton}
                    color="inherit"
                >
                    <Close onClick={handleClose} />
                </IconButton>
                <Typography className={classes.title} variant="h6" noWrap>
                    Image
                </Typography>
                <Button style={{
                    background: "linear-gradient(0deg, rgba(37,97,235,1), 0%, rgba(7,122,235,1) 100%)",
                    color: "#ffffff"
                }} color="inherit" onClick={() => saveImage(image.src)}>Save Image</Button>
                </Toolbar>
            </AppBar>
        </Box>
        <div style={{
            margin: "auto",
            width: "50%",
            height: "auto"
        }} >{image && image.src && <img style={{
                "width": "100%",
                "height": "auto"
        }}  src = {image.src}  ></img> }</div>
    </Dialog>
    </>
    );
};

export default ImagePreview
