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

function VideoPreview({ src, handleClose }) {
   
    const classes = useStyles();

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
                    Video
                </Typography>
                </Toolbar>
            </AppBar>
        </Box>
        <div style={{
            margin: "auto",
            width: "50%",
            height: "auto"
        }} ><video style={{
                "width": "100%",
                "height": "auto"
        }} width="400" src = {src} controls ></video></div>
    </Dialog>
    </>
    );
};

export default VideoPreview