import React, { useState, useEffect, useLayoutEffect, useRef, memo, useImperativeHandle, forwardRef  } from 'react';
import { Avatar, IconButton } from '@material-ui/core';
import { TransitionGroup, Transition, CSSTransition } from "react-transition-group";
import { AddPhotoAlternate, MoreVert, DoneAllRounded, ArrowDownward, ArrowBack, CameraAlt, Collections, Close  } from '@material-ui/icons';
import { useParams, useRouteMatch, useLocation, Link, Route, useHistory } from 'react-router-dom';
import db, { createTimestamp, fieldIncrement, storage, audioStorage, videoStorage } from "./firebase";
import { useStateValue } from './StateProvider';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Dialog from '@material-ui/core/Dialog'
import Slide  from '@material-ui/core/Slide'
import Box from '@material-ui/core/Box';
import { fade, makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import moment from 'moment'
import { fileTypeFromBlob } from 'file-type';
import CircularProgress from '@material-ui/core/CircularProgress';
import MediaPreview from "./MediaPreview";
import ImagePreview from "./ImagePreview";
import VideoPreview from "./VideoPreview";
import ChatFooter from "./ChatFooter";
import Compressor from 'compressorjs';
import anime from 'animejs/lib/anime.es.js';
import { v4 as uuidv4 } from 'uuid';
import { stringAvatar } from "./utils"
import AudioPlayer from "./AudioPlayer.js"
import './Chat.css';
import audio2 from "./message_sent.mp3";
import audio1 from "./message_received.mp3";
import Webcam from "react-webcam";
import Linkify from 'linkify-react';

const isBase64 = require('is-base64');

const MAX_VIDEO_SIZE = 16777216;    // 16 MB

const VIDEO_UPLOAD_LIMIT_EXCEEDS = 'Video is too large. Please upload a video less than 16 MB.';


const DialogTransition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const WebcamCapture = forwardRef((props, ref) => {

    const webcamRef = React.useRef(null);
    const [imgSrc, setImgSrc] = React.useState(null);


    useImperativeHandle(ref, () => ({
        callCapture() {
            const imageSrc = webcamRef.current.getScreenshot({width: 300, height: 300});
            props.getScreenShot(imageSrc);
        }
    }));

    return (
      <>
        <Webcam
          audio={false}
          ref={webcamRef}
          width={360}
          height={360}
          screenshotFormat="image/jpeg"
        />
      </>
    );
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
    }
  }));

const avtarStyles = makeStyles((theme) => ({
    avtarCls: {
      color: props => {
          return theme.palette.getContrastText(props.color);
      },
      backgroundColor: props => props.backgroundColor
    }
}));

function Chat({ animState, isDesktop, unreadMessages, b, photos }) {
    const [input, setInput] = useState('');
    const { roomID } = useParams();
    const location = useLocation()
    const match = useRouteMatch();
    const [{ dispatchMessages, user, roomsData, page }, dispatch, actionTypes] = useStateValue();
    const [imagePreviewSRC, setImagePreviewSRC] = useState({})
    const [videoPreviewSRC, setVideoPreviewSRC] = useState('')
    const [messages, setMessages] = useState([]);
    const [openMenu, setOpenMenu] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [focus, setFocus] = useState(false);
    const [token, setToken] = useState('');
    const [state, setState] = useState(location.state ? location.state : {});
    const [seen, setSeen] = useState(false);
    const [typing, setTyping] = useState(false);
    const [src, setSRC] = useState('');
    const [videoSrc, setVideoSRC] = useState('');
    const [image, setImage] = useState(null);
    const [isOpenVideoPreview, setOpenVideoPreview] = useState(false);
    const [isOpenImagePreview, setOpenImagePreview] = useState(false);
    const [video, setVideo] = React.useState(null);
    const [writeState, setWriteState] = useState(0);
    const [ratio, setRatio] = useState(false);
    const [scrollArrow, setScrollArrow] = useState(false);
    const [clientWidth, setClientWidth] = useState(null);
    const [firstRender, setFirstRender] = useState(false);
    const [sendAnim, setSendAnim] = useState(false);
    const [limitReached, setLimitReached] = useState(Boolean(dispatchMessages[roomID]?.limitReached));
    const history = useHistory();
    const chatBodyRef = useRef();
    const lastMessageRef = useRef();
    const chatBodyContainer = useRef();
    const chatAnim = useRef();
    const mediaPreview = useRef();
    const prevMessages = useRef([])
    const limit = useRef(30);
    const prevScrollHeight = useRef(null);
    const [audioID, setAudioID] = useState(null);
    const paginating = useRef(null);
    const paginating2 = useRef(null);
    const [paginateLoader, setPaginateLoader] = useState(false);
    const messageSentAudio = new Audio(audio2);
    const messageReceivedAudio = new Audio(audio1);
    const mediaSnap = useRef([]);
    const mediaChecked = useRef(false);
    const classes = useStyles({});

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const [openCameraDialog, setOpenCameraDialog] = useState(false);

    const handleCameraCloseDialog = () => {
        setOpenCameraDialog(false);
    };

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    let photoURL = state?.photoURL;
    const findIndex = photos.findIndex((photo) => photo.userID === state?.userID);
    if (findIndex > -1) {
        photoURL = photos[findIndex]['photoURL'];
    }


    //console.log(match)
    const change = (e) => {
        clearTimeout(writeState);
        setInput(e.target.value);
        if (state?.userID) {
            db.collection("rooms").doc(roomID).set({
                [user.uid]: true,
            }, { merge: true }).then(() => {
                setWriteState(setTimeout(() => {
                    db.collection("rooms").doc(roomID).set({
                        [user.uid]: false,
                    }, { merge: true });
                }, 1000));
            });
        };
    };

    const clickImagePreview = (event, src, ratio) => {
        setOpenImagePreview(true);
        const target = event.target;
        const node = target.parentNode.parentNode;
        const obj = node.getBoundingClientRect();
        setImagePreviewSRC({
    		ratio: ratio,
            top: page.transform === "scale(1)" ? obj.top :  obj.top / (window.innerHeight / page.height),
            left: page.transform === "scale(1)" ? obj.left : obj.left / (window.innerWidth / page.width),
            width: node.offsetWidth,
            height: node.offsetHeight,
            imgW: target.offsetWidth,
            imgH: target.offsetHeight,
            src,
        })
    }

    const clickVideoPreview = (event, src, ratio) => {
        setOpenVideoPreview(true);
        setVideoPreviewSRC(src)
    }



    const close = () => {
        mediaPreview.current.style.animation = "opacity-out 300ms ease forwards";
        setTimeout(() => {
            setImage(null);
            setSRC("");
            setVideo(null);
            setVideoSRC("");
        }, 310);
    };

    const handleFile = event => {
        if (window.navigator.onLine) {
            if (event.target.files[0]) {
                const file = event.target.files[0];
                // if(window.ReactNativeWebView.postMessage) {

                // }
                const patternImage = /image-*/;
                const patternVideo = /video-*/;
                let isImage = false;
                let isVideo = false;
                if (file.type.match(patternImage)) {
                  isImage = true;
                }
                if (file.type.match(patternVideo)) {
                    isVideo = true;
                }
                if(!isImage && !isVideo) {
                    alert("You can upload images or videos");
                    return;
                }
                if(isVideo && file.size > MAX_VIDEO_SIZE){
                    // alert(VIDEO_UPLOAD_LIMIT_EXCEEDS);
                    alert(`Video is too large ${(file.size/1e6).toFixed(2)}MB. Please upload a video less than 16 MB.`);
                    return;
                }
                var reader = new FileReader();
                reader.onload = function () {
                    if(isImage) {
                        setSRC(reader.result)
                    } else {
                        setVideoSRC(reader.result)
                    }
                    setAnchorEl(null);
                }
                reader.readAsDataURL(event.target.files[0]);
                if(isImage) {
                    setImage(event.target.files[0])
                } else {
                    setVideo(event.target.files[0])
                }
            }
        } else {
            alert("No access to internet !!!");
        };
    };
    //window
    const scrollChatBody = () => {
        const nodeArr = Array.from(document.querySelectorAll('.chat__message'));
        const height =  outerHeight(nodeArr[nodeArr.length - 2]) + outerHeight(nodeArr[nodeArr.length - 3]) + outerHeight(nodeArr[nodeArr.length - 4]);
        const lastMHeight = height < page.height / 2 ? height : page.height / 2;
        if (chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight === 0) {
            setTimeout(() => {
                if (chatBodyRef.current) {
                	chatBodyRef.current.style.opacity = "1";
                }
                setFirstRender(true)
            }, animState === "entering" ? 350 : 50);
            setTimeout(() => {
                const node = document.querySelector(".chat .chat__lastMessage");
                if (node) {
                    node.style.animation = "none";
                    node.style.opacity = "1";
                }
            }, 50)
        } else if (chatBodyContainer.current.scrollTop + outerHeight(nodeArr[nodeArr.length - 1]) >=
            (chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight - lastMHeight)
            && messages[messages.length - 1].uid !== user.uid) {
            if (chatBodyContainer.current.scrollTop !== chatBodyContainer.current.scrollHeight) {
                //console.log("scrolling down 1");
                setSendAnim(true);
                anime({
                    targets: chatBodyContainer.current,
                    scrollTop: chatBodyContainer.current.scrollHeight,
                    duration: 800,
                    easing: "linear",
                    complete: function() {
                        setSendAnim(false);
                    }
                });
            };
        } else if (messages[messages.length - 1].uid === user.uid) {
            if (chatBodyContainer.current.scrollTop !== chatBodyContainer.current.scrollHeight) {
                //console.log("scrolling down 2");
                setSendAnim(true);
                anime({
                    targets: chatBodyContainer.current,
                    scrollTop: chatBodyContainer.current.scrollHeight,
                    duration: 800,
                    easing: "linear",
                    complete: function() {
                        setSendAnim(false);
                    }
                });
            }

        } else {
            setScrollArrow(true);
        }
    }

    function outerHeight(el) {
      if (el) {
        var height = el.offsetHeight;
          var style = getComputedStyle(el);

          height += parseInt(style.marginTop) + parseInt(style.marginBottom);
          return height;
      }
      return null;
    }

    const sendMessage = async event => {
        event.preventDefault();
        if (focus) {
            document.querySelector('.chat__footer > form > input').focus();
        }
        let isNoticationSend = false;
        if (input !== "" || (input === "" && (image || video))) {
            const inputText = input;
            const imageToUpload = image
            const videoToUpload = video
            if (imageToUpload || video) {
                close();
            }
            setInput("");
            const roomInfo = {
                lastMessage: imageToUpload ? {
                    message: inputText,
                    audio: false,
                    video: false,
                    image: true,
                    timestamp: createTimestamp(),
                } : videoToUpload ? {
                    message: inputText,
                    audio: false,
                    video: true,
                    image: false,
                    timestamp: createTimestamp(),
                } : {
                    message: inputText,
                    audio: false,
                    video: false,
                    image: false,
                    timestamp: createTimestamp(),
                },
                seen: false,
            }
           db.collection("rooms").doc(roomID).set(roomInfo, { merge: true });
            var split, docName;
            let messageToSend =  {
                name: user.displayName,
                message: input,
                uid: user.uid,
                timestamp: createTimestamp(),
                time: new Date().toUTCString(),
            }
            if(imageToUpload) {
                split = imageToUpload.name.split(".");
                docName = split[0] + uuidv4() + "." + split[1];
                messageToSend = {
                    ...messageToSend,
                    imageUrl: "uploading",
                    imageName: docName,
                    ratio: ratio
                }
            }
            if(videoToUpload) {
                split = videoToUpload.name.split(".");
                docName = split[0] + uuidv4() + "." + split[1];
                messageToSend = {
                    ...messageToSend,
                    videoUrl: "uploading",
                    videoName: docName,
                }
            }
            if (state.userID) {
                db.collection("users").doc(state.userID).collection("chats").doc(roomID).set({
                    timestamp: createTimestamp(),
                    photoURL: user.photoURL ? user.photoURL : null,
                    name: user.displayName,
                    userID: user.uid,
                    unreadMessages: fieldIncrement(1),
                }, { merge: true });
                db.collection("users").doc(user.uid).collection("chats").doc(roomID).set({
                    timestamp: createTimestamp(),
                    photoURL: state.photoURL ? state.photoURL : null,
                    name: state.name,
                    userID: state.userID
                }, { merge: true });
            } else {
                db.collection("users").doc(user.uid).collection("chats").doc(roomID).set({
                    timestamp: createTimestamp(),
                    photoURL: state.photoURL ? state.photoURL : null,
                    name: state.name,
                });
            };
            const doc = await db.collection("rooms").doc(roomID).collection("messages").add(messageToSend);
            if (imageToUpload) {
                if(imageToUpload.isCaptureImage) {
                    setSRC("");
                    setImage(null);
                    await storage.child(docName).putString(imageToUpload.data.split(',')[1], "base64", {contentType: "image/jpg"});
                    const url = await storage.child(docName).getDownloadURL();
                    db.collection("rooms").doc(roomID).collection("messages").doc(doc.id).update({
                        imageUrl: url
                    });
                    if (state.userID) db.collection("notifications").add({
                        userID: user.uid,
                        title: user.displayName,
                        body: inputText,
                        photoURL: user.photoURL,
                        toUserId: state.userID,
                        image: url
                    });
                    isNoticationSend = true;
                } else {
                    new Compressor(imageToUpload, { quality: 0.8, maxWidth: 1920, async success(result) {
                        setSRC("");
                        setImage(null);
                        await storage.child(docName).put(result);
                        const url = await storage.child(docName).getDownloadURL();
                        db.collection("rooms").doc(roomID).collection("messages").doc(doc.id).update({
                            imageUrl: url
                        });
                        if (state.userID) db.collection("notifications").add({
                            userID: user.uid,
                            title: user.displayName,
                            body: inputText,
                            photoURL: user.photoURL,
                            toUserId: state.userID,
                            image: url
                        });
                        isNoticationSend = true;
                    }});
                }
            };
            if(videoToUpload) {
                const data = videoSrc;
                setVideoSRC("");
                setVideo(null);
                await videoStorage.child(docName).putString(data.split(',')[1], "base64", {contentType: "video/mp4"});
                const url = await videoStorage.child(docName).getDownloadURL();
                db.collection("rooms").doc(roomID).collection("messages").doc(doc.id).update({
                    videoUrl: url
                });
                if (state.userID) db.collection("notifications").add({
                    userID: user.uid,
                    title: user.displayName,
                    body: inputText,
                    photoURL: user.photoURL,
                    toUserId: state.userID,
                    video: url
                });
                isNoticationSend = true;
            }
            if(!isNoticationSend && state.userID) {
                db.collection("notifications").add({
                    userID: user.uid,
                    title: user.displayName,
                    body: inputText,
                    photoURL: user.photoURL,
                    toUserId: state.userID,
                });
            }
        };
    };

    const deleteRoom = async () => {
	if (window.navigator.onLine) {
            setOpenMenu(false);
            setDeleting(true);
            try {
                const room = db.collection("rooms").doc(roomID);
                const fetchedMessages = await room.collection("messages").get();
                const fetchedAudios = [];
                const fecthedImages = [];
                fetchedMessages.docs.forEach(doc => {
                    if (doc.data().audioName) {
                        fetchedAudios.push(doc.data().audioName);
                    } else if (doc.data().imageName) {
                        fecthedImages.push(doc.data().imageName);
                    }
                });
                var usersChats = [];
                if (state.userID) {
                    usersChats = [state.userID, user.uid];
                } else {
                    usersChats = [...new Set(fetchedMessages.docs.map(cur => cur.data().uid))];
                };
                await Promise.all([
                    ...fetchedMessages.docs.map(doc => doc.ref.delete()),
                    ...fecthedImages.map(img => storage.child(img).delete()),
                    ...fetchedAudios.map(aud => audioStorage.child(aud).delete()),
                    ...usersChats.map(userChat => db.collection("users").doc(userChat).collection("chats").doc(roomID).delete()),
                    room.delete()
                ]);
                page.width <= 760 ? history.goBack() : history.replace("/chats");
            } catch(e) {
                console.log(e.message);
                page.width <= 760 ? history.goBack() : history.replace("/chats");
            };
        } else {
            alert("No access to internet !!!");
        };
    };

    const handleFocus = () => {
        if (chatBodyContainer.current.scrollTop > chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight - 120) {
            chatBodyContainer.current.scrollTop = chatBodyContainer.current.scrollHeight;
        };
    };

    const isToday = (momentDate) => {
        const today = moment();
        return momentDate.isSame(today, 'd');
    }

    const isPreviousDay = (momentDate, day) => {
        const yesterday = moment().subtract(day, 'day');
        return momentDate.isSame(yesterday, 'd');
    }

    const getDate = (date) => {
        const local = moment(date?.toDate()).local();
        let timestamp = local;
        let timeGroup;
        if(isToday(local)) {
            timestamp = `${local.format('hh:mm A')}`
            timeGroup = `Today`;
        } else if(isPreviousDay(local, 1)) {
            timestamp = `${local.format('hh:mm A')}`
            timeGroup = `Yesterday`;
        } else {
            let isFindWeekDate = false;
            for(let i = 1; i <= 7; i++) {
                if(isPreviousDay(local, i)) {
                    timestamp = `${local.format('hh:mm A')}`;
                    timeGroup = local.format('ddd');
                    isFindWeekDate = true;
                    break;
                }
            }
            if (!isFindWeekDate) {
                timestamp = local.format('hh:mm A');
                timeGroup = local.format('YYYY/MM/DD');
            }
        }
        return {
            timestamp,
            timesGroup: timeGroup
        };
    }

    function fetchMessages(update) {
        const ref = db.collection("rooms").doc(roomID).collection("messages").orderBy("timestamp", "desc");
        if (update) {
            b.current[roomID] = ref.limit(5).onSnapshot(snapshot => {
                const newMessages = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const local = moment(data.timestamp?.toDate()).local();
                    let timesObj = getDate(local);
                    return {
                        ...data,
                        timestamp: timesObj.timestamp,
                        timesGroup: timesObj.timesGroup,
                        id: doc.id,
                    }
                });
                newMessages.reverse();
                dispatch({
                    type: actionTypes.SET_MESSAGES,
                    id: roomID,
                    messages: newMessages,
                    update
                });
            });
        } else {
            ref.limit(limit.current).get().then(docs => {
                const newMessages = [];
                docs.forEach(doc => {
                    const data = doc.data();
                    const time = data.time ? data.time : new Date(data.timestamp?.toDate()).toUTCString()
                    const local = moment(data.timestamp?.toDate()).local();
                    let timesObj = getDate(local);
                    newMessages.push({
                        ...data,
                        timestamp: timesObj.timestamp,
                        timesGroup: timesObj.timesGroup,
                        id: doc.id,
                    });
                });
                newMessages.reverse();
                dispatch({
                    type: actionTypes.SET_MESSAGES,
                    id: roomID,
                    messages: newMessages,
                    update
                });
            });
        };
    }

    function paginate() {
        if (chatBodyContainer.current?.scrollTop === 0 && !limitReached && !paginating.current) {
            setPaginateLoader(true);
            prevScrollHeight.current = chatBodyContainer.current.scrollHeight;
            paginating.current = true;
            paginating2.current = true;
            limit.current = messages.length + limit.current;
            fetchMessages(false);
        } else if (paginating2.current) {
        	prevScrollHeight.current = chatBodyContainer.current.scrollHeight - chatBodyContainer.current.scrollTop;
        };
    };

    useEffect(() => {
        if (messages.length > 0 && !deleting && isDesktop) {
            if (messages[messages.length - 1].id !== prevMessages.current[prevMessages.current?.length - 1]?.id && dispatchMessages[roomID]?.audio) {
                if (messages[messages.length - 1].uid !== user.uid && !paginating2.current && (messages[messages.length - 1].imageUrl === "uploading" || !messages[messages.length - 1].imageUrl)) {
                    messageReceivedAudio.play();
                } else if (messages[messages.length - 1].uid !== user.uid && !paginating2.current && (messages[messages.length - 1].videoUrl === "uploading" || !messages[messages.length - 1].videoUrl)) {
                    messageReceivedAudio.play();
                } else if (messages[messages.length - 1].uid === user.uid && !paginating2.current && (messages[messages.length - 1].imageUrl === "uploading" || !messages[messages.length - 1].imageUrl) && (messages[messages.length - 1].audioUrl === "uploading" || !messages[messages.length - 1].audioUrl)) {
                    messageSentAudio.play();
                };
            };

        };
    }, [messages, deleting, dispatchMessages[roomID]]);

    useEffect(() => {
        if (firstRender && !limitReached) {
            chatBodyContainer.current.addEventListener("scroll", paginate);
        };
        const clean = chatBodyContainer.current;
        return () => {
            clean.removeEventListener("scroll", paginate);
        };
    }, [firstRender, limitReached]);


    useEffect(() => {
        if (limitReached !== dispatchMessages[roomID]?.limitReached) {
            //console.log("setting limit reached: ", Boolean(dispatchMessages[roomID]?.limitReached));
            setLimitReached(Boolean(dispatchMessages[roomID]?.limitReached));
        }
    }, [dispatchMessages[roomID]], limitReached);

    useLayoutEffect(() => {
        //console.log("paginating: ", paginating.current)
        if (messages.length > 0 && paginating.current) {
            if (paginating.current && messages.length > prevMessages.current?.length) {
                chatBodyContainer.current.scrollTop = chatBodyContainer.current.scrollHeight - prevScrollHeight.current;
                paginating.current = false;
                setPaginateLoader(false);
            };
        };
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0) {
            if (!firstRender && chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight !== 0) {
                chatBodyContainer.current.scrollTop = chatBodyContainer.current.scrollHeight;
                setTimeout(() => {
                    const node = document.querySelector(".chat .chat__lastMessage");
                    if (node) {
                        node.style.animation = "none";
                        node.style.opacity = "1";
                    };
                    setTimeout(() => {
                        setFirstRender(true);
                    }, 200);
                }, 50);
            } else {
                //console.log("messages: ", messages);
                //console.log("previous messages: ", prevMessages.current);
                //console.log("paginating2: ", paginating2.current)
                if (!paginating2.current) {
                    scrollChatBody();
                };
            };
        }
    }, [messages]);

    function listenToImg(docID) {
        return db.collection("rooms").doc(roomID).collection("messages").doc(docID).onSnapshot(doc => {
            //console.log("image snap set");
            //console.log("image data: ", doc.data());
            if(doc.data()) {
                const { imageUrl } = doc.data();
                if (imageUrl !== "uploading") {
                    //console.log("dispatching the image");
                    dispatch({
                        type: "update_media",
                        roomID: roomID,
                        id: docID,
                        data: {imageUrl}
                    });
                    //console.log("unsubscribing from image snap: ", docID);
                    mediaSnap.current = mediaSnap.current.filter(cur => {
                        if (cur.id !== docID) {
                            return true;
                        }
                        cur.snap();
                        return false;
                    });
                };
            }
        });
    };

    function listenToAudio(docID) {
        //console.log("listen to audio function")
        const s = db.collection("rooms").doc(roomID).collection("messages").doc(docID).onSnapshot(doc => {
            //console.log("audio snap set");
            //console.log("audio data: ", doc.data());
            if(doc.data()) {
                const {audioUrl, audioPlayed} = doc.data();
                if (audioUrl !== "uploading" || audioPlayed === true) {
                    //console.log("dispatching audio");
                    dispatch({
                        type: "update_media",
                        roomID: roomID,
                        id: docID,
                        data: {
                            audioUrl,
                            audioPlayed
                        }
                    });
                };
                if (audioUrl !== "uploading" && audioPlayed === true) {
                    //console.log("unsubscribing from audio snap: ", docID);
                    mediaSnap.current = mediaSnap.current.filter(cur => {
                        if (cur.id !== docID) {
                            return true;
                        };
                        cur.snap();
                        return false;
                    });
                }
            }
        });
        return s;
    };

    function listenToVideo(docID) {
        //console.log("listen to video function")
        const s = db.collection("rooms").doc(roomID).collection("messages").doc(docID).onSnapshot(doc => {
            //console.log("video snap set");
            //console.log("video data: ", doc.data());

            if(doc.data()) {
                const {videoUrl, videoPlayed, uid} = doc.data();

                if(uid !== user.uid && videoUrl === 'uploading') {
                    return;
                }

                if (videoUrl !== "uploading" || videoPlayed === true) {
                    //console.log("dispatching video");
                    dispatch({
                        type: "update_media",
                        roomID: roomID,
                        id: docID,
                        data: {
                            videoUrl,
                            videoPlayed
                        }
                    });
                };
                if (videoUrl !== "uploading" && videoPlayed === true) {
                    //console.log("unsubscribing from audio snap: ", docID);
                    mediaSnap.current = mediaSnap.current.filter(cur => {
                        if (cur.id !== docID) {
                            return true;
                        };
                        cur.snap();
                        return false;
                    });
                }
            }
        });
        return s;
    };

    useEffect(() => {
        return () => {
            dispatch({type: "set_audio_false", id: roomID});
        };
    }, [roomID]);

    useEffect(() => {
        if (messages.length > 0 && firstRender && !mediaChecked.current) {
            messages.forEach(cur => {
                if (cur.imageUrl === "uploading") {
                    console.log("listening to an image");
                    const x = listenToImg(cur.id);
                    mediaSnap.current.push({
                        snap: x,
                        id: cur.id,
                    });
                } else if (cur.audioUrl === "uploading" || cur.audioPlayed === false) {
                    console.log("listening to audio");
                    const x = listenToAudio(cur.id);
                    mediaSnap.current.push({
                        snap: x,
                        id: cur.id,
                    });
                } else if (cur.videoUrl === "uploading" || cur.videoPlayed === false) {
                    console.log("listening to video");
                    const x = listenToVideo(cur.id);
                    mediaSnap.current.push({
                        snap: x,
                        id: cur.id,
                    });
                };
            });
            mediaChecked.current = true;
        } else if (messages.length > prevMessages.current.length && firstRender && mediaChecked.current) {
            //console.log("checking updates")
            let init = 0;
            let stop = messages.length - prevMessages.length;
            if (prevMessages.current[0]?.id === messages[0].id) {
	            init = prevMessages.current.length;
	            stop = messages.length;
            }
            for (var i = init; i < stop; i++) {
                if (messages[i].imageUrl === "uploading") {
                    console.log("listening to an image 1");
                    const x = listenToImg(messages[i].id);
                    mediaSnap.current.push({
                        snap: x,
                        id: messages[i].id,
                    });
                } else if (messages[i].audioUrl === "uploading" || messages[i].audioPlayed === false) {
                    console.log("listening to audio 1");
                    const x = listenToAudio(messages[i].id);
                    mediaSnap.current.push({
                        snap: x,
                        id: messages[i].id,
                    });
                } else if (messages[i].videoUrl === "uploading" || messages[i].videoPlayed === false) {
                    console.log("listening to video 1");
                    const x = listenToVideo(messages[i].id);
                    mediaSnap.current.push({
                        snap: x,
                        id: messages[i].id,
                    });
                };
            };
        };
    }, [messages, firstRender]);

    useEffect(() => {
        return () => {
            //console.log("cleaning media snap");
            mediaSnap.current.forEach(cur => cur.snap());
            setFirstRender(false)
        };
    }, [roomID]);

    useEffect(() => {
        paginating2.current = paginating.current;
        prevMessages.current = [...messages];
    }, [messages]);

    useEffect(() => {
        if (roomID && !deleting) {
            if (b.current[roomID]) {
                //console.log("snapshot listener already exists");
                b.current[roomID]();
            }
            //console.log("first message from fetch effect: ", dispatchMessages[roomID]?.firstMessageID);
            if (dispatchMessages[roomID]?.firstMessageID) {
                fetchMessages(true);
            } else {
                db.collection("rooms").doc(roomID).collection("messages").orderBy("timestamp", "asc").limit(1).get().then(docs => {
                        //console.log("doc: ", docs);
                        if (docs.empty) {
                            dispatch({
                                type: "set_firstMessage",
                                id: roomID,
                                firstMessageID: "no id",
                            });
                        } else {
                            docs.forEach(doc => {
                                //console.log("doc.exists: ", doc.exists);
                                //console.log("first document id: ", doc.id);
                                //console.log("first document data: ", doc.data());
                                dispatch({
                                    type: "set_firstMessage",
                                    id: roomID,
                                    firstMessageID: doc.id,
                                });
                            });
                        };
                    fetchMessages(false);
                    fetchMessages(true);
                });
            };
        };
    }, [roomID, deleting]);

    useEffect(() => {
        if (src !== "") {
            setTimeout(() => {
                const width = document.querySelector('.mediaPreview img').clientWidth;
                const height = document.querySelector('.mediaPreview img').clientHeight;
                setRatio(height / width);
            }, 1000)
        }
    }, [src])

    useEffect(() => {
        setClientWidth(document.querySelector('.chat__body--container').clientWidth)
    }, []);
    //window
    useEffect(() => {
        if (animState === "entering" && page.width <= 760) {
            setTimeout(() => {
                document.querySelector(".chat").classList.add('chat-animate');
            }, 0)
        } else if (animState === "entered" && state?.name && page.width <= 760) {
            setTimeout(() => {
                document.querySelector('.sidebar').classList.remove('side');
            }, 50)
        } else if (animState === "exiting" && page.width <= 760 ) {
            setTimeout(() => {
                document.querySelector(".chat")?.classList.remove('chat-animate');
                setTimeout(() => {
                    document.querySelector('.sidebar').classList.add('side');
                }, 10)
            }, 0)
        }
    }, [animState])

    useEffect(() => {
        if (!location.state && roomID) {
            const userID = roomID?.replace(user.uid, "");
            db.collection("users").doc(userID).get().then(doc => {
                const data = doc.data();
                setState(data?.name ? {
                    name: data.name,
                    photoURL: data.photoURL,
                    userID,
                } : {
                        userID,
                    })
            })
        } else {
            setState(location.state)
        }
    }, [location.state, roomID])

    useEffect(() => {
        if (state?.userID) {
            db.collection("users").doc(state.userID).onSnapshot(doc => {
                if (doc.data()?.token) {
                    setToken(doc.data().token);
                };
            });
        };
    }, [state]);

    useEffect(() => {
        if (roomID && state?.userID) {
            console.log(roomID);
            var h = db.collection("rooms").doc(roomID).onSnapshot(snap => {
                if (snap.data()) {
                    setTyping(snap.data()[state.userID]);
                }
            })
        }

        return () => {
            if (h) h();
        }
    }, [roomID, state])

    useEffect(() => {
        if (roomID) {
            var z = db.collection("rooms").doc(roomID).onSnapshot(snap => {
                setSeen(snap.data()?.seen);
            })
        }

        return () => {
            if (z) {
                z();
            }
        }
    }, [roomID])

    //setSender
    //window
    useEffect(() => {
        var a = () => {
            const nodeArr = Array.from(document.querySelectorAll('.chat__message'));
            const height = outerHeight(nodeArr[nodeArr.length - 1]) + outerHeight(nodeArr[nodeArr.length - 2]) + outerHeight(nodeArr[nodeArr.length - 3]) + outerHeight(nodeArr[nodeArr.length - 4]);
            const lastMHeight = height < page.height / 2 ? height : page.height / 2;
            if (chatBodyContainer.current?.scrollTop <= (chatBodyContainer.current?.scrollHeight - chatBodyContainer.current?.offsetHeight - lastMHeight)) {
                setScrollArrow(true)
            } else {
                setScrollArrow(false)
            }
            const scrollTop = Math.round(chatBodyContainer.current.scrollTop);
            const scrollHeight = chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight;
            if ((scrollTop === scrollHeight || scrollTop + 1 === scrollHeight || scrollTop - 1 === scrollHeight) && (chatBodyRef.current.style.opacity === "0" || chatBodyRef.current.style.opacity === "")) {
                setTimeout(() => {
                	if (chatBodyRef.current) {
                		chatBodyRef.current.style.opacity = "1";
                	}
                }, animState === "entering" ? 350 : 50)
            }
            if (messages.length > 0) {
                if (chatBodyContainer.current.scrollTop > chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight - 180
                    && state.userID && !seen && messages[messages.length - 1].uid !== user.uid) {
                    console.log("setting seen true with event");
                    db.collection("rooms").doc(roomID).set({
                        seen: true,
                    }, { merge: true });
                }
                if (chatBodyContainer.current.scrollTop > chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight - 180
                    && state.userID) {
                    db.collection("users").doc(user.uid).collection("chats").doc(roomID).set({
                        unreadMessages: 0,
                    }, { merge: true });
                };
            };
        };
        chatBodyContainer.current.addEventListener('scroll', a);
        const ref = chatBodyContainer.current;

        return () => {
            ref.removeEventListener("scroll", a)
        }
    }, [messages, state, user.uid, roomID, seen]);


    //setting seen and unreadMessages when chat is unscrollable
    useEffect(() => {
        if (messages.length > 0) {
            if (chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight === 0 && messages[messages.length - 1].uid !== user.uid) {
                const lastMesage =  messages[messages.length - 1];
                if((lastMesage.imageUrl === 'uploading' || lastMesage.videoUrl === 'uploading')) {
                    db.collection("rooms").doc(roomID).set({
                        seen: true,
                    }, { merge: true });
                }
            };
        };
    },[messages]);

    useEffect(() => {
		if (messages.length > 0) {
            if (chatBodyContainer.current.scrollHeight - chatBodyContainer.current.offsetHeight === 0
                && state.userID) {
                db.collection("users").doc(user.uid).collection("chats").doc(roomID).set({
                    unreadMessages: 0,
                }, { merge: true });
            }
        }
    }, [messages, state]);

    useEffect(() => {
        if (dispatchMessages[roomID]?.messages) {
            setMessages(dispatchMessages[roomID].messages);
        };
    }, [dispatchMessages[roomID]]);

    const handleCamera = () => {
        setOpenCameraDialog(true);
        handleClose();
    }

    const webCapture = useRef();

    const captureImage = () => {
        webCapture.current.callCapture()
    }

    const getScreenShot = (str) => {
        if(isBase64(str, {allowMime: true})) {
            setSRC(str)
            setImage({
                isCaptureImage: true,
                data: str,
                name: 'capture.png'
            })
        }
        handleCameraCloseDialog();
    }

    const widthRatio = 0.7;

    let dates = [];

    const StyledAvatar = ({ children, ...props }) => {
        const { avtarCls } = avtarStyles(props);
        return(<Avatar className={avtarCls}>
            {children}
        </Avatar>)
    };

    let avtarStyle;
    if (photoURL === null && state.name !== null) {
        avtarStyle = stringAvatar(state.name);
    }

    const linkProps = {
        target: '_blank',
        style: {
            cursor: 'pointer',
            color: '#027eb5',
            'text-decoration': 'underline'
        },
        onClick: (event) => {
            if (window.ReactNativeWebView) {
                event.preventDefault();
                const href = event.target.href;
                window.ReactNativeWebView?.postMessage(href);
            }
        }
    };

    const validURL = (str) => {
        var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
          '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
          '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
          '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
          '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
          '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
        return !!pattern.test(str);
    }

    return (
        <>
        <div style={!roomID ? { display: "none"} : {}} ref={chatAnim} className="chat">
            <div style={{
                height: page.height,
            }} className="chat__background">

            </div>
            <div className="chat__header">
                {page.width <= 760 ?
                    <IconButton onClick={() => setTimeout(() => history.goBack(), 150)}>
                        <ArrowBack />
                        <div className="avatar__container">
                        { photoURL &&
                            <Avatar  src={`${photoURL}`} />
                        }
                        { photoURL === null && state.name === null &&
                            <Avatar  />
                        }
                        { photoURL === null && state.name !== null &&
                             <StyledAvatar {...avtarStyle} />
                        }
                            {roomsData[roomID]?.onlineState === "online" ? <div className="online"></div> : null}
                        </div>

                    </IconButton>
                :
                    <div className="avatar__container">

                        { photoURL &&
                            <Avatar  src={`${photoURL}`} />
                        }
                        { photoURL === null && state.name === null &&
                            <Avatar  />
                        }
                        { photoURL === null && state.name !== null &&
                              <StyledAvatar {...avtarStyle} />
                        }
                        {roomsData[roomID]?.onlineState === "online" ? <div className="online"></div> : null}
                    </div>
                }
                <div className="chat__header--info">
                    <h3 style={page.width <= 760 ? {width: page.width - 165 } : {}}>{state?.name} </h3>
                    <p style={page.width <= 760 ? {width: page.width - 165 } : {}}>{typing === "recording" ? "Recording ..." : typing ? "Typing ..." : messages?.length > 0 ? "Seen at " + `${messages[messages.length - 1]?.timesGroup} ${messages[messages.length - 1]?.timestamp}` : ""} </p>
                </div>

                <div className="chat__header--right">

                <Dialog
                    fullScreen
                    open={openCameraDialog}
                    onClose={handleCameraCloseDialog}
                    TransitionComponent={DialogTransition}
                >
                    <Box sx={{ flexGrow: 1 }}>
                        <AppBar elevation={1} position="relative" style={{ background: '#ededed', color: '#000000' }}>
                            <Toolbar>
                            <IconButton
                                className={classes.menuButton}
                                color="inherit"
                            >
                                <Close onClick={handleCameraCloseDialog} />
                            </IconButton>
                            <Typography className={classes.title} variant="h6" noWrap>
                                Camera
                            </Typography>
                                <Button style={{
                                    background: "linear-gradient(0deg, rgba(37,97,235,1), 0%, rgba(7,122,235,1) 100%)",
                                    color: "#ffffff"
                                }} color="inherit" onClick={captureImage}>Capture</Button>
                            </Toolbar>
                        </AppBar>
                    </Box>
                    <div style={{
                        margin: "0 auto"
                    }} ><WebcamCapture getScreenShot = {getScreenShot} ref={webCapture} ></WebcamCapture></div>
                </Dialog>
                    <IconButton>
                            <AddPhotoAlternate onClick={handleClick} />
                            <Menu
                                id="basic-menu"
                                anchorEl={anchorEl}
                                open={open}
                                onClose={handleClose}
                                MenuListProps={{
                                'aria-labelledby': 'basic-button',
                                }}
                            >
                            { isDesktop &&
                                <MenuItem onClick={handleCamera}><CameraAlt></CameraAlt>  Camera</MenuItem>
                            }
                                <MenuItem >
                                <label style={{ cursor: "pointer", height: 24 }} htmlFor="attach-media">
                                    <input id="attach-media" style={{ display: "none" }} accept="image/*,video/*" type="file" onChange={handleFile} />
                                    <Collections></Collections> <span style={{
                                        top: "-10px",
                                        position: "relative"
                                    }}>Gallery</span>
                                </label>
                                </MenuItem>
                            </Menu>
                    </IconButton>

                    <IconButton aria-controls="menu" aria-haspopup="true" onClick={event => setOpenMenu(event.currentTarget)}>
                        <MoreVert />
                    </IconButton>
                    <Menu
                        anchorEl={openMenu}
                        id={"menu"}
                        open={Boolean(openMenu)}
                        onClose={() => setOpenMenu(null)}
                        keepMounted
                    >
                        <MenuItem onClick={deleteRoom}>Delete Chat</MenuItem>
                    </Menu>
                </div>
            </div>

            <div className="chat__body--container" ref={chatBodyContainer}>
                <div className="chat__body" ref={chatBodyRef}>
                    <div
                        className="loader__container paginateLoader"
                        style={{
                            height: !limitReached ? 70 : 30,
                        }}
                    >
                        {paginateLoader && !limitReached ? <CircularProgress /> : null}
                    </div>
                    {messages.map((message, i, messageArr) => {

                        let timeGroup;
                        if(!dates.includes(message.timesGroup)) {
                            timeGroup = message.timesGroup
                            dates.push(message.timesGroup);
                        }

                        const style = message.imageUrl ? {
                            marginBottom: !messageArr[i + 1] ? 0 : message.uid !== messageArr[i + 1].uid ? 30 : 8,
                            width: clientWidth * widthRatio + 20,
                            maxWidth: 320,
                        } : {
                                marginBottom: !messageArr[i + 1] ? 0 : message.uid !== messageArr[i + 1].uid ? 30 : 8,
                                width: clientWidth * widthRatio + 20,
                                maxWidth: 320,
                            }

                        if(page.width < 760) {
                            style.marginTop = "10px"
                        }

                        if((message.imageUrl === 'uploading' || message.videoUrl === 'uploading') && message.uid !== user.uid) {
                             return null
                        }
                        return (
                            <>
                            { timeGroup &&
                              <div class="divider" style={{'zIndex': 9999}}>
                                <span>{timeGroup}</span>
                              </div>
                            }
                            <div style={style} ref={i === messages.length - 1 && !(seen && messages[messages.length - 1].uid === user.uid) ? lastMessageRef : null} key={message.id} className={`chat__message ${message.uid === user.uid && "chat__reciever"} ${i === messages.length - 1 ? "chat__lastMessage" : ""}`}>
                                {message.imageUrl === "uploading" ?
                                    <div
                                        style={{
                                            width: clientWidth * widthRatio,
                                            height: message.ratio <= 1 ?
                                                    clientWidth * widthRatio > 300 ?
                                                        300 * message.ratio : clientWidth * widthRatio * message.ratio :
                                                    clientWidth * widthRatio < 300 ? clientWidth * widthRatio : 300,
                                        }}
                                        className="image-container"
                                    >
                                        <div className="image__container--loader">
                                            <CircularProgress style={{ width: page.width <= 760 ? 40 : 80, height: page.width <= 760 ? 40 : 80 }} />
                                        </div>
                                    </div>
                                    : message.imageUrl ?
                                        <div
                                            className="image-container"
                                            style={{
                                                width: clientWidth * widthRatio,
                                                height: message.ratio <= 1 ?
                                                        clientWidth * widthRatio > 300 ?
                                                            300 * message.ratio : clientWidth * widthRatio * message.ratio :
                                                        clientWidth * widthRatio < 300 ? clientWidth * widthRatio : 300,
                                            }}
                                        >
                                                <img onClick={(e) => clickImagePreview(e, message.imageUrl, message.ratio)} src={message.imageUrl} alt="" />
                                        </div>
                                        : null
                                }


                                { message.videoUrl === "uploading" ?
                                    <div
                                        style={{
                                            width: clientWidth * widthRatio,
                                            height: message.ratio <= 1 ?
                                                    clientWidth * widthRatio > 300 ?
                                                        300 * message.ratio : clientWidth * widthRatio * message.ratio :
                                                    clientWidth * widthRatio < 300 ? clientWidth * widthRatio : 300,
                                        }}
                                        className="image-container"
                                    >
                                        <div className="image__container--loader">
                                            <CircularProgress style={{ width: page.width <= 760 ? 40 : 80, height: page.width <= 760 ? 40 : 80 }} />
                                        </div>
                                    </div>
                                    : message.videoUrl ?
                                        <div
                                            className="image-container"
                                            style={{
                                                width: clientWidth * widthRatio,
                                                height: message.ratio <= 1 ?
                                                        clientWidth * widthRatio > 300 ?
                                                            240 * message.ratio : clientWidth * widthRatio * message.ratio :
                                                        clientWidth * widthRatio < 300 ? clientWidth * widthRatio : 240,
                                            }}
                                        >
                                                <video width="320" onClick={(e) => clickVideoPreview(e, message.videoUrl, message.ratio)} height="240" playsinline  preload="metadata"  key={message.videoUrl} src={`${message.videoUrl}#t=0.2`} alt="" />
                                        </div>
                                        : null
                                }



                                {message.audioName ?
                                    <AudioPlayer sender={message.uid === user.uid} roomID={roomID} animState={animState} setAudioID={setAudioID} audioID={audioID} id={message.id} audioUrl={message.audioUrl} audioPlayed={message.audioPlayed} />
                                :
                                    <span className="chat__message--message" style={{
                                        display: 'block'
                                    }}>
                                        <Linkify options={{ attributes: linkProps }}>
                                            {message.message}
                                        </Linkify>
                                        {/* {message.message} */}
                                    </span>
                                }


                                <span className="chat__timestamp">
                                    {message.timestamp}
                                </span>
                            </div>
                            </>
                        )
                    })}
                    {messages.length > 0 ?
                        <CSSTransition
                            in={seen && messages[messages.length - 1].uid === user.uid}
                            timeout={200}
                            classNames="seen-animate"
                            appear={true}
                        >
                            <p className="seen" >
                                <p><span>Seen <DoneAllRounded /></span></p>
                            </p>
                        </CSSTransition>
                    : null}
                </div>
            </div>
            {src !== "" && <MediaPreview close={close} mediaPreview={mediaPreview} setSRC={setSRC}  src={src} docType="image"/> }
            {videoSrc !== "" && <MediaPreview close={close} mediaPreview={mediaPreview} setSRC={videoSrc} src={videoSrc} docType="video" /> }


            <ChatFooter
                input={input}
                handleFocus={handleFocus}
                change={change}
                sendMessage={sendMessage}
                setFocus={setFocus}
                image={image}
                video={video}
                focus={focus}
                state={state}
                token={token}
                roomID={roomID}
                setAudioID={setAudioID}
            />
            <div></div>

            <CSSTransition
                in={firstRender && scrollArrow && !sendAnim}
                classNames="scroll"
                timeout={310}
                unmountOnExit
            >
                <div className="scroll" onClick={() =>
                    anime({
                        targets: chatBodyContainer.current,
                        scrollTop: chatBodyContainer.current.scrollHeight,
                        duration: 1000,
                        easing: "linear",
                    })}
                >
                    <ArrowDownward style={{
                        width: 22,
                        height: 22,
                        color: "black",
                    }} />
                    {unreadMessages ? <div><span>{unreadMessages}</span></div> : null}
                </div>
            </CSSTransition>
            {deleting ?
                <div className="chat__deleting">
                    <CircularProgress />
                </div> : null
            }
            { isOpenVideoPreview &&
                <VideoPreview src={videoPreviewSRC} handleClose={() => setOpenVideoPreview(false)}/>
            }
            { isOpenImagePreview &&
                 <ImagePreview
                    image={imagePreviewSRC}
                    handleClose={() => setOpenImagePreview(false)}
                    animState={animState}
             />
            }
        </div>
        </>
    )
}

export default memo(Chat);
