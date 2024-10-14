import { useEffect, useState, memo, useRef } from 'react';
import SidebarChat from './SidebarChat';
import { Avatar, IconButton } from '@material-ui/core';
import { Message,  Chat, Home, ExitToApp as LogOut, SearchOutlined, GetAppRounded, Add, QuestionAnswer } from '@material-ui/icons';
import db, { auth, createTimestamp } from "./firebase";
import { useStateValue } from './StateProvider';
import { NavLink, Route, useLocation, useHistory, Switch } from 'react-router-dom';
import './Sidebar.css';
import audio from './notification.mp3'
import announcement from './announcement.png'


function Sidebar({ chats, pwa, rooms, fetchRooms, users, searchUser, authUser, currentUserName, clientIds, fetchUsers, photos, broadcasts, userRole }) {
    const [searchList, setSearchList] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [fliterClientIds, setFilterClientIds] = useState([]);
    const [menu, setMenu] = useState(1);
    const [mounted, setMounted] = useState(false);
    const [{ user, page, pathID }] = useStateValue();
    const [isNewBroadcast, setIsNewBroadcast] = useState(false);
    let history = useHistory()
    const location = useLocation();
    const notification = new Audio(audio);
    const prevUnreadMessages = useRef((() => {
        const data = {};
        chats.forEach(cur => cur.unreadMessages || cur.unreadMessages === 0 ? data[cur.id] = cur.unreadMessages : null);
        return data;
    })());

    var Nav;
    if (page.width > 760) {
        Nav = (props) =>
            <div className={`${props.classSelected ? "sidebar__menu--selected" : ""}`} onClick={props.click}>
                {props.children}
            </div>
    } else {
        Nav = NavLink;
    }

    useEffect(() => {
        setIsNewBroadcast(false);
    }, [location.pathname]);

    async function search(e) {
        if (e) {
            document.querySelector(".sidebar__search input").blur();
            e.preventDefault();
        }
        if ( location.pathname !== '/broadcast' && page.width <= 760) {
            history.push("/search?" + searchInput);
        };
        setSearchList(null);
        if (menu !== 4 && menu !== 5) {
            setMenu(4)
        };
        let filterClientIds = clientIds.filter((clientId) => {
            return clientId.name.toUpperCase().includes(searchInput.toUpperCase());
         });
        if(searchInput === '') {
            filterClientIds = clientIds;
        }
        setFilterClientIds(filterClientIds)
        await searchUser(searchInput, filterClientIds);
    }

    const createChat = () => {
        const roomName = prompt("Type the name of your room");
        if (roomName) {
            db.collection("rooms").add({
                name: roomName,
                timestamp: createTimestamp(),
                lastMessage: "",
            });
        };
    };

    const moveUserChat = () => {
        setSearchInput("");
        fetchUsers(() => null, [], false, clientIds, true);
        setIsNewBroadcast(false);
        setMenu(3);
    }

    const showBroadcast = () => {
        setSearchInput("");
        fetchUsers(() => null, [], false, clientIds, true);
        setIsNewBroadcast(false);
        setMenu(5);
    }

    useEffect(() => {
        const data = {};
        chats.forEach(cur => {
            if (cur.unreadMessages || cur.unreadMessages === 0) {
                if ((cur.unreadMessages > prevUnreadMessages.current[cur.id] || !prevUnreadMessages.current[cur.id] && prevUnreadMessages.current[cur.id] !== 0) && pathID !== cur.id) {
                    notification.play();
                };
                data[cur.id] = cur.unreadMessages;
            };
        });
        prevUnreadMessages.current = data;
    }, [chats, pathID]);

    useEffect(() => {
        if (page.width <= 760 && chats && !mounted) {
            setMounted(true);
            setTimeout(() => {
                document.querySelector('.sidebar').classList.add('side');
            }, 10);
        };
    }, [chats, mounted]);

    const passParentData = (isNewBroadcast) => {
        setIsNewBroadcast(isNewBroadcast)
    }

    return (
        <div className="sidebar" style={{
            minHeight: page.width <= 760 ? page.height : "auto"
        }}>
            <div className="sidebar__header">
                <div className="sidebar__header--left">
                    <Avatar src={user?.photoURL} />
                    <h4>{user?.displayName} </h4>
                </div>
                {/* <div className="sidebar__header--right">
                    <IconButton onClick={() => {
                        if (pwa) {
                            console.log("prompting the pwa event")
                            pwa.prompt()
                        } else {
                            console.log("pwa event is undefined")
                        }
                    }} >
                        <GetAppRounded />
                    </IconButton>
                    <IconButton onClick={() => {
                        auth.signOut();
                        db.doc('/users/' + user.uid).set({ state: "offline" }, { merge: true });
                        history.replace("/chats")
                    }} >
                        <LogOut />
                    </IconButton>

                </div> */}
            </div>

            <div className="sidebar__search">
                <form className="sidebar__search--container" onSubmit={search}>
                <SearchOutlined />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search for users."
                        type="text"
                        disabled={menu === 5 && !isNewBroadcast}
                    />
                    {/* <button style={{ display: "none" }} type="submit" onClick={search}></button> */}
                </form>
            </div>

            <div className="sidebar__menu">
                <Nav
                    classSelected={menu === 1 ? true : false}
                    to="/chats"
                    click={() => {
                        setSearchInput("");
                        setMenu(1)
                    }}
                    activeClassName="sidebar__menu--selected"
                >
                    <div className="sidebar__menu--home">
                        <Home />
                        <div className="sidebar__menu--line"></div>
                    </div>
                </Nav>
                <Nav
                    classSelected={menu === 3 ? true : false}
                    to="/users"
                    click={() => moveUserChat()}
                    activeClassName="sidebar__menu--selected"
                >
                    <div className="sidebar__menu--users">
                        <Chat photos = {photos} />
                        <div className="sidebar__menu--line"></div>
                    </div>
                </Nav>
                {(userRole.includes('trainer') || userRole.includes('brand')) && <Nav
                    classSelected={menu === 5 ? true : false}
                    to="/broadcast"
                    click={() => showBroadcast()}
                    activeClassName="sidebar__menu--selected"
                >
                    <div className="sidebar__menu--users">
                        <img src={announcement} style={{ width: 25, height: 25 }} alt="broadcast" />
                        <div className="sidebar__menu--line"></div>
                    </div>
                </Nav>}
            </div>

            {page.width <= 760 ?
                <>
                    <Switch>
                        <Route path="/users" >
                            <SidebarChat key="users" isNewBroadcast={isNewBroadcast} passParentData={passParentData} photos={photos} fetchList={fetchUsers} clientIds={clientIds} dataList={users} title="New Chat" path="/users" />
                        </Route>
                        <Route path="/search">
                            <SidebarChat key="search" isNewBroadcast={isNewBroadcast} passParentData={passParentData} photos={photos} clientIds={fliterClientIds} fetchList={fetchUsers} dataList={users} title="Search Result" path="/search" />
                        </Route>
                        <Route path="/chats" >
                            <SidebarChat key="chats" isNewBroadcast={isNewBroadcast} passParentData={passParentData} photos={photos} clientIds={clientIds}  dataList={chats} title="Chats" path="/chats" />
                        </Route>
                        <Route path="/broadcast" >
                            <SidebarChat key="broadcast" isNewBroadcast={isNewBroadcast} passParentData={passParentData} broadcasts={broadcasts} photos={photos} fetchList={fetchUsers} clientIds={clientIds} dataList={users} title="Broadcast" path="/broadcast" />
                        </Route>
                    </Switch>
                </>
                :
                menu === 1 ?
                    <SidebarChat key="chats" isNewBroadcast={isNewBroadcast} passParentData={passParentData}  photos={photos} clientIds={clientIds}  dataList={chats} title="Chats" />
                    : menu === 2 ?
                        <SidebarChat key="rooms" isNewBroadcast={isNewBroadcast} passParentData={passParentData}  photos={photos} clientIds={clientIds}  fetchList={fetchRooms} dataList={rooms} title="Rooms" />
                        : menu === 3 ?
                            <SidebarChat key="users" isNewBroadcast={isNewBroadcast} passParentData={passParentData}  photos={photos}  clientIds={clientIds} isSearch={false} fetchList={fetchUsers} dataList={users} title="New Chat" />
                            : menu === 4 ?
                                <SidebarChat key="search" isNewBroadcast={isNewBroadcast}  passParentData={passParentData}  photos={photos} fetchList={fetchUsers} isSearch={true} clientIds={fliterClientIds} dataList={users} title="Search Result" />
                            : menu === 5 ?
                                <SidebarChat key="broadcast" isNewBroadcast={isNewBroadcast} passParentData={passParentData}  broadcasts={broadcasts} photos={photos} fetchList={fetchUsers} isSearch={false} clientIds={clientIds} dataList={users} title="Broadcast" />
                                : null
            }
            {/* <div className="sidebar__chat--addRoom" onClick={createChat}>
                <IconButton >
                    <Add />
                </IconButton>
            </div> */}
        </div>
    );
};

export default memo(Sidebar);
