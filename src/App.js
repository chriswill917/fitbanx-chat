import { useState, useEffect, memo, useRef } from 'react';
import Sidebar from './Sidebar';
import Chat from './Chat';
import Login from './Login';
import setOnlineStatus from "./setOnlineStatus";
import { Route, useLocation, Redirect } from 'react-router-dom';
import { useStateValue } from './StateProvider';
import LoadingOverlay from 'react-loading-overlay';
import Loader from 'react-loader-spinner';
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import db, { auth, createTimestamp, messaging, getFieldPath } from './firebase';
import { TransitionGroup, Transition, CSSTransition } from "react-transition-group";
import queryString from 'query-string';
import axios from "axios";
import './App.css';
import useRoomsData from './useRoomsData';
import scalePage from "./scalePage";
import useFetchData from "./useFetchData.js";
import Broadcast from './Broadcast';
import { getBroadcastRecipientsLabel } from './utils';


function configureAxios() {
  axios.defaults.baseURL = process.env.REACT_APP_API_URL;
  axios.defaults.headers.common['Authorization'] = null;
  axios.defaults.headers.patch['Content-Type'] = 'application/json';
  axios.defaults.transformResponse = [
    (data) => {
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) { /* Ignore */
          console.warn(e)
        }
      }
      return data;
    }
  ]
}

configureAxios();

function App() {
  const [{ user, path, pathID, roomsData, page }, dispatch, actionTypes] = useStateValue();
  const [loader, setLoader] = useState(true);
  const [pwaEvent, setPwaEvent] = useState(undefined);
  const [updating, setUpdating] = useState(false);
  const [checkingVersion, setCheckingVerison] = useState(false);
  const [chats, setChats] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [clientIds, setClientIds] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [userRole, setUserRole] = useState([]);
  const [chatsFetched, setChatsFetched] = useState();
  const [loginData, setLoginData] = useState({})
  const [isDesktop, setDesktop] = useState(false);
  const location = useLocation();
  const [setRoomsData] = useRoomsData();
  const b = useRef([]);
  const menus = ["/rooms", "/search", "/users", "/chats"];

  useEffect(() => {
    // let reqParams = queryString.parse(location.search);
    // if(reqParams.clientIds) {
    //   const key = "fb_user_id";
    //   let parseClientIds = JSON.parse(reqParams.clientIds);
    //   console.log(parseClientIds);
    //   parseClientIds = [...new Map(parseClientIds.map(item =>
    //     [item[key], item])).values()];
    //   parseClientIds =  parseClientIds.sort((a,b)=> (a.name > b.name ? 1 : -1));
    //   setClientIds(parseClientIds);
    // }
  }, []);

  const searchUser = async(searchTerm, clientIds) => {
    fetchUsers(() => null, [], true, clientIds, true);
  }


  const clientArr = clientIds.map((a) => {
    return a.fb_user_id;
  });


  const [users, fetchUsers] = useFetchData(10, db.collection("users"), true, clientIds, snap => {
      const data = [];
      if (snap.docs.length > 0) {
        snap.docs.forEach((doc) => {
          const id = doc.id > user.uid ? doc.id + user.uid : user.uid + doc.id;
          if (doc.id !== user.uid) {
            data.push({
              ...doc.data(),
              id,
              userID: doc.id,
            });
            setRoomsData(doc.id, id);
          };
        });
      };

      return data;
  }, "users");




  useEffect(() => {
    auth.onAuthStateChanged(authUser => {
      let reqParams = queryString.parse(location.search);
      if (authUser) {
        if (reqParams.userId) {
          localStorage.setItem('userId', reqParams.userId);
          setLoader(true)
          axios
            .get(`/clients/registeredClientIds/${reqParams.userId}`, {})
            .then(res => {
               let { clientIds, name } = res.data;
               const key = "fb_user_id";
               clientIds = [...new Map(clientIds.map(item =>
                [item[key], item])).values()];
               clientIds =  clientIds.sort((a,b)=> (a.name > b.name ? 1 : -1));
               setClientIds(clientIds);
               setLoader(false)
               dispatch({ type: actionTypes.SET_USER, user: authUser });
            })
            .catch(function (error) {
            });


            if(reqParams?.role?.includes('trainer') || reqParams?.role?.includes('brand')) {
              db.collection("broadcast").where('owner', '==', reqParams.userId).get().then(response => {
              const broadcastRooms = response.docs;
              broadcastRooms.forEach((room, index) => {
                setRoomsData(reqParams.userId, room.id)
                setBroadcasts((prev) => {
                  const roomData = room.data();
                  const recipientsInfo = getBroadcastRecipientsLabel(roomData.recipients);
                  const d = {
                    id: room.id,
                    name: recipientsInfo,
                    subtitle: recipientsInfo,
                    photoURL: null,
                    timestamp: roomData.lastMessage?.timestamp || createTimestamp(),
                    unreadMessages: 0,
                    userID: room.id,
                    recipients: roomData.recipients,
                    lastMessage: roomData.lastMessage,
                    isBroadcast: true
                  }
                  const updatedList = [...(prev || []), d];
                  const uniqList = [...new Map(updatedList.map((u) => [u.id, u])).values()].sort((a, b) => b.timestamp - a.timestamp)
                  return uniqList;
                })
              })
            })
          }

        }
        // if (reqParams.clientIds) {
        //   setLoader(false)
        //   dispatch({ type: actionTypes.SET_USER, user: authUser });
        // }
        const ref = db.collection("users").doc(authUser.uid);
        ref.get().then(doc => {
          const data = doc.data();
          if (data) {
            if (data.timestamp) {
              return ref.set({
                photoURL: authUser.photoURL,
              }, { merge: true })
            }
          }
          return ref.set({
            photoURL: authUser.photoURL,
            timestamp: createTimestamp(),
          }, { merge: true })
        });
      } else {
        dispatch({ type: actionTypes.SET_USER, user: null });
        setLoader(false);
      }
    })
  }, [])

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from earing on mobile
      //console.log("pwa event executed");
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setPwaEvent(e);
      // Update UI notify the user they can install the PWA
    });
    window.addEventListener("resize", () => {
      dispatch({ type: "set_scale_page", page: scalePage() });
    })
  }, []);

  useEffect(() => {
    let params = queryString.parse(location.search);
    if(params.logout) {
      localStorage.clear();
       auth.signOut().then((res) => {
        setTimeout(() => {
          document.location.href = params.returnUrl;
        }, 500);
      });
    } else {
      auth.signOut().then((res) => {
        setLoginData({
          ...params
        });
      });
    }

    if(params.platform === "desktop") {
      setDesktop(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (clientIds.length > 0) {
        let clients = clientIds.map(c => c.fb_user_id);
        db.collection("photos").onSnapshot({ includeMetadataChanges: true }, snap => {
          if (snap.docs?.length > 0) {
            let photos = [];
            let isUpdate = false;
            snap.docChanges().forEach(change => {
              const data = change.doc.data();
              if (clients.includes(change.doc.id)) {
                photos.push({
                  ...data,
                  userID: change.doc.id
                });
              }
            });
            setPhotos(photos);
          }
        });
      }
      db.collection("users").doc(user.uid).collection("chats").orderBy("timestamp", "desc").onSnapshot({ includeMetadataChanges: true }, snap => {
        if (snap.docs?.length > 0) {
          snap.docChanges().forEach(change => {
            if (change.type === "added") {
              setRoomsData(change.doc.data().userID, change.doc.id);
            };
          });
          if (!snap.metadata.fromCache || (!window.navigator.onLine && snap.metadata.fromCache)) {
            let chatFilters = [];
            for(let i = 0; i < snap.docs.length; i++) {
              const cur = snap.docs[i];
              const a = cur.data();
              const findIndex = clientIds.findIndex((clientId) => clientId.fb_user_id === a.userID);
              if (findIndex > -1) {
                chatFilters.push({
                  ...a,
                  name: clientIds[findIndex]['name'],
                  id: cur.id
                })
              }
            }
            setChats(chatFilters);
          };
        } else {
          setChats([]);
        };
      });
      fetchUsers(() => null, [], false, clientIds, true);
    };
  }, [user]);

  useEffect(() => {

    let reqParams = queryString.parse(location.search);
    reqParams?.role && setUserRole(reqParams?.role);

    if (reqParams.userId && (reqParams.role?.includes('trainer') || reqParams.role?.includes('brand'))) {
      db.collection("broadcast").where('owner', '==', reqParams.userId).onSnapshot({ includeMetadataChanges: true }, snap => {
          snap.docChanges().forEach(change => {
            if (change.type === "added" || change.type === 'modified') {
              setRoomsData(reqParams.userId, change.doc.id);

              setBroadcasts((prev) => {
                const roomData = change.doc.data();
                const recipientsInfo = getBroadcastRecipientsLabel(roomData.recipients);
                const d = {
                  id: change.doc.id,
                  name: roomData.name || recipientsInfo,
                  subtitle: recipientsInfo,
                  photoURL: null,
                  timestamp: roomData.lastMessage?.timestamp || createTimestamp(),
                  unreadMessages: 0,
                  userID: change.doc.id,
                  recipients: roomData.recipients,
                  lastMessage: roomData.lastMessage || null,
                  isBroadcast: true
                }
                const updatedList = [...(prev || []), d];
                const uniqList = [...new Map(updatedList.map((u) => [u.id, u])).values()].sort((a, b) => b.timestamp - a.timestamp)
                return uniqList;
              });
            } else if(change.type === 'removed') {
              setBroadcasts(prev => [...prev].filter(r => r.id !== change.doc.id));
            }
          });
      })
    }
  }, [location.search])

  useEffect(() => {
    if (chats?.length > 0) {
      let isAnyChat = false;
      if (chats.every(cur => roomsData[cur.id]?.lastMessage)) {
        setChatsFetched(true);
      };
    } else if (chats?.length === 0) {
      setChatsFetched(true);
    }
  }, [chats, roomsData]);

  useEffect(() => {
    var s;
    if (user) {
      setOnlineStatus(user.uid);
    }
    return () => {
      if (s) {
        s();
      };
    };
  }, [user]);


  useEffect(() => {
    var id = location.pathname.replace("/room/", "");
    menus.forEach(cur => id = id.replace(cur, ""))
    dispatch({ type: "set_path_id", id });
  }, [location.pathname]);

  let replacePath = location.pathname.replace("/image", "");
  replacePath = replacePath.replace("/video", "");
  
  return (
    <div className="app" style={{ ...page }} >
      {page.width <= 760 ?
        <Redirect to="/chats" />
        : <Redirect to="/" />}
      {!user && !loader ?
        <Login data={loginData} />
        : user && chatsFetched ?
          <div className="app__body">
            <Sidebar chats={chats} broadcasts={broadcasts} authUser={user} photos={photos}  pwa={pwaEvent} clientIds={clientIds} searchUser={searchUser} users={users} fetchUsers={fetchUsers} userRole={userRole} />
            <TransitionGroup component={null} >
              {page.width <= 760 ?
                <Transition
                  key={location.pathname.replace("/image", "")}
                  timeout={260}
                >
                  {state => {
                    return (
                    <>
                      <Route location={location} exact path={`${path}/room/:roomID`}>
                        <Chat
                          b={b}
                          photos = {photos}
                          isDesktop={isDesktop}
                          unreadMessages={chats?.length > 0 ? chats.find(cur => cur.id === pathID)?.unreadMessages : 0}
                          animState={state}
                        />
                      </Route>
                      <Route location={location} exact path={[
                         `${path}/room/broadcast/:broadcastID`, '/broadcast/room/broadcast/:broadcastID']}>
                        <Broadcast
                          b={b}
                          photos = {photos}
                          isDesktop={isDesktop}
                          unreadMessages={0}
                          animState={state}
                        />
                      </Route>
                    </>)
                   }
                  }
                </Transition>
                :
                <CSSTransition
                  key={location.pathname.replace("/image", "")}
                  timeout={1010}
                  classNames="page"
                >
                  {state => (
                    <>
                      <Route location={location} exact path={`${path}/room/:roomID`}>
                        <Chat
                          b={b}
                          isDesktop={isDesktop}
                          photos = {photos}
                          unreadMessages={chats?.length > 0 ? chats.find(cur => cur.id === pathID)?.unreadMessages : 0}
                          animState={state}
                        />
                      </Route>
                      <Route location={location} exact path={`${path}/room/broadcast/:broadcastID`}>
                        <Broadcast
                          b={b}
                          isDesktop={isDesktop}
                          photos = {photos}
                          unreadMessages={0}
                          animState={state}
                        />
                      </Route>
                    </>
                  )}
                </CSSTransition>
              }
            </TransitionGroup>
          </div> :
            <div>
              <Loader
         type="CradleLoader"
              visible={true}
      />
            </div>
      }
    </div>
  );
}

export default memo(App);
