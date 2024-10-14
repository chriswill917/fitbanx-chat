import { useEffect, memo, useRef, useState } from 'react';
import { Avatar, Button, Chip, Fab, Typography } from '@material-ui/core';
import { makeStyles, createStyles, withStyles } from '@material-ui/core/styles';

import {
	Add,
	CancelOutlined,
	Check,
	Clear,
	SearchOutlined,
	Photo,
	MicRounded,
	Videocam,
} from '@material-ui/icons';
import './SidebarChat.css';
import { getBroadcastRecipientsLabel, stringAvatar } from './utils';
import { Link, useHistory } from 'react-router-dom';
import CircularProgress from '@material-ui/core/CircularProgress';
import { useStateValue } from './StateProvider';
import Pagination from 'material-ui-flat-pagination';
import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { fade } from '@material-ui/core/styles/colorManipulator';
import ArrowBack from '@material-ui/icons/ArrowBack';
import ArrowForward from '@material-ui/icons/ArrowForward';
import blue from '@material-ui/core/colors/blue';
import deepOrange from '@material-ui/core/colors/deepOrange';
import green from '@material-ui/core/colors/green';
import announcement from './announcement.png';

import moment from 'moment';
import db from './firebase';
import useRoomsData from './useRoomsData';

const theme = createMuiTheme();

const createBroadcastRoom = () => {
	const trainerId = localStorage.getItem('userId');
	if(trainerId) {
		return `${trainerId}__broadcast_${Date.now()}`
	}
	return null;
}

const useAvatarStyles = makeStyles(theme => ({
	avtarCls: {
		color: props => {
			return props.color ? theme.palette.getContrastText(props.color) : undefined;
		},
		backgroundColor: props => props.backgroundColor,
	},
}));

const useStyles = makeStyles(theme => ({
	fab: {
		position: 'absolute',
		bottom: 40,
		right: 40,
		backgroundColor: 'green',
		zIndex: 99
	},
}));

const styles = theme =>
	createStyles({
		paperRoot: {
			margin: theme.spacing(2),
			padding: theme.spacing(2),
			textAlign: 'center',
		},
		root: {
			textAlign: 'center',
		},
		colorInheritCurrent: {
			color: deepOrange.A200,
			'&:hover': {
				backgroundColor: fade(
					deepOrange.A200,
					theme.palette.action.hoverOpacity
				),
			},
		},
		colorInheritOther: {
			color: green['500'],
			'&:hover': {
				backgroundColor: fade(green['500'], theme.palette.action.hoverOpacity),
			},
		},
	});

//window
function SidebarChat({
	dataList,
	title,
	path,
	fetchList,
	clientIds,
	isSearch,
	photos,
	classes,
	broadcasts,
	passParentData,
	isNewBroadcast
}) {
	const [{ roomsData, page, pathID }, dispatch] = useStateValue();
	const [scrollFetch, setScrollFetch] = useState(false);
	const [list, setList] = useState(null);
	const [broadcastUsers, setBroadcastUsers] = useState([]);
	const sidebarChatContainer = useRef();
	const [offset, setOffSet] = useState(0);
	const [isLoader, setLoader] = useState(false);

	const history = useHistory();
	const broadcastRoomID = useRef(null);
	const [setRoomsData] = useRoomsData();

	const { paperRoot, ...paginationClasses } = classes;

	const classNames = useStyles();

	const paperClasses = {
		root: paperRoot,
	};

	useEffect(() => {
		if(title === 'Broadcast' && !broadcastRoomID.current) {
			broadcastRoomID.current = createBroadcastRoom();
		}
	}, [title]);

	useEffect(() => {
		setLoader(false);
	}, [dataList, fetchList, photos]);

	useEffect(() => {
		if (dataList?.length === list?.length) {
			setTimeout(() => {
				Array.from(document.querySelectorAll('.animate')).forEach((cur, i) => {
					setTimeout(() => {
						cur.classList.remove('animate');
					}, 50 * i);
				});
			}, 10);
		}
	}, [dataList, list, broadcasts, isNewBroadcast]);

	const isToday = momentDate => {
		const today = moment();
		return momentDate.isSame(today, 'd');
	};

	const isPreviousDay = (momentDate, day) => {
		const yesterday = moment().subtract(day, 'day');
		return momentDate.isSame(yesterday, 'd');
	};

	const getDate = date => {
		const local = moment(date?.toDate()).local();
		let timestamp = local;
		if (isToday(local)) {
			timestamp = `${local.format('hh:mm A')}`;
		} else if (isPreviousDay(local, 1)) {
			timestamp = `Yesterday`;
		} else {
			let isFindWeekDate = false;
			for (let i = 1; i <= 7; i++) {
				if (isPreviousDay(local, i)) {
					timestamp = local.format('ddd');
					isFindWeekDate = true;
					break;
				}
			}
			if (!isFindWeekDate) {
				timestamp = local.format('YYYY/MM/DD');
			}
		}
		return timestamp;
	};

	const StyledAvatar = ({ children, ...props }) => {
		const { avtarCls } = useAvatarStyles(props);
		return <Avatar className={avtarCls}>{children}</Avatar>;
	};

	const onSelectBroadcastUsers = (data, isSelected) => {
		setBroadcastUsers(prev =>
			isSelected
				? [...prev].filter(item => item.roomID !== data.roomID)
				: [...prev, data]
		);
	};

	const getUserRow = ({ lastMessage, onlineState, photoURL, avtarStyle, data, selectedRoomIds }) => {

		let avatar = <Avatar />;

		if (photoURL) avatar = <Avatar style={{ width: 45, height: 45 }}src={`${photoURL}`} />;
		else if (data.name) avatar = <StyledAvatar {...avtarStyle} />;

		if (selectedRoomIds.includes(data.id)) avatar = <Avatar><Check /></Avatar>;

		return (
			<div className={`sidebar__chat animate`}>
				<div className="avatar__container">
					{avatar}
					{onlineState === 'online' ? (
						<div className="online"></div>
					) : null}
				</div>
				<div className="sidebar__chat--info">
					<h2
						dangerouslySetInnerHTML={{
							__html: title === 'Search Result' ? data.name : data.name,
						}}
						style={{
							width:
								page.width <= 760
									? page.width - 126
									: page.width * 0.315 - 126,
							marginBottom: lastMessage?.message || lastMessage ? 8 : 0,
						}}
					></h2>
					<p
						style={{
							width:
								page.width <= 760
									? page.width - 126
									: page.width * 0.315 - 126,
						}}
					>
						{lastMessage?.image ? (
							<>
								<Photo style={{ width: 19, height: 19 }} />{' '}
								<span
									style={{
										width:
											page.width <= 760
												? page.width - 150
												: page.width * 0.315 - 150,
									}}
								>
									{lastMessage.message}
								</span>{' '}
							</>
						) : lastMessage?.audio ? (
							<>
								<MicRounded style={{ width: 19, height: 19 }} />
								<span
									style={{
										width:
											page.width <= 760
												? page.width - 150
												: page.width * 0.315 - 150,
									}}
								></span>
							</>
						) : lastMessage?.video ? (
							<>
								<Videocam style={{ width: 19, height: 19 }} />
								<span
									style={{
										width:
											page.width <= 760
												? page.width - 150
												: page.width * 0.315 - 150,
									}}
								>
									Video
								</span>
							</>
						) : lastMessage?.message ? (
							<>
								<span
									style={{
										width:
											page.width <= 760
												? page.width - 150
												: page.width * 0.315 - 150,
									}}
								>
									{lastMessage.message}
								</span>{' '}
							</>
						) : (
							''
						)}
					</p>
				</div>
				<div className="sidebar__chat--lastMessageDate">
					<div>
						{lastMessage &&
							lastMessage.timestamp &&
							getDate(lastMessage.timestamp)}
					</div>
				</div>
				{data?.unreadMessages && pathID !== data.id ? (
					<div className="sidebar__chat--unreadMessages">
						<div>{data.unreadMessages}</div>
					</div>
				) : null}
			</div>
		)
	}

	// scroll selected broadcast users horizontal list
	useEffect(() => {
		if (title === 'Broadcast' && broadcastUsers.length) {
			const element = document.querySelector('.sidebar__chat--broadcast-row');
			if (element) {
				const scrollWidth = element.scrollWidth;
				element.scrollTo(scrollWidth, 0);
			}
		}
	}, [title, broadcastUsers]);

	useEffect(() => {
		if (dataList) {
			const arr = [];
			const selectedRoomIds =
				title === 'Broadcast' ? broadcastUsers.map(item => item.roomID) : [];
			dataList.forEach(data => {
				if (data) {
					const onlineState = roomsData[data.id]?.onlineState
						? roomsData[data.id].onlineState
						: data.state;
					const lastMessage =
						title === 'Search Result'
							? null
							: roomsData[data.id]?.lastMessage
							? roomsData[data.id].lastMessage
							: data.lastMessage;
					if (
						title === 'Rooms' ||
						title === 'Search Result' ||
						title === 'Chats' ||
						(title === 'Broadcast' && roomsData[data.id].lastMessage) ||
						(title !== 'Chats' && roomsData[data.id])
					) {
						const findIndex = photos.findIndex(
							photo => photo.userID === data.userID
						);
						let photoURL = data.photoURL;
						if (findIndex > -1) {
							photoURL = photos[findIndex]['photoURL'];
						}

						let avtarStyle;
						if (photoURL === null && data.name !== null) {
							avtarStyle = stringAvatar(data.name);
						}

						if (typeof photoURL === 'undefined') {
							avtarStyle = stringAvatar(data.name);
						}

						const userInfo = getUserRow({ lastMessage, onlineState, photoURL, avtarStyle, data, selectedRoomIds });

						if (title === 'Broadcast') {
							arr.push(
								<div
									className="link"
									key={data.id}
									onClick={() =>
										onSelectBroadcastUsers(
											{
												roomID: data.id,
												photoURL: photoURL ? photoURL : null,
												name: data.name,
												userID: data.userID ? data.userID : null,
												state: data.state,
												avtarStyle,
											},
											selectedRoomIds.includes(data.id)
										)
									}
								>
									{userInfo}
								</div>
							);
						} else {
							let navigateTo = {
								pathname: path
									? `${path}/room/${data.id}`
									: `/room/${data.id}`,
								state: {
									photoURL: photoURL,
									name: data.name,
									userID: data.userID ? data.userID : null,
									state: data.state,
								},
							};
							if(data.isBroadcast) {
								navigateTo = {
									pathname: path ? `${path}/room/broadcast` : '/room/broadcast',
									state: {
										roomID: data.id,
										photoURL: null,
										name: 'Broadcast list',
										isBroadcast: true,
										broadcastUsers: data.recipients
									},
								}
							}
							arr.push(
								<Link
									className="link"
									key={data.id}
									to={navigateTo}
								>
									{userInfo}
								</Link>
							);
						}
					}
				} else {
					arr.push(null);
				}
			});
			setList(arr);
		}
	}, [dataList, roomsData, page, pathID, photos, broadcastUsers]);

	useEffect(() => {
		if (page.width <= 760) {
			dispatch({ type: 'SET_PATH', path: path });
		} else {
			dispatch({ type: 'SET_PATH', path: '' });
		}
	}, [path, page]);

	const renderList = () => {
		if (title === 'Broadcast' && !isNewBroadcast) {
			if (broadcasts.length) {
				return broadcasts.map((data) => {
					let navigateTo = {
						pathname: path
							? `${path}/room/broadcast/${data.id}`
							: `/room/broadcast/${data.id}`,
						state: {
							photoURL: null,
							name: data.name,
							userID: data.userID ? data.userID : null,
							roomID: data.id,
							state: data.state,
							broadcastUsers: data.recipients,
							isBroadcast: true
						},
					};

					let avtarStyle = stringAvatar(data.name);

					const userInfo = getUserRow({ lastMessage: data.lastMessage, photoURL: null, data, avtarStyle, selectedRoomIds: [] });

					return (
						<Link
							className="link"
							key={data.id}
							to={navigateTo}
						>
							{userInfo}
						</Link>
					)
				})
			} else {
				return (
					<div className="no-result">
						<div>
							<SearchOutlined />
							<div className="cancel-root">
								<CancelOutlined />
							</div>
						</div>
						<h2>No {title} found </h2>
					</div>
				)
			}
		}
		return list;
	}

	return (
		<div ref={sidebarChatContainer} className="sidebar__chat--container">
			<h2 className="animate">{title} </h2>
			{broadcastUsers.length > 0 && (
				<>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: '0 20px',
						}}
					>
						<span>{broadcastUsers.length > 1 ? `${broadcastUsers.length} selected`: 'Please select two or more users to broadcast'}</span>
						<span
							variant="text"
							style={{ color: 'red', cursor: 'pointer' }}
							startIcon={<Clear />}
							onClick={() => setBroadcastUsers([])}
						>
							Clear
						</span>
					</div>
					<div className="sidebar__chat--broadcast-row">
						{broadcastUsers.map(item => {
							const avatar = item.photoURL ? (
								<Avatar
									style={{ width: 45, height: 45 }}
									src={`${item.photoURL}`}
								/>
							) : item.name ? (
								<StyledAvatar {...item.avtarStyle} />
							) : (
								<Avatar />
							);
							return (
								<Chip
									key={item.roomID}
									variant="outlined"
									avatar={avatar}
									label={item.name}
									style={{ margin: 5 }}
									onDelete={() => onSelectBroadcastUsers(item, true)}
								/>
							);
						})}
					</div>

				</>
			)}
			{title === 'Broadcast' && (
				<Fab
					className={classNames.fab}
					onClick={() => {
						if (isNewBroadcast) {
							if (broadcastUsers.length > 1) {
								const name = `${getBroadcastRecipientsLabel(broadcastUsers)}`;
								setRoomsData(localStorage.userId, broadcastRoomID.current);
								db.collection("broadcast").doc(broadcastRoomID.current).set({
									name,
									isBroadcast: true,
									recipientIds: broadcastUsers.map(r => r.userID),
									recipients: broadcastUsers.map(r => {
										const u = { ...r };
										delete u.avtarStyle;
										return u;
									}),
									owner: localStorage.userId,
									seen: false
								}, { merge: true });
								history.push({
									pathname: path
									? `${path}/room/broadcast/${broadcastRoomID.current}`
									: `/room/broadcast/${broadcastRoomID.current}`,
									state: { ...broadcastUsers[0], roomID: broadcastRoomID.current, photoURL: null, name, isBroadcast: true, broadcastUsers },
								});
								setTimeout(() => {
									setBroadcastUsers([]);
								}, 500);
							} else {
								setBroadcastUsers([]);
								passParentData(false);
							}
						} else {
							passParentData(true)
						}
					}}
				>
					{isNewBroadcast ?
						(broadcastUsers.length <= 1 ? <Clear style={{ color: 'white' }} /> : <Check style={{ color: 'white' }} />) :
						<Add style={{ color: 'white' }} />}
				</Fab>
			)}

			<div
				id="scrollableDiv"
				style={{
					height: page.height - 215,
					overflow: 'auto',
				}}
			>
				{isLoader && (
					<div className="loader__container sidebar__loader">
						<CircularProgress />
					</div>
				)}
				{clientIds.length > 0 && dataList?.length > 0 ? renderList() : dataList === null && title !== 'Chats' ? (
					<div className="loader__container sidebar__loader">
						<CircularProgress />
					</div>
				) : (
					<div className="no-result">
						<div>
							<SearchOutlined />
							<div className="cancel-root">
								<CancelOutlined />
							</div>
						</div>
						<h2>No {title} found </h2>
					</div>
				)}
				{title !== 'Chats' && title !== 'Broadcast' && (
					<MuiThemeProvider theme={theme}>
						<CssBaseline />
						<Pagination
							limit={10}
							offset={offset}
							total={clientIds.length}
							classes={paginationClasses}
							currentPageColor="inherit"
							nextPageLabel={<ArrowForward fontSize="inherit" />}
							previousPageLabel={<ArrowBack fontSize="inherit" />}
							otherPageColor="inherit"
							size="large"
							reduced={true}
							onClick={(e, offset) => {
								setOffSet(offset);
								setList(null);
								setLoader(true);
								fetchList(
									() => null,
									dataList,
									isSearch,
									clientIds,
									false,
									offset
								);
							}}
						/>
					</MuiThemeProvider>
				)}
			</div>
		</div>
	);
}

export default memo(withStyles(styles)(SidebarChat));
